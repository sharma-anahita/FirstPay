import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';

export class UserController {
  public static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await User.find({}).sort({ name: 1 });
      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        throw new NotFoundError(`User with ID ${id} not found`);
      }
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, monthlyIncome, employmentType, experienceLevel, minimumSafetyBuffer } = req.body;

      // Validation
      if (monthlyIncome !== undefined && (typeof monthlyIncome !== 'number' || monthlyIncome < 0)) {
        throw new BadRequestError('monthlyIncome must be a positive number');
      }
      if (minimumSafetyBuffer !== undefined && (typeof minimumSafetyBuffer !== 'number' || minimumSafetyBuffer < 0)) {
        throw new BadRequestError('minimumSafetyBuffer must be a positive number');
      }

      const user = await User.findById(id);
      if (!user) {
        throw new NotFoundError(`User with ID ${id} not found`);
      }

      if (name) user.name = name;
      if (monthlyIncome !== undefined) user.monthlyIncome = monthlyIncome;
      if (employmentType) user.employmentType = employmentType;
      if (experienceLevel) user.experienceLevel = experienceLevel;
      if (minimumSafetyBuffer !== undefined) user.minimumSafetyBuffer = minimumSafetyBuffer;

      await user.save();

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
}
