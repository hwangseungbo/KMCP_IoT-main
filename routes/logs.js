const router = require("express").Router();

let connectDB = require("./../database.js");
const { ObjectId } = require("bson");

let db;
connectDB
  .then((client) => {
    db = client.db("KMCP");
  })
  .catch((err) => {
    console.log(err);
  });

// 라우터 미들웨어: DB 초기화 확인
router.use((req, res, next) => {
  if (!db) {
    return res.status(500).json({ error: "Database not initialized yet." });
  }
  next();
});

router.get("", async (req, res) => {
  let result = await db
    .collection("telemetry")
    .find() // 조건 없이 모든 문서를 검색
    .sort({ ts: -1 }) // 최신 데이터를 기준으로 내림차순 정렬
    .limit(1) // 가장 최신 데이터 1개만 가져옴
    .toArray();
  // result[0].createdAt = "2024-11-27T14:30:07.892Z";
  console.log(result);

  res.json(result);
});

module.exports = router;
