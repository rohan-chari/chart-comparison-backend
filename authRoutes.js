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

        const { displayName, uid, email, emailVerified, providerData, createdAt, lastLoginAt } = req.body.user;
        if(!displayName || !req.body.user){
            return res.status(400).json({ error: "Missing email or display name" });

        }
        let user = await userCollection.findOne({ _id: uid });
        if (!user) {
            user = {
                _id: uid,
                displayName: displayName,
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

router.post("/existing-user", async (req, res) => {
    try {
        const db = await connectToMongo();
        const userCollection = db.collection("users"); 

        const { email, displayName } = req.body;
        let existingEmail = await userCollection.findOne({ email: email });
        let existingDisplayName = await userCollection.findOne({ displayName: displayName });

        if(existingEmail && existingDisplayName){
            return res.status(400).json({message: "Email and Username are taken.", canRegister: false})
        }
        if(existingEmail){
            return res.status(400).json({message: "Email is taken.", canRegister: false})
        }
        if(existingDisplayName){
            return res.status(400).json({message: "Username is taken.", canRegister: false})
        }
        
        return res.status(200).json({canRegister: true, message: "Successfully Registered!"})
    } catch (error) {
        console.error("❌ Error registering user:", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
