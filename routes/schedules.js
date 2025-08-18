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
  console.log("schedule get");
  res.send("schedule get");
});

router.post("", async (req, res) => {
  console.log("schedule post");
});

router.patch("/:scheduleId", async (req, res) => {
  console.log("schedule patch");
});

router.delete("/:scheduleId", async (req, res) => {
  console.log("schedule delete");
});

module.exports = router;
