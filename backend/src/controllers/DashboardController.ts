import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { FinancialGoal } from '../models/FinancialGoal';
import { Recommendation } from '../models/Recommendation';
import { NotFoundError } from '../middleware/errorHandler';
import { RecommendationEngine } from '../services/recommendation/engine';

export class DashboardController {
  public static async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = req.params;
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }

      // 1. Fetch Financial State details using the engine
      const state = await RecommendationEngine.buildFinancialState(userId);

      // 2. Fetch recent transactions (last 5)
      const recentTransactions = await Transaction.find({ userId })
        .sort({ date: -1 })
        .limit(5);

      // 3. Fetch active goals and calculate detailed progress
      const goals = await FinancialGoal.find({ userId, status: 'active' });
      const activeGoals = goals.map(goal => {
        const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
        const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
        
        const now = new Date();
        const targetDate = new Date(goal.targetDate);
        let monthsRemaining = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
        if (monthsRemaining <= 0) monthsRemaining = 1;

        return {
          _id: goal._id,
          name: goal.name,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          category: goal.category,
          priority: goal.priority,
          targetDate: goal.targetDate,
          progressPercent: Number(progress.toFixed(1)),
          requiredMonthlySaving: Math.round(remainingAmount / monthsRemaining)
        };
      });

      // 4. Fetch pending recommendations
      const recommendations = await Recommendation.find({ userId, status: 'pending' })
        .sort({ score: -1 })
        .limit(3);

      // 5. Compute financial health indicators
      const surplus = state.monthlyIncome - state.monthlyEssentialExpenses - state.monthlyDiscretionaryExpenses;
      const monthlySavings = state.availableMonthlySavings;
      
      const basicExpenses = state.monthlyEssentialExpenses > 0 ? state.monthlyEssentialExpenses : state.monthlyIncome * 0.5;
      const safetyBufferMonths = basicExpenses > 0 ? Number((state.currentBalance / basicExpenses).toFixed(1)) : 0;

      let safetyBufferStatus: 'inadequate' | 'warning' | 'healthy' = 'inadequate';
      if (safetyBufferMonths >= user.minimumSafetyBuffer) {
        safetyBufferStatus = 'healthy';
      } else if (safetyBufferMonths >= 1) {
        safetyBufferStatus = 'warning';
      }

      let generalBudgetStatus: 'excellent' | 'good' | 'critical' = 'good';
      if (state.savingsRate >= 20 && safetyBufferStatus === 'healthy') {
        generalBudgetStatus = 'excellent';
      } else if (state.savingsRate < 10 || state.monthlyDiscretionaryExpenses > state.monthlyIncome * 0.45) {
        generalBudgetStatus = 'critical';
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            employmentType: user.employmentType,
            experienceLevel: user.experienceLevel
          },
          summary: {
            currentBalance: state.currentBalance,
            monthlyIncome: state.monthlyIncome,
            monthlyExpenses: state.monthlyEssentialExpenses + state.monthlyDiscretionaryExpenses,
            needsSpending: state.monthlyEssentialExpenses,
            wantsSpending: state.monthlyDiscretionaryExpenses,
            savingsSurplus: surplus,
            savingsRate: Number(state.savingsRate.toFixed(1))
          },
          financialHealth: {
            safetyBufferMonths,
            safetyBufferTargetMonths: user.minimumSafetyBuffer,
            safetyBufferStatus,
            generalBudgetStatus,
            subscriptionCount: state.subscriptions.length,
            totalSubscriptionCost: state.subscriptions.reduce((sum: number, s: any) => sum + s.amount, 0)
          },
          recentTransactions,
          activeGoals,
          recommendationsSummary: {
            count: recommendations.length,
            list: recommendations
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
