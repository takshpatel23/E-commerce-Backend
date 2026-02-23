import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import sharp from "sharp";
import fs from "fs";
import path from "path";
const router = express.Router();

// GET USER PROFILE
router.get("/profile", protect, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
});
router.get("/data", protect, async (req, res) => {
  try {
    // Fetch only users with role 'user'
    const users = await User.find({ role: "user" }).select("-password"); 
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});
// UPDATE USER PROFILE
router.put(
  "/profile",
  protect,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { name, phone, address, city, state, pincode, country } = req.body;

      user.name = name || user.name;
      user.phone = phone;
      user.address = address;
      user.city = city;
      user.state = state;
      user.pincode = pincode;
      user.country = country;

      if (req.file) {
        const inputPath = req.file.path;
        const outputFileName = Date.now() + ".jpg";
        const outputPath = path.join("uploads", outputFileName);

        // 🔥 Convert to JPG
        await sharp(inputPath)
          .jpeg({ quality: 90 })
          .toFile(outputPath);

        // Delete original file
        fs.unlinkSync(inputPath);

        user.profileImage = `/uploads/${outputFileName}`;
      }

      await user.save();
      res.json(user);

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);


router.put("/wishlist/:productId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { productId } = req.params;

    if (user.wishlist.includes(productId)) {
      // Remove from wishlist
      user.wishlist = user.wishlist.filter(p => p.toString() !== productId);
    } else {
      // Add to wishlist
      user.wishlist.push(productId);
    }

    await user.save();
    res.status(200).json({ wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET wishlist products
router.get("/wishlist", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("wishlist");
    res.status(200).json(user.wishlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// 🔥 UPLOAD PROFILE IMAGE
router.put(
  "/profile/image",
  protect,
  upload.single("image"),
  async (req, res) => {
    const user = await User.findById(req.user.id);

    if (user) {
      user.profileImage = `/uploads/${req.file.filename}`;
      await user.save();
      res.json({ message: "Image uploaded", image: user.profileImage });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  }
);


export default router;
