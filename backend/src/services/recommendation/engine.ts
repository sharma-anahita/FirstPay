import { Types } from 'mongoose';
import { User, IUser } from '../../models/User';
import { Transaction, ITransaction } from '../../models/Transaction';
import { FinancialGoal, IFinancialGoal } from '../../models/FinancialGoal';
import { Recommendation, IRecommendation } from '../../models/Recommendation';
import { FinancialPlan, IFinancialPlan } from '../../models/FinancialPlan';
import { AuditLog } from '../../models/AuditLog';

// Interface matching the user request specifications
export interface IFinancialState {
  userId: string;
  monthlyIncome: number;
  monthlyEssentialExpenses: number; // Needs
  monthlyDiscretionaryExpenses: number; // Wants
  monthlyRecurringExpenses: number; // Subscriptions
  averageMonthlyExpenses: number; // Essential + Discretionary
  currentBalance: number;
  currentSavings: number; // Equivalent to currentBalance
  availableMonthlySavings: number; // monthlyIncome - averageMonthlyExpenses
  savingsRate: number; // percentage (0-100)
  minimumSafetyBuffer: number; // (monthlyEssentialExpenses * user.minimumSafetyBuffer)
}

export interface IGoalCalculations {
  goalId: string;
  name: string;
  requiredAmount: number; // targetAmount
  remainingAmount: number; // targetAmount - currentAmount
  monthsRemaining: number;
  requiredMonthlySaving: number; // remainingAmount / monthsRemaining
  currentMonthlySavingCapacity: number; // Allocated surplus
  feasibility: 'feasible' | 'feasible_with_adjustments' | 'unfeasible';
}

export interface ICandidateStrategy {
  strategyType: 'conservative' | 'balanced' | 'aggressive';
  monthlySavingTarget: number;
  spendingAdjustments: { category: string; originalAmount: number; newAmount: number; difference: number }[];
  projectedBalance: number;
  projectedGoalDate: Date;
  safetyBuffer: number; // months of essential expenses
  feasibility: 'feasible' | 'unfeasible' | 'critical';
  score: number;
  assumptions: string[];
  rulesTriggered: string[];
  explanation: string;
}

export class RecommendationEngine {
  /**
   * Identifies whether a category is Essential (Needs), Discretionary (Wants), or Savings
   */
  public static classifyCategory(categoryName: string): 'needs' | 'wants' | 'savings' {
    const category = categoryName.toLowerCase();
    const needsList = ['rent', 'groceries', 'utilities', 'transport', 'medicine', 'insurance', 'bill', 'loan', 'emi', 'public transport'];
    const wantsList = ['dining out', 'entertainment', 'subscriptions', 'shopping', 'travel', 'coffee', 'leisure', 'ott', 'cafe', 'food'];
    const savingsList = ['emergency fund', 'mutual funds', 'investments', 'savings', 'deposit'];

    if (needsList.some(c => category.includes(c))) return 'needs';
    if (wantsList.some(c => category.includes(c))) return 'wants';
    if (savingsList.some(c => category.includes(c))) return 'savings';
    return 'wants'; // Default discretionary
  }

