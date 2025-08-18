const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema({
  예약자이름: String,
  예약상태: Boolean,
  예약자연락처: String,
  날짜: String,
  시간: String,
});

module.exports = mongoose.model("Reservation", reservationSchema);
