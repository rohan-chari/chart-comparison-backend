const express = require("express");
const router = express.Router();
const connectToMongo = require("./connectToDb");

// Route to get historical stock data for a specific ticker
router.post("/historical", async (req, res) => {
  const { comparisonStocks, timeframeStartDate, timeframeEndDate  } = req.body;
    let stocks = comparisonStocks;
    let [startMonth,startDay,startYear] = timeframeStartDate.split("/")
    let [endMonth,endDay,endYear] = timeframeEndDate.split("/")

    const chartStartDate = new Date(startYear, startMonth - 1, startDay);
    const chartEndDate = new Date(endYear, endMonth - 1, endDay);


  try {
    const db = await connectToMongo();
    const historicalCollection = db.collection("stockHistoricalData");
    let stockHistoricalData = [];

    // Find historical data for the given ticker
    for(const ticker of stocks){
        const stockHistory = await historicalCollection.aggregate([
            {
                $match: { ticker: ticker.ticker.toUpperCase() }
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
            }
        ]).toArray();
        
        stockHistoricalData.push(...stockHistory);
        
    }

    

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
