"use strict";
const mongoose = require("mongoose");

module.exports = function (app) {
  let uri = process.env.STOCK_PRICE_CHECKER_MONGO_URI;
  mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const Schema = mongoose.Schema;

  // Use the next four lines to see if you are conneted to mongoose correctly
  var db = mongoose.connection;
  db.on("error", console.error.bind(console, "connection error:"));
  db.once("open", () => {
    console.log("Connection Successful!");
  });

  app.route("/api/stock-prices").get(function (req, res) {});
};
