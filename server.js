require('dotenv').config();
const express = require('express');
const stockRoutes = require("./stockRoutes");
const chartRoutes = require("./chartRoutes");
const portfolioRoutes = require("./portfolioRoutes");
const authRoutes = require("./authRoutes")
const userRoutes = require("./userRoutes")

const admin = require("./firebase"); 


const http = require('http');
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require("cors");


app.use(express.json());
app.use(cors());

const server = http.createServer(app);

app.use("/stocks", stockRoutes);
app.use("/chart", chartRoutes);
app.use("/portfolio", portfolioRoutes);
app.use("/auth",authRoutes)
app.use("/user",userRoutes)



server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
