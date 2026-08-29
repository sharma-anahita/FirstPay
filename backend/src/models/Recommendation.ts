import { Schema, model, Document, Types } from 'mongoose';

export interface IRecommendation extends Document {
  userId: Types.ObjectId;
  goalId?: Types.ObjectId; // Optional link to a specific financial goal
  type: 'emergency_fund' | 'expense_reduction' | 'goal_acceleration' | 'general_budget';
  title: string;
  explanation: string;
  suggestedAction: string;
  estimatedMonthlyImpact: number; // positive is savings increase, negative is cost
  projectedGoalDate?: Date;
  feasibility: 'feasible' | 'unfeasible' | 'critical' | 'n/a';
  score: number; // 0 to 100 recommendation weight/priority score
  rulesTriggered: string[]; // e.g. ['RULE_SAFETY_BUFFER', 'RULE_WANTS_LIMIT']
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: Date;
}

const RecommendationSchema = new Schema<IRecommendation>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  goalId: { type: Schema.Types.ObjectId, ref: 'FinancialGoal', default: null, index: true },
  type: {
    type: String,
    required: true,
    enum: ['emergency_fund', 'expense_reduction', 'goal_acceleration', 'general_budget']
  },
  title: { type: String, required: true },
  explanation: { type: String, required: true },
  suggestedAction: { type: String, required: true },
  estimatedMonthlyImpact: { type: Number, required: true, default: 0 },
  projectedGoalDate: { type: Date, default: null },
  feasibility: {
    type: String,
    required: true,
    enum: ['feasible', 'unfeasible', 'critical', 'n/a'],
    default: 'n/a'
  },
  score: { type: Number, required: true, min: 0, max: 100, default: 50 },
  rulesTriggered: { type: [String], default: [] },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'accepted', 'rejected', 'completed'],
    default: 'pending',
    index: true
  },
  createdAt: { type: Date, default: Date.now }
});

// Index to pull latest pending recommendations for a user
RecommendationSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const Recommendation = model<IRecommendation>('Recommendation', RecommendationSchema);
