const express = require("express");
const router = express.Router();
const connectToMongo = require("./connectToDb");
const { getStockPrice } = require("./helperFunctions");

router.post("/calculation", async (req, res) => {
  const { portfolioStocks, start, end } = req.body;
  let [startMonth, startDay, startYear] = start.split("/");
  let [endMonth, endDay, endYear] = end.split("/");

  const chartStartDate = new Date(startYear, startMonth - 1, startDay);
  const chartEndDate = new Date(endYear, endMonth - 1, endDay);

  try {
    const db = await connectToMongo();
    const historicalCollection = db.collection("stockHistoricalData");

    let initialPortfolioValue = 0;
    let finalPortfolioValue = 0;
    
    const tickers = portfolioStocks.map(stock => stock.ticker.toUpperCase());

    const stockHistory = await historicalCollection.aggregate([
      {
        $match: { ticker: { $in: tickers } }
      },
      {
        $project: {
          _id: 0,
          ticker: 1,
          historicalData: {
            $filter: {
              input: "$historicalData",
              as: "data",
              cond: {
                $and: [
                  { $gte: ["$$data.date", chartStartDate] },
                  { $lte: ["$$data.date", chartEndDate] }
                ]
              }
            }
          }
        }
      },
      {
        $addFields: {
          sortedData: {
            $sortArray: { input: "$historicalData", sortBy: { date: 1 } }
          }
        }
      }
    ]).toArray();

    let historicalPortfolioValue = {}; 

    for (const stock of portfolioStocks) {
      const stockData = stockHistory.find(s => s.ticker === stock.ticker.toUpperCase());

      let startPrice = stockData?.sortedData?.[0]?.close ?? null;
      let endPrice = stockData?.sortedData?.[stockData.sortedData.length - 1]?.close ?? null;

      if (startPrice === null || endPrice === null) {
        startPrice = endPrice = await getStockPrice(stock.ticker);
      }

      initialPortfolioValue += stock.quantity * startPrice;
      finalPortfolioValue += stock.quantity * endPrice;

      stockData?.sortedData.forEach(dataPoint => {
        let dateStr = dataPoint.date.toISOString();
        let stockValue = stock.quantity * dataPoint.close;

        if (!historicalPortfolioValue[dateStr]) {
          historicalPortfolioValue[dateStr] = 0;
        }

        historicalPortfolioValue[dateStr] += stockValue;
      });
    }

    let historicalData = Object.keys(historicalPortfolioValue).map(date => ({
      date,
      percentChange: ((historicalPortfolioValue[date] - initialPortfolioValue) / initialPortfolioValue) * 100
    }));

    historicalData.sort((a, b) => new Date(a.date) - new Date(b.date));

    let overallPercentChange = ((finalPortfolioValue - initialPortfolioValue) / initialPortfolioValue) * 100;

    res.json({
      portfolioValue: finalPortfolioValue,
      historicalData,
      overallPercentChange
    });

  } catch (err) {
    console.error("Error: ", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
