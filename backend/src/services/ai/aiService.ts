import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { User } from '../../models/User';
import { Transaction } from '../../models/Transaction';
import { FinancialGoal } from '../../models/FinancialGoal';
import { Recommendation } from '../../models/Recommendation';
import { RecommendationEngine } from '../recommendation/engine';
import { AuditLog } from '../../models/AuditLog';

export class AIService {
  // 1. Read-Only Financial Tools
  public static async getFinancialSummary(userId: string) {
    const user = await User.findById(userId);
    if (!user) return { error: 'User not found' };

    const transactions = await Transaction.find({ userId });
    const state = RecommendationEngine.calculateFinancialState(user, transactions);
    
    return {
      name: user.name,
      monthlyIncome: state.monthlyIncome,
      essentialExpenses: state.monthlyEssentialExpenses,
      discretionaryExpenses: state.monthlyDiscretionaryExpenses,
      savingsSurplus: state.availableMonthlySavings,
      savingsRate: state.savingsRate,
      currentBalance: state.currentBalance,
      minimumSafetyBuffer: state.minimumSafetyBuffer
    };
  }

  public static async getTransactions(userId: string) {
    const transactions = await Transaction.find({ userId }).sort({ date: -1 }).limit(10);
    return transactions.map(t => ({
      merchant: t.merchant,
      amount: t.amount,
      type: t.type,
      category: t.category,
      date: t.date.toISOString().split('T')[0],
      recurring: t.recurring
    }));
  }

  public static async getGoalProgress(userId: string) {
    const goals = await FinancialGoal.find({ userId, status: 'active' });
    const summary = await this.getFinancialSummary(userId);
    const surplus = (summary as any).savingsSurplus || 0;

    return goals.map(g => {
      const remainingAmount = Math.max(0, g.targetAmount - g.currentAmount);
      const now = new Date();
      const targetDate = new Date(g.targetDate);
      let monthsRemaining = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
      if (monthsRemaining <= 0) monthsRemaining = 1;
      const requiredMonthlySaving = Math.round(remainingAmount / monthsRemaining);
      const progressPercent = Number(((g.currentAmount / g.targetAmount) * 100).toFixed(1));

      return {
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        progressPercent,
        requiredMonthlySaving,
        currentSurplusPace: surplus,
        isPaceMatching: surplus >= requiredMonthlySaving,
        targetDate: g.targetDate.toISOString().split('T')[0]
      };
    });
  }

  public static async getSpendingBreakdown(userId: string) {
    const summary = await this.getFinancialSummary(userId);
    if ((summary as any).error) return summary;

    const s = summary as any;
    return {
      needs: {
        actual: s.essentialExpenses,
        target: Math.round(s.monthlyIncome * 0.5),
        percent: s.monthlyIncome > 0 ? (s.essentialExpenses / s.monthlyIncome) * 100 : 0
      },
      wants: {
        actual: s.discretionaryExpenses,
        target: Math.round(s.monthlyIncome * 0.3),
        percent: s.monthlyIncome > 0 ? (s.discretionaryExpenses / s.monthlyIncome) * 100 : 0
      },
      savings: {
        actual: s.savingsSurplus,
        target: Math.round(s.monthlyIncome * 0.2),
        percent: s.savingsRate
      }
    };
  }

  public static async simulatePurchase(userId: string, amount: number, category?: string) {
    const summary = await this.getFinancialSummary(userId);
    if ((summary as any).error) return summary;

    const s = summary as any;
    const balance = s.currentBalance;
    const safetyBuffer = s.minimumSafetyBuffer;
    const surplus = s.savingsSurplus || 1000;

    let canAfford = true;
    let impactOnSafetyBuffer = 'Safe';
    let explanation = '';

    if (amount > balance) {
      canAfford = false;
      explanation = `This purchase exceeds your total bank cash balance of ₹${balance.toLocaleString('en-IN')}.`;
      impactOnSafetyBuffer = 'Critical: Exceeds cash liquidity';
    } else if (balance - amount < safetyBuffer) {
      impactOnSafetyBuffer = `Warning: Reduces reserves below your target buffer of ₹${safetyBuffer.toLocaleString('en-IN')}`;
      explanation = `You have the cash (₹${balance.toLocaleString('en-IN')}), but spending ₹${amount.toLocaleString('en-IN')} will dip into your emergency buffer, leaving you with ₹${(balance - amount).toLocaleString('en-IN')} in liquid reserves.`;
    } else {
      impactOnSafetyBuffer = 'Safe';
      explanation = `You have ample balance to absorb this purchase. Remaining reserves (₹${(balance - amount).toLocaleString('en-IN')}) stay above your ₹${safetyBuffer.toLocaleString('en-IN')} safety buffer.`;
    }

    // Impact on goals
    const goals = await FinancialGoal.find({ userId, status: 'active' });
    let impactOnGoals = 'No active goals affected.';

    if (goals.length > 0) {
      const primaryGoal = goals[0];
      const gap = Math.max(0, primaryGoal.targetAmount - primaryGoal.currentAmount);
      const delayDays = Math.round((amount / Math.max(100, surplus)) * 30.4);
      
      if (delayDays > 0) {
        impactOnGoals = `Consuming ₹${amount.toLocaleString('en-IN')} from surplus will delay your '${primaryGoal.name}' goal by approximately ${delayDays} days.`;
      }
    }

    return {
      purchaseAmount: amount,
      category: category || 'General Gadgets',
      canAfford,
      impactOnSafetyBuffer,
      impactOnGoals,
      explanation
    };
  }

