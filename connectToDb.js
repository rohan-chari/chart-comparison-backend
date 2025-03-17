require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
let client;
let db;

async function connectToMongo() {
    if (!client) {
        client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000, 
            maxPoolSize: 10,
        });

        try {
            await client.connect();
            console.log("Connected to MongoDB cluster.");
            db = client.db("stock-charts");

            // Handle unexpected disconnects
            client.on('close', () => {
                console.warn("MongoDB connection lost. Reconnecting...");
                client = null; // Reset client instance
            });

        } catch (error) {
            console.error("MongoDB connection error:", error);
            throw error;
        }
    }
    
    return db;
}

// Gracefully close the connection on app termination
process.on("SIGINT", async () => {
    if (client) {
        await client.close();
        console.log("MongoDB connection closed.");
    }
    process.exit(0);
});

module.exports = connectToMongo;
