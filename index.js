import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "../Backend/routes/authRoutes.js";
import productRoutes from "../Backend/routes/productRoutes.js";
import userRoutes from "../Backend/routes/userRoutes.js";
import orderRoutes from "../Backend/routes/orderRoutes.js";
import reportsRoutes from "../Backend/routes/reportRoutes.js";
import notificationRoutes from "../Backend/routes/notificationRoutes.js";
import categoryRoutes from "../Backend/routes/categoryRoutes.js";

dotenv.config();

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(cors()); // Vercel ma localhost restrict na rakhu

app.use("/uploads", express.static("uploads"));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/notifications", notificationRoutes);

// ✅ MongoDB Connect (Important Fix For Serverless)
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  const db = await mongoose.connect(process.env.MONGO_URI);
  isConnected = db.connections[0].readyState;
};

app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// ❌ REMOVE THIS
// app.listen(PORT)

// ✅ Export for Vercel
export default app;