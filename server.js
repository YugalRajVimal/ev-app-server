import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import router from "./routes.js";
import { connectUsingMongoose } from "./config/mongoose.config.js";

const app = express();

app.use(
  cors({
    origin: "*", // allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"], // allow headers
  })
);

// Handle preflight requests explicitly
// app.options("/*", cors());
app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("Welcome to EV App Server");
});

app.use("/Uploads/Aadhar", express.static("Uploads/Aadhar"));
app.use("/Uploads/DrivingLicense", express.static("Uploads/DrivingLicense"));
app.use("/Uploads/AddressProof", express.static("Uploads/AddressProof"));
app.use("/Uploads/ProfilePicture", express.static("Uploads/ProfilePicture"));

app.use("/api", router);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  connectUsingMongoose();
});
