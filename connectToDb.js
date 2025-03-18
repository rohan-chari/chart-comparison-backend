require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI; 
const client = new MongoClient(uri);

async function connectToMongo() {
    try {
        await client.connect();
        console.log("Connected to MongoDB cluster.");
        return client.db("stock-charts"); 
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
}

module.exports = connectToMongo;