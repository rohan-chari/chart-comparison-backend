const express = require("express");
const router = express.Router();
const connectToMongo = require("./connectToDb");

// Route to get historical stock data for a specific ticker
router.post("/historical", async (req, res) => {
  const { comparisonStocks, timeframeStartDate, timeframeEndDate  } = req.body;
    let stocks = [];
    let [startMonth,startDay,startYear] = timeframeStartDate.split("/")
    let [endMonth,endDay,endYear] = timeframeEndDate.split("/")

    const chartStartDate = new Date(startYear, startMonth - 1, startDay);
    const chartEndDate = new Date(endYear, endMonth - 1, endDay);

    for(const ticker of comparisonStocks){
      if(ticker.value){
        stocks.push(ticker.ticker)
      }
    }

  try {
    const db = await connectToMongo();
    const historicalCollection = db.collection("stockHistoricalData");
    let stockHistoricalData = [];

    const stockHistory = await historicalCollection.aggregate([
      {
          $match: { ticker: { $in: stocks.map(t => t.toUpperCase()) } }
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
          $project: {
              ticker: 1,
              historicalData: {
                  $map: {
                      input: "$historicalData",
                      as: "data",
                      in: {
                          date: "$$data.date",
                          open: "$$data.open",
                          close: "$$data.close"
                      }
                  }
              }
          }
      }
    ]).toArray();
  
      
    stockHistoricalData.push(stockHistory);
        

    

    if (stockHistoricalData.length < 1) {
      return res.status(404).json({ error: "Historical data not found" });
    }

    res.json(stockHistoricalData);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



module.exports = router;
