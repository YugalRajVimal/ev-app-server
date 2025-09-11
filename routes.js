import express from "express";
import adminRouter from "./Routers/admin.routes.js";
import customerRouter from "./Routers/customer.routes.js";
import organisationRouter from "./Routers/organisation.routes.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Welcome to EV App Server APIs");
});

router.use("/admin", adminRouter);
router.use("/customer", customerRouter);
router.use("/organisation", organisationRouter);

export default router;
