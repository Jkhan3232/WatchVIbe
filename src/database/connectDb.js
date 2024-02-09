import mongoose from "mongoose";
import { connectDb } from "../servers/constant.js";

// Function to connect to the database
const connectToDatabase = async () => {
  try {
    const connectionIns = await mongoose.connect(
      `${process.env.MONGODB_URI}/${connectDb}`
    );
    console.log(
      `\n MongoDB Connected On Host! ${connectionIns.connection.host}`
    );
  } catch (error) {
    // Log any errors
    console.error("Error connecting to database: ", error);
    process.exit(1);
  }
};

// Export the connectToDatabase function
export default connectToDatabase;
