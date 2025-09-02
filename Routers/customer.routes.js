import express from "express";
import CustomerAuthController from "../Controllers/CustomerControllers/customer.auth.controller.js";
import jwtAuth from "../middlewares/Auth/auth.middleware.js";

const customerRouter = express.Router();

const customerAuthController = new CustomerAuthController();

customerRouter.get("/", (req, res) => {
  res.send("Welcome to EV App Customer APIs");
});

customerRouter.post("/auth", jwtAuth, (req, res) => {
  customerAuthController.checkAuth(req, res);
});

customerRouter.post("/signup", (req, res) => {
  customerAuthController.signup(req, res);
});

customerRouter.post("/signin", (req, res) => {
  customerAuthController.signin(req, res);
});

customerRouter.post("/verify-account", (req, res) => {
  customerAuthController.verifyAccount(req, res);
});

customerRouter.post("/change-password", (req, res) => {
  customerAuthController.changePassword(req, res);
});

customerRouter.post("/reset-password", (req, res) => {
  customerAuthController.resetPassword(req, res);
});

export default customerRouter;
