import { Request, Response, NextFunction } from 'express';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import { RecommendationEngine } from '../services/recommendation/engine';

export class TransactionController {
  public static async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = req.params;
      const { category, type, search, startDate, endDate, limit = 50, page = 1 } = req.query;

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }

      const query: any = { userId };

      if (category) {
        query.category = category;
      }
      if (type) {
        query.type = type;
      }
      if (search) {
        query.$or = [
          { merchant: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate as string);
        if (endDate) query.date.$lte = new Date(endDate as string);
      }

      const parsedLimit = Math.max(1, parseInt(limit as string));
      const parsedPage = Math.max(1, parseInt(page as string));
      const skip = (parsedPage - 1) * parsedLimit;

      const transactions = await Transaction.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parsedLimit);

      const total = await Transaction.countDocuments(query);

      res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            total,
            page: parsedPage,
            limit: parsedLimit,
            pages: Math.ceil(total / parsedLimit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = req.params;
      const { amount, type, category, merchant, description, date, recurring, categorySource } = req.body;

      // Validation
      if (!amount || typeof amount !== 'number') {
        throw new BadRequestError('amount is required and must be a number');
      }
      if (!type || !['income', 'expense'].includes(type)) {
        throw new BadRequestError("type is required and must be 'income' or 'expense'");
      }
      if (!category) {
        throw new BadRequestError('category is required');
      }
      if (!merchant) {
        throw new BadRequestError('merchant is required');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }

      // Format amount (negative for expense, positive for income)
      const formattedAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);

      const transaction = await Transaction.create({
        userId,
        amount: formattedAmount,
        type,
        category,
        merchant,
        description: description || '',
        date: date ? new Date(date) : new Date(),
        recurring: !!recurring,
        categorySource: categorySource || 'user'
      });

      // Proactively recalculate recommendations in background
      RecommendationEngine.generateRecommendations(userId.toString()).catch(err => {
        console.error(`[Engine Background Error] Failed to update recommendations for user ${userId}:`, err);
      });

      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: transaction
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { amount, type, category, merchant, description, date, recurring, categorySource } = req.body;

      const transaction = await Transaction.findById(id);
      if (!transaction) {
        throw new NotFoundError(`Transaction with ID ${id} not found`);
      }

      if (amount !== undefined) {
        const checkType = type || transaction.type;
        transaction.amount = checkType === 'expense' ? -Math.abs(amount) : Math.abs(amount);
      }
      if (type) {
        transaction.type = type;
        // recalculate sign of amount
        transaction.amount = type === 'expense' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);
      }
      if (category) transaction.category = category;
      if (merchant) transaction.merchant = merchant;
      if (description !== undefined) transaction.description = description;
      if (date) transaction.date = new Date(date);
      if (recurring !== undefined) transaction.recurring = recurring;
      if (categorySource) transaction.categorySource = categorySource;

      await transaction.save();

      // Recalculate recommendations
      RecommendationEngine.generateRecommendations(transaction.userId.toString()).catch(err => {
        console.error(`[Engine Background Error] Failed to update recommendations for user ${transaction.userId}:`, err);
      });

      res.status(200).json({
        success: true,
        message: 'Transaction updated successfully',
        data: transaction
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const transaction = await Transaction.findById(req.params.id);
      if (!transaction) {
        throw new NotFoundError(`Transaction with ID ${id} not found`);
      }

      const userId = transaction.userId.toString();
      await transaction.deleteOne();

      // Recalculate recommendations
      RecommendationEngine.generateRecommendations(userId).catch(err => {
        console.error(`[Engine Background Error] Failed to update recommendations for user ${userId}:`, err);
      });

      res.status(200).json({
        success: true,
        message: 'Transaction deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getTransactionSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = req.params;
      const state = await RecommendationEngine.buildFinancialState(userId);

      // Return budget summary comparisons
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }

      // Standard budget targets (50/30/20 or user custom limits)
      const needsLimitPercent = 50;
      const wantsLimitPercent = 30;
      const savingsLimitPercent = 20;

      const needsTarget = state.monthlyIncome * (needsLimitPercent / 100);
      const wantsTarget = state.monthlyIncome * (wantsLimitPercent / 100);
      const savingsTarget = state.monthlyIncome * (savingsLimitPercent / 100);

      res.status(200).json({
        success: true,
        data: {
          monthlyIncome: state.monthlyIncome,
          currentBalance: state.currentBalance,
          breakdown: {
            needs: {
              actual: state.monthlyEssentialExpenses,
              target: needsTarget,
              percentageActual: state.monthlyIncome > 0 ? (state.monthlyEssentialExpenses / state.monthlyIncome) * 100 : 0,
              percentageTarget: needsLimitPercent
            },
            wants: {
              actual: state.monthlyDiscretionaryExpenses,
              target: wantsTarget,
              percentageActual: state.monthlyIncome > 0 ? (state.monthlyDiscretionaryExpenses / state.monthlyIncome) * 100 : 0,
              percentageTarget: wantsLimitPercent
            },
            savings: {
              actual: state.availableMonthlySavings,
              target: savingsTarget,
              percentageActual: state.savingsRate,
              percentageTarget: savingsLimitPercent
            }
          },
          subscriptions: state.subscriptions
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
