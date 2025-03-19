const express = require("express");
const verifyToken = require("./middleware/authMiddleware");
const connectToMongo = require("./connectToDb");

const router = express.Router();


router.get("/get-display-name/:userId", async (req, res) => {
    try {
        const db = await connectToMongo();
        const userCollection = db.collection("users"); 

        const { userId } = req.params;
        if(!userId){
            return res.status(400).json({ error: "User ID not provided" });
        }
        let user = await userCollection.findOne({ _id: userId });
        return res.json({displayName: user.displayName})
    } catch (error) {
        console.error("❌ Error fetching user display name:", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
