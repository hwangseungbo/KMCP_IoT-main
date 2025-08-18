require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const methodOverride = require("method-override");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
// session 데이터를 DB에 저장을 위해 connect-mongo 설치
const MongoStore = require("connect-mongo");
//RTSP 스트림 관련
const Stream = require("node-rtsp-stream");
const { spawn } = require("child_process");
//socket.io
const http = require("http");
const socketIO = require("socket.io");
const WebSocket = require("ws");
const server = http.createServer(app);
const wss = new WebSocket.Server({ port: 3007 });
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    // credentials: true,
  },
});

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));

let clients = [];
//JSON형태 데이터 자동으로 파싱
app.use(express.json());

// RTSP 스트림을 WebSocket으로 전송하는 함수
let streams = [
  {
    name: "cam_1",
    port: 9999,
    url: "rtsp://admin:kmcp123!@192.168.0.101/profile2/media.smp",
  },
];

function startStream(wsServer, rtspUrl) {
  ffmpeg = spawn("ffmpeg", [
    "-i",
    rtspUrl, // 입력: RTSP 스트림 URL
    //'-probesize', '32',                 // 스트림 분석에 사용하는 데이터의 양을 32바이트로 제한하여 초기 지연 감소
    //'-analyzeduration', '0',            // 분석 시간을 0으로 설정하여 스트림 연결 속도 향상
    "-f",
    "mjpeg", // 출력 포맷: MJPEG (각 프레임을 JPEG 이미지로 변환)
    "-q:v",
    "15", // 비디오 품질 설정 (값이 낮을수록 화질이 높음; 5는 중간 화질)
    "-r",
    "2", // 초당 프레임 수 (10fps로 설정하여 네트워크 사용량 절약)
    "-vf",
    "scale=320:180", // 비디오 필터: 해상도 변경
    "-timeout",
    "5000000", // 타임아웃 설정: 5초 동안 응답이 없을 경우 스트림을 중단
    "-reconnect",
    "1", // 연결 실패 시 자동 재연결 활성화
    "-reconnect_streamed",
    "1", // 실시간 스트림 재연결 허용
    "-reconnect_delay_max",
    "2", // 최대 재연결 지연 시간: 2초
    "-an", // 오디오 제거 (오디오가 필요하지 않을 때 자원 사용 절약)
    "pipe:1", // 파이프 출력: FFmpeg 출력을 파이프로 전달
  ]);

  ffmpeg.stdout.on("data", (data) => {
    wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });

  ffmpeg.stderr.on("data", (data) => {
    console.error(`FFmpeg stderr: ${data}`);
  });

  ffmpeg.on("close", (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
  });

  wsServer.on("close", () => {
    ffmpeg.kill("SIGINT");
  });
}

streams.forEach((stream) => {
  const wsServer = new WebSocket.Server({ port: stream.port });
  startStream(wsServer, stream.url);
  console.log(`Started ${stream.name} on port ${stream.port}`);
});

// 스트림 URL 목록을 제공하는 엔드포인트를 추가합니다.
app.get("/streams", (req, res) => {
  res.json(streams);
});

// method-override 사용을 위한
app.use(methodOverride("_method"));

// post 요청시 담긴내용을 req.body 를 통해 출력하는데 이를 쉽게 이용하기위한 추가구문
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let connectDB = require("./database.js");

