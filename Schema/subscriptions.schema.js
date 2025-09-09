import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    planName: {
      type: String,
      required: true,
    },
    period: {
      type: String,
      required: true,
      enum: ["weekly", "monthly", "payAsYouGo"],
    }, // e.g., "monthly", "yearly"
    daysCount: { type: Number },
    trialEndsOn: { type: Date, required: true },
    subscriptionStartsOn: { type: Date, required: true },
    amount: { type: Number, required: true },
    active: { type: Boolean, default: true },
    paymentFrom: { type: String, enum: ["Wallet", "PaymentGateway"] },
  },
  { timestamps: true }
);

const SubscriptionModel = mongoose.model("Subscriptions", subscriptionSchema);
export default SubscriptionModel;
