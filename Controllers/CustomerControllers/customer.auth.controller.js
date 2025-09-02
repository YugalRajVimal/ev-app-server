import UserModel from "../../Schema/user.schema.js";
import sendMail from "../../config/nodeMailer.config.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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
    const { email, password, name, companyName } = req.body;
    if (!email || !password || !name || !companyName) {
      return res.status(400).json({ message: "All fields are required" });
    }
    try {
      const existingUserUsingEmail = await UserModel.findOne({ email });

      if (existingUserUsingEmail) {
        return res.status(409).json({
          message: "User with this email already exists.",
        });
      }

      if (existingUserUsingEmail) {
        if (!existingUserUsingEmail.verified) {
          const otp = Math.floor(Math.random() * 900000) + 100000;
          await UserModel.findByIdAndUpdate(existingUserUsingEmail._id, {
            otp,
          });
          const message = `Your OTP is: ${otp}`;
          await sendMail(email, "Sign Up OTP", message);
          return res.status(200).json({
            message:
              "User already exists. OTP sent to your email. Verify Account",
          });
        }
        return res
          .status(409)
          .json({ message: "Email already in use. Login." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new UserModel({
        email,
        password: hashedPassword,
        name,
        companyName,
        role: "Customer",
      });

      await newUser.save();
      // Generate a random 6 digit OTP using crypto
      const otp = Math.floor(Math.random() * 900000) + 100000;
      // Save OTP to the user document
      await UserModel.findByIdAndUpdate(newUser.id, { otp }, { new: true });
      // Send OTP to the user's email
      const message = `Your OTP is: ${otp}`;
      await sendMail(email, "Sign Up OTP", message);
      res.status(201).json({
        message: "Sign Up successful. OTP sent to your email. Verify Account",
      });
    } catch (error) {
      console.error(error);
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
      await UserModel.findByIdAndUpdate(
        user.id,
        { verified: true },
        { new: true }
      );
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
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    try {
      const user = await UserModel.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.verified) {
        const otp = Math.floor(Math.random() * 900000) + 100000;
        // Save OTP to the user document
        await UserModel.findByIdAndUpdate(user.id, { otp }, { new: true });
        const message = `Your OTP is: ${otp}`;
        await sendMail(email, "Sign Up OTP", message);
        return res.status(403).json({
          message: "User not verified. OTP sent to your email. Verify Account",
        });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      // Generate a JSON Web Token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: "Customer" },
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
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    try {
      const user = await UserModel.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Encrypt the new password
      const encryptedPassword = await bcrypt.hash(password, 10);
      // Update the user document with the new password and set verified to false
      // Generate OTP
      const otp = Math.floor(Math.random() * 900000) + 100000;

      await UserModel.findByIdAndUpdate(
        user.id,
        { otp, password: encryptedPassword, verified: false },
        { new: true }
      );
      // Send OTP to the user's email
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
    const { oldPassword, password } = req.body;
    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Old and new passwords are required" });
    }
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Old password is incorrect" });
      }
      const encryptedPassword = await bcrypt.hash(newPassword, 10);
      await UserModel.findByIdAndUpdate(
        user.id,
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

export default CustomerAuthController;
