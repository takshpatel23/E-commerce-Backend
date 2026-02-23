import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import reportsRoutes from "./routes/reportRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());

app.use(cors({
    origin: true,
    credentials: true
}));

app.use("/uploads", express.static("uploads"));

// MongoDB Connection Cache
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGO_URI);
    }

    cached.conn = await cached.promise;
    return cached.conn;
}

// Database middleware
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Database connection failed" });
    }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/notifications", notificationRoutes);

export default app;