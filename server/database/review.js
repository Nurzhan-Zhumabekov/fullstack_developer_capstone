const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  dealership: { type: Number, required: true, index: true },
  review: { type: String, required: true },
  purchase: { type: Boolean, required: true },
  purchase_date: { type: String, default: "" },
  car_make: { type: String, default: "" },
  car_model: { type: String, default: "" },
  car_year: Number,
  sentiment: { type: String, enum: ["positive", "neutral", "negative"] },
});

module.exports = mongoose.model("reviews", schema);
