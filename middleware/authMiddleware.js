const admin = require("firebase-admin");

async function verifyToken(req, res, next) {
    try {
        const token = req.headers.authorization?.split(" ")[1]; 
        if (!token) return res.status(401).json({ error: "Unauthorized: No token provided" });

        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken; 
        next(); 
    } catch (error) {
        console.error("Token verification failed:", error);
        res.status(403).json({ error: "Invalid or expired token" });
    }
}

module.exports = verifyToken;
