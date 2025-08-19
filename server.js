// server.js
require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const methodOverride = require("method-override");
const { MongoClient, ObjectId } = require("mongodb");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const MongoStore = require("connect-mongo");
const WebSocket = require("ws");
const { spawn, execSync } = require("child_process");

const app = express();
const server = http.createServer(app);

// ─────────────────────────────────────────────────────────────
// 1) CORS (필요한 출처만 허용; 공개 API면 origin: '*' 로 단순화 가능)
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://iot-client-iota.vercel.app",
      "https://kmcp-io-t-main.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true, // 세션/쿠키 기반이면 true 유지, 아니면 제거 가능
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// ─────────────────────────────────────────────────────────────
// 2) 세션/패스포트 (필요 없으면 이 블록 통째로 제거 가능)
if (process.env.DB_URL && process.env.PASS_SEC) {
  app.use(
    session({
      secret: process.env.PASS_SEC,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
      store: MongoStore.create({
        mongoUrl: process.env.DB_URL,
        dbName: "KMCP_IoT",
      }),
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
}

// ─────────────────────────────────────────────────────────────
// 3) DB 연결 (서버는 항상 뜨고, DB는 비동기로 연결)
let db;
const connectDB = require("./database.js"); // 기존 프로젝트의 Promise<Client> 반환 구조 유지

connectDB
  .then((client) => {
    db = client.db("KMCP_IoT");
    console.log("mongoDB의 KMCP_IoT 데이터베이스에 연결되었습니다.");

    // DB 준비 후에 로컬전략 연결 (db 참조 필요)
    passport.use(
      new LocalStrategy(async (username, password, cb) => {
        try {
          const user = await db.collection("businesses").findOne({ username });
          if (!user)
            return cb(null, false, { message: "아이디가 존재하지 않습니다" });
          const ok = await bcrypt.compare(password, user.password);
          return ok
            ? cb(null, user)
            : cb(null, false, { message: "비밀번호가 일치하지 않습니다" });
        } catch (err) {
          return cb(err);
        }
      })
    );

    passport.serializeUser((user, done) => {
      process.nextTick(() =>
        done(null, { id: user._id, username: user.username })
      );
    });

    passport.deserializeUser(async (user, done) => {
      try {
        const found = await db
          .collection("businesses")
          .findOne({ _id: new ObjectId(user.id) });
        if (found) delete found.password;
        process.nextTick(() => done(null, found));
      } catch (err) {
        done(err);
      }
    });
  })
  .catch((err) => {
    console.error("Mongo 연결 실패:", err);
  });

// ─────────────────────────────────────────────────────────────
// 4) 라우트 (헬스체크 포함)
app.get("/health", (_, res) => res.status(200).send("OK"));
app.get("/", (_, res) => res.send("서버열림"));

// 기존 라우터들
try {
  app.use("/test", require("./routes/datas.js"));
} catch {}
try {
  app.use("/api/operators", require("./routes/operators.js"));
} catch {}
try {
  app.use("/api/owners", require("./routes/owners.js"));
} catch {}
try {
  app.use(
    "/api/ships/:shipId/reservations",
    require("./routes/reservations.js")
  );
} catch {}
try {
  app.use("/api/ships/:shipId/scheduling", require("./routes/schedules.js"));
} catch {}
try {
  app.use("/api/ships", require("./routes/ships.js"));
} catch {}

// 404
app.get("*", (_, res) => res.status(404).send("페이지를 찾을 수 없습니다"));

// ─────────────────────────────────────────────────────────────
// 5) WebSocket: “같은 포트” + “경로로 구분” (별도 포트 절대 열지 않음)
const wss = new WebSocket.Server({ server, path: "/ws/mjpeg" });

// lights 라우터가 wss를 필요로 한다면, factory 패턴 유지
try {
  const lightsRouterFactory = require("./routes/lights.js");
  app.use("/light", lightsRouterFactory(wss));
} catch {}

// ─────────────────────────────────────────────────────────────
// 6) FFmpeg → WS 브로드캐스트 (단일 프로세스, 첫 접속 시 기동)

// ── ENV 캐시 ─────────────────────────────────────────────
const RTSP_HOST = (process.env.RTSP_HOST || "223.171.72.233").trim();
const RTSP_PORT = (process.env.RTSP_PORT || "10554").trim();
const RTSP_PATH = (process.env.RTSP_PATH || "/profile2/media.smp").trim();
const RTSP_USER = (process.env.RTSP_USER || "").trim();
const RTSP_PASS = (process.env.RTSP_PASS || "").trim();

// ── URL 생성(인증+timeout) ──────────────────────────────
function buildRtspUrlWithAuthAndTimeout(
  host,
  port,
  path,
  user,
  pass,
  timeoutUs = 15000000
) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const u = new URL(`rtsp://${host}:${port}${cleanPath}`);
  if (user) u.username = encodeURIComponent(user);
  if (pass) u.password = encodeURIComponent(pass);
  if (!u.searchParams.has("timeout"))
    u.searchParams.set("timeout", String(timeoutUs));
  return u.toString(); // <- 여기서 ! 가 %21 로 변환됨
}

let ff = null;
function startRtspToMjpeg(wss) {
  const finalRtsp = buildRtspUrlWithAuthAndTimeout(
    RTSP_HOST,
    RTSP_PORT,
    RTSP_PATH,
    RTSP_USER,
    RTSP_PASS
  );
  console.log("[CHECK] Final RTSP URL passed to ffmpeg =", finalRtsp); // 반드시 %21 이 보여야 함

  const args = [
    "-rtsp_transport",
    "tcp",
    "-probesize",
    "10M",
    "-analyzeduration",
    "10M",
    "-i",
    finalRtsp, // 오직 finalRtsp 만 사용!
    "-fflags",
    "nobuffer",
    "-flags",
    "low_delay",
    "-f",
    "mjpeg",
    "-q:v",
    "10",
    "-r",
    "2",
    "-vf",
    "scale=640:360",
    "-an",
    "pipe:1",
  ];
  console.log("FFmpeg args:", args.join(" "));
  const { spawn, execSync } = require("child_process");

  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
  } catch {
    console.log("FFmpeg not installed");
    return;
  }

  const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
  proc.stdout.on("data", (chunk) => {
    wss.clients.forEach((c) => {
      if (c.readyState === 1) c.send(chunk);
    });
  });
  proc.stderr.on("data", (d) => console.error("FFmpeg:", d.toString()));
  proc.on("close", (code) => {
    console.log("FFmpeg exited:", code);
    ff = null;
  });
  return proc;
}

//ffprobe로 자동 경로 스캔(원클릭 진단)
const { exec } = require("child_process");

async function tryProbe(url) {
  return new Promise((resolve) => {
    exec(
      `ffprobe -rtsp_transport tcp -v error -select_streams v:0 -show_streams -of json "${url}"`,
      { timeout: 8000 },
      (err, stdout) => {
        if (err) return resolve({ ok: false, err: err.message });
        try {
          const j = JSON.parse(stdout || "{}");
          if (j.streams && j.streams.length)
            return resolve({ ok: true, info: j.streams[0] });
        } catch (_) {}
        resolve({ ok: false, err: "no streams" });
      }
    );
  });
}

async function autoDiscoverRtsp(host, port, user, pass, paths) {
  for (const p of paths) {
    const base = new URL(
      `rtsp://${host}:${port}${p.startsWith("/") ? p : `/${p}`}`
    );
    if (user) base.username = encodeURIComponent(user);
    if (pass) base.password = encodeURIComponent(pass);
    base.searchParams.set("timeout", "15000000");
    const url = base.toString();
    const r = await tryProbe(url);
    console.log("[PROBE]", p, r.ok ? "OK" : `FAIL: ${r.err}`);
    if (r.ok) return url;
  }
  return null;
}

// 사용 예 (서버 시작 시 1회 실행)
(async () => {
  const paths = [
    "/profile1/media.smp",
    "/profile2/media.smp",
    "/onvif-media/media.amp",
    "/Streaming/Channels/101",
    "/h264/ch1/main/av_stream",
    "/h264",
  ];
  const found = await autoDiscoverRtsp(
    process.env.RTSP_HOST,
    process.env.RTSP_PORT,
    process.env.RTSP_USER,
    process.env.RTSP_PASS,
    paths
  );
  console.log("[PROBE] FOUND =", found);
})();

// 첫 연결 때만 ffmpeg 기동
wss.on("connection", () => {
  if (!ff) ff = startRtspToMjpeg(wss);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`HTTP/WS 서버가 0.0.0.0:${PORT} 에서 실행 중입니다.`);
});

module.exports = app;
