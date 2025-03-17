const express = require("express");
const router = express.Router();
const connectToMongo = require("./connectToDb");
const { checkWhichStocksToFetch, fetchHistoricalData } = require("./alpacaService");

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
router.get("/historical", async (req, res) => {
  const { tickers, start,end  } = req.query;

  if (!tickers) {
    return res.status(400).json({ error: "Ticker is required" });
  }

  try {
    const tickerList = tickers.split(",")
    const tickersToFetch = await checkWhichStocksToFetch(tickerList)
    const data = await fetchHistoricalData(tickersToFetch,start,end)



    res.json({meow: 'asl;kdhjasdlkahs'});
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



module.exports = router;