let db;
// MongoDB 연결
connectDB
  .then((client) => {
    console.log("mongoDB의 KMCP_IoT 데이터베이스에 연결되었습니다.");
    db = client.db("KMCP_IoT");

    // Express 서버 시작
    app.listen(process.env.Backend_Port, "0.0.0.0", () => {
      console.log(
        `${process.env.Backend_Port}번 포트를 모든 인터페이스에서 수신합니다.`
      );
    });

    //웹소켓 클라이언트가 연결시 실행
    wss.on("connection", (ws) => {
      console.log("새로운 웹소켓 클라이언트가 연결되었습니다.");

      //데이터 수신시
      ws.on("message", async (message) => {
        try {
          // message를 파싱하고 현재 시각을 추가
          let parsedMessage = JSON.parse(message);

          // 현재 시각에 9시간 추가
          let now = new Date();
          now.setTime(now.getTime() + 9 * 60 * 60 * 1000); // 9시간 추가
          parsedMessage.createdAt = now;

          // DB에 삽입
          await db.collection("logs").insertOne(parsedMessage);

          // 응답
          let today = new Date();
          console.log(today.toLocaleString());
          ws.send(
            `${today.toLocaleString()} 서버에서 정상적으로 데이터를 수신했습니다.`
          );
        } catch (err) {
          console.error("웹소켓 메시지 처리 중 오류 발생: ", err);
        }
      });

      //클라이언트 연결종료시
      ws.on("close", () => {
        console.log("클라이언트의 연결이 종료되었습니다.");
      });

      //에러 발생시
      ws.on("error", (error) => {
        console.error("웹소켓 에러 : ", error);
      });
    });

    //웹소켓 서버 시작
    const wssPort = process.env.Web_Socket_Port;
    console.log(`웹소켓 서버가 ws:192.168.0.8:${wssPort}에서 실행중입니다.`);
  })
  .catch((err) => {
    console.log(err);
  });

const lightsRouter = require("./routes/lights.js")(wss);

app.use("/light", lightsRouter);

// API
app.get("/", (req, res) => {
  res.send("서버열림");
});

passport.use(
  new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    try {
      let result = await db
        .collection("businesses")
        .findOne({ username: 입력한아이디 });
      if (!result) {
        return cb(null, false, { message: "아이디가 존재하지 않습니다" });
      }

      if (await bcrypt.compare(입력한비번, result.password)) {
        return cb(null, result);
      } else {
        return cb(null, false, { message: "비밀번호가 일치하지 않습니다" });
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.serializeUser((user, done) => {
  //console.log(user);  //로긍인중인 유저정보 확인
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username });
  });
});

// deserializeUser 함수의 경우 세션정보가 적힌 쿠키를 갖고있는 유저가 요청을 날릴 때 마다 실행됨
passport.deserializeUser(async (user, done) => {
  let result = await db
    .collection("businesses")
    .findOne({ _id: new ObjectId(user.id) });
  delete result.password;
  process.nextTick(() => {
    done(null, result);
  });
});

// Data API
app.use("/test", require("./routes/datas.js"));

// Light API
app.use("/light", require("./routes/lights.js"));

// OPERATOR API
app.use("/api/operators", require("./routes/operators.js"));

// OWNER API
app.use("/api/owners", require("./routes/owners.js"));

// RESERVATION API
app.use("/api/ships/:shipId/reservations", require("./routes/reservations.js"));

// SCHEDULE API
app.use("/api/ships/:shipId/scheduling", require("./routes/schedules.js"));

// SHIP API
app.use("/api/ships", require("./routes/ships.js"));

// ETC... ALL
app.get("*", (req, res) => {
  res.status(404).send("페이지를 찾을 수 없습니다");
});

//소켓IO 클라이언트가 연결시 실행
io.on("connect", (socket) => {
  console.log("새로운 소켓IO 클라이언트가 연결되었습니다. ", socket.id);

  clients.push(socket);

  //데이터 수신시
  socket.on("data", (data) => {
    console.log("data Received: ", data);
  });

  //연결이 끊어졌을 때
  socket.on("disconnect", () => {
    console.log("클라이언트의 연결이 해제되었습니다.");

    clients = clients.filter((client) => client !== socket);
  });
});

// Vercel 환경에서는 서버를 직접 시작하지 않음
// Vercel이 자동으로 서버를 시작함
if (process.env.NODE_ENV !== "production") {
  // 로컬 개발 환경에서만 서버 시작
  const socketIOPort = process.env.Soket_IO_Port || 3000;
  server.listen(socketIOPort, () => {
    console.log(
      `소켓서버가 http://localhost:${socketIOPort}에서 실행중입니다.`
    );
  });
}

// Vercel을 위한 export
module.exports = app;
