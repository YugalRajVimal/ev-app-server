import express from "express";
import jwtAuth from "../middlewares/Auth/auth.middleware.js";
import { upload } from "../middlewares/fileUpload.middleware.js";
import OrganisationController from "../Controllers/OrganisationController/organisation.controller.js";

const organisationRouter = express.Router();

const organisationController = new OrganisationController();

organisationRouter.get("/", (req, res) => {
  res.send("Welcome to EV App Organisation APIs");
});

organisationRouter.post("/auth", jwtAuth, (req, res) => {
  organisationController.checkAuth(req, res);
});

organisationRouter.post("/signup", (req, res) => {
  organisationController.signup(req, res);
});

organisationRouter.post("/signin", (req, res) => {
  organisationController.signin(req, res);
});

organisationRouter.post("/verify-account", (req, res) => {
  organisationController.verifyAccount(req, res);
});

organisationRouter.post(
  "/registration",
  jwtAuth,
  upload.fields([
    { name: "aadhar", maxCount: 1 },
    { name: "drivingLicense", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
  ]),
  (req, res) => {
    organisationController.registration(req, res);
  }
);

organisationRouter.get("/registration-details", jwtAuth, (req, res) => {
  organisationController.getRegistrationDetails(req, res);
});

organisationRouter.post(
  "/update-profile-details",
  jwtAuth,
  upload.single("profilePicture"),
  (req, res) => {
    organisationController.updateProfileDetails(req, res);
  }
);

organisationRouter.get("/get-profile-details", jwtAuth, (req, res) => {
  organisationController.getProfileDetails(req, res);
});

organisationRouter.get("/get-all-packages", (req, res) => {
  organisationController.getAllPackages(req, res);
});

organisationRouter.post("/purchase-package", jwtAuth, (req, res) => {
  organisationController.purchasePackage(req, res);
});

organisationRouter.post("/webhook/package-purchase", (req, res) => {
  organisationController.handlePackagePurchaseWebhook(req, res);
});

organisationRouter.post("/renew-package", jwtAuth, (req, res) => {
  organisationController.renewPackage(req, res);
});

organisationRouter.post("/webhook/renew-package", (req, res) => {
  organisationController.handlePackageRenewWebhook(req, res);
});

organisationRouter.post("/webhook/wallet-topup", (req, res) => {
  organisationController.handleWalletWebhook(req, res);
});

organisationRouter.get(
  "/get-subscription-detail/:subscriptionId",
  jwtAuth,
  (req, res) => {
    organisationController.getSubscriptionDetail(req, res);
  }
);

organisationRouter.get("/get-all-subscription-detail", jwtAuth, (req, res) => {
  organisationController.getAllSubscriptionDetails(req, res);
});

organisationRouter.get("/get-subscription-history", jwtAuth, (req, res) => {
  organisationController.getSubscriptionHistory(req, res);
});

organisationRouter.get("/get-wallet-balance", jwtAuth, (req, res) => {
  organisationController.getWalletDetails(req, res);
});

organisationRouter.post("/add-wallet-balance", jwtAuth, (req, res) => {
  organisationController.addAmountToWallet(req, res);
});

organisationRouter.get("/get-wallet-history", jwtAuth, (req, res) => {
  organisationController.getWalletHistory(req, res);
});

organisationRouter.get("/get-transaction-history", jwtAuth, (req, res) => {
  organisationController.getTransactionHistory(req, res);
});

organisationRouter.post("/logout", (req, res) => {
  organisationController.logout(req, res);
});

export default organisationRouter;
