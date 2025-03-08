const express = require("express");
const router = express.Router();
const db = require("./connectToDb");

// Route to get stock details by ticker or company name
router.get("/", async (req, res) => {
  const { stockInfo } = req.query;

  if (!stockInfo) {
    return res.status(400).json({ error: "Ticker or company name is required" });
  }

  try {
    // Use wildcards for partial matches
    const searchQuery = `%${stockInfo}%`;

    const [results] = await db.query(
      "SELECT ticker, company_name, exchange, sector FROM stocks WHERE ticker = ? OR company_name LIKE ?",
      [stockInfo.toUpperCase(), searchQuery]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: "Stock not found" });
    }

    res.json(results); // Return all matching results
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
