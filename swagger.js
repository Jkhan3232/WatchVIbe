import swaggerAutogen from "swagger-autogen";
import path from "path";
import { fileURLToPath } from "url";

// Define __dirname for ES Module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const doc = {
  info: {
    title: "WatchVibe",
    description:
      "WatchVibe is a simple video uploading API that allows creating playlists and managing all videos, likes, comments, user channels, and editing all videos and hide profile information.",
  },
  host: "localhost:6000",
};

const outputFile = path.join(__dirname, "swagger-output.json");
const routesFiles = [
  "user.routes.js",
  "comment.routes.js",
  "subscription.routes.js",
  "video.routes.js",
  "tweet.routes.js",
  "playlist.routes.js", // Ensure this file exists or remove it if it doesn't
  "like.routes.js",
  "dashboard.routes.js",
  "healthcheck.routes.js", // Corrected from "health.routes.js" to match your existing file
];
const routes = routesFiles.map((file) =>
  path.join(__dirname, "src/routes", file)
); // Adjusted path
console.log(routes);

swaggerAutogen()(outputFile, routes, doc);
