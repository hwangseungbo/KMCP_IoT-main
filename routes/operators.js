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
    .collection("operators")
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
  await db.collection("operators").insertOne({
    owner: req.user._id.toString(),
    name: req.body.name,
    license_number: req.body.license_number,
    contact: req.body.contact,
    experience: req.body.experience,
    rating: req.body.rating,
    deleted: false,
  });

  console.log(req.body);
  res.send("선박운항자 추가 완료");
});

router.patch("/:operatorId", async (req, res) => {
  let result = await db.collection("operators").updateOne(
    { _id: new ObjectId(req.params.operatorId) },
    {
      $set: req.body,
    }
  );

  delete result.deleted;

  result = await db
    .collection("operators")
    .findOne({ _id: new ObjectId(req.params.operatorId) });

  console.log(`${result.name}의 운전자 정보가 성공적으로 수정되었습니다.`);
  res.send(`${result.name}의 운전자 정보가 성공적으로 수정되었습니다.`);
});

router.delete("/:operatorId", async (req, res) => {
  let result = await db
    .collection("operators")
    .updateOne(
      { _id: new ObjectId(req.params.operatorId) },
      { $set: { deleted: true } }
    );

  result = await db
    .collection("operators")
    .findOne({ _id: new ObjectId(req.params.operatorId) });

  console.log(`${result.name}의 운전자 정보가 성공적으로 삭제되었습니다.`);
  res.send(`${result.name}의 운전자 정보가 성공적으로 삭제되었습니다.`);
});

module.exports = router;
