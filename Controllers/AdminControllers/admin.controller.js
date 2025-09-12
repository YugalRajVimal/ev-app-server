import PackageModel from "../../Schema/CustomerSchema/packages.schema.js";
import UserModel from "../../Schema/CustomerSchema/user.schema.js";
import OrganisationModel from "../../Schema/OrganisationSchema/organisation.schema.js";
import OrganisationPackageModel from "../../Schema/OrganisationSchema/organisationPackages.schema.js";
import AdminModel from "../../Schema/admin.schema.js";

import sendMail from "../../config/nodeMailer.config.js";

import jwt from "jsonwebtoken";

class AdminController {
  checkAuth = async (req, res) => {
    try {
      console.log("Not Verified");

      if (req.user.role != "Admin") {
        return res.status(401).json({ message: "Unauthorized" });
      }
      console.log("Verified");
      return res.status(200).json({ message: "Authorized" });
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  };

  verifyAccount = async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }
    try {
      const user = await AdminModel.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "Admin not found" });
      }
      if (user.otp !== otp) {
        return res.status(401).json({ message: "Invalid OTP" });
      }
      user.otp = null;
      user.save();
      // Verify the user and update the verified field to true
      // Generate a JSON Web Token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: "Admin" },
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
      const user = await AdminModel.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "Admin not found" });
      }

      // Generate a random 6 digit OTP
      const otp = Math.floor(Math.random() * 900000) + 100000;
      // Save OTP to the user document and set an expiration time
      await AdminModel.findByIdAndUpdate(
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

  getAdminProfileDetails = async (req, res) => {
    try {
      // Assuming req.user is populated by an authentication middleware with the admin's ID
      const adminId = req.user.id;
      const admin = await AdminModel.findById(adminId).select(
        "-password -otp -otpExpires"
      ); // Exclude sensitive fields
      if (!admin) {
        return res.status(404).json({ message: "Admin profile not found" });
      }
      res.status(200).json({ admin });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  // Controller
  getAllIndividualUsers = async (req, res) => {
    try {
      let { page = 1, limit = 10, search = "" } = req.query;
      page = parseInt(page);
      limit = parseInt(limit);

      const skip = (page - 1) * limit;

      // Build search filter
      const searchFilter = search
        ? {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
              { phoneNo: { $regex: search, $options: "i" } },
            ],
          }
        : {};

      // Fetch users with search + pagination
      const [users, total] = await Promise.all([
        UserModel.find(searchFilter)
          .populate("subscriptionHistory")
          .select("-password -otp -otpExpires")
          .skip(skip)
          .limit(limit),
        UserModel.countDocuments(searchFilter),
      ]);

      res.status(200).json({
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  getAllOrganisationUsers = async (req, res) => {
    try {
      let { page = 1, limit = 10, search = "" } = req.query;
      page = parseInt(page);
      limit = parseInt(limit);

      const skip = (page - 1) * limit;

      // Build search filter
      const searchFilter = search
        ? {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
              { phoneNo: { $regex: search, $options: "i" } },
            ],
          }
        : {};

      // Fetch users with search + pagination
      const [users, total] = await Promise.all([
        OrganisationModel.find(searchFilter)
          .populate("subscriptionHistory")
          .select("-password -otp -otpExpires")
          .skip(skip)
          .limit(limit),
        OrganisationModel.countDocuments(searchFilter),
      ]);

      res.status(200).json({
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  getAllIndividualPackages = async (req, res) => {
    try {
      // Assuming PackageModel is imported and has a 'type' field to distinguish packages
      const individualPackages = await PackageModel.find({});
      res.status(200).json({ packages: individualPackages });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  editIndividualPackage = async (req, res) => {
    try {
      const { packageId } = req.params; // Get package ID from URL parameters
      const updatedData = req.body; // Get updated data from request body

      if (!packageId) {
        return res.status(400).json({ message: "Package ID is required" });
      }

      const updatedPackage = await PackageModel.findOneAndUpdate(
        { _id: packageId }, // Find by ID and ensure it's an individual package
        updatedData,
        { new: true, runValidators: true } // Return the updated document and run schema validators
      );

      if (!updatedPackage) {
        return res
          .status(404)
          .json({ message: "Individual package not found." });
      }

      res.status(200).json({
        message: "Individual package updated successfully",
        package: updatedPackage,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  getAllOrganisationPackage = async (req, res) => {
    try {
      // Assuming PackageModel is imported and has a 'type' field to distinguish packages
      const organisationPackages = await OrganisationPackageModel.find({});
      res.status(200).json({ packages: organisationPackages });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  editOrganisationPackage = async (req, res) => {
    try {
      const { packageId } = req.params; // Get package ID from URL parameters
      const updatedData = req.body; // Get updated data from request body

      if (!packageId) {
        return res.status(400).json({ message: "Package ID is required" });
      }

      const updatedPackage = await OrganisationPackageModel.findOneAndUpdate(
        { _id: packageId }, // Find by ID and ensure it's an organisation package
        updatedData,
        { new: true, runValidators: true } // Return the updated document and run schema validators
      );

      if (!updatedPackage) {
        return res
          .status(404)
          .json({ message: "Organisation package not found." });
      }

      res.status(200).json({
        message: "Organisation package updated successfully",
        package: updatedPackage,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };
}

export default AdminController;
