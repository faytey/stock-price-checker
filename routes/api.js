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
    price: { type: Number, default: 0, required: true },
    likes: { type: Number, default: 0, required: true },
    ips: { type: [String], default: [], required: true }, // Need this so only 1 like can be given by an ip. (check if ip is in db and if not add like...)
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

  const getStockWithNotTrue = async (stockName, documentUpdate) => {
    let stockReturn = await Stock.findOneAndUpdate(
      { stock: stockName },
      documentUpdate, // Will update whatever this variable tells it to if found
      { new: true, upsert: true } // upsert creates new doc if not there
    );

    // Be sure to return the stock outside of the findOne to return a value from the function
    return stockReturn;
  };

  const getStockWithTrue = (stockName, updateDocument) => {
    return Stock.findOneAndUpdate(
      { stock: stockName },
      updateDocument,
      { new: true, upsert: true } // Upsert creates new model if it doesn't exist with the updateDocument setting key:values
    );
  };

  app.route("/api/stock-prices").get(async (req, res) => {
    let stockName = req.query.stock;
    let ipa = req.connection.remoteAddress; // ip address of the user
    let likeTrue = req.query.like; // return
    let returnObject;
    let documentUpdate = {};
    let price;
    let stockHasIp = false;

    if (!stockName) return console.log("missing stockName");
    // If there is only one stock
    else if (typeof stockName == "string") {
      stockName = req.query.stock.toUpperCase();
      price = await getPrice(stockName);

      // if likeTrue query is not given
      if (!likeTrue) {
        // If found updates only thing that needs to be which is price because name and ips array will remain the same.
        documentUpdate = { $set: { price: price } };
        returnObject = await getStockWithNotTrue(stockName, documentUpdate);
      }

      // If likeTrue is true
      else if (likeTrue && likeTrue == "true") {
        // Check and see if the stock is in db and if ipa exists in ips array. If so they can't be allowed to add a like.
        stockHasIp = await Stock.findOne(
          { stock: stockName.toUpperCase(), ips: ipa },
          (error, result) => {
            if (error) return error;
            else if (!error && result) {
              return result;
            }
          }
        );
        console.log(stockHasIp, "<= stockHasIp");
        // If stock has ip address then don't update and send error message
        if (stockHasIp) {
          return res.json({ error: "only 1 like per IP address." });
        } else {
          documentUpdate = {
            $set: { price: price },
            $addToSet: { ips: ipa }, // $addToSet only pushes in array if it doesn't exist. Need this instead of push because await runs update twice
            $inc: { likes: 1 },
          };

          returnObject = await getStockWithTrue(stockName, documentUpdate);
          //console.log(returnObject, "<= returnObject with await");
        }
      }

      // If there is no price that means the symbol is not supported
      if (!price) {
        return res.json({ error: "invalid symbol input" });
      } else {
        return res.json({
          stockData: {
            stock: stockName,
            price: returnObject.price,
            likes: returnObject.likes,
          },
        });
      }
    }

    // If there are two stocks
    else {
      let stock1;
      let stock2;
      let price1 = await getPrice(stockName[0]);
      let price2 = await getPrice(stockName[1]);
      // If there is no price that means the symbol is not supported
      if (!price1 || !price2) {
        return res.json({ error: "invalid symbol input" });
      }
      // set up first responseStock for array (do findOneAndUpdate for rel_likes)
      let responseStock1 = {};
      responseStock1["stock"] = stockName[0].toUpperCase();

      // set up second responseStock for array (do findOneAndUpdate for rel_likes)
      let responseStock2 = {};
      responseStock2["stock"] = stockName[1].toUpperCase();

      // Run function getStock to add both stocks to db or update it if it is already there.
      if (!likeTrue) {
        // If found updates only thing that needs to be which is price because name and ips array will remain the same.
        documentUpdate = { $set: { price: price1 } };
        stock1 = await getStockWithNotTrue(
          stockName[0].toUpperCase(),
          documentUpdate
        );
        documentUpdate = { $set: { price: price2 } };
        stock2 = await getStockWithNotTrue(
          stockName[1].toUpperCase(),
          documentUpdate
        );
      } else if (likeTrue && likeTrue == "true") {
        // If found updates only thing that needs to be which is price because name and ips array will remain the same.
        documentUpdate = {
          $set: { price: price1 },
          $addToSet: { ips: ipa }, // $addToSet only pushes in array if it doesn't exist.
          $inc: { likes: 1 }, // For some reason it keeps on adding double of the inc so we do this instead
        };
        stock1 = await getStockWithTrue(
          stockName[0].toUpperCase(),
          documentUpdate
        );
        documentUpdate = {
          $set: { price: price2 },
          $addToSet: { ips: ipa }, // $addToSet only pushes in array if it doesn't exist.
          $inc: { likes: 1 },
        };
        stock2 = await getStockWithTrue(
          stockName[1].toUpperCase(),
          documentUpdate
        );
      }

      // Give responseStocks price key:value
      responseStock1["price"] = stock1.price;
      responseStock2["price"] = stock2.price;

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
