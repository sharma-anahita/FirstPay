import { Request, Response, NextFunction } from 'express';
import { FinancialPlan } from '../models/FinancialPlan';
import { FinancialGoal } from '../models/FinancialGoal';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import { RecommendationEngine } from '../services/recommendation/engine';

export class PlanController {
  public static async generatePlans(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: goalId } = req.params;
      const goal = await FinancialGoal.findById(goalId);
      if (!goal) {
        throw new NotFoundError(`Financial Goal with ID ${goalId} not found`);
      }

      const plans = await RecommendationEngine.generateGoalPlans(goal.userId.toString(), goalId);

      res.status(200).json({
        success: true,
        message: 'Successfully generated Conservative, Balanced, and Aggressive strategies.',
        data: plans
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: goalId } = req.params;
      const goal = await FinancialGoal.findById(goalId);
      if (!goal) {
        throw new NotFoundError(`Goal with ID ${goalId} not found`);
      }

      let plans: any[] = await FinancialPlan.find({ goalId });

      // If no plans exist yet, generate them dynamically
      if (plans.length === 0) {
        plans = await RecommendationEngine.generateGoalPlans(goal.userId.toString(), goalId);
      }

      res.status(200).json({
        success: true,
        data: plans
      });
    } catch (error) {
      next(error);
    }
  }

  public static async selectPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: planId } = req.params;
      const plan = await FinancialPlan.findById(planId);
      if (!plan) {
        throw new NotFoundError(`Financial Plan with ID ${planId} not found`);
      }

      const goal = await FinancialGoal.findById(plan.goalId);
      if (!goal) {
        throw new NotFoundError(`Goal associated with plan not found`);
      }

      // Log the selection in the audit trail
      await AuditLog.create({
        userId: plan.userId,
        action: 'select_plan_strategy',
        entityType: 'FinancialPlan',
        entityId: plan._id,
        inputSnapshot: {
          goalId: goal._id,
          goalName: goal.name,
          strategyType: plan.strategyType,
          monthlySavingTarget: plan.monthlySavingTarget
        },
        output: {
          message: `User selected the ${plan.strategyType} strategy for goal '${goal.name}'`,
          targetSavings: plan.monthlySavingTarget,
          projectedDate: plan.projectedGoalDate
        }
      });

      res.status(200).json({
        success: true,
        message: `Successfully selected the ${plan.strategyType} plan strategy for goal '${goal.name}'. This has been logged to your audit trail.`,
        data: plan
      });
    } catch (error) {
      next(error);
    }
  }
}
