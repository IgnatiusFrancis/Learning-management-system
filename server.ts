require("dotenv").config();
import { v2 as cloudinary } from "cloudinary";
import { app } from "./app";
import connectDB from "./utils/db";
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_KEY,
});

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Server is connected on port ${port}`);
  connectDB();
});
