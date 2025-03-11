const express = require("express");
const router = express.Router();
const connectToMongo = require("./connectToDb");

router.get("/", async (req, res) => {
  const { stockInfo } = req.query;

  if (!stockInfo) {
    return res.status(400).json({ error: "Ticker or company name is required" });
  }

  try {
    const db = await connectToMongo();
    const stocksCollection = db.collection("stocks");

    // Perform case-insensitive search for ticker OR company name (partial match)
    const results = await stocksCollection
      .find({
        $or: [
          { ticker: stockInfo.toUpperCase() }, // Exact match for ticker
          { company_name: { $regex: stockInfo, $options: "i" } } // Partial match for company name
        ]
      })
      .project({ _id: 0, ticker: 1, company_name: 1, exchange: 1, sector: 1 }) // Exclude _id field
      .toArray();

    if (results.length === 0) {
      return res.status(404).json({ error: "Stock not found" });
    }

    res.json(results);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Route to get historical stock data for a specific ticker
router.post("/historical/:ticker", async (req, res) => {
  const { comparisonStocks, timeframeStartDate, timeframeEndDate  } = req.params;W

  if (!ticker) {
    return res.status(400).json({ error: "Ticker is required" });
  }

  try {
    const db = await connectToMongo();
    const historicalCollection = db.collection("stockHistoricalData");

    // Find historical data for the given ticker
    const stockHistory = await historicalCollection.findOne(
      { ticker: ticker.toUpperCase() },
      {
        projection: {
          _id: 0,
          ticker: 1,
          "historicalData.date": 1,
          "historicalData.open": 1,
          "historicalData.close": 1
        } 
      }
    );
    

    if (!stockHistory) {
      return res.status(404).json({ error: "Historical data not found" });
    }

    res.json(stockHistory);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



module.exports = router;
