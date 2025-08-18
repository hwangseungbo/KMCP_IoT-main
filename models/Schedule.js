const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
  운항자이름: String,
  승객명단: [String],
  운영시간: Number,
  시작시간: String,
  종료시간: String,
  가격: {
    "1시간": Number,
    "2시간": Number,
  },
  상태: String,
  설명: String,
});

module.exports = mongoose.model("Schedule", scheduleSchema);
