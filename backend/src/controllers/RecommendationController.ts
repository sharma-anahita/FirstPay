import { Request, Response, NextFunction } from 'express';
import { Recommendation } from '../models/Recommendation';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { NotFoundError } from '../middleware/errorHandler';
import { RecommendationEngine } from '../services/recommendation/engine';

export class RecommendationController {
  public static async getRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = req.params;
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }

      // Fetch only pending recommendations
      const recommendations = await Recommendation.find({ userId, status: 'pending' }).sort({ score: -1 });

      res.status(200).json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      next(error);
    }
  }

  public static async generateRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = req.params;
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }

      const recs = await RecommendationEngine.generateRecommendations(userId);

      res.status(200).json({
        success: true,
        message: `Successfully evaluated recommendations. Created ${recs.length} actionable advice entries.`,
        data: recs
      });
    } catch (error) {
      next(error);
    }
  }

  public static async acceptRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rec = await Recommendation.findById(id);
      if (!rec) {
        throw new NotFoundError(`Recommendation with ID ${id} not found`);
      }

      rec.status = 'accepted';
      await rec.save();

      // Create Audit Log
      await AuditLog.create({
        userId: rec.userId,
        action: 'accept_recommendation',
        entityType: 'Recommendation',
        entityId: rec._id,
        inputSnapshot: { title: rec.title, type: rec.type, rulesTriggered: rec.rulesTriggered },
        output: { status: 'accepted', actionTimestamp: new Date() }
      });

      res.status(200).json({
        success: true,
        message: 'Recommendation accepted and logged to audit trail.',
        data: rec
      });
    } catch (error) {
      next(error);
    }
  }

  public static async rejectRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rec = await Recommendation.findById(id);
      if (!rec) {
        throw new NotFoundError(`Recommendation with ID ${id} not found`);
      }

      rec.status = 'rejected';
      await rec.save();

      // Create Audit Log
      await AuditLog.create({
        userId: rec.userId,
        action: 'reject_recommendation',
        entityType: 'Recommendation',
        entityId: rec._id,
        inputSnapshot: { title: rec.title, type: rec.type, rulesTriggered: rec.rulesTriggered },
        output: { status: 'rejected', actionTimestamp: new Date() }
      });

      res.status(200).json({
        success: true,
        message: 'Recommendation rejected and logged to audit trail.',
        data: rec
      });
    } catch (error) {
      next(error);
    }
  }
}
