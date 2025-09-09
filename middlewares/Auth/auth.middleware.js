import jwt from "jsonwebtoken";
import ExpiredTokenModel from "../../Schema/expired-token.schema.js";

const jwtAuth = async (req, res, next) => {
  // Read the token from the Authorization header
  const token = req.headers["authorization"];

  console.log(req.headers["authorization"]);

  const existingExpiredToken = await ExpiredTokenModel.findOne({ token });
  if (existingExpiredToken) {
    return res.status(401).json({
      message: "Unauthorized: Token expired, please log in again.",
    });
  }

  // If no token is present, return an error
  if (!token) {
    return res.status(401).json({ error: "--Unauthorized" });
  }

  // Verify if the token is valid
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload) {
      return res.status(401).json({ error: "Unauthorized Access" });
    }
    const user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
    req.user = user;

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    // If the token is not valid, return an error
    console.log(error);
    return res.status(401).json({ error: "Unauthorized Access" });
  }
};

export default jwtAuth;
