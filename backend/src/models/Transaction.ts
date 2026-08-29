import { Schema, model, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  userId: Types.ObjectId;
  amount: number; // positive for income, negative for expense
  type: 'income' | 'expense';
  category: 'Needs' | 'Wants' | 'Savings' | 'Income' | string; // 50/30/20 standard high-level or descriptive categories
  merchant: string;
  description: string;
  date: Date;
  recurring: boolean;
  categorySource: 'user' | 'rule_engine' | 'default';
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true },
  type: { type: String, required: true, enum: ['income', 'expense'] },
  category: { type: String, required: true, index: true }, // e.g. 'Rent' (Needs), 'Dining Out' (Wants), etc.
  merchant: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  date: { type: Date, required: true, index: true },
  recurring: { type: Boolean, default: false },
  categorySource: { type: String, enum: ['user', 'rule_engine', 'default'], default: 'default' },
  createdAt: { type: Date, default: Date.now }
});

// Compound index for querying user transactions sorted by date
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, category: 1 });

export const Transaction = model<ITransaction>('Transaction', TransactionSchema);
