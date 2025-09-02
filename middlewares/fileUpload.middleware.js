import multer from "multer";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "./Uploads/"; // default fallback

    // Decide folder based on fieldname
    if (file.fieldname === "aadhar") {
      uploadPath = "./Uploads/Aadhar";
    } else if (file.fieldname === "drivingLicense") {
      uploadPath = "./Uploads/DrivingLicense";
    } else if (file.fieldname === "addressProof") {
      uploadPath = "./Uploads/AddressProof";
    }

    // Ensure the folder exists
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// Multer middleware
export const upload = multer({ storage });
