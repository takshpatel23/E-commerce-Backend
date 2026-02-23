import express from "express";
import mongoose from "mongoose";
import slugify from "slugify"; // Ensure this is installed
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ================= GET ALL PRODUCTS =================
router.get("/", async (req, res) => {
  try {
    const products = await Product.find()
      .populate({
        path: "category",            // populate category
        select: "name parent slug",  // select only needed fields
        populate: {
          path: "parent",            // populate parent inside category
          select: "name slug"
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ================= GET SINGLE PRODUCT =================
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(req.params.id)
      .populate({
        path: "category",
        select: "name parent slug",
        populate: { path: "parent", select: "name slug" }
      });

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ================= CREATE =================
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { name, price, category, description, image, sizes } = req.body;

    // Basic Validation
    if (!name || price === undefined || !category || !image || image.length === 0) {
      return res.status(400).json({
        message: "Missing required fields: Name, price, category, and images are mandatory."
      });
    }

    // Category Validation
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: "The selected category does not exist" });
    }

    // Size Normalization
    const validatedSizes = Array.isArray(sizes)
      ? sizes
          .filter(s => s.size && s.quantity != null)
          .map(s => ({
            size: s.size.toUpperCase(),
            quantity: Number(s.quantity),
          }))
      : [];

    const product = await Product.create({
      name,
      slug: slugify(name, { lower: true, strict: true }), // Generate SEO-friendly slug
      price: Number(price),
      category,
      description,
      image,
      sizes: validatedSizes
    });

    res.status(201).json(product);

  } catch (err) {
    console.error("CREATE_PRODUCT_ERROR:", err);
    res.status(500).json({
      message: "Error creating product",
      error: err.message
    });
  }
});

// ================= UPDATE =================
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const { name, price, category, description, image, sizes } = req.body;
    const updateData = { ...req.body };

    // Update slug if name changes
    if (name) {
      updateData.slug = slugify(name, { lower: true, strict: true });
    }

    // Force number types
    if (price !== undefined) updateData.price = Number(price);

    // Validate category if being changed
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ message: "Invalid category ID format" });
      }
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ message: "The new category selected is invalid" });
      }
    }

    // Process sizes
    if (Array.isArray(sizes)) {
      updateData.sizes = sizes
        .filter(s => s.size && s.quantity != null)
        .map(s => ({
          size: s.size.toUpperCase(),
          quantity: Number(s.quantity),
        }));
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      // FIXED: Replaced { new: true } with { returnDocument: "after" }
      { returnDocument: "after", runValidators: true }
    ).populate("category", "name slug parent");

    if (!updated)
      return res.status(404).json({ message: "Product not found to update" });

    res.status(200).json(updated);

  } catch (err) {
    res.status(500).json({
      message: "Error updating product",
      error: err.message
    });
  }
});

// ================= DELETE =================
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const deleted = await Product.findByIdAndDelete(req.params.id);

    if (!deleted)
      return res.status(404).json({ message: "Product not found" });

    res.status(200).json({ message: "Product permanently removed from inventory" });

  } catch (err) {
    res.status(500).json({
      message: "Error deleting product",
      error: err.message
    });
  }
});

export default router;