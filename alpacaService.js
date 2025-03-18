require('dotenv').config();
const connectToMongo = require("./connectToDb");

async function fetchHistoricalData(symbol) {
    try {
        if(!symbol || symbol.length == 0 ){
            console.log("No need to fetch dates.")
            return;
        }
        const encodedSymbol = encodeURIComponent(symbol); 
        start = new Date('01/01/2000')
        start.setUTCHours(0,0,0,0)
        const url = `https://data.alpaca.markets/v2/stocks/bars?symbols=${encodedSymbol}&timeframe=1Day&start=${start.toISOString()}&limit=10000&adjustment=raw&feed=sip&sort=desc`;

        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
                'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET
            }
        };

        const response = await fetch(url, options);
        if (!response.ok) {
            const errorMessage = await response.text(); 
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorMessage}`);
        }

        const json = await response.json();
        await storeStockData(json);
        return json;
    } catch (error) {
        console.error("Error fetching historical data:", error);
        return null; 
    }
}

async function checkWhichStocksToFetch(tickers) {
    try {
        const db = await connectToMongo();
        const stockHistoryCollection = db.collection("stockHistoricalData");

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const tickersToFetch = [];

        for (const ticker of tickers) {
            const stock = await stockHistoryCollection.findOne({ ticker });

            if (!stock || !stock.updatedDate || new Date(stock.updatedDate) < oneHourAgo) {
                tickersToFetch.push(ticker);
            }
        }

        return tickersToFetch;
    } catch (err) {
        console.error("Error checking which stocks to fetch:", err);
        return [];
    }
}

async function storeStockData(json) {
    const db = await connectToMongo();
    const collection = db.collection("stockHistoricalData");
    try {
        for (const ticker in json.bars) {
            const historicalData = json.bars[ticker].map(bar => ({
                date: new Date(new Date(bar.t).setUTCHours(0, 0, 0, 0)),
                open: bar.o,   // Open price
                high: bar.h,   // High price
                low: bar.l,    // Low price
                close: bar.c   // Close price
            }));

            await collection.updateOne(
                { ticker: ticker },
                { 
                    $set: { ticker: ticker, updatedDate: new Date() },
                    $addToSet: { 
                        historicalData: { 
                            $each: historicalData 
                        } 
                    } 
                },
                { upsert: true }
            );
            

            console.log(`Stored historical data for ${ticker}`);
        }
    } catch (error) {
        console.error("Error storing stock data in MongoDB:", error.message);
    } finally {
        await db.client.close(); // Close connection
    }
}




module.exports = {
    fetchHistoricalData,
    checkWhichStocksToFetch
};
