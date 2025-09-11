import mongoose from "mongoose";

const organisationSubscriptionSchema = new mongoose.Schema(
  {
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },
    subscriptionStartsOn: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentFrom: {
      type: String,
      enum: ["Wallet", "PaymentGateway"],
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    vehicleCount: { type: Number, required: true, min: 1 },
    daysCount: { type: Number, required: true, min: 1 }, // Duration of the subscription in days
    active: { type: Boolean, default: false },
    isPaid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const OrganisationSubscriptionModel = mongoose.model(
  "OrganisationSubscriptions",
  organisationSubscriptionSchema
);
export default OrganisationSubscriptionModel;
