
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

    walletBalance: {
      type: Number,
      default: 0,
    },
    totalAddedBalanceInWallet: {
      type: Number,
      default: 0,
    },
    walletHistory: [
      {
        amount: { type: Number, required: true },
        type: {
          type: String,
          enum: ["Credit", "Debit"],
          required: true,
        },
        transactionDate: { type: Date, default: Date.now }, // Added for better tracking of individual transactions
      },
    ],
    transactionHistory: [
      {
        amount: { type: Number, required: true },
        type: {
          type: String,
          enum: ["Credit", "Debit", "Refund"],
          required: true,
        },
        creditedIn: {
          type: String,
          enum: ["Wallet", "Original Payment Method"],
        },
        debittedFrom: {
          type: String,
          enum: ["Wallet", "PaymentGateway"],
        },
        transactionDate: { type: Date, default: Date.now }, // Added for better tracking of individual transactions
      },
    ],
  },
  { timestamps: true }
);

const UserModel = mongoose.model("User", userSchema);
export default UserModel;
