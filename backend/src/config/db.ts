import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/firstpay';

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(MONGODB_URI);
    console.log(`[Database] MongoDB connected successfully to: ${MONGODB_URI}`);
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error);
    process.exit(1);
  }
};
