const express = require("express");
const router = express.Router();
const connectToMongo = require("./connectToDb");

router.post("/calculation", async (req, res) => {
  const { portfolioStocks, start, end } = req.body;
  let stocks = [];
  let [startMonth, startDay, startYear] = start.split("/");
  let [endMonth, endDay, endYear] = end.split("/");

  const chartStartDate = new Date(startYear, startMonth - 1, startDay);
  const chartEndDate = new Date(endYear, endMonth - 1, endDay);
  console.log(portfolioStocks)
  console.log(chartStartDate)
  console.log(chartEndDate)

  for (const ticker of portfolioStocks) {
    if (ticker.value) {
      stocks.push(ticker.ticker);
    }
  }

  try {
    res.json(200)
  } catch (err) {
    console.err("Error: ",err)
  }
});

module.exports = router;
