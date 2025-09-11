import mongoose from "mongoose";

const organisationPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    periodType: {
      type: String,
      required: true,
      enum: ["monthly", "weekly", "payAsYouGo"],
    },
    daysCount: {
      type: Number,
      min: 1, // Days count must be at least 1
    },
    amount: {
      type: Number,
      required: true,
      min: 0, // Amount cannot be negative
    },
    features: {
      type: [String], // Array of strings for package features/benefits
      default: [], // Default to an empty array
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

const OrganisationPackageModel = mongoose.model(
  "OrganisationPackage",
  organisationPackageSchema
);

export default OrganisationPackageModel;