  /**
   * Deterministically calculates the user's Financial State
   */
  public static calculateFinancialState(
    user: { monthlyIncome: number; minimumSafetyBuffer: number },
    transactions: { amount: number; type: string; category: string; recurring: boolean; date: Date }[]
  ): IFinancialState {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let monthlyEssentialExpenses = 0;
    let monthlyDiscretionaryExpenses = 0;
    let monthlyRecurringExpenses = 0;
    let currentBalance = 0;

    // Map to find subscription costs in the last 30 days
    const subscriptionCosts = new Map<string, number>();

    transactions.forEach(t => {
      currentBalance += t.amount;

      // Only check details for the last 30 days for rolling budget calculations
      if (t.date >= thirtyDaysAgo && t.type === 'expense') {
        const categoryClass = this.classifyCategory(t.category);
        const absAmount = Math.abs(t.amount);

        if (categoryClass === 'needs') {
          monthlyEssentialExpenses += absAmount;
        } else if (categoryClass === 'wants') {
          monthlyDiscretionaryExpenses += absAmount;
        }

        if (t.recurring || t.category.toLowerCase() === 'subscriptions' || t.category.toLowerCase() === 'ott') {
          monthlyRecurringExpenses += absAmount;
        }
      }
    });

    // Provide healthy fallbacks if database lacks transaction history
    if (monthlyEssentialExpenses === 0) {
      monthlyEssentialExpenses = user.monthlyIncome * 0.45;
    }
    if (monthlyDiscretionaryExpenses === 0) {
      monthlyDiscretionaryExpenses = user.monthlyIncome * 0.35;
    }

    const averageMonthlyExpenses = monthlyEssentialExpenses + monthlyDiscretionaryExpenses;
    const availableMonthlySavings = Math.max(0, user.monthlyIncome - averageMonthlyExpenses);
    const savingsRate = user.monthlyIncome > 0 ? (availableMonthlySavings / user.monthlyIncome) * 100 : 0;
    const minimumSafetyBuffer = monthlyEssentialExpenses * user.minimumSafetyBuffer;

    return {
      userId: '',
      monthlyIncome: user.monthlyIncome,
      monthlyEssentialExpenses,
      monthlyDiscretionaryExpenses,
      monthlyRecurringExpenses,
      averageMonthlyExpenses,
      currentBalance,
      currentSavings: currentBalance,
      availableMonthlySavings,
      savingsRate,
      minimumSafetyBuffer
    };
  }

  /**
   * Deterministically calculates goal details and allocates current monthly savings sequential priorities
   */
  public static calculateGoalMetrics(
    state: IFinancialState,
    goals: { id: string; name: string; targetAmount: number; currentAmount: number; targetDate: Date; priority: 'low' | 'medium' | 'high' }[]
  ): IGoalCalculations[] {
    const now = new Date();

    // 1. Sort goals sequentially: High Priority > Medium Priority > Low Priority
    const priorityWeights = { high: 3, medium: 2, low: 1 };
    const sortedGoals = [...goals].sort((a, b) => priorityWeights[b.priority] - priorityWeights[a.priority]);

    // 2. Enforce Emergency Buffer constraint: If current safety balance is below the minimum buffer,
    // we redirect 75% of available monthly savings into building a temporary Emergency Buffer, leaving only 25% for other goals.
    const isBufferViolated = state.currentBalance < state.minimumSafetyBuffer;
    let remainingSurplus = state.availableMonthlySavings;
    let bufferAllocation = 0;

    if (isBufferViolated && remainingSurplus > 0) {
      bufferAllocation = remainingSurplus * 0.75;
      remainingSurplus -= bufferAllocation;
    }

    // 3. Allocate capital sequentially to each goal based on priority
    const goalCapacityMap = new Map<string, number>();

    sortedGoals.forEach(g => {
      const remainingAmount = Math.max(0, g.targetAmount - g.currentAmount);
      const targetDate = new Date(g.targetDate);
      let monthsRemaining = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
      if (monthsRemaining <= 0) monthsRemaining = 1;

      const requiredSaving = remainingAmount / monthsRemaining;

      // Allocate available surplus up to the goal's monthly required target
      const allocation = Math.min(remainingSurplus, requiredSaving);
      goalCapacityMap.set(g.id, allocation);
      remainingSurplus -= allocation;
    });

    // 4. Map goals back into calculations objects
    return goals.map(g => {
      const remainingAmount = Math.max(0, g.targetAmount - g.currentAmount);
      const targetDate = new Date(g.targetDate);
      let monthsRemaining = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
      if (monthsRemaining <= 0) monthsRemaining = 1;

      const requiredMonthlySaving = remainingAmount / monthsRemaining;
      const currentMonthlySavingCapacity = goalCapacityMap.get(g.id) || 0;

      let feasibility: 'feasible' | 'feasible_with_adjustments' | 'unfeasible' = 'unfeasible';
      if (currentMonthlySavingCapacity >= requiredMonthlySaving) {
        feasibility = 'feasible';
      } else if (state.availableMonthlySavings + state.monthlyDiscretionaryExpenses * 0.4 > requiredMonthlySaving) {
        // feasible if wants cut by 40%
        feasibility = 'feasible_with_adjustments';
      }

      return {
        goalId: g.id,
        name: g.name,
        requiredAmount: g.targetAmount,
        remainingAmount,
        monthsRemaining,
        requiredMonthlySaving: Math.round(requiredMonthlySaving),
        currentMonthlySavingCapacity: Math.round(currentMonthlySavingCapacity),
        feasibility
      };
    });
  }

