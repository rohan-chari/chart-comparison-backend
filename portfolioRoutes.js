const express = require("express");
const router = express.Router();
const connectToMongo = require("./connectToDb");
const { getStockPrice } = require("./helperFunctions");
const verifyToken = require("./middleware/authMiddleware");

router.post("/calculation", async (req, res) => {
  const { portfolioStocks, start, end, followedUsersPortfolios } = req.body;
  let [startMonth, startDay, startYear] = start.split("/");
  let [endMonth, endDay, endYear] = end.split("/");

  const chartStartDate = new Date(startYear, startMonth - 1, startDay);
  const chartEndDate = new Date(endYear, endMonth - 1, endDay);

  try {
    const db = await connectToMongo();
    const historicalCollection = db.collection("stockHistoricalData");

    const calculatePortfolioMetrics = async (stocks) => {
      let tickers = stocks.map(stock => stock.ticker.toUpperCase());
      let stockHistory = await historicalCollection.aggregate([
        {
          $match: { ticker: { $in: tickers } }
        },
        {
          $project: {
            _id: 0,
            ticker: 1,
            historicalData: {
              $filter: {
                input: "$historicalData",
                as: "data",
                cond: {
                  $and: [
                    { $gte: ["$$data.date", chartStartDate] },
                    { $lte: ["$$data.date", chartEndDate] }
                  ]
                }
              }
            }
          }
        },
        {
          $addFields: {
            sortedData: {
              $sortArray: { input: "$historicalData", sortBy: { date: 1 } }
            }
          }
        }
      ]).toArray();

      let initialValue = 0;
      let finalValue = 0;
      let historicalValueMap = {};

      for (const stock of stocks) {
        const ticker = stock.ticker.toUpperCase();
        const quantity = parseFloat(stock.quantity);

        const stockData = stockHistory.find(s => s.ticker === ticker);
        let sortedData = stockData?.sortedData || [];

        let startPrice = sortedData[0]?.close ?? null;
        let endPrice = sortedData[sortedData.length - 1]?.close ?? null;

        if (startPrice === null || endPrice === null) {
          startPrice = endPrice = await getStockPrice(ticker);
        }

        initialValue += quantity * startPrice;
        finalValue += quantity * endPrice;

        for (const dataPoint of sortedData) {
          let dateStr = dataPoint.date.toISOString();
          let stockValue = quantity * dataPoint.close;

          if (!historicalValueMap[dateStr]) {
            historicalValueMap[dateStr] = 0;
          }

          historicalValueMap[dateStr] += stockValue;
        }
      }

      let historicalData = Object.keys(historicalValueMap).map(date => ({
        date,
        percentChange: ((historicalValueMap[date] - initialValue) / initialValue) * 100
      }));

      historicalData.sort((a, b) => new Date(a.date) - new Date(b.date));

      return {
        portfolioValue: finalValue,
        historicalData,
        overallPercentChange: ((finalValue - initialValue) / initialValue) * 100
      };
    };

    // main user portfolio
    const userPortfolioMetrics = await calculatePortfolioMetrics(portfolioStocks);

    // followed users
    const followedUsersResults = [];
    for (const user of followedUsersPortfolios) {
      const metrics = await calculatePortfolioMetrics(user.portfolioStocks);
      followedUsersResults.push({
        userId: user._id,
        ...metrics
      });
    }

    res.json({
      portfolioValue: userPortfolioMetrics.portfolioValue,
      historicalData: userPortfolioMetrics.historicalData,
      overallPercentChange: userPortfolioMetrics.overallPercentChange,
      followedUsers: followedUsersResults
    });

  } catch (err) {
    console.error("Error: ", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/save-timeframe", verifyToken, async (req, res) => {
  const { startDate, endDate, userId } = req.body;

  try {
    const db = await connectToMongo();
    const userPortfolioCollection = db.collection("userPortfolios");
    const existingPortfolio = await userPortfolioCollection.findOne({ _id: userId });

    if (existingPortfolio) {
      // Update
      await userPortfolioCollection.updateOne(
        { _id: userId },
        { $set: { startDate, endDate } }
      );
    } else {
      // Create
      await userPortfolioCollection.insertOne({
        _id: userId,
        startDate,
        endDate
      });
    }

    res.status(200).json({ message: "Timeframe saved successfully" });
  } catch (err) {
    console.error("Error saving timeframe:", err);
    res.status(500).json({ error: `Error saving timeframe: ${err.message}` });
  }
});

router.post("/save-stocks", verifyToken, async (req, res) => {
  const { userId, portfolioStocks } = req.body;

  try {
    const db = await connectToMongo();
    const userPortfolioCollection = db.collection("userPortfolios");
    const existingPortfolio = await userPortfolioCollection.findOne({ _id: userId });
    if (existingPortfolio) {
      await userPortfolioCollection.updateOne(
        { _id: userId },
        { $set: { portfolioStocks } }
      );
    } else {
      // Create
      await userPortfolioCollection.insertOne({
        _id: userId,
        portfolioStocks
      });
    }

    res.status(200).json({ message: "Stocks saved successfully" });
  } catch (err) {
    console.error("Error saving timeframe:", err);
    res.status(500).json({ error: `Error saving timeframe: ${err.message}` });
  }
});

router.post("/save-comparison-stocks", verifyToken, async (req, res) => {
  const { comparisonStocks, userId } = req.body;

  try {
    const db = await connectToMongo();
    const userPortfolioCollection = db.collection("userPortfolios");
    const existingPortfolio = await userPortfolioCollection.findOne({ _id: userId });
    if (existingPortfolio) {
      await userPortfolioCollection.updateOne(
        { _id: userId },
        { $set: { comparisonStocks } }
      );
    } else {
      // Create
      await userPortfolioCollection.insertOne({
        _id: userId,
        comparisonStocks
      });
    }

    res.status(200).json({ message: "Comparison stocks saved successfully" });
  } catch (err) {
    console.error("Error saving timeframe:", err);
    res.status(500).json({ error: `Error saving comparison stocks: ${err.message}` });
  }
});


router.get("/get-portfolio", verifyToken, async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const db = await connectToMongo();
    const portfoliosCollection = db.collection("userPortfolios");

    const portfolio = await portfoliosCollection.findOne({ _id: userId });

    if (!portfolio) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    portfolio.followedUserPortfolios = [];

    if (Array.isArray(portfolio.followedUsers) && portfolio.followedUsers.length > 0) {
      const checkedFollowedUsers = portfolio.followedUsers.filter(p => p.checked);

      for (const fp of checkedFollowedUsers) {
        const tempPortfolio = await portfoliosCollection.findOne({ _id: fp.followedUserUserId });

        portfolio.followedUserPortfolios.push({
          _id: fp.followedUserUserId,
          portfolioStocks: tempPortfolio?.portfolioStocks || []
        });
      }
    }

    res.json(portfolio);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post("/save-followed-user", verifyToken, async (req, res) => {
  const { followedUsers, userId } = req.body;

  try {
    const db = await connectToMongo();
    if(followedUsers.map(fu => fu.followedUserUserId).includes(userId)){
      return res.status(500).json({error:"Cannot follow yourself"})
    }
    const userPortfolioCollection = db.collection("userPortfolios");
    const existingPortfolio = await userPortfolioCollection.findOne({ _id: userId });
    if (existingPortfolio) {
      await userPortfolioCollection.updateOne(
        { _id: userId },
        { $set: { followedUsers } }
      );
    } else {
      await userPortfolioCollection.insertOne({
        _id: userId,
        comparisonStocks
      });
    }

    res.status(200).json({ message: "Followed User saved successfully" });
  } catch (err) {
    res.status(500).json({ error: `Error saving followed user: ${err.message}` });
  }
});

router.post("/update-followed-user", verifyToken, async (req, res) => {
  const { followedUser, userId } = req.body;

  try {
    const db = await connectToMongo();
    const userPortfolioCollection = db.collection("userPortfolios");
    const existingPortfolio = await userPortfolioCollection.findOne({ _id: userId });
    if (existingPortfolio) {
      await userPortfolioCollection.findOneAndUpdate(
        {
          _id: userId,
          "followedUsers.followedUserId": followedUser.followedUserId
        },
        {
          $set: {
            "followedUsers.$": followedUser
          }
        },
      );
    } else {
      res.status(500).json({error:`Portfolio does not exist`})
    }

    res.status(200).json({message:"Successfully updated followed user."})
  } catch (err) {
    res.status(500).json({ error: `Error updating followed user: ${err.message}` });
  }
});


module.exports = router;
