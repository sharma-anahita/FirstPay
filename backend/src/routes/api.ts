import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { TransactionController } from '../controllers/TransactionController';
import { GoalController } from '../controllers/GoalController';
import { RecommendationController } from '../controllers/RecommendationController';
import { PlanController } from '../controllers/PlanController';
import { AuditController } from '../controllers/AuditController';
import { DashboardController } from '../controllers/DashboardController';
import { AIController } from '../controllers/AIController';

const router = Router();

// --- AUTH/USER ENDPOINTS ---
router.get('/users', UserController.getUsers);
router.get('/users/:id', UserController.getUser);
router.put('/users/:id', UserController.updateUser);

// --- TRANSACTION ENDPOINTS ---
router.get('/users/:id/transactions', TransactionController.getTransactions);
router.post('/users/:id/transactions', TransactionController.createTransaction);
router.put('/transactions/:id', TransactionController.updateTransaction);
router.delete('/transactions/:id', TransactionController.deleteTransaction);
router.get('/users/:id/transactions/summary', TransactionController.getTransactionSummary);

// --- GOALS ENDPOINTS ---
router.get('/users/:id/goals', GoalController.getGoals);
router.post('/users/:id/goals', GoalController.createGoal);
router.put('/goals/:id', GoalController.updateGoal);
router.delete('/goals/:id', GoalController.deleteGoal);
router.get('/goals/:id/progress', GoalController.getGoalProgress);

// --- FINANCIAL SUMMARY (DASHBOARD) ---
router.get('/users/:id/dashboard', DashboardController.getDashboardSummary);

// --- RECOMMENDATIONS ENDPOINTS ---
router.get('/users/:id/recommendations', RecommendationController.getRecommendations);
router.post('/users/:id/recommendations/generate', RecommendationController.generateRecommendations);
router.post('/recommendations/:id/accept', RecommendationController.acceptRecommendation);
router.post('/recommendations/:id/reject', RecommendationController.rejectRecommendation);

// --- GOAL STRATEGY PLANS ENDPOINTS ---
router.post('/goals/:id/plans', PlanController.generatePlans);
router.get('/goals/:id/plans', PlanController.getPlans);
router.post('/plans/:id/select', PlanController.selectPlan);

// --- AUDIT TRAIL ENDPOINTS ---
router.get('/users/:id/audit-log', AuditController.getAuditLogs);

// --- AI LAYER ENDPOINTS ---
router.post('/users/:userId/chat', AIController.chat);

export default router;