  /**
   * Deterministically generates strategy options (Conservative, Balanced, Aggressive)
   */
  public static generateStrategiesForGoal(
    state: IFinancialState,
    goalCalculations: IGoalCalculations,
    userMinSafetyMonths: number
  ): ICandidateStrategy[] {
    const gap = goalCalculations.remainingAmount;
    const monthsRemaining = goalCalculations.monthsRemaining;
    const requiredSaving = goalCalculations.requiredMonthlySaving;

    // Base inputs
    const currentWants = state.monthlyDiscretionaryExpenses;
    const currentNeeds = state.monthlyEssentialExpenses;
    const baseSurplus = state.availableMonthlySavings;

    // --- Configurable Scoring Weights ---
    const weights = {
      achievement: 30,
      feasibility: 25,
      safety: 25,
      lifestylePenalty: 10,
      deadlinePenalty: 10
    };

    const runStrategy = (
      type: 'conservative' | 'balanced' | 'aggressive',
      wantsReductionPercent: number,
      subReductionPercent: number
    ): ICandidateStrategy => {
      // 1. Calculate spending cuts
      const wantsCut = Math.round(currentWants * wantsReductionPercent);
      const subCut = Math.round(state.monthlyRecurringExpenses * subReductionPercent);
      const totalCuts = wantsCut + subCut;

      const newSurplus = baseSurplus + totalCuts;

      // Hard Safety Constraint: check if we exceed possible bounds
      const actualSavingsLimit = state.monthlyIncome * 0.75; // cannot recommend saving >75% of income
      const monthlySavingTarget = Math.max(0, Math.round(Math.min(newSurplus, actualSavingsLimit)));

      // 2. Project timeline
      let monthsNeeded = monthlySavingTarget > 0 ? Math.ceil(gap / monthlySavingTarget) : 999;
      if (monthsNeeded <= 0) monthsNeeded = 1;

      const projectedDate = new Date();
      projectedDate.setMonth(projectedDate.getMonth() + monthsNeeded);

      const isAchievedOnTime = monthsNeeded <= monthsRemaining;

      // 3. Evaluate safety buffer levels
      const safetyBufferRatio = currentNeeds > 0 ? Math.max(0, state.currentBalance / currentNeeds) : 0;
      const isBufferMaintained = state.currentBalance >= state.minimumSafetyBuffer;

      // Feasibility class
      let feasibility: 'feasible' | 'unfeasible' | 'critical' = 'feasible';
      if (!isAchievedOnTime) {
        feasibility = monthsNeeded <= monthsRemaining * 1.5 ? 'unfeasible' : 'critical';
      }

      // 4. Compute Transparent Score
      // Score elements range from 0 to 100 before applying weights
      const achievementScore = isAchievedOnTime ? 100 : Math.max(0, 100 - (monthsNeeded - monthsRemaining) * 8);
      const feasibilityScore = monthlySavingTarget >= requiredSaving ? 100 : (monthlySavingTarget / requiredSaving) * 100;
      const safetyScore = isBufferMaintained ? 100 : (state.currentBalance / state.minimumSafetyBuffer) * 100;

      const lifestyleDisruptionPenalty = wantsReductionPercent * 100; // e.g. 15% wants cut = 15 penalty
      const deadlineRiskPenalty = isAchievedOnTime ? 0 : Math.min(100, (monthsNeeded - monthsRemaining) * 5);

      const weightedScore = Math.round(
        (achievementScore * weights.achievement) / 100 +
        (feasibilityScore * weights.feasibility) / 100 +
        (safetyScore * weights.safety) / 100 -
        (lifestyleDisruptionPenalty * weights.lifestylePenalty) / 100 -
        (deadlineRiskPenalty * weights.deadlinePenalty) / 100
      );

      const finalScore = Math.max(10, Math.min(100, weightedScore));

      // 5. Generate dynamically generated explainable text
      let explanation = '';
      const adjustmentsText = totalCuts > 0
        ? `Reducing your wants category by ₹${wantsCut.toLocaleString('en-IN')}/mo` + (subCut > 0 ? ` and subscriptions by ₹${subCut}/mo` : '')
        : 'Maintaining your current spending habits';

      if (isAchievedOnTime) {
        explanation = `Your goal '${goalCalculations.name}' requires saving ₹${requiredSaving.toLocaleString('en-IN')}/month. ${adjustmentsText} boosts your monthly savings target to ₹${monthlySavingTarget.toLocaleString('en-IN')}/month. This allows you to successfully hit your target of ₹${goalCalculations.requiredAmount.toLocaleString('en-IN')} by ${goalCalculations.monthsRemaining} months with a safety buffer of ${safetyBufferRatio.toFixed(1)}x.`;
      } else {
        const delay = monthsNeeded - monthsRemaining;
        explanation = `Your goal requires saving ₹${requiredSaving.toLocaleString('en-IN')}/month, but your projected capacity under this strategy is ₹${monthlySavingTarget.toLocaleString('en-IN')}/month. ${adjustmentsText} leaves a monthly shortage of ₹${(requiredSaving - monthlySavingTarget).toLocaleString('en-IN')}. Consequently, the engine recommends extending the target date by ${delay} month(s) (completing in ${monthsNeeded} months).`;
      }

      // Safety buffer alert injection
      if (!isBufferMaintained) {
        explanation += ` WARNING: Your current reserves (₹${state.currentBalance.toLocaleString('en-IN')}) are below the safety buffer limit of ₹${state.minimumSafetyBuffer.toLocaleString('en-IN')}. We strongly advise prioritizing emergency savings first.`;
      }

      // Adjustments structure
      const spendingAdjustments = [];
      if (wantsCut > 0) {
        spendingAdjustments.push({
          category: 'Wants',
          originalAmount: currentWants,
          newAmount: currentWants - wantsCut,
          difference: wantsCut
        });
      }
      if (subCut > 0) {
        spendingAdjustments.push({
          category: 'Subscriptions',
          originalAmount: state.monthlyRecurringExpenses,
          newAmount: state.monthlyRecurringExpenses - subCut,
          difference: subCut
        });
      }

      // Assumptions
      const assumptions = [];
      if (type === 'conservative') {
        assumptions.push('No adjustments made to current discretionary budgets.');
      } else if (type === 'balanced') {
        assumptions.push('Requires moderate 15% reduction in Wants category (dining out, entertainment).');
        if (subCut > 0) assumptions.push('Audit and cancel at least one active subscription.');
      } else {
        assumptions.push('Aggressive 40% reduction in Wants category spending.');
        if (subCut > 0) assumptions.push('Cancel overlapping subscription plans.');
      }
      assumptions.push(`Assumes income remains stable at ₹${state.monthlyIncome.toLocaleString('en-IN')}/month.`);

      return {
        strategyType: type,
        monthlySavingTarget,
        spendingAdjustments,
        projectedBalance: goalCalculations.requiredAmount,
        projectedGoalDate: projectedDate,
        safetyBuffer: safetyBufferRatio,
        feasibility,
        score: finalScore,
        assumptions,
        rulesTriggered: [
          type === 'conservative' ? 'RULE_CONS_MINIMAL_CHANGE' : type === 'balanced' ? 'RULE_BAL_MODERATE_TRIM' : 'RULE_AGG_AGGRESSIVE_SLASH',
          !isBufferMaintained ? 'RULE_SAFETY_BUFFER_ALERT' : 'RULE_SAFETY_BUFFER_OK'
        ],
        explanation
      };
    };

    return [
      runStrategy('conservative', 0.0, 0.0),
      runStrategy('balanced', 0.15, 0.20),
      runStrategy('aggressive', 0.40, 0.50)
    ];
  }

