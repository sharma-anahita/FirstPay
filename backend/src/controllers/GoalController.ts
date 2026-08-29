import { Request, Response, NextFunction } from 'express';
import { FinancialGoal } from '../models/FinancialGoal';
import { User } from '../models/User';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import { RecommendationEngine } from '../services/recommendation/engine';

export class GoalController {
  public static async getGoals(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = req.params;
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }

      const goals = await FinancialGoal.find({ userId });
      const state = await RecommendationEngine.buildFinancialState(userId.toString());

      // Enrich goals with calculations
      const enrichedGoals = goals.map(goal => {
        const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
        const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
        
        const now = new Date();
        const targetDate = new Date(goal.targetDate);
        let monthsRemaining = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
        if (monthsRemaining <= 0) monthsRemaining = 1;

        const requiredMonthlySaving = Math.round(remainingAmount / monthsRemaining);
        
        // Projected date based on current savings surplus
        const surplus = state.monthlyIncome - state.monthlyEssentialExpenses - state.monthlyDiscretionaryExpenses;
        const actualSurplus = Math.max(1000, surplus); // default floor
        const monthsProjected = Math.ceil(remainingAmount / actualSurplus);
        const projectedCompletionDate = new Date();
        projectedCompletionDate.setMonth(projectedCompletionDate.getMonth() + monthsProjected);

        return {
          ...goal.toObject(),
          progress: Number(progress.toFixed(1)),
          requiredMonthlySaving,
          monthsRemaining,
          projectedCompletionDate,
          isFeasible: actualSurplus >= requiredMonthlySaving
        };
      });

      res.status(200).json({
        success: true,
        data: enrichedGoals
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = req.params;
      const { name, targetAmount, currentAmount, targetDate, priority, category } = req.body;

      // Validation
      if (!name) throw new BadRequestError('name is required');
      if (!targetAmount || typeof targetAmount !== 'number' || targetAmount <= 0) {
        throw new BadRequestError('targetAmount is required and must be greater than 0');
      }
      if (!targetDate) throw new BadRequestError('targetDate is required');

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }

      const goal = await FinancialGoal.create({
        userId,
        name,
        targetAmount,
        currentAmount: currentAmount || 0,
        targetDate: new Date(targetDate),
        priority: priority || 'medium',
        category: category || 'General',
        status: 'active'
      });

      // Generate plans for this goal
      RecommendationEngine.generateGoalPlans(userId.toString(), goal._id.toString()).catch(err => {
        console.error(`[Engine Background Error] Failed to generate goal plans for goal ${goal._id}:`, err);
      });

      // Trigger recommendation run
      RecommendationEngine.generateRecommendations(userId.toString()).catch(err => {
        console.error(`[Engine Background Error] Failed to run recommendations:`, err);
      });

      res.status(201).json({
        success: true,
        message: 'Financial goal created successfully',
        data: goal
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, targetAmount, currentAmount, targetDate, priority, category, status } = req.body;

      const goal = await FinancialGoal.findById(id);
      if (!goal) {
        throw new NotFoundError(`Goal with ID ${id} not found`);
      }

      if (name) goal.name = name;
      if (targetAmount !== undefined) goal.targetAmount = targetAmount;
      if (currentAmount !== undefined) goal.currentAmount = currentAmount;
      if (targetDate) goal.targetDate = new Date(targetDate);
      if (priority) goal.priority = priority;
      if (category) goal.category = category;
      if (status) goal.status = status;

      await goal.save();

      const userId = goal.userId.toString();

      // Recalculate strategies if active
      if (goal.status === 'active') {
        RecommendationEngine.generateGoalPlans(userId, goal._id.toString()).catch(err => {
          console.error(`[Engine Background Error] Failed to regenerate goal plans:`, err);
        });
      }

      // Trigger recommendation recalculation
      RecommendationEngine.generateRecommendations(userId).catch(err => {
        console.error(`[Engine Background Error] Failed to run recommendations:`, err);
      });

      res.status(200).json({
        success: true,
        message: 'Goal updated successfully',
        data: goal
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const goal = await FinancialGoal.findById(id);
      if (!goal) {
        throw new NotFoundError(`Goal with ID ${id} not found`);
      }

      const userId = goal.userId.toString();
      await goal.deleteOne();

      // Clear related strategies
      const { FinancialPlan } = require('../models/FinancialPlan');
      await FinancialPlan.deleteMany({ goalId: id });

      // Run engine recommendations
      RecommendationEngine.generateRecommendations(userId).catch(err => {
        console.error(`[Engine Background Error] Failed to run recommendations:`, err);
      });

      res.status(200).json({
        success: true,
        message: 'Goal and associated plan strategies deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getGoalProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const goal = await FinancialGoal.findById(id);
      if (!goal) {
        throw new NotFoundError(`Goal with ID ${id} not found`);
      }

      const state = await RecommendationEngine.buildFinancialState(goal.userId.toString());

      const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
      const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
      
      const now = new Date();
      const targetDate = new Date(goal.targetDate);
      let monthsRemaining = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
      if (monthsRemaining <= 0) monthsRemaining = 1;

      const requiredMonthlySaving = Math.round(remainingAmount / monthsRemaining);
      
      const actualSurplus = state.monthlyIncome - state.monthlyEssentialExpenses - state.monthlyDiscretionaryExpenses;
      const progressRatePerMonth = actualSurplus;

      res.status(200).json({
        success: true,
        data: {
          goalId: goal._id,
          name: goal.name,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          progressPercent: Number(progress.toFixed(1)),
          remainingAmount,
          monthsRemaining,
          requiredMonthlySaving,
          actualSurplus,
          isFeasible: actualSurplus >= requiredMonthlySaving
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
