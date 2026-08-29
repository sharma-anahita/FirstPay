import { Request, Response, NextFunction } from 'express';
import { AIService } from '../services/ai/aiService';

export class AIController {
  public static async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { message } = req.body;

      if (!message) {
        res.status(400).json({
          success: false,
          error: 'Message parameter is required for conversational query.'
        });
        return;
      }

      const response = await AIService.chat(userId, message);

      res.status(200).json({
        success: true,
        data: {
          response
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
