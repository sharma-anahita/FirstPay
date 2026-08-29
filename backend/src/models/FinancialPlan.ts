import { Schema, model, Document, Types } from 'mongoose';

export interface ISpendingAdjustment {
  category: string;
  originalAmount: number;
  newAmount: number;
  difference: number;
}

export interface IFinancialPlan extends Document {
  userId: Types.ObjectId;
  goalId: Types.ObjectId;
  strategyType: 'conservative' | 'balanced' | 'aggressive';
  monthlySavingTarget: number;
  spendingAdjustments: ISpendingAdjustment[];
  projectedBalance: number; // projected balance at end of plan
  projectedGoalDate: Date;
  feasibility: 'feasible' | 'unfeasible' | 'critical';
  safetyBuffer: number; // safety buffer achieved in months of basic expenses
  score: number; // strategy suitability score
  assumptions: string[];
  createdAt: Date;
}

const SpendingAdjustmentSchema = new Schema<ISpendingAdjustment>({
  category: { type: String, required: true },
  originalAmount: { type: Number, required: true },
  newAmount: { type: Number, required: true },
  difference: { type: Number, required: true }
}, { _id: false });

const FinancialPlanSchema = new Schema<IFinancialPlan>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  goalId: { type: Schema.Types.ObjectId, ref: 'FinancialGoal', required: true, index: true },
  strategyType: {
    type: String,
    required: true,
    enum: ['conservative', 'balanced', 'aggressive']
  },
  monthlySavingTarget: { type: Number, required: true, min: 0 },
  spendingAdjustments: { type: [SpendingAdjustmentSchema], default: [] },
  projectedBalance: { type: Number, required: true, default: 0 },
  projectedGoalDate: { type: Date, required: true },
  feasibility: {
    type: String,
    required: true,
    enum: ['feasible', 'unfeasible', 'critical']
  },
  safetyBuffer: { type: Number, required: true, min: 0 },
  score: { type: Number, required: true, min: 0, max: 100, default: 50 },
  assumptions: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

// Compound index to fetch strategies generated for a goal
FinancialPlanSchema.index({ goalId: 1, strategyType: 1 }, { unique: true });

export const FinancialPlan = model<IFinancialPlan>('FinancialPlan', FinancialPlanSchema);
