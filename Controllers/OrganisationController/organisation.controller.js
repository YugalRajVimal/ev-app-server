import OrganisationModel from "../../Schema/OrganisationSchema/organisation.schema.js";
import sendMail from "../../config/nodeMailer.config.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { deleteUploadedFiles } from "../../middlewares/fileDelete.middleware.js";
import SubscriptionModel from "../../Schema/OrganisationSchema/organisationSubscriptions.schema.js";
import ExpiredTokenModel from "../../Schema/expired-token.schema.js";
import PackageModel from "../../Schema/OrganisationSchema/organisationPackages.schema.js";
import { Cashfree as CashfreePG } from "cashfree-pg";

CashfreePG.XClientId = process.env.CASHFREE_CLIENT_ID;
CashfreePG.XClientSecret = process.env.CASHFREE_CLIENT_SECRET;
CashfreePG.XEnvironment = CashfreePG.Environment.SANDBOX;

class OrganisationController {
  checkAuth = async (req, res) => {
    try {
      console.log("Not Verified");

      if (req.user.role != "Organisation") {
        return res.status(401).json({ message: "Unauthorized" });
      }
      console.log("Verified");
      return res.status(200).json({ message: "Authorized" });
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  };

  signup = async (req, res) => {
    const { email, name, phoneNo } = req.body;
    console.log(`[Signup] Attempting signup for email: ${email}`);

    if (!email || !name || !phoneNo) {
      console.log("[Signup] Missing required fields.");
      return res.status(400).json({ message: "All fields are required" });
    }

    try {
      const existingUser = await OrganisationModel.findOne({ email });
      console.log(`[Signup] Checked for existing user with email: ${email}`);

      if (existingUser) {
        return res
          .status(409)
          .json({ message: "Email already in use. Please login." });
      }

      const newUser = new OrganisationModel({
        email,
        name,
        phoneNo,
        role: "Organisation",
      });

      await newUser.save();
      console.log(`[Signup] New user ${newUser.id} saved successfully.`);

      // Generate a random 6 digit OTP
      const otp = Math.floor(Math.random() * 900000) + 100000;
      // Save OTP to the user document and set an expiration time
      await OrganisationModel.findByIdAndUpdate(
        newUser.id,
        { otp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) },
        { new: true }
      );
      console.log(
        `[Signup] OTP ${otp} generated and saved for new user ${newUser.id}.`
      );

      // Send OTP to the user's email
      const message = `Your OTP is: ${otp}`;
      await sendMail(email, "Sign Up OTP", message);
      console.log(`[Signup] OTP email sent to ${email}.`);

      res.status(201).json({
        message: "Sign Up successful. OTP sent to your email. Verify Account",
      });
      console.log(`[Signup] Signup successful for ${email}. Response sent.`);
    } catch (error) {
      console.error(`[Signup] Error during signup for ${email}:`, error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  verifyAccount = async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }
    try {
      const user = await OrganisationModel.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.otp !== otp) {
        return res.status(401).json({ message: "Invalid OTP" });
      }
      user.otp = null;
      user.save();
      // Verify the user and update the verified field to true
      // Generate a JSON Web Token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: "Organisation" },
        process.env.JWT_SECRET
        // { expiresIn: "24h" }
      );
      res.status(200).json({ message: "Account verified successfully", token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  signin = async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    try {
      const user = await OrganisationModel.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate a random 6 digit OTP
      const otp = Math.floor(Math.random() * 900000) + 100000;
      // Save OTP to the user document and set an expiration time
      await OrganisationModel.findByIdAndUpdate(
        user.id,
        { otp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) },
        { new: true }
      );

      // Send OTP to the user's email
      const message = `Your OTP is: ${otp}`;
      await sendMail(email, "Sign Up OTP", message);
      console.log(`[Signup] OTP email sent to ${email}.`);

      res.status(200).json({ message: "OTP sent to mail successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  getRegistrationDetails = async (req, res) => {
    try {
      const { id } = req.user; // Assuming req.user is populated by a JWT middleware

      if (!id) {
        return res.status(400).json({ message: "User ID is required." });
      }

      const user = await OrganisationModel.findById(id).select("documents"); // Select only the documents field

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      if (
        !user.documents ||
        Object.values(user.documents).every((doc) => !doc)
      ) {
        return res
          .status(404)
          .json({ message: "No registration documents found for this user." });
      }

      res.status(200).json({
        message: "Organisation registration documents retrieved successfully",
        documents: user.documents,
      });
    } catch (error) {
      console.error("Error fetching registration details:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  registration = async (req, res) => {
    try {
      const { id, email } = req.user;

      // Validate required fields from authenticated user
      if (!id || !email) {
        deleteUploadedFiles(req.files); // cleanup on failure
        return res.status(400).json({
          message: "User ID and Email are required for registration.",
        });
      }

      const existingUser = await OrganisationModel.findOne({ _id: id, email });

      if (!existingUser) {
        deleteUploadedFiles(req.files);
        return res
          .status(404) // Changed status from 409 to 404 as the user was not found.
          .json({ message: "User not found with the provided ID and email." });
      }

      if (
        !req.files ||
        (!req.files.aadhar?.length &&
          !req.files.drivingLicense?.length &&
          !req.files.addressProof?.length)
      ) {
        deleteUploadedFiles(req.files);
        return res.status(400).json({
          message:
            "At least one registration document (Aadhar, Driving License, or Address Proof) is required.",
        });
      }

      // Extract uploaded file paths safely
      const documents = {
        aadharFilePath: req.files?.aadhar ? req.files.aadhar[0].path : null,
        drivingLicenseFilePath: req.files?.drivingLicense
          ? req.files.drivingLicense[0].path
          : null,
        addressProofFilePath: req.files?.addressProof
          ? req.files.addressProof[0].path
          : null,
      };

      // Update the documents field on the user object
      existingUser.documents = documents;
      // Save the updated user document to the database
      await existingUser.save();

      res
        .status(200) // Changed status from 201 to 200 as this is an update operation, not a creation.
        .json({
          message: "Organisation documents registered successfully",
          user: existingUser, // The existingUser object now reflects the saved changes.
        });
    } catch (error) {
      console.error("Registration error:", error);

      // Cleanup uploaded files if an error occurs during processing
      deleteUploadedFiles(req.files);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  updateProfileDetails = async (req, res) => {
    // Assuming 'OrganisationModel' is imported and 'deleteSingleFile' utility function is available in scope.
    // 'deleteSingleFile' should handle deleting a single file path, similar to how 'deleteUploadedFiles'
    // handles multiple files in the 'registration' method.
    try {
      const userId = req.user.id; // Assuming jwtAuth middleware sets req.userId
      const { name } = req.body;
      const profilePictureFile = req.file; // Assuming 'upload.single('profilePicture')' middleware is used on the route

      if (!userId) {
        return res
          .status(401)
          .json({ message: "Unauthorized: User ID not found." });
      }

      const existingUser = await OrganisationModel.findById(userId);

      if (!existingUser) {
        // If a file was uploaded but user not found, delete the file
        if (profilePictureFile) {
          // Assuming deleteSingleFile is available (e.g., imported or defined globally)
          deleteSingleFile(profilePictureFile.path);
        }
        return res.status(404).json({ message: "User not found." });
      }

      let updated = false;

      // Update name if provided and different from current name
      // Check for undefined, null, and empty string after trimming
      if (
        name !== undefined &&
        name !== null &&
        name.trim() !== "" &&
        existingUser.name !== name
      ) {
        existingUser.name = name;
        updated = true;
      }

      // Update profile picture if a new one is uploaded
      if (profilePictureFile) {
        // Ensure documents object exists on the user
        if (!existingUser.documents) {
          existingUser.documents = {};
        }

        // If an old profile picture path exists, delete the old file
        if (existingUser.documents.profilePictureFilePath) {
          // Assuming deleteSingleFile is available
          deleteSingleFile(existingUser.documents.profilePictureFilePath);
        }

        // Set the new profile picture file path
        existingUser.documents.profilePictureFilePath = profilePictureFile.path;
        updated = true;
      }

      if (!updated) {
        // If no name was updated and no new profile picture was provided,
        // return a 400 Bad Request.
        // No file deletion needed here as 'profilePictureFile' would not have been processed as an update
        // (i.e., if profilePictureFile was present, 'updated' would have been true).
        return res
          .status(400)
          .json({ message: "No valid profile details provided for update." });
      }

      await existingUser.save();

      // Respond with updated user details, excluding sensitive info
      res.status(200).json({
        message: "Profile details updated successfully",
        user: {
          _id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          phoneNo: existingUser.phoneNo,
          role: existingUser.role,
          // Include the updated profile picture path if it exists
          profilePictureFilePath:
            existingUser.documents?.profilePictureFilePath || null,
        },
      });
    } catch (error) {
      console.error("Update profile details error:", error);
      // If a file was uploaded and an error occurred during processing, delete it
      if (req.file) {
        // Assuming deleteSingleFile is available
        deleteSingleFile(req.file.path);
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  getProfileDetails = async (req, res) => {
    try {
      const userId = req.user.id; // Get user ID from the authenticated request

      const user = await OrganisationModel.findById(userId).select(
        "name email phoneNo documents.profilePictureFilePath wallet createdAt"
      );

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      res.status(200).json({
        message: "Profile details fetched successfully",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phoneNo: user.phoneNo,
          wallet: user.wallet,
          createdAt: user.createdAt,
          profilePictureFilePath:
            user.documents?.profilePictureFilePath || null,
        },
      });
    } catch (error) {
      console.error("Get profile details error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  getAllPackages = async (req, res) => {
    // NOTE: PackageModel needs to be imported at the top of this file for this function to work correctly.
    // Example: import PackageModel from "../../Schema/packages.schema.js";
    try {
      const packages = await PackageModel.find({}); // Fetch all packages from the database

      if (!packages || packages.length === 0) {
        return res.status(404).json({ message: "No packages found." });
      }

      return res.status(200).json({
        message: "Packages fetched successfully",
        packages: packages,
      });
    } catch (error) {
      console.error("Error fetching packages:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };

  // purchasePackage = async (req, res) => {
  //   try {
  //     const userId = req.user.id; // Get user ID from the authenticated request

  //     // Extract subscription details from the request body
  //     const { planName, period, amount, daysCount, paymentFrom } = req.body;

  //     // Basic validation for required fields
  //     if (!planName || !period || !amount || !paymentFrom) {
  //       return res.status(400).json({
  //         message:
  //           "Missing required subscription details (planName, period, amount).",
  //       });
  //     }

  //     if (period == "payAsYouGo" && !daysCount) {
  //       return res.status(400).json({
  //         message: "For 'payAsYouGo' plans, 'daysCount' is required.",
  //       });
  //     }

  //     // Validate amount type and value
  //     if (typeof amount !== "number" || amount <= 0) {
  //       return res
  //         .status(400)
  //         .json({ message: "Amount must be a positive number." });
  //     }

  //     // Find the user and update their subscription arrays
  //     const user = await OrganisationModel.findById(userId);
  //     if (!user) {
  //       return res.status(404).json({ message: "User not found." });
  //     }

  //     // Set subscription start date to now
  //     const subscriptionStartsOn = new Date();
  //     let trialEndsOn = new Date(subscriptionStartsOn); // Initialize with start date

  //     if (period === "monthly") {
  //       trialEndsOn.setDate(subscriptionStartsOn.getDate() + 30);
  //     } else if (period === "weekly") {
  //       trialEndsOn.setDate(subscriptionStartsOn.getDate() + 7);
  //     } else if (period === "payAsYouGo") {
  //       trialEndsOn.setDate(subscriptionStartsOn.getDate() + daysCount);
  //     }

  //     if (paymentFrom != "Wallet" || paymentFrom != "PaymentGateway") {
  //       return res.status(400).json({
  //         message:
  //           "Invalid paymentFrom method. Must be 'Wallet' or 'PaymentGateway'",
  //       });
  //     }

  //     if (paymentFrom == "Wallet") {
  //       if (user.walletBalance < amount) {
  //         return res
  //           .status(402)
  //           .json({ message: "Insufficient wallet balance." });
  //       }

  //       user.walletBalance =
  //         parseFloat(user.walletBalance) - parseFloat(amount);

  //       user.walletHistory.push({
  //         amount: amount,
  //         type: "Debit",
  //       });
  //     }

  //     // Create a new subscription document
  //     const newSubscription = new SubscriptionModel({
  //       planName,
  //       period,
  //       trialEndsOn,
  //       subscriptionStartsOn,
  //       amount,
  //       paymentFrom,
  //       daysCount: daysCount ? daysCount : null,
  //     });

  //     // Save the new subscription to the database
  //     await newSubscription.save();

  //     user.currentSubscriptions.push(newSubscription._id);
  //     user.subscriptionHistory.push(newSubscription._id); // Also add to history

  //     // Add transaction history for the purchase
  //     user.transactionHistory.push({
  //       amount: amount,
  //       type: "Debit",
  //       debittedFrom: paymentFrom, // Assuming payment is made via an external gateway for the subscription
  //       transactionDate: new Date(),
  //     });

  //     await user.save();

  //     // Respond with success
  //     res.status(201).json({
  //       message: "Subscription package purchased successfully.",
  //       subscription: newSubscription,
  //     });
  //   } catch (error) {
  //     console.error("Purchase package error:", error);
  //     res.status(500).json({ message: "Internal Server Error" });
  //   }
  // };

  generateOrderId = async () => {
    const uniqueId = crypto.randomBytes(16).toString("hex");
    const hash = crypto.createHash("sha256");
    hash.update(uniqueId);
    return hash.digest("hex").slice(0, 12);
  };

  purchasePackage = async (req, res) => {
    try {
      const userId = req.user.id; // Get user ID from the authenticated request

      // Extract subscription details from the request body
      const { packageId, startDate, vehicleCount, paymentFrom } = req.body;

      // Basic validation for required fields
      if (!vehicleCount || !packageId || !startDate || !paymentFrom) {
        return res.status(400).json({
          message:
            "Missing required subscription details (planName, period, amount).",
        });
      }

      // Fetch package details from the database
      const packageDetails = await PackageModel.findById(packageId);
      if (!packageDetails) {
        return res.status(404).json({ message: "Package not found." });
      }

      // Extract details from the package
      const { amount, daysCount } = packageDetails;

      // Basic validation for extracted package details
      if (amount === undefined || amount === null) {
        return res.status(400).json({
          message:
            "Invalid package details: missing planName, period, or amount.",
        });
      }

      // Find the user and update their subscription arrays
      const user = await OrganisationModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Set subscription start date to now
      // let trialEndsOn = new Date(subscriptionStartsOn); // Initialize with start date
      // trialEndsOn.setDate(subscriptionStartsOn.getDate() + daysCount);

      if (paymentFrom != "Wallet" && paymentFrom != "PaymentGateway") {
        return res.status(400).json({
          message:
            "Invalid paymentFrom method. Must be 'Wallet' or 'PaymentGateway'",
        });
      }

      let isPaid = false;

      if (paymentFrom == "Wallet") {
        if (user.walletBalance < amount) {
          return res
            .status(402)
            .json({ message: "Insufficient wallet balance." });
        }

        user.walletBalance =
          parseFloat(user.walletBalance) - parseFloat(amount);

        user.walletHistory.push({
          amount: amount,
          type: "Debit",
        });

        isPaid = true;

        // Add transaction history for the purchase
        user.transactionHistory.push({
          amount: amount,
          type: "Debit",
          debittedFrom: paymentFrom, // Assuming payment is made via an external gateway for the subscription
          transactionDate: new Date(),
        });
      }

      let cashfreeRes;

      const orderId = await this.generateOrderId();

      if (paymentFrom == "PaymentGateway") {
        const totalCost = parseFloat(amount) * parseFloat(vehicleCount);

        let request = {
          order_id: orderId,
          order_amount: totalCost,
          order_currency: "INR",
          customer_details: {
            customer_id: user._id,
            customer_name: user.name,
            customer_phone: user.phoneNo,
            customer_email: user.email,
          },
        };

        cashfreeRes = await CashfreePG.PGCreateOrder("2023-08-01", request);
      }

      // Create a new subscription document
      const newSubscription = new SubscriptionModel({
        packageId,
        subscriptionStartsOn: startDate,
        amount,
        paymentFrom,
        vehicleCount,
        orderId,
        daysCount,
        active: false,
        isPaid,
      });

      // Save the new subscription to the database
      await newSubscription.save();

      user.currentSubscriptions.push(newSubscription._id);
      user.subscriptionHistory.push(newSubscription._id); // Also add to history

      await user.save();

      res.status(201).json({
        message: "Subscription package purchased successfully.",
        subscription: newSubscription,
        cashfreeResponse: cashfreeRes?.data || {}, // ✅ only send safe JSON
      });
    } catch (error) {
      console.error("Purchase package error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  handlePackagePurchaseWebhook = async (req, res) => {
    try {
      const order_id = req.body.data.order.order_id;
      const payment_status = req.body.data.payment.payment_status;
      const customer_id = req.body.data.customer_details.customer_id;

      // console.log("Order ID:", order_id);
      // console.log("Payment Status:", payment_status);
      // console.log("Customer ID:", customer_id);

      if (payment_status === "SUCCESS") {
        // const subscription = await SubscriptionModel.findOneAndUpdate(
        //   { orderId: order_id },
        //   { status: "PAID" },
        //   { new: true }
        // );

        let subscription = await SubscriptionModel.findOne({
          orderId: order_id,
        });

        if (!subscription) {
          console.error(`Subscription with order ID ${order_id} not found.`);
          // For webhooks, it's generally best to return a 200 OK even if the item isn't found
          // to prevent the payment gateway from retrying the webhook unnecessarily.
          return res
            .status(200)
            .send("Subscription not found, but webhook processed.");
        }

        if (subscription.isPaid) {
          console.log(
            `Subscription with order ID ${order_id} is already paid. No further action needed.`
          );
          // If the subscription is already marked as paid, we consider this webhook
          // successfully processed and prevent redundant updates or actions.
          return res
            .status(200)
            .send("Webhook received successfully (already paid).");
        }

        // If not already paid, proceed to mark as paid
        subscription.isPaid = true;
        await subscription.save();

        if (!subscription) {
          console.error(`Subscription with order ID ${order_id} not found.`);
          // For webhooks, it's generally best to return a 200 OK even if the item isn't found
          // to prevent the payment gateway from retrying the webhook unnecessarily.
          return res
            .status(200)
            .send("Subscription not found, but webhook processed.");
        }

        // Define variables needed by the subsequent code block
        // `isPaid` will be true as per the update above
        const amount = subscription.amount;
        const paymentFrom = subscription.paymentFrom;
        const order_status = payment_status; // Used in console.log later

        const user = await OrganisationModel.findById(customer_id);

        if (!user) {
          console.error(
            `User with ID ${customer_id} not found for package purchase webhook (Order ID: ${order_id}).`
          );
          // For webhooks, it's generally best to return a 200 OK even if the item isn't found
          // to prevent the payment gateway from retrying the webhook unnecessarily.
          return res.status(200).send("User not found, but webhook processed.");
        }

        // Add transaction history for the purchase
        user.transactionHistory.push({
          amount: amount,
          type: "Debit",
          debittedFrom: paymentFrom, // Assuming payment is made via an external gateway for the subscription
          transactionDate: new Date(),
        });

        console.log(`Order ${order_id} payment status: ${order_status}`);
      } else {
        console.log(`Order ${order_id} payment status: ${order_status}`);
      }

      res.status(200).send("Webhook received successfully");
    } catch (error) {
      console.error("Error handling Cashfree webhook", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };

  renewPackage = async (req, res) => {
    try {
      const userId = req.user.id; // Get user ID from the authenticated request

      // Extract subscription details from the request body
      const { subscriptionId, paymentFrom } = req.body;

      // Basic validation for required fields
      if (!subscriptionId || !paymentFrom) {
        return res.status(400).json({
          message:
            "Missing required subscription details (planName, period, amount).",
        });
      }

      // Fetch package details from the database
      const subscription = await SubscriptionModel.findById(subscriptionId);
      if (!subscription) {
        return res.status(404).json({ message: "Package not found." });
      }

      // Extract details from the package
      const { amount, vehicleCount, daysCount } = subscription;

      // Basic validation for extracted package details
      if (amount === undefined || amount === null) {
        return res.status(400).json({
          message:
            "Invalid package details: missing planName, period, or amount.",
        });
      }

      const totalCost = parseFloat(amount) * parseFloat(vehicleCount);

      // Find the user and update their subscription arrays
      const user = await OrganisationModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Set subscription start date to now
      // let trialEndsOn = new Date(subscriptionStartsOn); // Initialize with start date
      // trialEndsOn.setDate(subscriptionStartsOn.getDate() + daysCount);

      if (paymentFrom != "Wallet" && paymentFrom != "PaymentGateway") {
        return res.status(400).json({
          message:
            "Invalid paymentFrom method. Must be 'Wallet' or 'PaymentGateway'",
        });
      }

      let isPaid = false;

      if (paymentFrom == "Wallet") {
        if (user.walletBalance < totalCost) {
          return res
            .status(402)
            .json({ message: "Insufficient wallet balance." });
        }

        user.walletBalance =
          parseFloat(user.walletBalance) - parseFloat(totalCost);

        user.walletHistory.push({
          amount: totalCost,
          type: "Debit",
        });

        isPaid = true;

        // Add transaction history for the purchase
        user.transactionHistory.push({
          amount: totalCost,
          type: "Debit",
          debittedFrom: paymentFrom, // Assuming payment is made via an external gateway for the subscription
          transactionDate: new Date(),
        });
      }

      let cashfreeRes;

      const orderId = await this.generateOrderId();

      if (paymentFrom == "PaymentGateway") {
        let request = {
          order_id: orderId,
          order_amount: totalCost,
          order_currency: "INR",
          customer_details: {
            customer_id: user._id,
            customer_name: user.name,
            customer_phone: user.phoneNo,
            customer_email: user.email,
          },
        };

        cashfreeRes = await CashfreePG.PGCreateOrder("2023-08-01", request);
      }

      // Create a new subscription document
      const newSubscription = new SubscriptionModel({
        packageId: subscription.packageId,
        subscriptionStartsOn: (() => {
          const newStartDate = new Date(subscription.subscriptionStartsOn); // Use startDate from req.body as the base
          newStartDate.setDate(newStartDate.getDate() + daysCount); // Add daysCount from packageDetails
          return newStartDate;
        })(),
        amount,
        paymentFrom,
        vehicleCount,
        orderId,
        daysCount,
        active: false,
        isPaid,
      });

      // Save the new subscription to the database
      await newSubscription.save();

      user.currentSubscriptions.push(newSubscription._id);
      user.subscriptionHistory.push(newSubscription._id); // Also add to history

      await user.save();

      res.status(201).json({
        message: "Subscription package purchased successfully.",
        subscription: newSubscription,
        cashfreeResponse: cashfreeRes?.data || {}, // ✅ only send safe JSON
      });
    } catch (error) {
      console.error("Purchase package error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  handlePackageRenewWebhook = async (req, res) => {
    try {
      const order_id = req.body.data.order.order_id;
      const payment_status = req.body.data.payment.payment_status;
      const customer_id = req.body.data.customer_details.customer_id;

      // console.log("Order ID:", order_id);
      // console.log("Payment Status:", payment_status);
      // console.log("Customer ID:", customer_id);

      if (payment_status === "SUCCESS") {
        // const subscription = await SubscriptionModel.findOneAndUpdate(
        //   { orderId: order_id },
        //   { status: "PAID" },
        //   { new: true }
        // );

        let subscription = await SubscriptionModel.findOne({
          orderId: order_id,
        });

        if (!subscription) {
          console.error(`Subscription with order ID ${order_id} not found.`);
          // For webhooks, it's generally best to return a 200 OK even if the item isn't found
          // to prevent the payment gateway from retrying the webhook unnecessarily.
          return res
            .status(200)
            .send("Subscription not found, but webhook processed.");
        }

        if (subscription.isPaid) {
          console.log(
            `Subscription with order ID ${order_id} is already paid. No further action needed.`
          );
          // If the subscription is already marked as paid, we consider this webhook
          // successfully processed and prevent redundant updates or actions.
          return res
            .status(200)
            .send("Webhook received successfully (already paid).");
        }

        // If not already paid, proceed to mark as paid
        subscription.isPaid = true;
        await subscription.save();

        if (!subscription) {
          console.error(`Subscription with order ID ${order_id} not found.`);
          // For webhooks, it's generally best to return a 200 OK even if the item isn't found
          // to prevent the payment gateway from retrying the webhook unnecessarily.
          return res
            .status(200)
            .send("Subscription not found, but webhook processed.");
        }

        // Define variables needed by the subsequent code block
        // `isPaid` will be true as per the update above
        const amount = subscription.amount;
        const paymentFrom = subscription.paymentFrom;
        const order_status = payment_status; // Used in console.log later

        const user = await OrganisationModel.findById(customer_id);

        if (!user) {
          console.error(
            `User with ID ${customer_id} not found for package purchase webhook (Order ID: ${order_id}).`
          );
          // For webhooks, it's generally best to return a 200 OK even if the item isn't found
          // to prevent the payment gateway from retrying the webhook unnecessarily.
          return res.status(200).send("User not found, but webhook processed.");
        }

        // Add transaction history for the purchase
        user.transactionHistory.push({
          amount: amount,
          type: "Debit",
          debittedFrom: paymentFrom, // Assuming payment is made via an external gateway for the subscription
          transactionDate: new Date(),
        });

        console.log(`Order ${order_id} payment status: ${order_status}`);
      } else {
        console.log(`Order ${order_id} payment status: ${order_status}`);
      }

      res.status(200).send("Webhook received successfully");
    } catch (error) {
      console.error("Error handling Cashfree webhook", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };

  getSubscriptionDetail = async (req, res) => {
    try {
      const userId = req.user.id; // Assuming userId is available from JWT middleware
      const { subscriptionId } = req.params; // Assuming subscription ID comes from URL parameters

      if (!subscriptionId) {
        return res
          .status(400)
          .json({ message: "Subscription ID is required." });
      }

      // Find the user to ensure the subscription belongs to them
      const user = await OrganisationModel.findById(userId)
        .populate("currentSubscriptions")
        .populate("subscriptionHistory");

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Check if the requested subscription ID exists in either current or historical subscriptions for this user
      const isUsersSubscription =
        user.currentSubscriptions.some(
          (sub) => sub._id.toString() === subscriptionId
        ) ||
        user.subscriptionHistory.some(
          (sub) => sub._id.toString() === subscriptionId
        );

      if (!isUsersSubscription) {
        return res
          .status(404)
          .json({ message: "Subscription not found for this user." });
      }

      // Fetch the full subscription details
      const subscription = await SubscriptionModel.findById(subscriptionId);

      if (!subscription) {
        // This case should ideally not be hit if isUsersSubscription is true, but good for robustness
        return res
          .status(404)
          .json({ message: "Subscription details not found." });
      }

      res.status(200).json({ subscription });
    } catch (error) {
      console.error("Get specific subscription details error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  getAllSubscriptionDetails = async (req, res) => {
    try {
      const userId = req.user.id; // Assuming userId is available from JWT middleware

      // Find the user and populate their current subscriptions
      const user = await OrganisationModel.findById(userId).populate(
        "currentSubscriptions"
      );

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      res
        .status(200)
        .json({ currentSubscriptions: user.currentSubscriptions || [] });
    } catch (error) {
      console.error("Get all current subscriptions error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  getSubscriptionHistory = async (req, res) => {
    try {
      const userId = req.user.id; // Assuming userId is available from JWT middleware

      // Find the user and populate their subscription history
      const user = await OrganisationModel.findById(userId).populate(
        "subscriptionHistory"
      );

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      res
        .status(200)
        .json({ subscriptionHistory: user.subscriptionHistory || [] });
    } catch (error) {
      console.error("Get subscription history error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  getWalletDetails = async (req, res) => {
    try {
      const userId = req.user.id; // Assuming userId is available from JWT middleware

      const user = await OrganisationModel.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      res.status(200).json({ walletBalance: user.walletBalance || 0 }); // Assuming 'wallet' field exists in OrganisationModel
    } catch (error) {
      console.error("Get wallet details error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  addAmountToWallet = async (req, res) => {
    try {
      const userId = req.user.id; // Assuming userId is available from JWT middleware
      const { amount } = req.body;

      if (!amount || typeof amount !== "number" || amount <= 0) {
        return res
          .status(400)
          .json({ message: "Valid positive amount is required." });
      }

      const user = await OrganisationModel.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      const orderId = await this.generateOrderId();

      let request = {
        order_id: orderId,
        order_amount: parseFloat(amount),
        order_currency: "INR",
        customer_details: {
          customer_id: user._id,
          customer_name: user.name,
          customer_phone: user.phoneNo,
          customer_email: user.email,
        },
      };

      const cashfreeRes = await CashfreePG.PGCreateOrder("2023-08-01", request);

      // user.walletBalance += amount;
      // user.totalAddedBalanceInWallet += amount;
      user.walletHistory.push({
        amount: amount,
        type: "Credit",
        isPaid: false,
        orderId: orderId,
      });

      await user.save();

      res.status(200).json({
        message: "Amount added to wallet successfully.",
        // newWalletBalance: user.walletBalance,
        cashfreeResponse: cashfreeRes?.data || {},
      });
    } catch (error) {
      console.error("Add amount to wallet error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  handleWalletWebhook = async (req, res) => {
    try {
      const order_id = req.body.data.order.order_id;
      const payment_status = req.body.data.payment.payment_status;
      const customer_id = req.body.data.customer_details.customer_id;

      // console.log("Order ID:", order_id);
      // console.log("Payment Status:", payment_status);
      // console.log("Customer ID:", customer_id);

      if (payment_status === "SUCCESS") {
        const user = await OrganisationModel.findById(customer_id);

        if (!user) {
          console.error(
            `User with ID ${customer_id} not found for wallet webhook (Order ID: ${order_id}).`
          );
          // For webhooks, it's generally best to return a 200 OK even if the item isn't found
          // to prevent the payment gateway from retrying the webhook unnecessarily.
          return res.status(200).send("User not found, but webhook processed.");
        }

        // Find the wallet history entry with the matching orderId
        const walletEntryIndex = user.walletHistory.findIndex(
          (entry) => entry.orderId === order_id
        );

        if (walletEntryIndex === -1) {
          console.error(
            `Wallet history entry with order ID ${order_id} not found for user ${customer_id}.`
          );
          // For webhooks, it's generally best to return a 200 OK even if the item isn't found
          // to prevent the payment gateway from retrying the webhook unnecessarily.
          return res
            .status(200)
            .send("Wallet history entry not found, but webhook processed.");
        }

        let walletEntry = user.walletHistory[walletEntryIndex];

        if (walletEntry.isPaid) {
          console.log(
            `Wallet entry with order ID ${order_id} for user ${customer_id} is already paid. No further action needed.`
          );
          // If the wallet entry is already marked as paid, we consider this webhook
          // successfully processed and prevent redundant updates or actions.
          return res
            .status(200)
            .send("Webhook received successfully (already paid).");
        }

        // If not already paid, proceed to mark as paid
        walletEntry.isPaid = true;
        // Update the entry in the array (important for Mongoose to detect changes in subdocuments)
        user.walletHistory.set(walletEntryIndex, walletEntry);

        // Define variables needed by the subsequent code block and for transaction history
        const amount = parseFloat(walletEntry.amount);
        const paymentFrom = "PaymentGateway"; // For wallet top-up, payment always comes from a gateway

        // Update total added balance in wallet
        user.totalAddedBalanceInWallet += amount;
        user.walletBalance += amount; // 'amount' is already a float

        // Add transaction history for the wallet top-up (Credit)
        user.transactionHistory.push({
          amount: amount,
          type: "Credit",
          creditedIn: "Wallet",
          debittedFrom: paymentFrom,
          transactionDate: new Date(),
        });

        await user.save();

        console.log(
          `Order ${order_id} payment status: ${payment_status} for user ${customer_id}. Wallet updated.`
        );
      } else {
        console.log(
          `Order ${order_id} payment status: ${payment_status} for user ${customer_id}. No wallet update performed.`
        );
      }

      res.status(200).send("Webhook received successfully");
    } catch (error) {
      console.error("Error handling Cashfree wallet webhook:", error); // More specific error message
      res.status(500).json({ error: "Internal Server Error" });
    }
  };

  getWalletHistory = async (req, res) => {
    try {
      const userId = req.user.id; // Get user ID from the authenticated request

      const user = await OrganisationModel.findById(userId).select(
        "walletHistory"
      );

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      res.status(200).json({
        message: "Wallet history fetched successfully.",
        walletHistory: user.walletHistory,
      });
    } catch (error) {
      console.error("Get wallet history error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  getTransactionHistory = async (req, res) => {
    try {
      const userId = req.user.id; // Get user ID from the authenticated request

      const user = await OrganisationModel.findById(userId).select(
        "transactionHistory"
      );

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      res.status(200).json({
        message: "Transaction history fetched successfully.",
        transactionHistory: user.transactionHistory,
      });
    } catch (error) {
      console.error("Get transaction history error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  logout = async (req, res) => {
    try {
      const { token } = req.body; // Assuming the token is sent in the request body

      if (!token) {
        return res
          .status(400)
          .json({ message: "Token is required for logout." });
      }

      // Check if the token is already expired (optional, but good for idempotency)
      const existingExpiredToken = await ExpiredTokenModel.findOne({ token });
      if (existingExpiredToken) {
        return res
          .status(200)
          .json({ message: "User already logged out successfully." });
      }

      // Add the token to the ExpiredTokenModel
      const expiredToken = new ExpiredTokenModel({ token });
      await expiredToken.save();

      res.status(200).json({ message: "Logged out successfully." });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  pushNotification = async (req, res) => {};
}

export default OrganisationController;
