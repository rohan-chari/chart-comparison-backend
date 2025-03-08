require('dotenv').config();
const express = require('express');
const stockRoutes = require("./stockRoutes");
const http = require('http');
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require("cors");


const server = http.createServer(app);

app.use("/stocks", stockRoutes);


// Middleware to parse JSON requests
app.use(express.json());
app.use(cors());
// Default route
app.get('/', (req, res) => {
  res.send('Hello, Node.js!');
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
