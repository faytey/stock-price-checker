"use strict";
const mongoose = require("mongoose");
const fetch = require("node-fetch"); // When using node fetch is not supported so we must require it.

module.exports = function (app) {
  let uri = process.env.STOCK_PRICE_CHECKER_MONGO_URI;
  mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const Schema = mongoose.Schema;

  // Use the next four lines to see if you are conneted to mongoose correctly
  // var db = mongoose.connection;
  // db.on("error", console.error.bind(console, "connection error:"));
  // db.once("open", () => {
  //   console.log("Connection Successful!");
  // });

  const stockSchema = new Schema({
    stock: { type: String, required: true },
    price: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    ips: [String], // Need this so only 1 like can be given by an ip. (check if ip is in db and if not add like...)
  });

  const Stock = mongoose.model("Stock", stockSchema);

  const getPrice = (name) => {
    // return the response from (json) (other wise known as data). Then return variable so it works as a normal function. Be sure to use async and await to have correct value in following functions that call on getPrice(name)
    let latestPrice = fetch(
      "https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/" +
        name +
        "/quote"
    )
      .then((response) => response.json())
      .then((json) => {
        // console.log(json);
        return json.latestPrice;
      })
      .catch((error) => {
        console.error(error);
      });

    return latestPrice;
  };

  app.route("/api/stock-prices").get(async (req, res) => {
    let stockName = req.query.stock;
    let ipa = req.connection.remoteAddress; // ip address of the user
    let likeTrue = req.query.like; // return
    let likeValue = 0;
    let price = await getPrice(stockName);
    let options = { new: true };
    let update; // check to see if the ip address already exists in db. If not add a like. If so only update to latest price
    // console.log("upadate the found model in db");

    if (!stockName) return console.log("missing stockName");
    // If there is only one stock
    else if (typeof stockName == "string") {
      // If there is no price length that means the symbol is not supported
      if (price.length == 0) {
        return res.json({ error: "invalid symbol input" });
      } else {
        // create and save model here?
        Stock.findOneAndUpdate(
          { stock: stockName },
          update, // Set in beginning of route
          options, // Set in beginning of route
          (error, result) => {
            if (error) return console.log(error);

            // If not error and not result then the db does not have stock and we need to create/add it into db.
            if (!error && !result) {
              // if the like query exists set likeeValue to one. If none it remains 0.
              if (likeTrue == "true") {
                likeValue = 1; // use this value when creating new stock model
              }
              // create new model
              let stock = new Stock({
                stock: stockName,
                price: price,
                likes: likeValue,
                ips: ipa, // ip address of the user
              });

              // save the new model to db
              stock.save((err, stock) => {
                if (err) return console.error(err);
                else {
                  return res.json({
                    stockData: {
                      stock: stockName,
                      price: price,
                      likes: stock.likes,
                    },
                  });
                }
              });
            } else if (!error && result) {
              console.log("handle updated stock");
              return res.json({
                stockData: {
                  stock: stockName,
                  price: price,
                  likes: 100,
                  note:
                    "Find a way to search through and see if current ip address is in this stock. If not and like is true then increment",
                },
              });
            }
          }
        );
      }
    }

    // If there are two stocks
    else {
      console.log("there are two stocks entered");
    }
  });
};
