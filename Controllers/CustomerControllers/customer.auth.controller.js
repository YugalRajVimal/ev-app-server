import UserModel from "../../Schema/user.schema.js";
import sendMail from "../../config/nodeMailer.config.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { deleteUploadedFiles } from "../../middlewares/fileDelete.middleware.js";

class CustomerAuthController {
  checkAuth = async (req, res) => {
    try {
      console.log("Not Verified");

      if (req.user.role != "Customer") {
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
      const existingUser = await UserModel.findOne({ email });
      console.log(`[Signup] Checked for existing user with email: ${email}`);

      if (existingUser) {
        return res
          .status(409)
          .json({ message: "Email already in use. Please login." });
      }

      const newUser = new UserModel({
        email,
        name,
        phoneNo,
        role: "Customer",
      });

      await newUser.save();
      console.log(`[Signup] New user ${newUser.id} saved successfully.`);

      // Generate a random 6 digit OTP
      const otp = Math.floor(Math.random() * 900000) + 100000;
      // Save OTP to the user document and set an expiration time
      await UserModel.findByIdAndUpdate(
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
      const user = await UserModel.findOne({ email });
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
        { id: user.id, email: user.email, role: "Customer" },
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
      const user = await UserModel.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate a random 6 digit OTP
      const otp = Math.floor(Math.random() * 900000) + 100000;
      // Save OTP to the user document and set an expiration time
      await UserModel.findByIdAndUpdate(
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

      const user = await UserModel.findById(id).select("documents"); // Select only the documents field

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
        message: "Customer registration documents retrieved successfully",
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

      const existingUser = await UserModel.findOne({ _id: id, email });

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
          message: "Customer documents registered successfully",
          user: existingUser, // The existingUser object now reflects the saved changes.
        });
    } catch (error) {
      console.error("Registration error:", error);

      // Cleanup uploaded files if an error occurs during processing
      deleteUploadedFiles(req.files);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };
}

export default CustomerAuthController;
