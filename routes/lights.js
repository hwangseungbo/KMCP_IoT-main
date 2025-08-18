// const router = require("express").Router();

// const { ObjectId } = require("bson");

// router.post("", async (req, res) => {
//   console.log(req.body);
//   res.json(req.body);
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const { ObjectId } = require("bson");

module.exports = (wss) => {
  // POST 요청 처리
  router.post("", async (req, res) => {
    console.log(req.body);
    const { shipId, light } = req.body; // 요청 데이터에서 shipId와 light 값을 추출

    if (typeof light === "boolean") {
      // light 값이 true/false인지 확인
      const message = light ? "hello" : "bye"; // light 값에 따라 메시지 결정

      // WebSocket 클라이언트에게 메시지 전송
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(message);
        }
      });

      // 응답 반환
      res.json({
        shipId,
        light,
        message,
        status: "Message sent to WebSocket clients.",
      });
      ㅁ;
    } else {
      // light 값이 boolean이 아닌 경우 에러 응답
      res
        .status(400)
        .json({ error: "Invalid data format. 'light' must be a boolean." });
    }
  });

  return router;
};
