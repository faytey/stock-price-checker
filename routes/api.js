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

  const getStock = async (stockName, ipa, likeTrue) => {
    let price = await getPrice(stockName);
    let likeValue = 0;
    let stockReturn = Stock.findOneAndUpdate(
      { stock: stockName },
      { new: true }, // Need to show updated/new version
      async (error, result) => {
        if (error) return console.log(error);

        // If not error and not result then the db does not have stock and we need to create/add it into db.
        if (!error && !result) {
          // if the like query exists set likeeValue to one. If none it remains 0.
          if (likeTrue) {
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
              return {
                stockData: {
                  stock: stockName,
                  price: price,
                  likes: stock.likes, // increments no matter what. We want option of when ip address is in ips array then it won't increase
                },
              };
            }
          });
        }

        // If stock is already in database. Update it
        else if (!error && result) {
          // set howManylikes to the amount of likes in db.
          let howManyLikes = result.likes;

          // If the ip is not in database then add a like. If ip is in database then don't add a like
          let stockHasIp = await Stock.findOne(
            { stock: stockName, ips: ipa },
            (error, result) => {
              if (error) return error;
              else if (!error && !result) return false;
              else if (!error && result) {
                return true;
              }
            }
          );

          // If stock in databse does not have ip address then add one to howManyLikes
          if (!stockHasIp) howManyLikes += 1;

          return {
            stockData: {
              stock: stockName,
              price: price, // will get latest price
              likes: howManyLikes, // Will add one if stock does not have ip
            },
          };
        }
      }
    );

    // Be sure to return the stock outside of the findOne to return a value from the function
    return stockReturn;
  };

  app.route("/api/stock-prices").get(async (req, res) => {
    let stockName = req.query.stock;
    let ipa = req.connection.remoteAddress; // ip address of the user
    let likeTrue = req.query.like; // return

    if (!stockName) return console.log("missing stockName");
    // If there is only one stock
    else if (typeof stockName == "string") {
      let price = await getPrice(stockName);
      let returnObject = await getStock(stockName, ipa, likeTrue);
      console.log(returnObject, "<= returnObject");
      // If there is no price length that means the symbol is not supported
      if (price.length == 0) {
        return res.json({ error: "invalid symbol input" });
      } else {
        return res.json(returnObject);
      }
    }

    // If there are two stocks
    else {
      let priceStock1 = await getPrice(stockName[0]);
      let priceStock2 = await getPrice(stockName[1]);
      // set up first responseStock for array (do findOneAndUpdate for rel_likes)
      let responseStock1 = {};
      responseStock1["stock"] = stockName[0];
      responseStock1["price"] = priceStock1;

      // set up second responseStock for array (do findOneAndUpdate for rel_likes)
      let responseStock2 = {};
      responseStock2["stock"] = stockName[1];
      responseStock2["price"] = priceStock2;

      // Run function getStock to add both stocks to db or update it if it is already there.
      let stock1 = await getStock(stockName[0], ipa, likeTrue);
      let stock2 = await getStock(stockName[1], ipa, likeTrue);

      // Get the value for each of their likes
      let stock1Likes = stock1.likes;
      let stock2Likes = stock2.likes;

      // Make rel_likes based on how many more/less likes stocks have compared to each other
      responseStock1["rel_likes"] = stock1Likes - stock2Likes;
      responseStock2["rel_likes"] = stock2Likes - stock1Likes;

      return res.json({ stockData: [responseStock1, responseStock2] });
    }
  });
};
