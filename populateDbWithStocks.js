require('dotenv').config();
const axios = require('axios');
const connectToMongo = require('./connectToDb');

async function populateStocksInDb() {
    const db = await connectToMongo();
    const stocksCollection = db.collection("stocks"); // MongoDB collection for stocks

    try {
        console.log("Fetching all stocks from Finnhub...");

        // Fetch stock symbols from Finnhub (Example: US Market)
        const response = await axios.get(`https://finnhub.io/api/v1/stock/symbol`, {
            params: {
                exchange: 'US', // Change as needed
                token: process.env.FINNHUB_API_KEY
            }
        });

        const stocks = response.data;

        for (const stock of stocks) {
            const { symbol: ticker, description: company_name, type: stock_type } = stock;

            // Ensure we only insert common stocks
            if (stock_type !== "Common Stock") continue;

            // Check if stock already exists
            const existingStock = await stocksCollection.findOne({ ticker });

            if (!existingStock) {
                // Insert stock into MongoDB
                await stocksCollection.insertOne({
                    ticker,
                    company_name,
                    exchange: "US",
                    created_at: new Date()
                });
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
