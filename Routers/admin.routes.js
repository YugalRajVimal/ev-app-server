import express from "express";
import AdminController from "../Controllers/AdminControllers/admin.controller.js";
import jwtAdminAuth from "../middlewares/Auth/admin.auth.middleware.js";

const adminRouter = express.Router();

const adminController = new AdminController();

adminRouter.get("/", (req, res) => {
  res.send("Welcome to Green Glide App Admin APIs");
});

adminRouter.post("/auth", jwtAdminAuth, (req, res) => {
  adminController.checkAuth(req, res);
});

adminRouter.post("/signin", (req, res) => {
  adminController.signin(req, res);
});

adminRouter.post("/verify-account", (req, res) => {
  adminController.verifyAccount(req, res);
});

adminRouter.get("/profile", jwtAdminAuth, (req, res) => {
  adminController.getAdminProfileDetails(req, res);
});

adminRouter.get("/individual-users", jwtAdminAuth, (req, res) =>
  adminController.getAllIndividualUsers(req, res)
);

adminRouter.get("/organisation-users", jwtAdminAuth, (req, res) => {
  adminController.getAllOrganisationUsers(req, res);
});

adminRouter.get("/individual-packages", jwtAdminAuth, (req, res) => {
  adminController.getAllIndividualPackages(req, res);
});

adminRouter.put("/packages/individual/:packageId", jwtAdminAuth, (req, res) => {
  adminController.editIndividualPackage(req, res);
});

adminRouter.get("/organisation-packages", jwtAdminAuth, (req, res) => {
  adminController.getAllOrganisationPackage(req, res);
});

adminRouter.put(
  "/packages/organisation/:packageId",
  jwtAdminAuth,
  (req, res) => {
    adminController.editOrganisationPackage(req, res);
  }
);

export default adminRouter;
