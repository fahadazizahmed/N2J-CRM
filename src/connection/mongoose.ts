import mongoose from "mongoose";

// Maximum number of retries
const MAX_RETRIES = 5;
// Delay between retries (in milliseconds)
const RETRY_DELAY = 5000;

export const connectToMongo = async (retryCount = 0) => {
 
  const mongoUrl = process.env.MONGO_URL;

  // Check if MONGO_URL is defined
  if (!mongoUrl) {
    throw new Error("MONGO_URL is not defined in the environment variables.");
  }

  try {
    // Connection options
    const options = {
      connectTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
      maxPoolSize: 10, // Maximum number of connections in the pool
    };

    // Connect to MongoDB
    await mongoose.connect(mongoUrl, options);

    console.info(`
      \x1b[32m################################################
      ✌️ MongoDB loaded and connected!
      ################################################\x1b[0m
    `);

    // Handle connection events
    mongoose.connection.on("error", (error) => {
      console.error("\x1b[31mMongoDB connection error:", error, "\x1b[0m");
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("\x1b[33mMongoDB disconnected. Reconnecting...\x1b[0m");
      connectToMongo(); // Reconnect on disconnection
    });

    mongoose.connection.on("reconnected", () => {
      console.info("\x1b[32mMongoDB reconnected successfully!\x1b[0m");
    });
  } catch (error) {
    console.error("\x1b[31mError connecting to MongoDB:", error, "\x1b[0m");

    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.warn(`Retrying connection... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(() => connectToMongo(retryCount + 1), RETRY_DELAY);
    } else {
      console.error("\x1b[31mMax retries reached. Exiting...\x1b[0m");
      process.exit(1); // Exit the process if max retries are reached
    }
  }
};