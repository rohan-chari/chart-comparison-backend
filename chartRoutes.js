const express = require("express");
const router = express.Router();
const connectToMongo = require("./connectToDb");

router.post("/historical", async (req, res) => {
  const { comparisonStocks, timeframeStartDate, timeframeEndDate } = req.body;
  let stocks = [];
  let [startMonth, startDay, startYear] = timeframeStartDate.split("/");
  let [endMonth, endDay, endYear] = timeframeEndDate.split("/");

  const chartStartDate = new Date(startYear, startMonth - 1, startDay);
  const chartEndDate = new Date(endYear, endMonth - 1, endDay);
  if(comparisonStocks){
    for (const ticker of comparisonStocks) {
      if (ticker.value) {
        stocks.push(ticker.ticker);
      }
    }
  }


  try {
    const db = await connectToMongo();
    const historicalCollection = db.collection("stockHistoricalData");

    const stockHistory = await historicalCollection.aggregate([
      {
        $match: { ticker: { $in: stocks.map(t => t.toUpperCase()) } }
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
      },
      {
        $addFields: {
          sortedData: {
            $sortArray: { input: "$historicalData", sortBy: { date: 1 } }
          }
        }
      },
      {
        $addFields: {
          firstPrice: { $arrayElemAt: ["$sortedData.close", 0] }
        }
      },
      {
        $project: {
          ticker: 1,
          historicalData: {
            $map: {
              input: "$sortedData",
              as: "data",
              in: {
                date: "$$data.date",
                percentChange: {
                  $multiply: [
                    {
                      $divide: [
                        { $subtract: ["$$data.close", "$firstPrice"] },
                        "$firstPrice"
                      ]
                    },
                    100
                  ]
                }
              }
            }
          }
        }
      }
    ]).toArray();

    res.json(stockHistory);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
