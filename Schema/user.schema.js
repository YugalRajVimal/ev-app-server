// models/Farmer.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phoneNo: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: {
      type: String,
      default: "Customer",
    },
    // password: { type: String, required: true },
    // verified: {
    //   type: Boolean,
    // },
    otp: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
    documents: {
      profilePictureFilePath: {},
      aadharFilePath: {
        type: String,
      },
      drivingLicenseFilePath: {
        type: String,
      },
      addressProofFilePath: {
        type: String,
      },
    },
    currentSubscriptions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Subscriptions" },
    ],
    subscriptionHistory: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Subscriptions" },
    ],
    wallet: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const UserModel = mongoose.model("User", userSchema);
export default UserModel;
