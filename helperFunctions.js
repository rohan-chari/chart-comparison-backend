const connectToMongo = require("./connectToDb");

async function getStockPrice(ticker){
    const db = await connectToMongo();

    const historicalCollection = db.collection("stockHistoricalData");
    const stockData = await historicalCollection.find({ ticker: ticker }).toArray();
    return stockData[0].historicalData[0].close;

}

module.exports = {getStockPrice}