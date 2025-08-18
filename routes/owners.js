const router = require("express").Router();
const bcrypt = require("bcrypt");

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
    console.log(req.user);
  } else {
    res.send("로그인이 필요합니다");
  }

  let result = await db
    .collection("businesses")
    .find({ deleted: false })
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
  let hash = await bcrypt.hash(req.body.password, 10);
  console.log(hash);

  await db.collection("businesses").insertOne({
    username: req.body.username,
    password: hash,
    name: req.body.name,
    company_name: req.body.company_name,
    contact: req.body.contact,
    business_number: req.body.business_number,
    address: req.body.address,
    deleted: false,
  });

  console.log(req.body);
  res.send("회원가입완료");
});

router.patch("/:ownerId", async (req, res) => {
  let result = await db.collection("businesses").updateOne(
    { _id: new ObjectId(req.params.ownerId) },
    {
      $set: req.body, //{
      // username: req.body.username,
      // password: req.body.password,
      // name: req.body.name,
      // company_name: req.body.company_name,
      // contact: req.body.contact,
      // business_number: req.body.business_number,
      // address: req.body.address,
      //},
    }
  );

  delete result.deleted;

  console.log(result);
  res.send(result);
});

router.delete("/:ownerId", async (req, res) => {
  let result = await db
    .collection("businesses")
    .updateOne(
      { _id: new ObjectId(req.params.ownerId) },
      { $set: { deleted: true } }
    );

  console.log(result);
  res.send(result);
});

module.exports = router;
