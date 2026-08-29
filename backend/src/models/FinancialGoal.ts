import { Schema, model, Document, Types } from 'mongoose';

export interface IFinancialGoal extends Document {
  userId: Types.ObjectId;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  priority: 'low' | 'medium' | 'high';
  category: string; // e.g. 'Emergency Fund', 'Gadgets', 'Education', 'Travel'
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
}

const FinancialGoalSchema = new Schema<IFinancialGoal>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  targetAmount: { type: Number, required: true, min: 0 },
  currentAmount: { type: Number, required: true, default: 0, min: 0 },
  targetDate: { type: Date, required: true },
  priority: { type: String, required: true, enum: ['low', 'medium', 'high'], default: 'medium' },
  category: { type: String, required: true, trim: true },
  status: { type: String, required: true, enum: ['active', 'completed', 'paused'], default: 'active', index: true },
  createdAt: { type: Date, default: Date.now }
});

// Compound index to quickly find active goals for a user
FinancialGoalSchema.index({ userId: 1, status: 1 });

export const FinancialGoal = model<IFinancialGoal>('FinancialGoal', FinancialGoalSchema);
