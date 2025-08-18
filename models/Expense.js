const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  유류비용: String,
  유류비날짜: String,
  // 다른 지출 항목들도 필요에 따라 추가
});

module.exports = mongoose.model("Expense", expenseSchema);

// models/Operator.js
const mongoose = require("mongoose");

const operatorSchema = new mongoose.Schema({
  이름: String,
  면허번호: String,
  연락처: String,
  경력: Number,
  평가: Number,
});

module.exports = mongoose.model("Operator", operatorSchema);
