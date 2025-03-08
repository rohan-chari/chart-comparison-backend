require('dotenv').config();
const axios = require('axios');
const db = require('./connectToDb');

async function populateStocksInDb() {
    try {
        console.log("Fetching all stocks from Finnhub...");

        // Fetch stock symbols from Finnhub (Example: US Market)
        const response = await axios.get(`https://finnhub.io/api/v1/stock/symbol`, {
            params: {
                exchange: 'US', // Change to "US", "NASDAQ", "NYSE", etc.
                token: process.env.FINNHUB_API_KEY
            }
        });

        const stocks = response.data;

        for (const stock of stocks) {
            const { symbol: ticker, description: company_name, type: stock_type } = stock;

            // Ensure we only insert common stocks
            if (stock_type !== "Common Stock") continue;

            // Check if stock already exists
            const [existing] = await db.query("SELECT 1 FROM stocks WHERE ticker = ?", [ticker]);

            if (existing.length === 0) {
                // Insert stock into database
                await db.query(
                    "INSERT INTO stocks (ticker, company_name, exchange) VALUES (?, ?, ?)",
                    [ticker, company_name, "US"]
                );
                console.log(`Added stock: ${ticker} - ${company_name}`);
            } else {
                console.log(`Stock ${ticker} already exists.`);
            }
        }

        console.log("All stocks updated successfully!");
    } catch (error) {
        console.error("Error fetching or inserting stocks:", error.message);
    } finally {
        process.exit();
    }
}

// Run the function
populateStocksInDb();