  public static async getActiveRecommendations(userId: string) {
    // Return pending engine-generated recommendations
    const recs = await Recommendation.find({ userId, status: 'pending' });
    return recs.map(r => ({
      title: r.title,
      explanation: r.explanation,
      suggestedAction: r.suggestedAction,
      estimatedMonthlyImpact: r.estimatedMonthlyImpact,
      feasibility: r.feasibility,
      score: r.score,
      rulesTriggered: r.rulesTriggered
    }));
  }

  // 2. Chat Processing Entrypoint
  public static async chat(userId: string, message: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;

    // Log query in Audit trail
    await AuditLog.create({
      userId,
      action: 'ai_chat_query',
      entityType: 'System',
      inputSnapshot: { message },
      output: { hasApiKey: !!apiKey }
    });

    if (!apiKey) {
      // Deterministic Fallback Regex Parser
      return this.processDeterministicFallback(userId, message);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: `
          You are the FirstPay AI Financial Assistant.
          Your purpose is to explain the user's financial status, transactions, and goal timelines using ONLY results from the tools provided.
          
          CRITICAL SAFETY RULES:
          1. NEVER invent or guess cash balances, expenses, or transactions. If you need them, call the appropriate tool.
          2. NEVER calculate financial metrics (affordability/delays) yourself. Call 'simulatePurchase' to check if they can buy an item.
          3. If the user asks about affordability (e.g., "Can I buy a ₹10,000 phone?"), you MUST run 'simulatePurchase(amount, category)'.
          4. You do NOT have authority to move money, create transactions, or alter goals. Inform the user they can log transactions or create goals in the UI panels.
          5. Only output recommendations returned by 'getActiveRecommendations'. Do NOT invent recommendations.
          6. Keep your responses short, professional, and empathetic to first-time earners.
        `
      });

