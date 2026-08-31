import { RecommendationEngine, IFinancialState, IGoalCalculations } from './engine';

describe('Recommendation Engine Core Calculations', () => {
  const dummyUser = {
    monthlyIncome: 50000,
    minimumSafetyBuffer: 3 // 3 months of essential expenses
  };

  const today = new Date();

  // Helper to construct a future date in months
  const getFutureDate = (months: number): Date => {
    const d = new Date();
    d.setDate(15); // Set to middle of month to avoid month end rollover overflows
    d.setMonth(d.getMonth() + months);
    return d;
  };

  describe('1. Financial State Calculator & Category Classification', () => {
    it('should classify transaction categories correctly', () => {
      expect(RecommendationEngine.classifyCategory('Rent')).toBe('needs');
      expect(RecommendationEngine.classifyCategory('Groceries')).toBe('needs');
      expect(RecommendationEngine.classifyCategory('Dining Out')).toBe('wants');
      expect(RecommendationEngine.classifyCategory('Subscriptions')).toBe('wants');
      expect(RecommendationEngine.classifyCategory('Mutual Funds')).toBe('savings');
    });

    it('should calculate rolling state metrics and current balance accurately', () => {
      const mockTransactions = [
        { amount: 50000, type: 'income', category: 'Salary', recurring: true, date: today },
        { amount: -15000, type: 'expense', category: 'Rent', recurring: true, date: today },
        { amount: -5000, type: 'expense', category: 'Groceries', recurring: false, date: today },
        { amount: -10000, type: 'expense', category: 'Dining Out', recurring: false, date: today },
        { amount: -2000, type: 'expense', category: 'Subscriptions', recurring: true, date: today }
      ];

      const state = RecommendationEngine.calculateFinancialState(dummyUser, mockTransactions);

      expect(state.monthlyIncome).toBe(50000);
      expect(state.monthlyEssentialExpenses).toBe(20000); // Rent + Groceries
      expect(state.monthlyDiscretionaryExpenses).toBe(12000); // Dining Out + Subscriptions
      expect(state.monthlyRecurringExpenses).toBe(17000); // Rent + Subscriptions are both recurring
      expect(state.currentBalance).toBe(18000); // 50000 - 15000 - 5000 - 10000 - 2000
      expect(state.availableMonthlySavings).toBe(18000); // 50000 - 32000
      expect(state.savingsRate).toBe(36); // 18000 / 50000 * 100
      expect(state.minimumSafetyBuffer).toBe(60000); // Essential (20000) * 3
    });
  });

  describe('2. Goal Metrics & Prioritized Savings Allocation', () => {
    it('should identify a feasible goal where surplus exceeds required monthly savings', () => {
      const state: IFinancialState = {
        userId: 'test-user',
        monthlyIncome: 50000,
        monthlyEssentialExpenses: 20000,
        monthlyDiscretionaryExpenses: 10000,
        monthlyRecurringExpenses: 1000,
        averageMonthlyExpenses: 30000,
        currentBalance: 80000, // safety buffer satisfied (80000 > 60000)
        currentSavings: 80000,
        availableMonthlySavings: 20000,
        savingsRate: 40,
        minimumSafetyBuffer: 60000
      };

      const goals = [
        { id: 'goal-1', name: 'Buy Laptop', targetAmount: 60000, currentAmount: 10000, targetDate: getFutureDate(5), priority: 'high' as const }
      ];

      // gap = 50000, months = 5 -> required = 10000/mo. Surplus = 20000.
      const metrics = RecommendationEngine.calculateGoalMetrics(state, goals);
      expect(metrics[0].requiredMonthlySaving).toBe(10000);
      expect(metrics[0].currentMonthlySavingCapacity).toBe(10000);
      expect(metrics[0].feasibility).toBe('feasible');
    });

    it('should identify an infeasible goal if required savings exceed available surplus', () => {
      const state: IFinancialState = {
        userId: 'test-user',
        monthlyIncome: 30000,
        monthlyEssentialExpenses: 15000,
        monthlyDiscretionaryExpenses: 12000,
        monthlyRecurringExpenses: 500,
        averageMonthlyExpenses: 27000,
        currentBalance: 40000,
        currentSavings: 40000,
        availableMonthlySavings: 3000, // very low surplus
        savingsRate: 10,
        minimumSafetyBuffer: 45000
      };

      const goals = [
        { id: 'goal-1', name: 'Ladakh Trip', targetAmount: 40000, currentAmount: 10000, targetDate: getFutureDate(3), priority: 'medium' as const }
      ];

      // gap = 30000, months = 3 -> required = 10000/mo. Surplus = 3000.
      const metrics = RecommendationEngine.calculateGoalMetrics(state, goals);
      expect(metrics[0].requiredMonthlySaving).toBe(10000);
      expect(metrics[0].feasibility).toBe('unfeasible');
    });

    it('should handle sequential surplus allocation for multiple goals correctly based on priority', () => {
      const state: IFinancialState = {
        userId: 'test-user',
        monthlyIncome: 50000,
        monthlyEssentialExpenses: 20000,
        monthlyDiscretionaryExpenses: 10000,
        monthlyRecurringExpenses: 0,
        averageMonthlyExpenses: 30000,
        currentBalance: 90000,
        currentSavings: 90000,
        availableMonthlySavings: 20000,
        savingsRate: 40,
        minimumSafetyBuffer: 60000
      };

      // Two goals: High priority gets allocation first, Medium priority gets leftovers
      const goals = [
        { id: 'goal-low', name: 'Low Priority Goal', targetAmount: 30000, currentAmount: 0, targetDate: getFutureDate(5), priority: 'low' as const },
        { id: 'goal-high', name: 'High Priority Goal', targetAmount: 60000, currentAmount: 0, targetDate: getFutureDate(4), priority: 'high' as const }
      ];

      // goal-high: gap 60000, months 4 -> requires 15000/mo
      // goal-low: gap 30000, months 5 -> requires 6000/mo
      // Surplus = 20000. High gets 15000. Low gets remaining 5000.
      const metrics = RecommendationEngine.calculateGoalMetrics(state, goals);
      
      const highMetric = metrics.find(m => m.goalId === 'goal-high')!;
      const lowMetric = metrics.find(m => m.goalId === 'goal-low')!;

      expect(highMetric.currentMonthlySavingCapacity).toBe(15000);
      expect(highMetric.feasibility).toBe('feasible');
      
      expect(lowMetric.currentMonthlySavingCapacity).toBe(5000); // Leftover surplus
      expect(lowMetric.feasibility).toBe('feasible_with_adjustments'); // requires cuts to cover remaining 1000/mo
    });
  });

  describe('3. Multi-Strategy Generation & Safety Buffers', () => {
    it('should generate strategies and enforce safety buffer penalties when reserves are low', () => {
      const state: IFinancialState = {
        userId: 'test-user',
        monthlyIncome: 40000,
        monthlyEssentialExpenses: 20000,
        monthlyDiscretionaryExpenses: 15000,
        monthlyRecurringExpenses: 2000,
        averageMonthlyExpenses: 35000,
        currentBalance: 15000, // VIOLATED: Min Safety Buffer target is 60,000 (20k * 3)
        currentSavings: 15000,
        availableMonthlySavings: 5000,
        savingsRate: 12.5,
        minimumSafetyBuffer: 60000
      };

      const goalMetric: IGoalCalculations = {
        goalId: 'goal-1',
        name: 'iPhone',
        requiredAmount: 50000,
        remainingAmount: 40000,
        monthsRemaining: 4,
        requiredMonthlySaving: 10000,
        currentMonthlySavingCapacity: 5000,
        feasibility: 'feasible_with_adjustments'
      };

      const strategies = RecommendationEngine.generateStrategiesForGoal(state, goalMetric, 3);

      expect(strategies.length).toBe(3); // Conservative, Balanced, Aggressive
      
      // Safety buffer violation warnings check
      strategies.forEach(s => {
        expect(s.rulesTriggered).toContain('RULE_SAFETY_BUFFER_ALERT');
        expect(s.explanation).toContain('WARNING: Your current reserves');
      });

      // Aggressive plan check (discretionary spending wants cut by 40%, subscription cut by 50%)
      const aggPlan = strategies.find(s => s.strategyType === 'aggressive')!;
      expect(aggPlan.monthlySavingTarget).toBe(12000); // 5000 base + 6000 wants cut + 1000 sub cut
      expect(aggPlan.projectedGoalDate).toBeDefined();
      expect(aggPlan.score).toBeLessThan(90); // Penalized due to low safety buffer
    });

    it('should forecast delayed deadlines if available surplus is insufficient', () => {
      const state: IFinancialState = {
        userId: 'test-user',
        monthlyIncome: 25000,
        monthlyEssentialExpenses: 15000,
        monthlyDiscretionaryExpenses: 9000,
        monthlyRecurringExpenses: 0,
        averageMonthlyExpenses: 24000,
        currentBalance: 50000,
        currentSavings: 50000,
        availableMonthlySavings: 1000,
        savingsRate: 4,
        minimumSafetyBuffer: 45000
      };

      const goalMetric: IGoalCalculations = {
        goalId: 'goal-1',
        name: 'Certification',
        requiredAmount: 10000,
        remainingAmount: 9000,
        monthsRemaining: 3,
        requiredMonthlySaving: 3000,
        currentMonthlySavingCapacity: 1000,
        feasibility: 'unfeasible'
      };

      const strategies = RecommendationEngine.generateStrategiesForGoal(state, goalMetric, 3);
      const consPlan = strategies.find(s => s.strategyType === 'conservative')!;

      // Conservative plan keeps surplus at 1000. Gap is 9000. Needs 9 months.
      expect(consPlan.monthlySavingTarget).toBe(1000);
      expect(consPlan.feasibility).toBe('critical'); // target deadline is 3 months, needs 9 months
      expect(consPlan.explanation).toContain('extending the target date by 6 month(s)');
    });
  });
});
