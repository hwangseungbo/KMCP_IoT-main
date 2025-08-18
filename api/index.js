const express = require("express");
const cors = require("cors");

const app = express();

// CORS 설정
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// JSON 파싱
app.use(express.json());

// 기본 라우트
app.get("/", (req, res) => {
  res.send("서버열림");
});

// API 라우트들
app.get("/api/test", (req, res) => {
  res.json({ message: "API 테스트 성공" });
});

// 404 핸들러
app.get("*", (req, res) => {
  res.status(404).send("페이지를 찾을 수 없습니다");
});

// Vercel을 위한 export
module.exports = app;
