const mongoose = require("mongoose");

const ownerSchema = new mongoose.Schema({
  이름: { type: String, required: true },
  상호명: { type: String, required: true },
  이메일: { type: String, required: true, unique: true, match: /.+\@.+\..+/ },
  사업자등록번호: { type: String, required: true, unique: true },
  연락처: { type: String, required: true },
  주소: { type: String, required: true },
});

module.exports = mongoose.model("Owner", ownerSchema);
