import express from "express";
import expressValidator from "express-validator";
import AdminAuthController from "../Controllers/AdminControllers/admin.auth.controller.js";
import AdminController from "../Controllers/AdminControllers/admin.controller.js";
import jwtAdminAuth from "../middlewares/Auth/admin.auth.middleware.js";

const adminRouter = express.Router();

const adminAuthController = new AdminAuthController();
const adminController = new AdminController();

adminRouter.get("/", (req, res) => {
  res.send("Welcome to EV App Admin APIs");
});

adminRouter.post("/auth", (req, res) => {
  adminAuthController.checkAuth(req, res);
});

adminRouter.post("/signin", (req, res) => {
  adminAuthController.signin(req, res);
});

adminRouter.post("/verify-account", (req, res) => {
  adminAuthController.verifyAccount(req, res);
});

adminRouter.post("/change-password", jwtAdminAuth, (req, res) => {
  adminAuthController.changePassword(req, res);
});

adminRouter.post("/reset-password", (req, res) => {
  adminAuthController.resetPassword(req, res);
});

export default adminRouter;
