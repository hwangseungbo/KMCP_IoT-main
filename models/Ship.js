const mongoose = require("mongoose");

const shipSchema = new mongoose.Schema({
  이름: String,
  식별번호: String,
  종류: String,
  최대승객수: Number,
  정박: Boolean,
  정비: Boolean,
  총가동률: Boolean,
  유휴시간: Boolean,
  지출: {
    유류비: [{ 유류비용: String, 유류비날짜: String }],
    소모품비: [{ 소모품비용: String, 소모품비날짜: String }],
    수리비: [{ 수리비용: String, 수리비날짜: String }],
  },
  서비스항목: {
    운항자정보: [
      {
        이름: String,
        면허번호: String,
        연락처: String,
        경력: Number,
        평가: Number,
      },
    ],
    예약: [
      {
        예약자이름: String,
        예약상태: Boolean,
        예약자연락처: String,
        날짜: String,
        시간: String,
      },
    ],
    배차: {
      운항자이름: String,
      승객명단: [String],
      운영시간: Number,
      시작시간: String,
      종료시간: String,
      가격: { "1시간": Number, "2시간": Number },
      상태: String,
      설명: String,
    },
  },
});

module.exports = mongoose.model("Ship", shipSchema);
