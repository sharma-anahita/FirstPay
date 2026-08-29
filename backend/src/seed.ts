import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { User } from './models/User';
import { Transaction } from './models/Transaction';
import { FinancialGoal } from './models/FinancialGoal';
import { Recommendation } from './models/Recommendation';
import { FinancialPlan } from './models/FinancialPlan';
import { AuditLog } from './models/AuditLog';

// Helper to get dates in the past
const getPastDate = (daysAgo: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

const runSeed = async () => {
  console.log('[Seed] Starting synthetic database seeding...');
  await connectDB();

  // Clear existing collections
  await User.deleteMany({});
  await Transaction.deleteMany({});
  await FinancialGoal.deleteMany({});
  await Recommendation.deleteMany({});
  await FinancialPlan.deleteMany({});
  await AuditLog.deleteMany({});
  console.log('[Seed] Cleared existing data.');

  // 1. Create Users
  const users = await User.create([
    {
      name: 'Aarav Patel',
      email: 'aarav.patel@student.in',
      monthlyIncome: 15000,
      employmentType: 'student',
      experienceLevel: 'beginner',
      minimumSafetyBuffer: 2, // 2 months buffer (Needs are low)
      createdAt: getPastDate(60)
    },
    {
      name: 'Sneha Reddy',
      email: 'sneha.reddy@freelance.com',
      monthlyIncome: 65000,
      employmentType: 'freelancer',
      experienceLevel: 'intermediate',
      minimumSafetyBuffer: 4, // 4 months (variable income)
      createdAt: getPastDate(60)
    },
    {
      name: 'Vikram Malhotra',
      email: 'vikram.m@techcorp.com',
      monthlyIncome: 95000,
      employmentType: 'full-time',
      experienceLevel: 'intermediate',
      minimumSafetyBuffer: 3, // 3 months buffer
      createdAt: getPastDate(60)
    },
    {
      name: 'Priya Sharma',
      email: 'priya.s@intern.org',
      monthlyIncome: 25000,
      employmentType: 'part-time',
      experienceLevel: 'beginner',
      minimumSafetyBuffer: 3,
      createdAt: getPastDate(60)
    },
    {
      name: 'Rohan Das',
      email: 'rohan.das@sales.co',
      monthlyIncome: 40000,
      employmentType: 'full-time',
      experienceLevel: 'beginner',
      minimumSafetyBuffer: 3,
      createdAt: getPastDate(60)
    }
  ]);

  console.log(`[Seed] Seeded ${users.length} users successfully.`);

  const [aarav, sneha, vikram, priya, rohan] = users;

  // 2. Create Goals
  const goals = await FinancialGoal.create([
    // Aarav: Student Laptop (Unfeasible - target is high and fast)
    {
      userId: aarav._id,
      name: 'MacBook Air for Coding',
      targetAmount: 85000,
      currentAmount: 5000,
      targetDate: getPastDate(-180), // 6 months from now
      priority: 'high',
      category: 'Gadgets',
      status: 'active',
      createdAt: getPastDate(30)
    },
    // Sneha: Emergency Fund & Tablet
    {
      userId: sneha._id,
      name: 'Safety Emergency Fund',
      targetAmount: 200000,
      currentAmount: 60000,
      targetDate: getPastDate(-365), // 12 months from now
      priority: 'high',
      category: 'Emergency Fund',
      status: 'active',
      createdAt: getPastDate(45)
    },
    {
      userId: sneha._id,
      name: 'Wacom Graphics Tablet',
      targetAmount: 70000,
      currentAmount: 15000,
      targetDate: getPastDate(-120), // 4 months from now
      priority: 'medium',
      category: 'Gadgets',
      status: 'active',
      createdAt: getPastDate(20)
    },
    // Vikram: Pay Education Loan & Ladakh Trip
    {
      userId: vikram._id,
      name: 'Education Loan Part-Payment',
      targetAmount: 300000,
      currentAmount: 50000,
      targetDate: getPastDate(-540), // 18 months
      priority: 'high',
      category: 'Education Loan',
      status: 'active',
      createdAt: getPastDate(50)
    },
    {
      userId: vikram._id,
      name: 'Ladakh Bike Trip',
      targetAmount: 60000,
      currentAmount: 15000,
      targetDate: getPastDate(-120), // 4 months
      priority: 'low',
      category: 'Travel',
      status: 'active',
      createdAt: getPastDate(10)
    },
    // Priya: Cloud Certification
    {
      userId: priya._id,
      name: 'AWS Solutions Architect Cert',
      targetAmount: 12000,
      currentAmount: 3000,
      targetDate: getPastDate(-60), // 2 months
      priority: 'high',
      category: 'Education',
      status: 'active',
      createdAt: getPastDate(15)
    },
    // Rohan: New iPhone (Wants overspending)
    {
      userId: rohan._id,
      name: 'iPhone 16 Pro Max',
      targetAmount: 130000,
      currentAmount: 10000,
      targetDate: getPastDate(-90), // 3 months
      priority: 'medium',
      category: 'Gadgets',
      status: 'active',
      createdAt: getPastDate(20)
    }
  ]);

  console.log(`[Seed] Seeded ${goals.length} goals successfully.`);

  // 3. Transactions List
  const transactionsData = [];

  // --- Aarav Patel (Student, 15000 monthly) ---
  // Month 1 Income
  transactionsData.push(
    { userId: aarav._id, amount: 10000, type: 'income', category: 'Pocket Money', merchant: 'Parents', date: getPastDate(50), recurring: true, categorySource: 'default' },
    { userId: aarav._id, amount: 5000, type: 'income', category: 'Freelance Pay', merchant: 'Local Shop Website', date: getPastDate(45), recurring: false, categorySource: 'default' }
  );
  // Month 2 Income
  transactionsData.push(
    { userId: aarav._id, amount: 10000, type: 'income', category: 'Pocket Money', merchant: 'Parents', date: getPastDate(15), recurring: true, categorySource: 'default' },
    { userId: aarav._id, amount: 5500, type: 'income', category: 'Freelance Pay', merchant: 'Tutor Fee', date: getPastDate(10), recurring: true, categorySource: 'default' }
  );
  // Expenses - High Wants
  for (const monthOffset of [45, 15]) {
    transactionsData.push(
      { userId: aarav._id, amount: -4000, type: 'expense', category: 'Rent', merchant: 'PG Owner', date: getPastDate(monthOffset), recurring: true, categorySource: 'default' }, // Needs
      { userId: aarav._id, amount: -3000, type: 'expense', category: 'Groceries', merchant: 'Supermarket', date: getPastDate(monthOffset - 2), recurring: true, categorySource: 'default' }, // Needs
      { userId: aarav._id, amount: -1500, type: 'expense', category: 'Dining Out', merchant: 'Cafe Coffee Day', date: getPastDate(monthOffset - 5), recurring: false, categorySource: 'default' }, // Wants
      { userId: aarav._id, amount: -1200, type: 'expense', category: 'Dining Out', merchant: 'Zomato Pizza', date: getPastDate(monthOffset - 8), recurring: false, categorySource: 'default' }, // Wants
      { userId: aarav._id, amount: -999, type: 'expense', category: 'Subscriptions', merchant: 'Netflix India', date: getPastDate(monthOffset - 10), recurring: true, categorySource: 'default' }, // Wants
      { userId: aarav._id, amount: -699, type: 'expense', category: 'Subscriptions', merchant: 'Spotify Premium', date: getPastDate(monthOffset - 12), recurring: true, categorySource: 'default' }, // Wants
      { userId: aarav._id, amount: -800, type: 'expense', category: 'Public Transport', merchant: 'Metro Recharge', date: getPastDate(monthOffset - 14), recurring: false, categorySource: 'default' }, // Needs
      { userId: aarav._id, amount: -2000, type: 'expense', category: 'Shopping', merchant: 'Myntra Clothes', date: getPastDate(monthOffset - 20), recurring: false, categorySource: 'default' } // Wants
    );
  }

  // --- Sneha Reddy (Freelancer, ~65000 monthly) ---
  // Incomes
  transactionsData.push(
    { userId: sneha._id, amount: 40000, type: 'income', category: 'Freelance Pay', merchant: 'US Client Tech Corp', date: getPastDate(48), recurring: false, categorySource: 'default' },
    { userId: sneha._id, amount: 20000, type: 'income', category: 'Freelance Pay', merchant: 'Branding Project', date: getPastDate(40), recurring: false, categorySource: 'default' },
    { userId: sneha._id, amount: 35000, type: 'income', category: 'Freelance Pay', merchant: 'Retainer Agency', date: getPastDate(15), recurring: true, categorySource: 'default' },
    { userId: sneha._id, amount: 30000, type: 'income', category: 'Freelance Pay', merchant: 'Website UX Audit', date: getPastDate(5), recurring: false, categorySource: 'default' }
  );
  // Expenses - Moderate Wants, High Rent (Freelancer work setup)
  for (const monthOffset of [45, 15]) {
    transactionsData.push(
      { userId: sneha._id, amount: -18000, type: 'expense', category: 'Rent', merchant: 'Apartment Owner', date: getPastDate(monthOffset), recurring: true, categorySource: 'default' }, // Needs
      { userId: sneha._id, amount: -6000, type: 'expense', category: 'Groceries', merchant: 'Nature Basket', date: getPastDate(monthOffset - 2), recurring: true, categorySource: 'default' }, // Needs
      { userId: sneha._id, amount: -3500, type: 'expense', category: 'Utilities', merchant: 'BESCOM Electricity & WiFi', date: getPastDate(monthOffset - 5), recurring: true, categorySource: 'default' }, // Needs
      { userId: sneha._id, amount: -4000, type: 'expense', category: 'Dining Out', merchant: 'Social Indiranagar', date: getPastDate(monthOffset - 8), recurring: false, categorySource: 'default' }, // Wants
      { userId: sneha._id, amount: -2500, type: 'expense', category: 'Entertainment', merchant: 'PVR Movies', date: getPastDate(monthOffset - 12), recurring: false, categorySource: 'default' }, // Wants
      { userId: sneha._id, amount: -5000, type: 'expense', category: 'Shopping', merchant: 'Zara', date: getPastDate(monthOffset - 18), recurring: false, categorySource: 'default' }, // Wants
      { userId: sneha._id, amount: -1999, type: 'expense', category: 'Subscriptions', merchant: 'Adobe Creative Suite', date: getPastDate(monthOffset - 10), recurring: true, categorySource: 'default' } // Needs (Job-related)
    );
  }

  // --- Vikram Malhotra (Junior Engineer, 95000 monthly) ---
  // Incomes (Stable)
  transactionsData.push(
    { userId: vikram._id, amount: 95000, type: 'income', category: 'Salary', merchant: 'TechCorp Solutions', date: getPastDate(30), recurring: true, categorySource: 'default' },
    { userId: vikram._id, amount: 95000, type: 'income', category: 'Salary', merchant: 'TechCorp Solutions', date: getPastDate(2), recurring: true, categorySource: 'default' }
  );
  // Expenses - Heavy subscriptions and loan repayments
  for (const monthOffset of [28, 5]) {
    transactionsData.push(
      { userId: vikram._id, amount: -25000, type: 'expense', category: 'Rent', merchant: 'Flat Owner HSR Layout', date: getPastDate(monthOffset), recurring: true, categorySource: 'default' }, // Needs
      { userId: vikram._id, amount: -8000, type: 'expense', category: 'Groceries', merchant: 'Zepto', date: getPastDate(monthOffset - 3), recurring: false, categorySource: 'default' }, // Needs
      { userId: vikram._id, amount: -4000, type: 'expense', category: 'Utilities', merchant: 'WiFi + Gas + Power', date: getPastDate(monthOffset - 4), recurring: true, categorySource: 'default' }, // Needs
      { userId: vikram._id, amount: -15000, type: 'expense', category: 'Education Loan EMI', merchant: 'HDFC Bank', date: getPastDate(monthOffset - 5), recurring: true, categorySource: 'default' }, // Needs (Debt repayment)
      { userId: vikram._id, amount: -8000, type: 'expense', category: 'Dining Out', merchant: 'The Black Pearl', date: getPastDate(monthOffset - 10), recurring: false, categorySource: 'default' }, // Wants
      { userId: vikram._id, amount: -6000, type: 'expense', category: 'Shopping', merchant: 'Amazon India', date: getPastDate(monthOffset - 15), recurring: false, categorySource: 'default' }, // Wants
      { userId: vikram._id, amount: -1500, type: 'expense', category: 'Subscriptions', merchant: 'Youtube Premium Family', date: getPastDate(monthOffset - 1), recurring: true, categorySource: 'default' }, // Wants
      { userId: vikram._id, amount: -999, type: 'expense', category: 'Subscriptions', merchant: 'Netflix Premium', date: getPastDate(monthOffset - 1), recurring: true, categorySource: 'default' }, // Wants
      { userId: vikram._id, amount: -699, type: 'expense', category: 'Subscriptions', merchant: 'Gym Membership', date: getPastDate(monthOffset - 2), recurring: true, categorySource: 'default' }, // Wants
      { userId: vikram._id, amount: -399, type: 'expense', category: 'Subscriptions', merchant: 'Disney+ Hotstar', date: getPastDate(monthOffset - 2), recurring: true, categorySource: 'default' }, // Wants
      { userId: vikram._id, amount: -499, type: 'expense', category: 'Subscriptions', merchant: 'Medium Premium', date: getPastDate(monthOffset - 3), recurring: true, categorySource: 'default' }, // Wants
      { userId: vikram._id, amount: -999, type: 'expense', category: 'Subscriptions', merchant: 'Amazon Prime', date: getPastDate(monthOffset - 5), recurring: true, categorySource: 'default' } // Wants
    );
  }

  // --- Priya Sharma (Intern, 25000 monthly) ---
  // Incomes (Stable Stipend)
  transactionsData.push(
    { userId: priya._id, amount: 25000, type: 'income', category: 'Stipend', merchant: 'NGO Internships', date: getPastDate(30), recurring: true, categorySource: 'default' },
    { userId: priya._id, amount: 25000, type: 'income', category: 'Stipend', merchant: 'NGO Internships', date: getPastDate(2), recurring: true, categorySource: 'default' }
  );
  // Expenses - Extremely tight
  for (const monthOffset of [28, 5]) {
    transactionsData.push(
      { userId: priya._id, amount: -8000, type: 'expense', category: 'Rent', merchant: 'Girls Hostels', date: getPastDate(monthOffset), recurring: true, categorySource: 'default' }, // Needs
      { userId: priya._id, amount: -4000, type: 'expense', category: 'Groceries', merchant: 'Local Mandi', date: getPastDate(monthOffset - 2), recurring: false, categorySource: 'default' }, // Needs
      { userId: priya._id, amount: -1500, type: 'expense', category: 'Utilities', merchant: 'Mobile Bill + Hostel WiFi', date: getPastDate(monthOffset - 4), recurring: true, categorySource: 'default' }, // Needs
      { userId: priya._id, amount: -1000, type: 'expense', category: 'Public Transport', merchant: 'Auto + Bus pass', date: getPastDate(monthOffset - 6), recurring: true, categorySource: 'default' }, // Needs
      { userId: priya._id, amount: -2000, type: 'expense', category: 'Dining Out', merchant: 'Street Food Stall', date: getPastDate(monthOffset - 8), recurring: false, categorySource: 'default' }, // Wants
      { userId: priya._id, amount: -1500, type: 'expense', category: 'Shopping', merchant: 'Sarojini Nagar', date: getPastDate(monthOffset - 15), recurring: false, categorySource: 'default' } // Wants
    );
  }

  // --- Rohan Das (Careless Spender, 40000 monthly) ---
  // Incomes
  transactionsData.push(
    { userId: rohan._id, amount: 40000, type: 'income', category: 'Salary', merchant: 'Apex BPO Services', date: getPastDate(30), recurring: true, categorySource: 'default' },
    { userId: rohan._id, amount: 40000, type: 'income', category: 'Salary', merchant: 'Apex BPO Services', date: getPastDate(2), recurring: true, categorySource: 'default' }
  );
  // Expenses - Heavy overspending in Wants
  for (const monthOffset of [28, 5]) {
    transactionsData.push(
      { userId: rohan._id, amount: -12000, type: 'expense', category: 'Rent', merchant: 'Co-Living Space', date: getPastDate(monthOffset), recurring: true, categorySource: 'default' }, // Needs
      { userId: rohan._id, amount: -5000, type: 'expense', category: 'Groceries', merchant: 'Supermarket', date: getPastDate(monthOffset - 3), recurring: false, categorySource: 'default' }, // Needs
      { userId: rohan._id, amount: -2500, type: 'expense', category: 'Utilities', merchant: 'Power & Wifi', date: getPastDate(monthOffset - 4), recurring: true, categorySource: 'default' }, // Needs
      { userId: rohan._id, amount: -8000, type: 'expense', category: 'Dining Out', merchant: 'Brewery & Clubs', date: getPastDate(monthOffset - 6), recurring: false, categorySource: 'default' }, // Wants (High)
      { userId: rohan._id, amount: -6000, type: 'expense', category: 'Dining Out', merchant: 'Zomato & Swiggy', date: getPastDate(monthOffset - 10), recurring: false, categorySource: 'default' }, // Wants (High)
      { userId: rohan._id, amount: -7000, type: 'expense', category: 'Shopping', merchant: 'Sneaker Store', date: getPastDate(monthOffset - 15), recurring: false, categorySource: 'default' }, // Wants (High)
      { userId: rohan._id, amount: -3000, type: 'expense', category: 'Entertainment', merchant: 'Gaming Zone', date: getPastDate(monthOffset - 20), recurring: false, categorySource: 'default' }, // Wants
      { userId: rohan._id, amount: -2000, type: 'expense', category: 'Subscriptions', merchant: 'OTT Packages', date: getPastDate(monthOffset - 1), recurring: true, categorySource: 'default' } // Wants
    );
  }

  const transactions = await Transaction.create(transactionsData);
  console.log(`[Seed] Seeded ${transactions.length} transactions successfully.`);

  // 4. Initial Recommendations & Audit Logs
  const activeLaptopGoal = goals.find(g => g.name === 'MacBook Air for Coding');
  const activeIphoneGoal = goals.find(g => g.name === 'iPhone 16 Pro Max');
  const activeLoanGoal = goals.find(g => g.name === 'Education Loan Part-Payment');

  const recommendations = await Recommendation.create([
    {
      userId: aarav._id,
      goalId: activeLaptopGoal?._id,
      type: 'emergency_fund',
      title: 'Setup Emergency Fund Buffer First',
      explanation: 'Currently you have ₹5,000 in your laptop goal, but your account balance shows no dedicated emergency reserve. Basic stability requires at least 2 months of basic expenses (₹14,000) as buffer before aggressive goal-funding.',
      suggestedAction: 'Pause the Laptop Goal and open a 2-month Emergency Fund of ₹14,000. Reallocate the monthly savings there first.',
      estimatedMonthlyImpact: 1500,
      projectedGoalDate: getPastDate(-240),
      feasibility: 'unfeasible',
      score: 95,
      rulesTriggered: ['RULE_EMERGENCY_BUFFER_CHECK'],
      status: 'pending'
    },
    {
      userId: rohan._id,
      goalId: activeIphoneGoal?._id,
      type: 'expense_reduction',
      title: 'Discretionary Overspending Detected',
      explanation: 'Your Wants (Dining Out, Shopping, Entertainment) account for ₹26,000 (65%) of your ₹40,000 monthly income. This significantly exceeds the recommended 30% limit for Wants, leaving you with zero savings rate and making your iPhone goal unfeasible.',
      suggestedAction: 'Cut dining out and food orders by 40% (save ₹5,600/month) and freeze clothes shopping. Reallocate ₹5,600/month to your iPhone Goal.',
      estimatedMonthlyImpact: 5600,
      projectedGoalDate: getPastDate(-120),
      feasibility: 'critical',
      score: 90,
      rulesTriggered: ['RULE_WANTS_LIMIT_EXCEEDED', 'RULE_SAVINGS_RATE_ZERO'],
      status: 'pending'
    },
    {
      userId: vikram._id,
      goalId: undefined,
      type: 'expense_reduction',
      title: 'Subscription Creep Audit',
      explanation: 'You have 6 active recurring subscriptions costing a total of ₹5,595/month. This represents about 6% of your monthly income. Minimizing overlapping entertainment plans can optimize your loan pre-payment capacity.',
      suggestedAction: 'Audit your subscription list and cancel at least two inactive streaming services (e.g., Netflix Premium, Disney+ Hotstar) to redirect ₹1,398/month to your Education Loan Goal.',
      estimatedMonthlyImpact: 1398,
      projectedGoalDate: undefined,
      feasibility: 'feasible',
      score: 80,
      rulesTriggered: ['RULE_SUBSCRIPTION_CREEP_CHECK'],
      status: 'pending'
    }
  ]);
  console.log(`[Seed] Seeded ${recommendations.length} initial recommendations successfully.`);

  // 5. Seeding initial Financial Plans
  const plans = await FinancialPlan.create([
    {
      userId: rohan._id,
      goalId: activeIphoneGoal?._id,
      strategyType: 'conservative',
      monthlySavingTarget: 0,
      spendingAdjustments: [],
      projectedBalance: 10000,
      projectedGoalDate: getPastDate(-720), // 24 months
      feasibility: 'unfeasible',
      safetyBuffer: 0.1,
      score: 30,
      assumptions: ['Assuming current spending trends continue', 'Savings rate remains close to zero']
    },
    {
      userId: rohan._id,
      goalId: activeIphoneGoal?._id,
      strategyType: 'balanced',
      monthlySavingTarget: 10000,
      spendingAdjustments: [
        { category: 'Dining Out', originalAmount: 14000, newAmount: 9000, difference: 5000 },
        { category: 'Shopping', originalAmount: 7000, newAmount: 5000, difference: 2000 },
        { category: 'Subscriptions', originalAmount: 2000, newAmount: 1500, difference: 500 },
        { category: 'Savings/Reserve', originalAmount: 0, newAmount: 2500, difference: -2500 }
      ],
      projectedBalance: 130000,
      projectedGoalDate: getPastDate(-360), // 12 months (instead of 3)
      feasibility: 'feasible',
      safetyBuffer: 1.5,
      score: 85,
      assumptions: ['Assuming wants spending reduced by ~27%', 'Safety buffer gets partially established']
    },
    {
      userId: rohan._id,
      goalId: activeIphoneGoal?._id,
      strategyType: 'aggressive',
      monthlySavingTarget: 22000,
      spendingAdjustments: [
        { category: 'Dining Out', originalAmount: 14000, newAmount: 5000, difference: 9000 },
        { category: 'Shopping', originalAmount: 7000, newAmount: 1000, difference: 6000 },
        { category: 'Entertainment', originalAmount: 3000, newAmount: 500, difference: 2500 },
        { category: 'Subscriptions', originalAmount: 2000, newAmount: 999, difference: 1001 },
        { category: 'Savings/Reserve', originalAmount: 0, newAmount: 3499, difference: -3499 }
      ],
      projectedBalance: 130000,
      projectedGoalDate: getPastDate(-180), // 6 months (closer to target)
      feasibility: 'feasible',
      safetyBuffer: 3.0,
      score: 75,
      assumptions: ['Assuming wants spending is aggressively slashed by ~65%', 'Fully establishes emergency buffer']
    }
  ]);
  console.log(`[Seed] Seeded ${plans.length} initial strategies (Plans) successfully.`);

  // 6. Create Audit Logs
  await AuditLog.create([
    {
      userId: aarav._id,
      action: 'generate_recommendations',
      entityType: 'System',
      inputSnapshot: {
        monthlyIncome: 15000,
        averageMonthlyExpenses: 13500,
        currentEmergencyReserve: 0,
        totalActiveGoalsCount: 1
      },
      rulesApplied: ['RULE_EMERGENCY_BUFFER_CHECK', 'RULE_50_30_20'],
      output: {
        recommendationsCreated: 1,
        message: 'Flagged laptop goal due to missing emergency safety buffer'
      },
      timestamp: getPastDate(1)
    },
    {
      userId: rohan._id,
      action: 'generate_recommendations',
      entityType: 'System',
      inputSnapshot: {
        monthlyIncome: 40000,
        averageMonthlyExpenses: 40500,
        totalWantsExpense: 26000,
        totalActiveGoalsCount: 1
      },
      rulesApplied: ['RULE_WANTS_LIMIT_EXCEEDED', 'RULE_SAVINGS_RATE_ZERO'],
      output: {
        recommendationsCreated: 1,
        message: 'Flagged iPhone goal, wants exceed 65% of income'
      },
      timestamp: getPastDate(1)
    }
  ]);
  console.log('[Seed] Seeded initial audit logs.');

  console.log('[Seed] Seeding completed successfully. Closing connection.');
  await mongoose.disconnect();
};

runSeed().catch(err => {
  console.error('[Seed] Critical error seeding database:', err);
  process.exit(1);
});
