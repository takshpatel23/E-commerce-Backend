import mongoose from "mongoose";
import slugify from "slugify";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    // Reference to the parent category
    // If null = Top Level (Men, Women, Kids)
    // If ID = Sub-category (T-shirts, Dresses, etc.)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    description: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    bannerImage: {
      type: String,
      default: "",
    },

    metaTitle: {
      type: String,
      default: "",
    },

    metaDescription: {
      type: String,
      default: "",
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { 
    timestamps: true,
    // Allows us to see virtuals when converting to JSON
    toJSON: { virtuals: true },
    toObject: { virtuals: true } 
  }
);

// --- VIRTUALS ---
// This allows you to call .populate('children') in your controller
categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});



// --- MIDDLEWARE ---
// Auto generate slug before save
categorySchema.pre("save", async function () {
  if (this.isModified("name")) {
    let baseSlug = slugify(this.name, { lower: true, strict: true });
    
    // Logic to handle duplicate slugs (e.g., "Jeans" in Men and "Jeans" in Women)
    // We check if the slug already exists
    const Category = mongoose.model("Category");
    const existingCount = await Category.countDocuments({ 
      slug: baseSlug, 
      _id: { $ne: this._id } 
    });

    if (existingCount > 0) {
      this.slug = `${baseSlug}-${Math.floor(Math.random() * 1000)}`;
    } else {
      this.slug = baseSlug;
    }
  }
  
});

// Middleware to prevent a category from being its own parent
categorySchema.pre("findOneAndUpdate", function() {
    const update = this.getUpdate();
    if (update.parent && update.parent.toString() === this.getQuery()._id.toString()) {
        return next(new Error("A category cannot be its own parent."));
    }
    
});

const Category = mongoose.model("Category", categorySchema);

export default Category;