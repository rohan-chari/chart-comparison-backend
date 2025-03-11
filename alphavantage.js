require("dotenv").config();
const axios = require("axios");
const { MongoClient } = require("mongodb");

const API_KEY = process.env.ALPHAVANTAGE_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const TICKER = "QQQ"; // Fetching historical data for SPY

async function fetchHistoricalData() {
    try {
        console.log(`Fetching historical data for ${TICKER}...`);

        const response = await axios.get("https://www.alphavantage.co/query", {
            params: {
                function: "TIME_SERIES_DAILY",
                symbol: TICKER,
                outputsize: "full",
                apikey: API_KEY
            }
        });

        if (!response.data || !response.data["Time Series (Daily)"]) {
            throw new Error("Invalid response from Alpha Vantage");
        }

        const timeSeries = response.data["Time Series (Daily)"];

        // Transform the data into a structured format
        const historicalData = Object.entries(timeSeries).map(([date, values]) => ({
            date: new Date(date),
            open: parseFloat(values["1. open"]),
            high: parseFloat(values["2. high"]),
            low: parseFloat(values["3. low"]),
            close: parseFloat(values["4. close"]),
            adjusted_close: parseFloat(values["5. adjusted close"]),
            volume: parseInt(values["6. volume"])
        }));

        console.log(`Fetched ${historicalData.length} records. Now storing in MongoDB...`);
        await storeDataInMongo(historicalData);
    } catch (error) {
        console.error("Error fetching stock data:", error.message);
    }
}

async function storeDataInMongo(historicalData) {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        const db = client.db("stock-charts"); // Replace with your actual DB name
        const collection = db.collection("stockHistoricalData");

        // Store data with ticker as the key
        await collection.updateOne(
            { ticker: TICKER }, // Match the document with the ticker
            { $set: { ticker: TICKER, historicalData } }, // Update or insert data
            { upsert: true } // If no record exists, insert it
        );

        console.log(`Historical data for ${TICKER} stored successfully.`);
    } catch (error) {
        console.error("Error storing data in MongoDB:", error.message);
    } finally {
        await client.close();
    }
}

// Run the script
fetchHistoricalData();
