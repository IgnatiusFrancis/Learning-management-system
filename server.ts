require("dotenv").config();
import { app } from "./app";
import connectDB from "./utils/db";
require("dotenv").config();

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Server is connected on port ${port}`);
  connectDB();
});