      // Declare tools functions
      const chat = model.startChat({
        tools: [
          {
            functionDeclarations: [
              {
                name: 'getFinancialSummary',
                description: 'Retrieves the user\'s base financial summary: income, needs, wants, savings surplus, rate, balance, and buffers.'
              },
              {
                name: 'getTransactions',
                description: 'Retrieves the last 10 logged transactions in the ledger.'
              },
              {
                name: 'getGoalProgress',
                description: 'Retrieves active goals with required savings, target dates, and surplus pace comparison.'
              },
              {
                name: 'getSpendingBreakdown',
                description: 'Retrieves 50/30/20 actual vs recommended budget spending distributions.'
              },
              {
                name: 'simulatePurchase',
                description: 'Simulates a purchase to analyze affordability and goal delays.',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    amount: { type: SchemaType.NUMBER, description: 'Price of the item to buy' },
                    category: { type: SchemaType.STRING, description: 'Item category (e.g. Gadgets, Travel)' }
                  },
                  required: ['amount']
                }
              },
              {
                name: 'getActiveRecommendations',
                description: 'Retrieves the active recommendations generated by the rule engine.'
              }
            ]
          }
        ]
      });

      let response = await chat.sendMessage(message);
      let functionCalls = response.response.functionCalls();

      // Handle function execution loop (allows up to 2 nested rounds)
      let rounds = 0;
      while (functionCalls && functionCalls.length > 0 && rounds < 2) {
        rounds++;
        const functionResponses = [];

        for (const call of functionCalls) {
          const { name, args } = call;
          let result: any = null;

          if (name === 'getFinancialSummary') {
            result = await this.getFinancialSummary(userId);
          } else if (name === 'getTransactions') {
            result = await this.getTransactions(userId);
          } else if (name === 'getGoalProgress') {
            result = await this.getGoalProgress(userId);
          } else if (name === 'getSpendingBreakdown') {
            result = await this.getSpendingBreakdown(userId);
          } else if (name === 'simulatePurchase') {
            result = await this.simulatePurchase(userId, (args as any).amount, (args as any).category);
          } else if (name === 'getActiveRecommendations') {
            result = await this.getActiveRecommendations(userId);
          }

          functionResponses.push({
            response: { result }
          });
        }

        // Send function execution output back to Gemini
        const followUp = await chat.sendMessage(
          functionResponses.map((res, index) => ({
            functionResponse: {
              name: functionCalls![index].name,
              response: res.response
            }
          }))
        );

        response = followUp;
        functionCalls = response.response.functionCalls();
      }

      return response.response.text() || 'I analyzed your ledger data but couldn\'t format a response. Try asking again.';
    } catch (e: any) {
      console.error('Gemini AI execution failed:', e);
      return `[AI Engine Offline] I couldn't connect to the AI model. Operating in Local Deterministic Mode:\n\n${await this.processDeterministicFallback(userId, message)}`;
    }
  }

  // 3. Local Deterministic Parser (No API Key Fallback)
  private static async processDeterministicFallback(userId: string, message: string): Promise<string> {
    const text = message.toLowerCase();

    // Match simulatePurchase: "Can I buy a ₹12,000 phone?"
    const buyMatch = text.match(/(?:buy|afford|purchase|cost|phone|macbook|laptop|gadget|spend)\s*(?:₹|rs\.?)?\s*([0-9,]+)/i);
    if (buyMatch) {
      const amount = parseFloat(buyMatch[1].replace(/,/g, ''));
      const sim = (await this.simulatePurchase(userId, amount, 'Gadgets')) as any;
      if (sim.error) return 'I could not access your account data.';

      return `**Deterministic Purchase Simulation**
- **Simulated Amount**: ₹${amount.toLocaleString('en-IN')}
- **Category**: ${sim.category}
- **Affordable**: ${sim.canAfford ? 'Yes ✅' : 'No ❌'}
- **Safety Buffer**: ${sim.impactOnSafetyBuffer}
- **Goal Impact**: ${sim.impactOnGoals}

*Explanation*: ${sim.explanation}`;
    }

    // Match Goal progress queries
    if (text.includes('goal') || text.includes('milestone') || text.includes('deadline') || text.includes('pace') || text.includes('timeline')) {
      const goals = await this.getGoalProgress(userId);
      if (goals.length === 0) return 'You do not have any active financial goals logged.';

      let res = `**Goal Progress & Pace Reports (Deterministic Rules)**\n`;
      goals.forEach(g => {
        res += `\n* **${g.name}** (${g.progressPercent}% achieved)
  - Target: ₹${g.targetAmount.toLocaleString()} (Saved: ₹${g.currentAmount.toLocaleString()})
  - Required Pace: ₹${g.requiredMonthlySaving.toLocaleString()}/mo
  - Current Pace (Surplus): ₹${g.currentSurplusPace.toLocaleString()}/mo
  - Status: ${g.isPaceMatching ? 'On Track ✅' : 'Delayed / Underfunded ⚠️'}`;
      });
      return res;
    }

    // Match spending categories: 50/30/20
    if (text.includes('spend') || text.includes('breakdown') || text.includes('category') || text.includes('needs') || text.includes('wants')) {
      const b = (await this.getSpendingBreakdown(userId)) as any;
      if (b.error) return 'I could not access your spending ledger.';

      return `**Budget Allocation Audit (Deterministic 50/30/20 Rules)**
- **Essential Needs**: ₹${b.needs.actual.toLocaleString('en-IN')} / limit: ₹${b.needs.target.toLocaleString('en-IN')} (${b.needs.percent.toFixed(1)}% of income)
- **Discretionary Wants**: ₹${b.wants.actual.toLocaleString('en-IN')} / limit: ₹${b.wants.target.toLocaleString('en-IN')} (${b.wants.percent.toFixed(1)}% of income)
- **Savings Surplus**: ₹${b.savings.actual.toLocaleString('en-IN')} / rate: ${b.savings.percent.toFixed(1)}%`;
    }

    // Match recommendations
    if (text.includes('recommend') || text.includes('what should i do') || text.includes('advice') || text.includes('action')) {
      const recs = await this.getActiveRecommendations(userId);
      if (recs.length === 0) return 'No active recommendations. Your budget checks are 100% matched.';

      let res = `**Active Financial Recommendations (Deterministic Rules Engine)**\n`;
      recs.forEach(r => {
        res += `\n* **${r.title}**
  - Trigger: ${r.explanation}
  - Action: ${r.suggestedAction}
  - Monthly Savings Impact: +₹${r.estimatedMonthlyImpact.toLocaleString('en-IN')}/mo`;
      });
      return res;
    }

    // General Summary Fallback
    const s = (await this.getFinancialSummary(userId)) as any;
    if (s.error) return 'I could not retrieve your summary.';

    return `👋 Hey ${s.name}! I am FirstPay Local AI (Deterministic Fallback Mode). 
You can ask me questions about affordability, goals, or spending breakdowns.

**Your Current Snapshot:**
- Bank Cash Balance: ₹${s.currentBalance.toLocaleString('en-IN')}
- Base Monthly Income: ₹${s.monthlyIncome.toLocaleString('en-IN')}
- Savings Surplus: ₹${s.savingsSurplus.toLocaleString('en-IN')}/mo
- Safety buffer level: ₹${s.minimumSafetyBuffer.toLocaleString('en-IN')}

*Try asking me: "Can I buy a ₹15,000 phone?" or "Why am I not reaching my goal?"*`;
  }
}
