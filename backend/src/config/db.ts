import mongoose from "mongoose";

export let isDbOffline = false;

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cyber_defense_platform";
    
    // Set short timeout (3 seconds) for quick local fallback
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000
    });
    isDbOffline = false;
    console.log("MongoDB Database successfully connected.");
  } catch (error) {
    isDbOffline = true;
    console.warn("==========================================================");
    console.warn("⚠️  MongoDB offline. Activating Aegis In-Memory Mock Database.");
    console.warn("==========================================================");
  }
};
