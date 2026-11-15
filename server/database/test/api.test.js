const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { once } = require("node:events");
const test = require("node:test");
const mongoose = require("mongoose");
const { createApp, seed } = require("../app");

const mongoUri = process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017";

test("the dealership catalog and reviews use a persistent MongoDB database", async (t) => {
  await mongoose.connect(mongoUri, {
    dbName: `dealership_test_${randomUUID().replaceAll("-", "")}`,
    serverSelectionTimeoutMS: 5000,
  });
  t.after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  await seed();
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (path) => fetch(base + path);
  const dealers = await (await get("/fetchDealers")).json();
  const kansas = await (await get("/fetchDealers/Kansas")).json();
  assert.equal(dealers.length, 50);
  assert.ok(kansas.length > 0 && kansas.every(({ state }) => state === "Kansas"));
  const dealer = await (await get("/fetchDealer/1")).json();
  assert.equal(dealer.id, 1);
  assert.equal((await get("/fetchDealer/0")).status, 400);
  assert.equal((await get("/fetchDealer/99999")).status, 404);

  const payload = {
    name: "Test user", dealership: 1, review: "Fantastic services", purchase: true,
    purchase_date: "2026-11-15", car_make: "Honda", car_model: "Civic", car_year: 2022,
    sentiment: "positive",
  };
  const post = () => fetch(base + "/insert_review", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const responses = await Promise.all([post(), post()]);
  assert.ok(responses.every(({ status }) => status === 201));
  const newReviews = await Promise.all(responses.map((response) => response.json()));
  assert.notEqual(newReviews[0].id, newReviews[1].id);
  await seed();
  const reviews = await (await get("/fetchReviews/dealer/1")).json();
  assert.ok(newReviews.every(({ id }) => reviews.some((review) => review.id === id)));
});
