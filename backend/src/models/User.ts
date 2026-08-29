import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  monthlyIncome: number;
  employmentType: 'student' | 'part-time' | 'full-time' | 'freelancer' | 'unemployed';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  minimumSafetyBuffer: number; // e.g. 3 (number of months of expenses to buffer)
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  monthlyIncome: { type: Number, required: true, min: 0 },
  employmentType: {
    type: String,
    required: true,
    enum: ['student', 'part-time', 'full-time', 'freelancer', 'unemployed']
  },
  experienceLevel: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  minimumSafetyBuffer: { type: Number, required: true, default: 3, min: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const User = model<IUser>('User', UserSchema);
