import express from "express";
import mongoose from "mongoose";
import slugify from "slugify";
import Category from "../models/Category.js";
import Product from "../models/Product.js";

const router = express.Router();

// ================= CREATE CATEGORY =================
router.post("/", async (req, res) => {
  try {
    const { name, description, image, isFeatured, parent } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Category name required" });
    }

    let parentCategory = null;

    // Validate Parent
    if (parent) {
      if (!mongoose.Types.ObjectId.isValid(parent)) {
        return res.status(400).json({ message: "Invalid parent ID" });
      }
      parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(404).json({ message: "Parent category not found" });
      }
      // Strict 2-level limit: prevents nesting a sub-category inside another sub-category
      if (parentCategory.parent) {
        return res.status(400).json({ message: "Architecture Error: Only 2-level depth allowed (Main > Sub)" });
      }
    }

    // Check Duplicate within the same parent scope
    const exists = await Category.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
      parent: parent || null
    });

    if (exists) {
      return res.status(400).json({ message: "Conflict: This category label already exists at this level" });
    }

    const category = await Category.create({
      name: name.trim(),
      description,
      image,
      isFeatured: isFeatured || false,
      parent: parent || null,
      // Slug is usually handled by a pre-save hook in the model, 
      // but we can explicitly set it here if your model doesn't handle it
      slug: slugify(name, { lower: true, strict: true })
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= GET ALL (Clean Nested Structure) =================
router.get("/", async (req, res) => {
  try {
    // Fetch all active categories
    const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();

    // Separate Root (Main) categories
    const mainCategories = categories.filter(cat => !cat.parent);
    
    // Build the tree structure manually
    const structured = mainCategories.map(main => ({
      ...main,
      subCategories: categories.filter(
        sub => sub.parent?.toString() === main._id.toString()
      ),
    }));

    res.json(structured);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= UPDATE (Return After Fix) =================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    // Auto-update slug if name is modified
    if (updateData.name) {
      updateData.slug = slugify(updateData.name, { lower: true, strict: true });
    }

    // CLEANUP: Ensure parent is null if empty string is passed
    if (updateData.parent === "") {
      updateData.parent = null;
    }

    const updatedCategory = await Category.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      // FIXED: Replaced 'new: true' with 'returnDocument: "after"' to resolve Mongoose warning
      { returnDocument: "after", runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found in database" });
    }

    res.json(updatedCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= DELETE (Atomic Cleanup) =================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Target category not found" });

    // Scenario A: Deleting a MAIN category (Cascading Delete)
    if (!category.parent) {
      const subCategories = await Category.find({ parent: id });
      const subIds = subCategories.map(s => s._id);

      // Wipe products from all sub-categories
      await Product.deleteMany({ category: { $in: subIds } });
      // Wipe the sub-categories themselves
      await Category.deleteMany({ parent: id });
    }

    // Scenario B: Deleting a SUB category (Direct Delete)
    // Wipe products belonging specifically to this ID
    await Product.deleteMany({ category: id });

    // Finalize the deletion of the category itself
    await category.deleteOne();

    res.json({ message: "Entity and all associated dependencies successfully purged." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;