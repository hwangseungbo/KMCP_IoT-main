const router = require("express").Router();

let connectDB = require("./../database.js");
const { ObjectId } = require("bson");

let db;
connectDB
  .then((client) => {
    db = client.db("KMCP_IoT");
  })
  .catch((err) => {
    console.log(err);
  });

router.get("", async (req, res) => {
  if (req.user) {
    console.log(req.user._id);
  } else {
    res.send("로그인이 필요합니다");
  }

  let result = await db
    .collection("ships")
    .find({ deleted: false, owner: req.user._id.toString() })
    .toArray();

  result = result.map((user) => {
    const { deleted, ...rest } = user;
    return rest;
  });

  try {
    console.log(result);
    res.json(result);
  } catch (err) {
    console.log(err);
  }
});

router.post("", async (req, res) => {
  await db.collection("ships").insertOne({
    owner: req.user._id.toString(),
    name: req.body.name,
    type: req.body.type,
    max_passenger: req.body.max_passenger,
    docked: req.body.docked,
    mainten: req.body.mainten,
    fueltank: req.body.fueltank,
    deleted: false,
  });

  console.log(req.body);
  res.send("선박추가 완료");
});

router.patch("/:shipId", async (req, res) => {
  let result = await db.collection("ships").updateOne(
    { _id: new ObjectId(req.params.shipId) },
    {
      $set: req.body, //{
      // name: req.body.name,
      // type: req.body.type,
      // max_passenger: req.body.max_passenger,
      // docked: req.body.docked,
      // mainten: req.body.mainten,
      // fueltank: req.body.fueltank,
      //},
    }
  );

  delete result.deleted;

  result = await db
    .collection("ships")
    .findOne({ _id: new ObjectId(req.params.shipId) });

  console.log(`${result.name}의 선박 정보가 성공적으로 수정되었습니다.`);
  res.send(`${result.name}의 선박 정보가 성공적으로 수정되었습니다.`);
});

router.delete("/:shipId", async (req, res) => {
  let result = await db
    .collection("ships")
    .updateOne(
      { _id: new ObjectId(req.params.shipId) },
      { $set: { deleted: true } }
    );

  console.log(`${result.name}의 선박 정보가 성공적으로 삭제되었습니다.`);
  res.send(`${result.name}의 선박 정보가 성공적으로 삭제되었습니다.`);
});

module.exports = router;
