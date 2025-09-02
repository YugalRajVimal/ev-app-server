import express from "express";
import CustomerAuthController from "../Controllers/CustomerControllers/customer.auth.controller.js";
import jwtAuth from "../middlewares/Auth/auth.middleware.js";
import { upload } from "../middlewares/fileUpload.middleware.js";

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

customerRouter.post(
  "/registration",
  jwtAuth,
  upload.fields([
    { name: "aadhar", maxCount: 1 },
    { name: "drivingLicense", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
  ]),
  (req, res) => {
    customerAuthController.registration(req, res);
  }
);

customerRouter.get("/registration-details", jwtAuth, (req, res) => {
  customerAuthController.getRegistrationDetails(req, res);
});

export default customerRouter;
