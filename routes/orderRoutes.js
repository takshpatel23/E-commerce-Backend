import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ================= CREATE NEW ORDER =================

router.post("/", protect, async (req, res) => {
    try {
        const { items, subtotal, gst, total, paymentMethod } = req.body;

        if (!items || items.length === 0)
            return res.status(400).json({ message: "Cart is empty" });

        // Check stock
        for (let item of items) {
            const product = await Product.findById(item.product);
            if (!product)
                return res.status(404).json({ message: "Product not found" });

            const sizeObj = product.sizes.find(
                s => s.size === item.selectedSize
            );

            if (!sizeObj || sizeObj.quantity < item.quantity)
                return res.status(400).json({
                    message: `${product.name} stock insufficient`
                });
        }

        const newOrder = await Order.create({
            user: req.user._id,
            userName: req.user.name,
            userEmail: req.user.email,
            items,
            subtotal,
            gst,
            total,
            paymentMethod,
        });

        // Reduce stock
        for (let item of items) {
            const product = await Product.findById(item.product);
            const sizeObj = product.sizes.find(
                s => s.size === item.selectedSize
            );

            if (sizeObj) {
                sizeObj.quantity -= item.quantity;
                await product.save();
            }
        }

        res.status(201).json(newOrder);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// ================= UPDATE ORDER STATUS (ADMIN ONLY) =================
router.put("/:id/status", protect, async (req, res) => {
    try {
        // Only admin can update status
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        const previousStatus = order.status;
        const newStatus = req.body.status; // "Completed" or "Cancelled"
        order.status = newStatus;

        // If status changed to Cancelled and it was NOT previously cancelled
        if (newStatus === "Cancelled" && previousStatus !== "Cancelled") {
            for (let item of order.items) {
                const product = await Product.findById(item.product);
                if (!product) continue;

                // Restore stock for the selected size
                const sizeObj = product.sizes.find(s => s.size === item.selectedSize);
                if (sizeObj) {
                    sizeObj.quantity += item.quantity;
                } else {
                    // Optional: if size not found, add a new size entry
                    product.sizes.push({ size: item.selectedSize, quantity: item.quantity });
                }

                await product.save();
            }
        }

        await order.save();
        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
// ================= GET PENDING ORDER COUNT (ADMIN) =================
router.get("/pending/count", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const count = await Order.countDocuments({ status: "Pending" });
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


// ================= GET ALL ORDERS (ADMIN ONLY) =================
router.get("/", protect, async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Access denied" });

        const orders = await Order.find()
            .sort({ createdAt: -1 })   // 🔥 newest first
            .populate("user", "name email");

        res.json(orders);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/myorders", protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
