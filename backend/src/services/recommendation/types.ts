import { Types } from 'mongoose';

export interface IFinancialState {
  userId: string;
  monthlyIncome: number;
  monthlyEssentialExpenses: number; // Needs
  monthlyDiscretionaryExpenses: number; // Wants
  monthlyRecurringExpenses: number; // Subscriptions
  averageMonthlyExpenses: number; // Essential + Discretionary
  currentBalance: number;
  currentSavings: number; // Equivalent to currentBalance
  availableMonthlySavings: number; // monthlyIncome - averageMonthlyExpenses
  savingsRate: number; // percentage (0-100)
  minimumSafetyBuffer: number;
  
  // Detail collections for API responses
  subscriptions: {
    merchant: string;
    amount: number;
  }[];
  activeGoals: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: Date;
    priority: 'low' | 'medium' | 'high';
    category: string;
    requiredMonthlySaving: number;
    projectedCompletionMonths: number;
  }[];
}

export interface IEngineRule {
  code: string;
  name: string;
  description: string;
  evaluate(state: IFinancialState): IRuleResult | null;
}

export interface IRuleResult {
  ruleCode: string;
  type: 'emergency_fund' | 'expense_reduction' | 'goal_acceleration' | 'general_budget';
  title: string;
  explanation: string;
  suggestedAction: string;
  estimatedMonthlyImpact: number;
  feasibility: 'feasible' | 'unfeasible' | 'critical' | 'n/a';
  score: number; // 0-100 weight
}
