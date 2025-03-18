const express = require("express");
const verifyToken = require("./middleware/authMiddleware");
const connectToMongo = require("./connectToDb");

const router = express.Router();

/**
 * 🔹 Register User (Runs only on first login)
 */
router.post("/register", verifyToken, async (req, res) => {
    try {
        const db = await connectToMongo();
        const userCollection = db.collection("users"); 

        const { uid, email, emailVerified, providerData, createdAt, lastLoginAt } = req.body.user;
        let user = await userCollection.findOne({ _id: uid });
        if (!user) {
            user = {
                _id: uid,
                email,
                emailVerified,
                createdAt: createdAt,
                lastLoginAt: lastLoginAt,
                provider: providerData[0]?.providerId || "unknown"
            };

            await userCollection.insertOne(user); 
        }

        res.json({ message: "User registered successfully", user });
    } catch (error) {
        console.error("❌ Error registering user:", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