  // --- Wrapper helpers to support live controller calls ---

  public static async buildFinancialState(userId: string): Promise<any> {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const transactions = await Transaction.find({ userId });
    const baseState = this.calculateFinancialState(user, transactions);

    // Get active goals
    const dbGoals = await FinancialGoal.find({ userId: user._id, status: 'active' });

    // Calculate recent active goals progress
    const activeGoals = dbGoals.map((g) => {
      const remainingAmount = Math.max(0, g.targetAmount - g.currentAmount);
      const now = new Date();
      const targetDate = new Date(g.targetDate);
      let monthsRemaining = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
      if (monthsRemaining <= 0) monthsRemaining = 1;
      const requiredMonthlySaving = Math.round(remainingAmount / monthsRemaining);
      
      const surplus = baseState.availableMonthlySavings;
      const actualMonthlySurplus = Math.max(2000, surplus);
      const projectedCompletionMonths = Math.ceil(remainingAmount / actualMonthlySurplus);

      return {
        id: g._id.toString(),
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        targetDate: g.targetDate,
        priority: g.priority,
        category: g.category,
        requiredMonthlySaving,
        projectedCompletionMonths
      };
    });

    // Calculate subscriptions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const subscriptionsMap = new Map<string, number>();

    transactions.forEach((t) => {
      if (t.date >= thirtyDaysAgo && t.type === 'expense') {
        const categoryClass = this.classifyCategory(t.category);
        if (t.recurring || t.category.toLowerCase() === 'subscriptions' || t.category.toLowerCase() === 'ott') {
          subscriptionsMap.set(t.merchant, Math.abs(t.amount));
        }
      }
    });

    const subscriptions = Array.from(subscriptionsMap.entries()).map(([merchant, amount]) => ({
      merchant,
      amount
    }));

    return {
      ...baseState,
      userId: user._id.toString(),
      activeGoals,
      subscriptions
    };
  }

