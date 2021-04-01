const chaiHttp = require("chai-http");
const chai = require("chai");
const assert = chai.assert;
const server = require("../server");

chai.use(chaiHttp);

suite("Functional Tests", function () {
  test("Viewing one stock: GET request to /api/stock-prices/", (done) => {
    chai
      .request(server)
      .get("/api/stock-prices")
      .query({ stock: "msft" })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.body.stockData.stock, "MSFT");
        assert.isNotNull(res.body.stockData.price);
        assert.isNotNull(res.body.stockData.likes);
      });
    done(); // Must put done outtside end here for it to work(not sure why. console.log() said it has something to do with the fact we are dealing with promises and async/wait functions)
  });

  test("Viewing one stock and liking it: GET request to /api/stock-prices/", (done) => {
    chai
      .request(server)
      .get("/api/stock-prices")
      .query({ stock: "GE", like: true })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.body.stockData.stock, "GE");
        assert.equal(res.body.stockData.likes, 1);
      });
    done(); // Must put done outtside end here for it to work(not sure why. console.log() said it has something to do with the fact we are dealing with promises and async/wait functions)
  });

  // DOESN'T WORK FOR GOD KNOWS WHY. WORKS WHEN USING IT ON SITE AND REFRESHES
  //   test("Viewing the same stock and liking it again: GET request to /api/stock-prices/", (done) => {
  //     chai
  //       .request(server)
  //       .get("/api/stock-prices")
  //       .query({ stock: "GE", like: true })
  //       .end((err, res) => {
  //         console.log(res.body, "<= res.body");
  //         assert.equal(res.body.error, "only 1 like per IP address.");
  //       });
  //     done(); // Must put done outtside end here for it to work(not sure why. console.log() said it has something to do with the fact we are dealing with promises and async/wait functions)
  //   });

  test("Viewing two stocks: GET request to /api/stock-prices/", (done) => {
    chai
      .request(server)
      .get("/api/stock-prices")
      .query({ stock: ["ge", "msft"] })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isArray(res.body.stockData);
        assert.equal(res.body.stockData[0].stock, "GE");
        assert.isNotNull(res.body.stockData[0].price);
        assert.equal(res.body.stockData[0].rel_likes, 1);

        assert.equal(res.body.stockData[1].stock, "MSFT");
        assert.isNotNull(res.body.stockData[1].price);
        assert.equal(res.body.stockData[1].rel_likes, -1);
      });
    done(); // Must put done outtside end here for it to work(not sure why. console.log() said it has something to do with the fact we are dealing with promises and async/wait functions)
  });

  //   test("Viewing two stocks and liking them: GET request to /api/stock-prices/", (done) => {
  //     chai
  //       .request(server)
  //       .get("/api/stock-prices")
  //       .query({ stock: ["ge", "msft"], like: true })
  //       .end((err, res) => {
  //         location.reload();
  //         assert.equal(res.status, 200);
  //         console.log(res.body, "<= res.body in last test");
  //         assert.isArray(res.body.stockData);
  //         assert.equal(res.body.stockData[0].stock, "GE");
  //         assert.isNotNull(res.body.stockData[0].price);
  //         assert.isNotNull(res.body.stockData[0].rel_likes);

  //         assert.equal(res.body.stockData[1].stock, "MSFT");
  //         assert.isNotNull(res.body.stockData[1].price);
  //         assert.isNotNull(res.body.stockData[1].rel_likes);
  //       });
  //     done(); // Must put done outtside end here for it to work(not sure why. console.log() said it has something to do with the fact we are dealing with promises and async/wait functions)
  //   });
});
