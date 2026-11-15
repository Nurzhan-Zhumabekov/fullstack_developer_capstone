const express = require("express");
const mongoose = require("mongoose");
const Dealers = require("./dealership");
const Reviews = require("./review");
const { dealerships } = require("./data/dealerships.json");
const { reviews } = require("./data/reviews.json");

const counter = () => mongoose.connection.collection("sequences");

async function seed() {
  await Promise.all([Dealers.init(), Reviews.init()]);
  await Promise.all([
    Dealers.bulkWrite(dealerships.map((dealer) => ({
      updateOne: { filter: { id: dealer.id }, update: { $setOnInsert: dealer }, upsert: true },
    }))),
    Reviews.bulkWrite(reviews.map((review) => ({
      updateOne: { filter: { id: review.id }, update: { $setOnInsert: review }, upsert: true },
    }))),
  ]);
  const lastReview = await Reviews.findOne().sort({ id: -1 }).select("id").lean();
  await counter().updateOne(
    { _id: "reviews" }, { $max: { value: lastReview?.id ?? 0 } }, { upsert: true },
  );
}

function withDatabase(handler) {
  return (request, response, next) => handler(request, response).catch(next);
}

function dateIsValid(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(value + "T");
}

function reviewIsValid(body) {
  return body && Number.isSafeInteger(body.dealership) && body.dealership > 0
    && typeof body.name === "string" && body.name.trim().length > 0 && body.name.length <= 150
    && typeof body.review === "string" && body.review.trim().length > 0
    && body.review.length <= 2000 && typeof body.purchase === "boolean"
    && (!body.purchase || (
      dateIsValid(body.purchase_date) && typeof body.car_make === "string"
      && body.car_make.trim() && body.car_make.length <= 80
      && typeof body.car_model === "string" && body.car_model.trim()
      && body.car_model.length <= 80 && Number.isInteger(body.car_year)
      && body.car_year >= 2015 && body.car_year <= 2023
    ));
}

function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.param("id", (request, response, next, id) => {
    if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) {
      return response.status(400).json({ error: "Use a positive dealer ID." });
    }
    request.dealerId = Number(id);
    return next();
  });

  app.get("/", (request, response) => response.send("Dealership catalog API"));
  app.get("/health", withDatabase(async (request, response) => {
    await mongoose.connection.db.command({ ping: 1 });
    response.json({ status: "OK" });
  }));
  app.get("/fetchDealers", withDatabase(async (request, response) => {
    response.json(await Dealers.find().sort({ id: 1 }).lean());
  }));
  app.get("/fetchDealers/:state", withDatabase(async (request, response) => {
    const state = request.params.state.trim();
    if (!state || state.length > 60) {
      return response.status(400).json({ error: "Supply a state name." });
    }
    const dealers = await Dealers.find({ state })
      .collation({ locale: "en", strength: 2 }).sort({ id: 1 }).lean();
    return response.json(dealers);
  }));
  app.get("/fetchDealer/:id", withDatabase(async (request, response) => {
    const dealer = await Dealers.findOne({ id: request.dealerId }).lean();
    if (!dealer) return response.status(404).json({ error: "Dealer not found." });
    return response.json(dealer);
  }));
  app.get("/fetchReviews", withDatabase(async (request, response) => {
    response.json(await Reviews.find().sort({ id: 1 }).lean());
  }));
  app.get("/fetchReviews/dealer/:id", withDatabase(async (request, response) => {
    const reviewsForDealer = await Reviews.find({ dealership: request.dealerId })
      .sort({ id: 1 }).lean();
    response.json(reviewsForDealer);
  }));
  app.post("/insert_review", withDatabase(async (request, response) => {
    const body = request.body;
    if (!reviewIsValid(body)) {
      return response.status(400).json({ error: "Supply a valid dealership and review." });
    }
    if (!await Dealers.exists({ id: body.dealership })) {
      return response.status(404).json({ error: "Dealer not found." });
    }
    const sequence = await counter().findOneAndUpdate(
      { _id: "reviews" }, { $inc: { value: 1 } }, { returnDocument: "after" },
    );
    const { name, dealership, review, purchase } = body;
    const sentiment = ["positive", "neutral", "negative"].includes(body.sentiment)
      ? body.sentiment : undefined;
    const newReview = await Reviews.create({
      id: sequence.value, name: name.trim(), dealership, review: review.trim(), purchase, sentiment,
      purchase_date: purchase ? body.purchase_date : "",
      car_make: purchase ? body.car_make.trim() : "",
      car_model: purchase ? body.car_model.trim() : "",
      car_year: purchase ? body.car_year : undefined,
    });
    return response.status(201).json(newReview);
  }));
  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    if (error.type === "entity.parse.failed" || error.type === "entity.too.large") {
      return response.status(error.status).json({ error: "Invalid review request body." });
    }
    console.error("Catalog request failed:", error.name);
    return response.status(503).json({ error: "Catalog temporarily unavailable." });
  });
  return app;
}

async function start() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017", {
    dbName: process.env.MONGODB_DB || "dealershipsDB",
    serverSelectionTimeoutMS: 8000,
  });
  await seed();
  const port = Number(process.env.PORT || 3030);
  createApp().listen(port, "0.0.0.0", () => console.log(`Catalog API listening on port ${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Unable to start catalog API:", error.name);
    process.exit(1);
  });
}

module.exports = { createApp, seed };