  public static async generateRecommendations(userId: string): Promise<IRecommendation[]> {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const transactions = await Transaction.find({ userId });
    const state = this.calculateFinancialState(user, transactions);

    const generatedRecommendations: IRecommendation[] = [];
    const minBufferMonths = user.minimumSafetyBuffer || 3;

    // 1. Check emergency fund rule
    if (state.currentBalance < state.minimumSafetyBuffer) {
      const gap = state.minimumSafetyBuffer - state.currentBalance;
      generatedRecommendations.push(new Recommendation({
        userId: user._id,
        type: 'emergency_fund',
        title: 'Establish Emergency Safety Reserve',
        explanation: `Your current balance (₹${state.currentBalance.toLocaleString('en-IN')}) is below your safety buffer of ₹${state.minimumSafetyBuffer.toLocaleString('en-IN')} (equivalent to ${minBufferMonths} months of basic needs: ₹${state.monthlyEssentialExpenses.toLocaleString('en-IN')}/mo). First-time earners need this cushion to absorb unexpected costs.`,
        suggestedAction: `Temporarily redirect discretionary spending to build a ₹${gap.toLocaleString('en-IN')} emergency reserve. We recommend aiming to save at least 15% of your income (₹${(state.monthlyIncome * 0.15).toLocaleString('en-IN')}/mo) until complete.`,
        estimatedMonthlyImpact: state.monthlyIncome * 0.15,
        feasibility: 'critical',
        score: 95,
        rulesTriggered: ['RULE_EMERGENCY_BUFFER_CHECK'],
        status: 'pending'
      }));
    }

    // 2. Check wants overspending
    const wantsPercent = (state.monthlyDiscretionaryExpenses / state.monthlyIncome) * 100;
    if (wantsPercent > 30) {
      const recommendSaving = Math.round(state.monthlyDiscretionaryExpenses * 0.15);
      generatedRecommendations.push(new Recommendation({
        userId: user._id,
        type: 'expense_reduction',
        title: 'Optimize Wants Spending',
        explanation: `Your non-essential spending on 'Wants' is ₹${state.monthlyDiscretionaryExpenses.toLocaleString('en-IN')}, which consumes ${wantsPercent.toFixed(1)}% of your monthly income. This exceeds the recommended 30% ceiling.`,
        suggestedAction: `Reduce discretionary spending by 15% to save ₹${recommendSaving.toLocaleString('en-IN')} per month.`,
        estimatedMonthlyImpact: recommendSaving,
        feasibility: 'feasible',
        score: 85,
        rulesTriggered: ['RULE_WANTS_LIMIT_EXCEEDED'],
        status: 'pending'
      }));
    }

    // 3. Audit subscriptions
    if (state.monthlyRecurringExpenses > 0) {
      generatedRecommendations.push(new Recommendation({
        userId: user._id,
        type: 'expense_reduction',
        title: 'Audit Recurring Subscriptions',
        explanation: `You have active recurring subscriptions costing ₹${state.monthlyRecurringExpenses.toLocaleString('en-IN')}/mo. Recurring charges creep up silently and drain savings potential.`,
        suggestedAction: 'Audit your active streaming services and cancel at least one unused membership.',
        estimatedMonthlyImpact: 200,
        feasibility: 'feasible',
        score: 70,
        rulesTriggered: ['RULE_SUBSCRIPTION_CREEP_CHECK'],
        status: 'pending'
      }));
    }

    // 4. Adaptive Goal Progress & Recovery Recommendation
    const activeGoals = await FinancialGoal.find({ userId: user._id, status: 'active' });
    const now = new Date();
    const actualSurplus = state.monthlyIncome - state.monthlyEssentialExpenses - state.monthlyDiscretionaryExpenses;

    for (const goal of activeGoals) {
      const gap = Math.max(0, goal.targetAmount - goal.currentAmount);
      const targetDate = new Date(goal.targetDate);
      let monthsRemaining = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
      if (monthsRemaining <= 0) monthsRemaining = 1;

      const requiredMonthlySaving = gap / monthsRemaining;

      // Deficit check
      if (actualSurplus < requiredMonthlySaving) {
        const spendsOverage = Math.round(requiredMonthlySaving - Math.max(0, actualSurplus));
        const projectedMonths = actualSurplus > 0 ? gap / actualSurplus : 999;
        
        let delayDays = 999;
        if (projectedMonths > monthsRemaining && actualSurplus > 0) {
          delayDays = Math.round((projectedMonths - monthsRemaining) * 30.4);
        }

        const wantsRecoveryCut = Math.round(Math.min(spendsOverage, state.monthlyDiscretionaryExpenses * 0.4));
        const finalFeasibility = actualSurplus + wantsRecoveryCut >= requiredMonthlySaving ? 'feasible' : 'unfeasible';

        generatedRecommendations.push(new Recommendation({
          userId: user._id,
          goalId: goal._id,
          type: 'goal_acceleration',
          title: `Goal Overage Alert: ${goal.name} At Risk`,
          explanation: `Your spending this month is ₹${spendsOverage.toLocaleString('en-IN')} higher than planned. Your '${goal.name}' goal is now projected to be ${delayDays} days late.`,
          suggestedAction: `Apply a temporary recovery budget reduction of ₹${wantsRecoveryCut.toLocaleString('en-IN')}/mo on your discretionary Wants to recover this delay and stay on track.`,
          estimatedMonthlyImpact: wantsRecoveryCut,
          feasibility: finalFeasibility,
          score: 90,
          rulesTriggered: ['RULE_GOAL_TIMELINE_DELAY_ALERT', 'RULE_GOAL_RECOVERY_TRIM'],
          status: 'pending'
        }));
      } else if (actualSurplus > requiredMonthlySaving * 1.25) {
        // Ahead of schedule check
        const accelMonths = actualSurplus > 0 ? gap / actualSurplus : 0;
        const daysSaved = Math.round((monthsRemaining - accelMonths) * 30.4);

        if (daysSaved > 2) {
          generatedRecommendations.push(new Recommendation({
            userId: user._id,
            goalId: goal._id,
            type: 'goal_acceleration',
            title: `Goal Speedup: ${goal.name} Ahead of Schedule`,
            explanation: `Your actual monthly savings surplus of ₹${Math.round(actualSurplus).toLocaleString('en-IN')} is ₹${Math.round(actualSurplus - requiredMonthlySaving).toLocaleString('en-IN')} higher than the required ₹${Math.round(requiredMonthlySaving).toLocaleString('en-IN')}/mo.`,
            suggestedAction: `Maintain your current spending habits to achieve your goal '${goal.name}' ${daysSaved} days ahead of schedule, or reallocate ₹${Math.round(actualSurplus - requiredMonthlySaving).toLocaleString('en-IN')}/mo to lower priority goals.`,
            estimatedMonthlyImpact: 0,
            feasibility: 'feasible',
            score: 65,
            rulesTriggered: ['RULE_GOAL_AHEAD_OF_SCHEDULE'],
            status: 'pending'
          }));
        }
      }
    }

    if (generatedRecommendations.length > 0) {
      await Recommendation.deleteMany({ userId: user._id, status: 'pending' });
      await Recommendation.insertMany(generatedRecommendations);
    }

    // Log evaluation run
    await AuditLog.create({
      userId: user._id,
      action: 'generate_recommendations',
      entityType: 'System',
      inputSnapshot: state,
      rulesApplied: ['RULE_EMERGENCY_BUFFER_CHECK', 'RULE_WANTS_LIMIT_EXCEEDED', 'RULE_SUBSCRIPTION_CREEP_CHECK', 'RULE_GOAL_TIMELINE_DELAY_ALERT', 'RULE_GOAL_RECOVERY_TRIM', 'RULE_GOAL_AHEAD_OF_SCHEDULE'],
      output: { count: generatedRecommendations.length }
    });

    return generatedRecommendations;
  }

