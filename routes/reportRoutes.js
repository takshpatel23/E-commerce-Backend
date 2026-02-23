import express from "express";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/advanced-stats", protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // Top 5 Products Aggregation
    const topProducts = await Order.aggregate([
      { $match: { status: "Completed" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" }, // Assumes item name is stored in order
          count: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    // 1. Revenue Segmentation (Completed vs Cancelled vs Total)
    const revenueMetrics = await Order.aggregate([
      {
        $group: {
          _id: null,
          completedRevenue: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, "$total", 0] } },
          lostRevenue: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, "$total", 0] } },
          totalPotential: { $sum: "$total" },
          approvedCount: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
          rejectedCount: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } }
        }
      }
    ]);

    // 2. Daily Revenue for Current Month
    const dailyStats = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: "Completed" } },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          revenue: { $sum: "$total" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 3. Monthly Revenue for the Year
    const monthlyStats = await Order.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$total" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json({
      metrics: revenueMetrics[0] || {},
      daily: dailyStats.map(d => ({ day: `Day ${d._id}`, revenue: d.revenue })),
      monthly: monthlyStats.map(m => ({ 
        month: new Date(0, m._id - 1).toLocaleString('en-US', { month: 'short' }), 
        revenue: m.revenue 

      })),
      topProducts
      
    });
  } catch (error) {
    res.status(500).json({ message: "Analytics Hub Error" });
  }
});
export default router;