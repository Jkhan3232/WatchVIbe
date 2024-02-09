import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_SECRTE,
});

const uploadOnCloudinary = async (localFilePath, username) => {
  try {
    if (!localFilePath) return null;
    const folder = username ? `${username}` : null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: folder,
    });
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error);
    fs.unlinkSync(localFilePath);
    return null;
  }
};

// Function to delete an image from Cloudinary
const deleteFromCloudinary = async (imageUrl, username) => {
  try {
    if (!imageUrl) return null;

    // Extract publicId from the Cloudinary image URL
    const publicId = imageUrl.split("/").pop().split(".")[0];

    // If the username is provided, add it to the folder
    const folder = username ? `${username}/` : null;

    // Construct the public ID with the folder
    const fullPublicId = folder ? `${folder}${publicId}` : publicId;

    // Delete the image from Cloudinary
    const response = await cloudinary.uploader.destroy(fullPublicId);

    return response;
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    return null;
  }
};

// Export the functions
export { uploadOnCloudinary, deleteFromCloudinary };
