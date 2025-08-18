const mongoose = require("mongoose");

const operatorSchema = new mongoose.Schema({
  이름: String,
  면허번호: String,
  연락처: String,
  경력: Number,
  평가: Number,
});

module.exports = mongoose.model("Operator", operatorSchema);
