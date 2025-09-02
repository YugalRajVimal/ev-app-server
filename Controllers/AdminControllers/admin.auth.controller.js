import sendMail from "../../config/nodeMailer.config.js";
import AdminModel from "../../Schema/admin.schema.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

class AdminAuthController {
  checkAuth = async (req, res) => {
    try {
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
      const admin = await AdminModel.findOne({ email });
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }
      if (admin.otp !== otp) {
        return res.status(401).json({ message: "Invalid OTP" });
      }
      admin.otp = null;
      admin.save();
      // Verify the admin and update the verified field to true
      await AdminModel.findByIdAndUpdate(
        admin.id,
        { verified: true },
        { new: true }
      );
      // Generate a JSON Web Token
      const token = jwt.sign(
        { id: admin.id, email: admin.email, role: "Admin" },
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
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    try {
      const admin = await AdminModel.findOne({ email });
      if (!admin) {
        return res.status(404).json({ message: "admin not found" });
      }
      if (!admin.verified) {
        const otp = Math.floor(Math.random() * 900000) + 100000;
        // Save OTP to the admin document
        await AdminModel.findByIdAndUpdate(admin.id, { otp }, { new: true });
        const message = `Your OTP is: ${otp}`;
        await sendMail(email, "Sign Up OTP", message);
        return res.status(403).json({
          message: "Admin not verified. OTP sent to your email. Verify Account",
        });
      }
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      // Generate a JSON Web Token
      const token = jwt.sign(
        { id: admin.id, email: admin.email, role: "Admin" },
        process.env.JWT_SECRET
        // { expiresIn: "24h" }
      );
      res.status(200).json({ token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  resetPassword = async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    try {
      const admin = await AdminModel.findOne({ email });
      if (!admin) {
        return res.status(404).json({ message: "admin not found" });
      }
      // Encrypt the new password
      const encryptedPassword = await bcrypt.hash(newPassword, 10);
      // Update the admin document with the new password and set verified to false
      // Generate OTP
      const otp = Math.floor(Math.random() * 900000) + 100000;

      await AdminModel.findByIdAndUpdate(
        admin.id,
        { otp, password: encryptedPassword, verified: false },
        { new: true }
      );
      // Send OTP to the admin's email
      const message = `Your OTP is: ${otp}`;
      await sendMail(email, "Reset Password OTP", message);
      return res.status(200).json({
        message: "OTP sent to your Email, Verify youseft to reset Password.",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Old and new passwords are required" });
    }
    try {
      const admin = await AdminModel.findById(req.user.id);
      if (!admin) {
        return res.status(404).json({ message: "admin not found" });
      }
      const isMatch = await bcrypt.compare(oldPassword, admin.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Old password is incorrect" });
      }
      const encryptedPassword = await bcrypt.hash(newPassword, 10);
      await AdminModel.findByIdAndUpdate(
        admin.id,
        { password: encryptedPassword },
        { new: true }
      );
      return res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };
}

export default AdminAuthController;
