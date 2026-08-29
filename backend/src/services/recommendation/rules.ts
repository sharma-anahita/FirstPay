import { IEngineRule, IFinancialState, IRuleResult } from './types';

// Category helpers
const getBasicNeedsExpense = (state: IFinancialState): number => {
  return state.monthlyEssentialExpenses > 0 ? state.monthlyEssentialExpenses : state.monthlyIncome * 0.5;
};

export const rules: IEngineRule[] = [
  {
    code: 'RULE_EMERGENCY_BUFFER_CHECK',
    name: 'Emergency Buffer Check',
    description: 'Verifies if the user has an emergency fund covering their minimum safety buffer',
    evaluate(state: IFinancialState): IRuleResult | null {
      const basicExpenses = getBasicNeedsExpense(state);
      const minBufferMonths = 3; // Default buffer target
      const requiredBuffer = basicExpenses * minBufferMonths;

      // If current balance is lower than safety buffer
      if (state.currentBalance < requiredBuffer) {
        const gap = requiredBuffer - state.currentBalance;
        return {
          ruleCode: this.code,
          type: 'emergency_fund',
          title: 'Establish Emergency Safety Reserve',
          explanation: `Your current balance (₹${state.currentBalance.toLocaleString('en-IN')}) is below your safety buffer of ₹${requiredBuffer.toLocaleString('en-IN')} (equivalent to ${minBufferMonths} months of basic needs: ₹${basicExpenses.toLocaleString('en-IN')}/mo). First-time earners need this cushion to absorb unexpected costs.`,
          suggestedAction: `Temporarily redirect discretionary spending to build a ₹${gap.toLocaleString('en-IN')} emergency reserve. We recommend aiming to save at least 15% of your income (₹${(state.monthlyIncome * 0.15).toLocaleString('en-IN')}/mo) until complete.`,
          estimatedMonthlyImpact: state.monthlyIncome * 0.15,
          feasibility: 'critical',
          score: 95
        };
      }
      return null;
    }
  },
  {
    code: 'RULE_WANTS_LIMIT_EXCEEDED',
    name: 'Wants Category Overspending',
    description: 'Checks if discretionary spending (Wants) exceeds the standard 30% of income',
    evaluate(state: IFinancialState): IRuleResult | null {
      const wantsPercent = (state.monthlyDiscretionaryExpenses / state.monthlyIncome) * 100;
      if (wantsPercent > 30) {
        const overspentAmount = state.monthlyDiscretionaryExpenses - (state.monthlyIncome * 0.3);
        const recommendSaving = Math.round(state.monthlyDiscretionaryExpenses * 0.15); // cut Wants by 15%
        return {
          ruleCode: this.code,
          type: 'expense_reduction',
          title: 'Optimize Discretionary (Wants) Spending',
          explanation: `Your non-essential spending on 'Wants' is ₹${state.monthlyDiscretionaryExpenses.toLocaleString('en-IN')}, which consumes ${wantsPercent.toFixed(1)}% of your monthly income. This exceeds the recommended 30% ceiling by ₹${overspentAmount.toLocaleString('en-IN')}/mo.`,
          suggestedAction: `Reduce discretionary spending (such as dining out, shopping, or leisure travel) by 15%. This lifestyle trim will save ₹${recommendSaving.toLocaleString('en-IN')} per month without heavily impacting your daily needs.`,
          estimatedMonthlyImpact: recommendSaving,
          feasibility: 'feasible',
          score: 85
        };
      }
      return null;
    }
  },
  {
    code: 'RULE_SUBSCRIPTION_CREEP_CHECK',
    name: 'Subscription Creep Audit',
    description: 'Identifies if recurring subscription costs exceed 5% of monthly income or if user has multiple subscriptions',
    evaluate(state: IFinancialState): IRuleResult | null {
      const totalSubCost = state.subscriptions.reduce((sum: number, s: any) => sum + s.amount, 0);
      const subPercent = (totalSubCost / state.monthlyIncome) * 100;

      if (state.subscriptions.length >= 3 || subPercent > 5) {
        const listText = state.subscriptions.map(s => `${s.merchant} (₹${s.amount}/mo)`).join(', ');
        return {
          ruleCode: this.code,
          type: 'expense_reduction',
          title: 'Audit Active Subscriptions',
          explanation: `You have ${state.subscriptions.length} active recurring subscriptions costing ₹${totalSubCost.toLocaleString('en-IN')}/mo (${subPercent.toFixed(1)}% of your income). These services include: ${listText}. Recurring charges creep up silently and drain savings potential.`,
          suggestedAction: `Audit your active streaming services, app purchases, or memberships. Cancel at least one subscription that you have not used in the last 15 days, freeing up additional cash flow.`,
          estimatedMonthlyImpact: state.subscriptions.length > 0 ? Math.min(...state.subscriptions.map(s => s.amount)) : 200,
          feasibility: 'feasible',
          score: 70
        };
      }
      return null;
    }
  },
  {
    code: 'RULE_SAVINGS_RATE_ALERT',
    name: 'Low Savings Rate Alert',
    description: 'Triggers when a user savings rate is below the recommended 20%',
    evaluate(state: IFinancialState): IRuleResult | null {
      if (state.savingsRate < 20) {
        const gapPercent = 20 - state.savingsRate;
        const additionalMonthlySaving = Math.round(state.monthlyIncome * (gapPercent / 100));
        return {
          ruleCode: this.code,
          type: 'general_budget',
          title: 'Boost Your Monthly Savings Rate',
          explanation: `Your current savings rate is ${state.savingsRate.toFixed(1)}%, which is below the recommended 50/30/20 budget benchmark of 20%. As a first-time earner, forming saving habits early accelerates your compound wealth.`,
          suggestedAction: `Try the "Pay Yourself First" method. Automate a transfer of ₹${additionalMonthlySaving.toLocaleString('en-IN')} (representing the ${gapPercent.toFixed(0)}% gap) to your savings or investment account on the day you receive your income.`,
          estimatedMonthlyImpact: additionalMonthlySaving,
          feasibility: 'feasible',
          score: 75
        };
      }
      return null;
    }
  }
];
