import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  userId: Types.ObjectId;
  action: string; // e.g. 'generate_recommendations' | 'accept_recommendation' | 'reject_recommendation' | 'create_transaction'
  entityType: 'User' | 'Transaction' | 'FinancialGoal' | 'Recommendation' | 'FinancialPlan' | 'System';
  entityId?: Types.ObjectId;
  inputSnapshot: Schema.Types.Mixed; // state of user finances before running rules
  rulesApplied?: string[]; // e.g., ['RULE_EMERGENCY_FUND', 'RULE_50_30_20']
  output: Schema.Types.Mixed; // created recommendation content or action feedback
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, trim: true },
  entityType: {
    type: String,
    required: true,
    enum: ['User', 'Transaction', 'FinancialGoal', 'Recommendation', 'FinancialPlan', 'System']
  },
  entityId: { type: Schema.Types.ObjectId, default: null },
  inputSnapshot: { type: Schema.Types.Mixed, required: true },
  rulesApplied: { type: [String], default: [] },
  output: { type: Schema.Types.Mixed, required: true },
  timestamp: { type: Date, default: Date.now, index: true }
});

// Compound index to search audit logs for a user over time
AuditLogSchema.index({ userId: 1, timestamp: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
