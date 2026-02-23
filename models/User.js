import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  phone: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  country: {
    type: String,
    default: "India",
  },

  profileImage: {
    type: String,
    default: "",
  },
  wishlist: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
  }
]
},
{ timestamps: true }
);

export default mongoose.model("User", userSchema);
