require('dotenv').config();
const fetch = require('node-fetch'); 

async function fetchHistoricalData(symbol) {
    try {
        const encodedSymbol = encodeURIComponent(symbol); 
        const url = `https://data.alpaca.markets/v2/stocks/bars?symbols=${encodedSymbol}&timeframe=1Day&start=2000-01-01T00%3A00%3A00Z&limit=10000&adjustment=raw&feed=sip&sort=desc`;

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
        return json;
    } catch (error) {
        console.error("Error fetching historical data:", error);
        return null; 
    }
}

(async () => {
    const data = await fetchHistoricalData('AAPL');
    console.log(JSON.stringify(data, null, 2)); 
})();
