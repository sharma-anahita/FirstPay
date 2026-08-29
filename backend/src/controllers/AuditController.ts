import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';
import { User } from '../models/User';
import { NotFoundError } from '../middleware/errorHandler';

export class AuditController {
  public static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = req.params;
      
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }

      const auditLogs = await AuditLog.find({ userId })
        .sort({ timestamp: -1 })
        .limit(100); // Caps at latest 100 entries

      res.status(200).json({
        success: true,
        data: auditLogs
      });
    } catch (error) {
      next(error);
    }
  }
}