  public static async generateGoalPlans(userId: string, goalId: string): Promise<any[]> {
    const user = await User.findById(userId);
    const goal = await FinancialGoal.findById(goalId);

    if (!user || !goal) throw new Error('User or Goal not found');

    const transactions = await Transaction.find({ userId });
    const state = this.calculateFinancialState(user, transactions);

    const goalCalcs = this.calculateGoalMetrics(state, [{
      id: goal._id.toString(),
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate,
      priority: goal.priority
    }])[0];

    const strategies = this.generateStrategiesForGoal(state, goalCalcs, user.minimumSafetyBuffer);

    const dbPlans = strategies.map(s => ({
      userId: user._id,
      goalId: goal._id,
      strategyType: s.strategyType,
      monthlySavingTarget: s.monthlySavingTarget,
      spendingAdjustments: s.spendingAdjustments,
      projectedBalance: s.projectedBalance,
      projectedGoalDate: s.projectedGoalDate,
      feasibility: s.feasibility,
      safetyBuffer: s.safetyBuffer,
      score: s.score,
      assumptions: s.assumptions
    }));

    await FinancialPlan.deleteMany({ goalId: goal._id });
    const createdPlans = await FinancialPlan.insertMany(dbPlans);

    // Audit select log
    await AuditLog.create({
      userId: user._id,
      action: 'generate_goal_plans',
      entityType: 'FinancialGoal',
      entityId: goal._id,
      inputSnapshot: state,
      rulesApplied: ['RULE_CONS_MINIMAL_CHANGE', 'RULE_BAL_MODERATE_TRIM', 'RULE_AGG_AGGRESSIVE_SLASH'],
      output: { plansGenerated: createdPlans.length }
    });

    return createdPlans;
  }
}
