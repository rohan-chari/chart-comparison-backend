require("dotenv").config();
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;

async function fetchStocks() {
    const url = 'https://api.alpaca.markets/v2/assets?attributes=';

    const options = {
        method: "GET",
        headers: {
            accept: "application/json",
            "APCA-API-KEY-ID": process.env.ALPACA_API_KEY,
            "APCA-API-SECRET-KEY": process.env.ALPACA_API_SECRET
        }
    };

    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Error fetching stocks: ${response.statusText}`);

    const stocks = await response.json();

    // Filter for active and tradable stocks
    return stocks.filter(stock => stock.status === "active" && stock.tradable);
}

async function storeStocksInMongo(stocks) {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db("stock-charts");
        const collection = db.collection("stocks");

        // Transform and upsert each stock into MongoDB
        for (const stock of stocks) {
            if(stock.status == 'active'){
                console.log(stock)
                const stockData = {
                    ticker: stock.symbol,
                    company_name: stock.name || stock.symbol,
                    exchange: stock.exchange,
                    createdAt: new Date()
                };
    
                await collection.updateOne(
                    { ticker: stock.symbol }, // Match the document with the ticker
                    { $set: stockData }, // Update or insert data
                    { upsert: true } // Insert if no record exists
                );
                console.log(`adding: ${stockData.company_name}`)
            }

        }

        console.log(`Stored ${stocks.length} tradable stocks in MongoDB.`);
    } catch (error) {
        console.error("Error storing stocks in MongoDB:", error.message);
    } finally {
        await client.close();
    }
}

// Run the process
async function main() {
    try {
        console.log("Fetching Alpaca stocks...");
        const stocks = await fetchStocks();
        console.log(`Fetched ${stocks.length} tradable stocks.`);
        await storeStocksInMongo(stocks);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

main();
