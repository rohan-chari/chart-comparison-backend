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

router.get("/get-user-by-username/:username", async (req, res) => {
    try {
      const db = await connectToMongo();
      const userCollection = db.collection("users");
  
      const { username } = req.params;
      if (!username) {
        return res.status(400).json({ error: "Username not provided" });
      }
  
      const users = await userCollection
        .find({ displayName: { $regex: username, $options: 'i' } })
        .project({ displayName: 1 }) 
        .limit(50) 
        .toArray();
  
      const formatted = users.map(user => ({
        userId: user._id,
        username: user.displayName
      }));
  
      return res.json(formatted);
    } catch (error) {
      console.error("❌ Error fetching user display name:", error);
      res.status(500).json({ error: "Server error" });
    }
});
  

module.exports = router;
