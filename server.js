require('dotenv').config();
const express = require('express');
const stockRoutes = require("./stockRoutes");
const chartRoutes = require("./chartRoutes");
const http = require('http');
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require("cors");


app.use(express.json());
app.use(cors());

const server = http.createServer(app);

app.use("/stocks", stockRoutes);
app.use("/chart", chartRoutes);



server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
