const router = require("express").Router();

let connectDB = require("./../database.js");

let db;
connectDB
  .then((client) => {
    db = client.db("KMCP_IoT");
  })
  .catch((err) => {
    console.log(err);
  });

router.get("", async (req, res) => {
  console.log("reservation get");
  res.send("reservation get");
});

router.post("", async (req, res) => {
  console.log("reservation post");
});

router.patch("", async (req, res) => {
  console.log("reservation patch");
});

router.delete("", async (req, res) => {
  console.log("reservation delete");
});

module.exports = router;
