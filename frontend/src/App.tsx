import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Shield,
  Activity,
  FileText,
  Check,
  X,
  Plus,
  Search,
  Loader,
  Sparkles,
  RefreshCw,
  UserCheck,
  ChevronRight,
  BookOpen,
  Calendar,
  Settings as SettingsIcon,
  Edit2,
  Trash2,
  PiggyBank
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';

// Interfaces
interface User {
  _id: string;
  name: string;
  email: string;
  employmentType: string;
  experienceLevel: string;
  monthlyIncome: number;
  minimumSafetyBuffer: number;
}

interface Transaction {
  _id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  merchant: string;
  description: string;
  date: string;
  recurring: boolean;
}

interface Goal {
  _id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  priority: 'low' | 'medium' | 'high';
  targetDate: string;
  progressPercent: number;
  requiredMonthlySaving: number;
  projectedCompletionDate?: string;
  isFeasible?: boolean;
}

interface Recommendation {
  _id: string;
  title: string;
  explanation: string;
  suggestedAction: string;
  estimatedMonthlyImpact: number;
  feasibility: string;
  score: number;
  type: string;
  rulesTriggered: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
}

interface SpendingAdjustment {
  category: string;
  originalAmount: number;
  newAmount: number;
  difference: number;
}

interface Plan {
  _id: string;
  strategyType: 'conservative' | 'balanced' | 'aggressive';
  monthlySavingTarget: number;
  spendingAdjustments: SpendingAdjustment[];
  projectedBalance: number;
  projectedGoalDate: string;
  feasibility: 'feasible' | 'unfeasible' | 'critical';
  safetyBuffer: number;
  score: number;
  assumptions: string[];
}

interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  timestamp: string;
  inputSnapshot: any;
  output: any;
  rulesApplied?: string[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'goals' | 'transactions' | 'audit' | 'recommendations'>('dashboard');
  const [detailRec, setDetailRec] = useState<Recommendation | null>(null);
  
  // Database States
  const [usersList, setUsersList] = useState<User[]>([]);
  const [activeUserId, setActiveUserId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Chat conversational assistant states
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileIncome, setProfileIncome] = useState('');
  const [profileBuffer, setProfileBuffer] = useState('3');
  const [profileExp, setProfileExp] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [profileEmployment, setProfileEmployment] = useState('student');

  // Goals Planning Form Modal State
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [goalFormName, setGoalFormName] = useState('');
  const [goalFormTarget, setGoalFormTarget] = useState('');
  const [goalFormCurrent, setGoalFormCurrent] = useState('0');
  const [goalFormDeadline, setGoalFormDeadline] = useState('6'); // Months
  const [goalFormPriority, setGoalFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [goalFormCategory, setGoalFormCategory] = useState('Gadgets');

  // Multi-Plan Compare View States
  const [planningGoal, setPlanningGoal] = useState<Goal | null>(null);
  const [generatedPlans, setGeneratedPlans] = useState<Plan[]>([]);
  const [selectedPlanStrategy, setSelectedPlanStrategy] = useState<Plan | null>(null);

  // Transactions Modals States
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showEditTxModal, setShowEditTxModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Transaction Form Field States
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txCategory, setTxCategory] = useState('Dining Out');
  const [txMerchant, setTxMerchant] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txRecurring, setTxRecurring] = useState(false);
  const [txDate, setTxDate] = useState('');

  // Transaction Tracker Filters State
  const [txSearch, setTxSearch] = useState('');
  const [txCategoryFilter, setTxCategoryFilter] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [txStartDate, setTxStartDate] = useState('');
  const [txEndDate, setTxEndDate] = useState('');

  // Fetch initial list of seeded users from backend
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setUsersList(json.data);
        const rohanUser = json.data.find((u: any) => u.email.includes('rohan'));
        const defaultUser = rohanUser || json.data[0];
        setActiveUserId(defaultUser._id);
      }
    } catch (error) {
      console.error('Failed to load user list:', error);
    }
  };

  // Fetch full details of selected user
  const fetchDashboard = async (userId: string) => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${userId}/dashboard`);
      const json = await res.json();
      if (json.success) {
        setDashboardData(json.data);
        setCurrentUser(json.data.user);
        
        // Populate profile settings states
        setProfileName(json.data.user?.name || '');
        setProfileIncome(json.data.user?.monthlyIncome?.toString() || '0');
        setProfileBuffer(json.data.financialHealth?.safetyBufferTargetMonths?.toString() || '3');
        setProfileExp(json.data.user?.experienceLevel || 'beginner');
        setProfileEmployment(json.data.user?.employmentType || 'student');
      }

      // Fetch Goals
      const goalsRes = await fetch(`/api/users/${userId}/goals`);
      const goalsJson = await goalsRes.json();
      if (goalsJson.success) {
        setGoals(goalsJson.data);
      }

      // Fetch Transactions
      const txRes = await fetch(`/api/users/${userId}/transactions?limit=100`);
      const txJson = await txRes.json();
      if (txJson.success) {
        setTransactions(txJson.data.transactions);
      }

      // Fetch Recommendations
      const recRes = await fetch(`/api/users/${userId}/recommendations`);
      const recJson = await recRes.json();
      if (recJson.success) {
        setRecommendations(recJson.data);
      }

      // Fetch Audit Logs
      const auditRes = await fetch(`/api/users/${userId}/audit-log`);
      const auditJson = await auditRes.json();
      if (auditJson.success) {
        setAuditLogs(auditJson.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeUserId) {
      fetchDashboard(activeUserId);
      setPlanningGoal(null);
      setGeneratedPlans([]);
      setSelectedPlanStrategy(null);
    }
  }, [activeUserId]);

  useEffect(() => {
    if (currentUser) {
      setChatMessages([
        {
          sender: 'ai',
          text: `Hi ${currentUser.name}! I am your FirstPay conversational assistant. You can ask me questions about affordability, goal timelines, or spending breakdowns:
          
• "Can I buy a ₹15,000 gadget?"
• "Why am I not reaching my goals?"
• "Break down my spending categories"
• "Show my active recommendations"`
        }
      ]);
    }
  }, [currentUser]);

  const handleSendChatMessage = async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const queryText = textOverride || chatInput;
    if (!queryText.trim() || isChatLoading || !activeUserId) return;

    // Append user message
    setChatMessages(prev => [...prev, { sender: 'user', text: queryText }]);
    if (!textOverride) setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch(`/api/users/${activeUserId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: queryText })
      });
      const json = await res.json();
      if (json.success) {
        setChatMessages(prev => [...prev, { sender: 'ai', text: json.data.response }]);
      } else {
        setChatMessages(prev => [...prev, { sender: 'ai', text: `Failed to get a response: ${json.error}` }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Error connecting to the chat endpoint.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveUserId(e.target.value);
  };

  // Update Settings Profile Handler
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/${currentUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          monthlyIncome: parseFloat(profileIncome),
          minimumSafetyBuffer: parseFloat(profileBuffer),
          experienceLevel: profileExp,
          employmentType: profileEmployment
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowSettingsModal(false);
        fetchDashboard(currentUser._id);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  // Create Goal Handler
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalFormName || !goalFormTarget) return;

    try {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + parseInt(goalFormDeadline));

      const res = await fetch(`/api/users/${activeUserId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: goalFormName,
          targetAmount: parseFloat(goalFormTarget),
          currentAmount: parseFloat(goalFormCurrent),
          targetDate: targetDate.toISOString(),
          priority: goalFormPriority,
          category: goalFormCategory
        })
      });

      const json = await res.json();
      if (json.success) {
        const createdGoal = json.data;
        setPlanningGoal(createdGoal);
        setShowCreateGoalModal(false);

        // Fetch plans
        const plansRes = await fetch(`/api/goals/${createdGoal._id}/plans`);
        const plansJson = await plansRes.json();
        if (plansJson.success) {
          setGeneratedPlans(plansJson.data);
        }

        // Reset form
        setGoalFormName('');
        setGoalFormTarget('');
        setGoalFormCurrent('0');
        setGoalFormDeadline('6');
        setGoalFormPriority('medium');
      }
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  // Select Strategy Plan Handler
  const handleSelectPlan = async (plan: Plan) => {
    try {
      const res = await fetch(`/api/plans/${plan._id}/select`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        setSelectedPlanStrategy(plan);
        fetchDashboard(activeUserId);
      }
    } catch (error) {
      console.error('Error selecting plan strategy:', error);
    }
  };

  // Adjust target timeline deadline and regenerate plans
  const handleRegenerateStrategies = async (newDeadlineMonths: number) => {
    if (!planningGoal) return;
    try {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + newDeadlineMonths);

      const updateGoalRes = await fetch(`/api/goals/${planningGoal._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate: targetDate.toISOString() })
      });
      const updateGoalJson = await updateGoalRes.json();

      if (updateGoalJson.success) {
        setPlanningGoal(updateGoalJson.data);
        const plansRes = await fetch(`/api/goals/${planningGoal._id}/plans`, { method: 'POST' });
        const plansJson = await plansRes.json();
        if (plansJson.success) {
          setGeneratedPlans(plansJson.data);
        }
      }
    } catch (error) {
      console.error('Error regenerating plans:', error);
    }
  };

  // Reject all plans
  const handleRejectAllPlans = () => {
    setPlanningGoal(null);
    setGeneratedPlans([]);
    setSelectedPlanStrategy(null);
    fetchDashboard(activeUserId);
  };

  // Add Transaction Handler
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || !txMerchant) return;

    try {
      const res = await fetch(`/api/users/${activeUserId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(txAmount),
          type: txType,
          category: txCategory,
          merchant: txMerchant,
          description: txDesc,
          recurring: txRecurring,
          date: txDate ? new Date(txDate).toISOString() : new Date().toISOString()
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowAddTxModal(false);
        fetchDashboard(activeUserId);
        // Reset form fields
        setTxAmount('');
        setTxMerchant('');
        setTxDesc('');
        setTxRecurring(false);
        setTxDate('');
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  // Populate Edit Modal
  const openEditTxModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTxAmount(Math.abs(tx.amount).toString());
    setTxType(tx.type);
    setTxCategory(tx.category);
    setTxMerchant(tx.merchant);
    setTxDesc(tx.description);
    setTxRecurring(tx.recurring);
    setTxDate(new Date(tx.date).toISOString().split('T')[0]);
    setShowEditTxModal(true);
  };

  // Edit Transaction Handler
  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || !txAmount || !txMerchant) return;

    try {
      const res = await fetch(`/api/transactions/${editingTransaction._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(txAmount),
          type: txType,
          category: txCategory,
          merchant: txMerchant,
          description: txDesc,
          recurring: txRecurring,
          date: new Date(txDate).toISOString()
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowEditTxModal(false);
        setEditingTransaction(null);
        fetchDashboard(activeUserId);
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  // Delete Transaction Handler
  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm('Are you sure you want to delete this transaction? This will recalculate all goals and safety buffers.')) return;
    try {
      const res = await fetch(`/api/transactions/${txId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        fetchDashboard(activeUserId);
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  // Apply general recommendations
  const handleRecommendAction = async (recId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/recommendations/${recId}/${action}`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        fetchDashboard(activeUserId);
      }
    } catch (error) {
      console.error(`Error processing recommendation ${action}:`, error);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'bg-danger/20 text-danger border-danger/30';
      case 'medium': return 'bg-warning/20 text-warning border-warning/30';
      default: return 'bg-success/20 text-success border-success/30';
    }
  };

  const getFeasibilityBadge = (f: string) => {
    switch (f) {
      case 'feasible': return 'bg-success/20 text-success border-success/30';
      case 'unfeasible': return 'bg-warning/20 text-warning border-warning/30';
      default: return 'bg-danger/20 text-danger border-danger/30';
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-slate-100">
        <div className="text-center space-y-4">
          <Loader className="h-10 w-10 animate-spin text-primary-500 mx-auto" />
          <p className="text-sm text-slate-400 font-medium animate-pulse">Re-calculating budget rules & buffer safety limits...</p>
        </div>
      </div>
    );
  }

  const { summary, financialHealth } = dashboardData || {};

  // Formulate data for Pie Chart (Needs vs Wants vs Savings)
  const pieData = [
    { name: 'Essential (Needs)', value: summary?.needsSpending || 1, color: '#3B82F6' },
    { name: 'Discretionary (Wants)', value: summary?.wantsSpending || 1, color: '#6366F1' },
    { name: 'Savings / Surplus', value: Math.max(0, summary?.savingsSurplus) || 0, color: '#10B981' }
  ].filter(d => d.value > 0);

  // Formulate data for target limits comparison chart
  const barData = [
    {
      name: 'Needs (50%)',
      Actual: summary?.needsSpending,
      Limit: Math.round(summary?.monthlyIncome * 0.5)
    },
    {
      name: 'Wants (30%)',
      Actual: summary?.wantsSpending,
      Limit: Math.round(summary?.monthlyIncome * 0.3)
    },
    {
      name: 'Savings (20%)',
      Actual: Math.max(0, summary?.savingsSurplus),
      Limit: Math.round(summary?.monthlyIncome * 0.2)
    }
  ];

  return (
    <div className="flex h-screen flex-col bg-background text-slate-100 overflow-hidden">
      {/* Top Header Bar */}
      <header className="flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#161C2C]/80 backdrop-blur-md px-6 z-10">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-primary-600 to-indigo-500 text-white shadow-lg shadow-primary-500/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">FirstPay</span>
            <span className="ml-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 px-2 py-0.5 text-[9px] font-bold text-primary-500 tracking-wider">PREMIUM</span>
          </div>
        </div>

        {/* Calendar Month & User switcher dropdowns */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 font-semibold border border-slate-800 bg-slate-900/40 px-3 py-1.5 rounded-lg">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            <span>
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center space-x-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 shadow-sm">
            <UserCheck className="h-4 w-4 text-primary-500" />
            <span className="text-xs text-slate-400 font-medium">Profile:</span>
            <select
              value={activeUserId}
              onChange={handleUserChange}
              className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
            >
              {usersList.map((user) => (
                <option key={user._id} value={user._id} className="bg-background text-slate-200">
                  {user.name} ({user.employmentType})
                </option>
              ))}
            </select>
          </div>

          {/* Profile settings button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            title="Edit financial assumptions"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Panel Viewport */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r border-slate-800/80 bg-card/40 p-4 space-y-2 flex flex-col justify-between">
          <div className="space-y-2">
            <button
              onClick={() => { setActiveTab('dashboard'); setPlanningGoal(null); }}
              className={`flex w-full items-center space-x-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'dashboard' && !planningGoal ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Dashboard Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'goals' || planningGoal ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Target className="h-4 w-4" />
                <span>Goal Strategy Planner</span>
              </div>
              {goals.length > 0 && (
                <span className="rounded-full bg-slate-800 text-[10px] px-2 py-0.5 text-slate-300 font-bold">{goals.length}</span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('recommendations'); setPlanningGoal(null); }}
              className={`flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'recommendations' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Sparkles className="h-4 w-4" />
                <span>Recommendation Center</span>
              </div>
              {recommendations.filter(r => r.status === 'pending').length > 0 && (
                <span className="rounded-full bg-primary-500/20 text-[10px] px-2 py-0.5 text-primary-400 font-bold">
                  {recommendations.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('transactions'); setPlanningGoal(null); }}
              className={`flex w-full items-center space-x-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'transactions' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span>Transaction Tracker</span>
            </button>
            <button
              onClick={() => { setActiveTab('audit'); setPlanningGoal(null); }}
              className={`flex w-full items-center space-x-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'audit' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Explainable Audit Trail</span>
            </button>
          </div>

          <div className="bg-[#121824]/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2 text-xs">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">System Diagnostics</span>
            <div className="flex justify-between font-medium">
              <span className="text-slate-400">Rules Evaluated</span>
              <span className="text-primary-500 font-bold">4 active</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-slate-400">Ledger Health</span>
              <span className="text-success font-bold">Optimal</span>
            </div>
          </div>
        </aside>

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto bg-[#080B11] p-6 space-y-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && !planningGoal && (
            <div className="space-y-6">
              {/* Financial Profile Header info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Hey, {currentUser?.name}!</h1>
                  <p className="text-xs text-slate-400 font-medium">Profile: {currentUser?.employmentType} earner | financial level: {currentUser?.experienceLevel}</p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddTxModal(true)}
                    className="flex items-center space-x-2 rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-lg shadow-primary-600/20"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Transaction</span>
                  </button>
                  <button
                    onClick={() => setShowCreateGoalModal(true)}
                    className="flex items-center space-x-2 rounded-lg border border-slate-800 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 transition-all"
                  >
                    <Target className="h-4 w-4" />
                    <span>New Goal</span>
                  </button>
                </div>
              </div>

              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                <div className="rounded-xl border border-slate-800/80 bg-card p-4 flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cash Balance</span>
                    <DollarSign className="h-4 w-4 text-primary-500" />
                  </div>
                  <div className="mt-4">
                    <div className="text-xl font-bold text-slate-100">₹{summary?.currentBalance.toLocaleString('en-IN')}</div>
                    <p className="text-[9px] text-slate-500 mt-1 font-semibold">Total ledger balance</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-card p-4 flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monthly Income</span>
                    <TrendingUp className="h-4 w-4 text-success" />
                  </div>
                  <div className="mt-4">
                    <div className="text-xl font-bold text-slate-100">₹{summary?.monthlyIncome.toLocaleString('en-IN')}</div>
                    <p className="text-[9px] text-slate-500 mt-1 font-semibold">Current monthly average</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-card p-4 flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monthly Expenses</span>
                    <TrendingDown className="h-4 w-4 text-danger" />
                  </div>
                  <div className="mt-4">
                    <div className="text-xl font-bold text-slate-100">₹{summary?.monthlyExpenses.toLocaleString('en-IN')}</div>
                    <p className="text-[9px] text-slate-500 mt-1 font-semibold">
                      Essential + Discretionary
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-card p-4 flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monthly Savings</span>
                    <PiggyBank className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="mt-4">
                    <div className="text-xl font-bold text-slate-100">₹{Math.max(0, summary?.savingsSurplus).toLocaleString('en-IN')}</div>
                    <p className="text-[9px] text-slate-500 mt-1 font-semibold">Current surplus margin</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-card p-4 flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Savings Rate</span>
                    <Shield className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="mt-4">
                    <div className="text-xl font-bold text-slate-100">{summary?.savingsRate}%</div>
                    <div className="flex items-center space-x-1 mt-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${summary?.savingsRate >= 20 ? 'bg-success' : 'bg-warning'}`}></span>
                      <span className="text-[9px] text-slate-500 font-semibold">{summary?.savingsRate >= 20 ? 'Optimal rate' : 'Under 20% limit'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Spending Analysis Section (Pie charts & limit aggregators) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Recharts Pie chart breakdown */}
                <div className="rounded-xl border border-slate-800 bg-card p-5 space-y-4">
                  <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Budget Allocation Actuals</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#161C2C', border: '1px solid #1F293D', borderRadius: '8px' }}
                          itemStyle={{ color: '#F1F5F9', fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend list */}
                  <div className="flex justify-around text-[10px] font-semibold text-slate-400">
                    {pieData.map((d, i) => (
                      <div key={i} className="flex items-center space-x-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                        <span>{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actual Spending vs Limit Target Comparison Bar Chart */}
                <div className="rounded-xl border border-slate-800 bg-card p-5 space-y-4">
                  <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Spending vs Recommended limits</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#161C2C', border: '1px solid #1F293D', borderRadius: '8px' }}
                          labelStyle={{ color: '#94A3B8', fontSize: '10px' }}
                          itemStyle={{ fontSize: '11px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '10px' }} />
                        <Bar dataKey="Actual" fill="#6366F1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Limit" fill="#1E293B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Financial Health indicators */}
                <div className="rounded-xl border border-slate-800 bg-card p-5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Financial Health Scorecards</h3>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900/50 border border-slate-800/40 text-xs">
                        <span className="text-slate-400 font-semibold">Cash-Flow Stability</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          summary?.savingsSurplus > summary?.monthlyIncome * 0.1 ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        }`}>
                          {summary?.savingsSurplus <= 0 ? 'Deficit / Critical' : summary?.savingsSurplus > summary?.monthlyIncome * 0.15 ? 'Stable surplus' : 'Tight / Warning'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900/50 border border-slate-800/40 text-xs">
                        <span className="text-slate-400 font-semibold">Safety Buffer Level</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          financialHealth?.safetyBufferStatus === 'healthy' ? 'bg-success/20 text-success' :
                          financialHealth?.safetyBufferStatus === 'warning' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'
                        }`}>
                          {financialHealth?.safetyBufferMonths || 0} months ({financialHealth?.safetyBufferStatus})
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900/50 border border-slate-800/40 text-xs">
                        <span className="text-slate-400 font-semibold">Subscription Creep</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          financialHealth?.subscriptionCount > 3 ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'
                        }`}>
                          {financialHealth?.subscriptionCount} active (₹{financialHealth?.totalSubscriptionCost}/mo)
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900/50 border border-slate-800/40 text-xs">
                        <span className="text-slate-400 font-semibold">Goal Coverage pace</span>
                        <span className="text-slate-300 font-bold">
                          {goals.filter(g => g.isFeasible).length} of {goals.length} on track
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-lg p-2.5 text-[10px] text-indigo-400 leading-normal flex items-start space-x-2 mt-3">
                    <BookOpen className="h-4 w-4 flex-shrink-0 text-indigo-400 mt-0.5" />
                    <span>
                      Rule-based advice compares your cash allocations with optimized safety levels to secure compound interest capabilities.
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendations segment */}
              <div className="rounded-xl border border-slate-800 bg-card p-5 space-y-4 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-primary-500" />
                  <h3 className="font-bold text-sm text-slate-200">Personalized Financial Recommendations</h3>
                </div>
                {recommendations.length === 0 ? (
                  <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500 font-medium">
                    Congratulations! Your expenditures are balanced and safety buffers are fully matched.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendations.map(rec => (
                      <div key={rec._id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3 relative overflow-hidden flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-xs text-slate-200">{rec.title}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${getFeasibilityBadge(rec.feasibility)}`}>
                              {rec.feasibility}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{rec.explanation}</p>
                          <div className="bg-slate-900 border border-slate-800/80 rounded p-2 text-[10px] text-indigo-400 font-semibold leading-relaxed">
                            💡 {rec.suggestedAction}
                          </div>
                        </div>

                        {/* Accept / Reject actions */}
                        <div className="flex justify-between items-center pt-3 border-t border-slate-800/60 mt-2">
                          <span className="text-[10px] text-success font-bold">Monthly Impact: +₹{rec.estimatedMonthlyImpact.toLocaleString('en-IN')}</span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleRecommendAction(rec._id, 'reject')}
                              className="rounded p-1 hover:bg-danger/20 text-slate-500 hover:text-danger border border-transparent hover:border-danger/30 transition-all"
                              title="Reject recommendation"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleRecommendAction(rec._id, 'accept')}
                              className="flex items-center space-x-1 rounded bg-success/20 text-success hover:bg-success/30 border border-success/30 px-2.5 py-1 text-[10px] font-bold transition-all shadow-sm"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Apply Target</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Goal planning card segment */}
              <div className="rounded-xl border border-slate-800 bg-card p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-200">Financial Goals</h3>
                  <button
                    onClick={() => setActiveTab('goals')}
                    className="text-xs font-semibold text-primary-500 flex items-center hover:underline"
                  >
                    <span>View Planner</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                
                {goals.length === 0 ? (
                  <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500 font-medium">
                    No active goals. Open the Goal Planner to design new milestones.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {goals.map(goal => {
                      const currentPace = summary?.savingsSurplus || 0;
                      const requiredPace = goal.requiredMonthlySaving;
                      const isPaceMatching = currentPace >= requiredPace;

                      return (
                        <div key={goal._id} className="rounded-lg border border-slate-800/80 bg-slate-900/20 p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-xs text-slate-100">{goal.name}</span>
                              <span className="text-[9px] text-slate-500 ml-2 font-medium">({goal.category})</span>
                            </div>
                            <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded ${getPriorityColor(goal.priority)}`}>
                              {goal.priority}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                              <span>₹{goal.currentAmount.toLocaleString('en-IN')} saved</span>
                              <span>Target: ₹{goal.targetAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${goal.progressPercent}%` }}></div>
                            </div>
                          </div>

                          {/* Pace comparer */}
                          <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-800/60 mt-1">
                            <div className="flex flex-col">
                              <span className="text-slate-500 text-[9px] font-bold uppercase">Required Pace</span>
                              <span className="text-slate-300 font-bold">₹{requiredPace.toLocaleString('en-IN')}/mo</span>
                            </div>
                            <div className="flex flex-col text-right">
                              <span className="text-slate-500 text-[9px] font-bold uppercase">Your Pace (Surplus)</span>
                              <span className={`font-black ${isPaceMatching ? 'text-success' : 'text-warning'}`}>
                                ₹{currentPace.toLocaleString('en-IN')}/mo
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Goal Planner Tab */}
          {activeTab === 'goals' && (
            <div className="space-y-6">
              {/* Renders strategy comparer cards if a goal is actively selected */}
              {planningGoal ? (
                <div className="space-y-6">
                  {/* Strategy Header Info */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-slate-800 rounded-xl p-5">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Target className="h-5 w-5 text-primary-500" />
                        <h2 className="text-sm font-bold text-slate-400">Comparing Goal Plan Strategies</h2>
                      </div>
                      <h1 className="text-2xl font-black text-white mt-1">{planningGoal.name}</h1>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs font-semibold text-slate-400">
                        <span>Target: ₹{planningGoal.targetAmount.toLocaleString('en-IN')}</span>
                        <span>•</span>
                        <span>Current: ₹{planningGoal.currentAmount.toLocaleString('en-IN')}</span>
                        <span>•</span>
                        <span>Deadline: {new Date(planningGoal.targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Assumptions controls */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-xs">
                        <span className="text-slate-500 font-semibold">Extend Deadline:</span>
                        <select
                          className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer"
                          defaultValue="6"
                          onChange={(e) => handleRegenerateStrategies(parseInt(e.target.value))}
                        >
                          <option value="3" className="bg-background text-slate-200">3 Months</option>
                          <option value="6" className="bg-background text-slate-200">6 Months</option>
                          <option value="9" className="bg-background text-slate-200">9 Months</option>
                          <option value="12" className="bg-background text-slate-200">12 Months</option>
                          <option value="18" className="bg-background text-slate-200">18 Months</option>
                        </select>
                      </div>
                      
                      <button
                        onClick={handleRejectAllPlans}
                        className="rounded-lg border border-slate-805 hover:bg-slate-800 text-xs font-bold text-slate-400 px-4 py-2 transition-all"
                      >
                        Reject All
                      </button>
                    </div>
                  </div>

                  {/* The 3 plans side-by-side comparison cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {generatedPlans.map((plan) => (
                      <div
                        key={plan._id}
                        className={`rounded-xl border bg-card flex flex-col justify-between shadow-xl transition-all duration-300 relative overflow-hidden ${
                          plan.strategyType === 'balanced'
                            ? 'border-primary-500/80 ring-2 ring-primary-500/10'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Highlight flag for recommended balanced plan */}
                        {plan.strategyType === 'balanced' && (
                          <div className="absolute top-0 right-0 bg-primary-500 text-white font-bold text-[9px] uppercase px-3 py-1 rounded-bl shadow-sm flex items-center space-x-1">
                            <Sparkles className="h-3 w-3" />
                            <span>⭐ Recommended</span>
                          </div>
                        )}

                        <div className="p-5 space-y-4">
                          {/* Plan Type Title */}
                          <div>
                            <span className="text-[10px] font-extrabold uppercase text-primary-500 tracking-wider">
                              Strategy Plan
                            </span>
                            <h3 className="text-xl font-bold text-slate-100 capitalize mt-0.5">{plan.strategyType}</h3>
                          </div>

                          {/* Strategy Score */}
                          <div className="flex justify-between items-center bg-slate-900/60 rounded-lg p-2.5 border border-slate-800/80">
                            <span className="text-xs text-slate-400 font-semibold">Suitability Score</span>
                            <span className="font-black text-sm text-primary-500">{plan.score} / 100</span>
                          </div>

                          {/* Monthly savings target */}
                          <div className="space-y-1">
                            <span className="text-xs text-slate-400 font-semibold">Monthly Savings Target</span>
                            <div className="text-2xl font-black text-slate-100">
                              ₹{plan.monthlySavingTarget.toLocaleString('en-IN')}
                              <span className="text-xs font-semibold text-slate-500"> /mo</span>
                            </div>
                          </div>

                          {/* Forecasted Target Date */}
                          <div className="space-y-1">
                            <span className="text-xs text-slate-400 font-semibold">Projected Date Achieved</span>
                            <div className="text-sm font-bold text-slate-200">
                              {new Date(plan.projectedGoalDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                            </div>
                          </div>

                          {/* Badges details */}
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-center space-y-0.5">
                              <span className="text-[9px] text-slate-500 font-semibold uppercase block">Safety Buffer</span>
                              <span className={`text-[10px] font-bold ${
                                plan.safetyBuffer >= 3 ? 'text-success' : plan.safetyBuffer >= 1.5 ? 'text-warning' : 'text-danger'
                              }`}>
                                {plan.safetyBuffer >= 3 ? 'Safe' : plan.safetyBuffer >= 1.5 ? 'Borderline' : 'Inadequate'} ({plan.safetyBuffer}x)
                              </span>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-center space-y-0.5">
                              <span className="text-[9px] text-slate-500 font-semibold uppercase block">Feasibility</span>
                              <span className={`text-[10px] font-bold ${getFeasibilityBadge(plan.feasibility)}`}>
                                {plan.feasibility}
                              </span>
                            </div>
                          </div>

                          {/* Spending Adjustments List */}
                          <div className="space-y-2 pt-2">
                            <span className="text-xs text-slate-400 font-bold">Monthly Cuts</span>
                            {plan.spendingAdjustments.length === 0 ? (
                              <div className="text-[11px] text-slate-500 font-medium italic">No budget cuts needed. Maintain current spending.</div>
                            ) : (
                              <div className="space-y-1.5">
                                {plan.spendingAdjustments.map((adj, i) => (
                                  <div key={i} className="flex justify-between items-center text-[11px] bg-slate-900/30 border border-slate-800/40 p-2 rounded">
                                    <span className="text-slate-300 font-semibold">{adj.category} Reduction</span>
                                    <span className="text-success font-bold">-₹{adj.difference}/mo</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Explanations */}
                          <div className="space-y-1.5 bg-slate-900/40 border border-slate-800/80 rounded-lg p-3 text-[11px] leading-relaxed text-slate-400">
                            <span className="font-bold text-[10px] text-slate-300 uppercase block tracking-wider">Engine Log Context</span>
                            <span>{plan.assumptions[0]}</span>
                          </div>
                        </div>

                        {/* Plan Strategy Selection Trigger */}
                        <div className="p-5 border-t border-slate-800/60 bg-slate-900/20">
                          <button
                            onClick={() => handleSelectPlan(plan)}
                            className={`w-full rounded-lg py-2.5 text-xs font-bold transition-all shadow-md ${
                              plan.strategyType === 'balanced'
                                ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/10'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            Select {plan.strategyType} Strategy
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Roadmap UI on selection */}
                  {selectedPlanStrategy && (
                    <div className="rounded-xl border border-success/40 bg-success/5 p-5 space-y-4">
                      <div className="flex items-center space-x-2">
                        <Check className="h-5 w-5 text-success animate-bounce" />
                        <h3 className="font-extrabold text-sm text-slate-200">Active Financial Strategy Persisted Successfully!</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-slate-400">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block">Selected Model</span>
                          <span className="text-slate-200 font-bold capitalize">{selectedPlanStrategy.strategyType}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block">Savings Milestone Target</span>
                          <span className="text-slate-200 font-bold">₹{selectedPlanStrategy.monthlySavingTarget.toLocaleString('en-IN')}/month</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block">Expected Target Completion</span>
                          <span className="text-slate-200 font-bold">
                            {new Date(selectedPlanStrategy.projectedGoalDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Goals List View */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-2xl font-bold text-white">Your Financial Goals</h1>
                      <p className="text-xs text-slate-400 font-medium">Create and customize financial milestones with prioritized rule-based allocations.</p>
                    </div>
                    <button
                      onClick={() => setShowCreateGoalModal(true)}
                      className="flex items-center space-x-2 rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-lg"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create Goal</span>
                    </button>
                  </div>

                  {goals.length === 0 ? (
                    <div className="border border-dashed border-slate-800 rounded-xl p-12 text-center max-w-lg mx-auto space-y-4">
                      <Target className="h-10 w-10 text-slate-600 mx-auto" />
                      <div className="space-y-1">
                        <h3 className="font-bold text-slate-300">No active goals</h3>
                        <p className="text-xs text-slate-500">First-time earners achieve financial milestones faster with focused goal planning. Let's create one!</p>
                      </div>
                      <button
                        onClick={() => setShowCreateGoalModal(true)}
                        className="rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2 text-xs font-bold text-white transition-all"
                      >
                        Create Your First Goal
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {goals.map((goal: any) => (
                        <div key={goal._id} className="rounded-xl border border-slate-800 bg-card p-5 space-y-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-extrabold text-slate-100">{goal.name}</h3>
                                <span className="text-[10px] text-slate-500 font-semibold">{goal.category} priority: {goal.priority}</span>
                              </div>
                              <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded ${
                                goal.isFeasible ? 'bg-success/20 text-success border-success/30' : 'bg-warning/20 text-warning border-warning/30'
                              }`}>
                                {goal.isFeasible ? 'Feasible' : 'At Risk'}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs text-slate-400 font-semibold">
                                <span>₹{goal.currentAmount.toLocaleString('en-IN')} saved</span>
                                <span>Target: ₹{goal.targetAmount.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${goal.progressPercent}%` }}></div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 bg-slate-900/30 p-3 rounded-lg border border-slate-800 text-xs font-semibold">
                              <div>
                                <span className="text-slate-500 font-bold block text-[9px] uppercase">Goal Target Deadline</span>
                                <span className="text-slate-300 font-bold">{new Date(goal.targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 font-bold block text-[9px] uppercase">Required Monthly Saving</span>
                                <span className="text-slate-300 font-bold">₹{goal.requiredMonthlySaving.toLocaleString('en-IN')}/mo</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-3 border-t border-slate-800/60 mt-3">
                            <span className="text-[10px] text-slate-500 font-semibold">
                              Created: {new Date(goal.createdAt).toLocaleDateString()}
                            </span>
                            <div className="flex space-x-3">
                              {/* Open strategies planner */}
                              <button
                                onClick={async () => {
                                  setPlanningGoal(goal);
                                  const plansRes = await fetch(`/api/goals/${goal._id}/plans`);
                                  const plansJson = await plansRes.json();
                                  if (plansJson.success) {
                                    setGeneratedPlans(plansJson.data);
                                  }
                                }}
                                className="flex items-center space-x-1.5 rounded-lg bg-primary-600/20 text-primary-500 hover:bg-primary-600/30 border border-primary-500/30 px-3 py-1.5 text-xs font-bold transition-all"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                <span>Plan Strategies</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-white">Transaction Tracker Ledger</h1>
                  <p className="text-xs text-slate-400 font-medium">Record and categorise all your savings, income, wants, and needs.</p>
                </div>
                <button
                  onClick={() => setShowAddTxModal(true)}
                  className="flex items-center space-x-2 rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  <span>Log Transaction</span>
                </button>
              </div>

              {/* Advanced Filtering Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-card border border-slate-800 p-4 rounded-xl text-xs font-semibold">
                {/* Search input */}
                <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search merchant/desc..."
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    className="bg-transparent focus:outline-none w-full text-slate-200 font-medium"
                  />
                </div>

                {/* Category select */}
                <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2">
                  <select
                    value={txCategoryFilter}
                    onChange={(e) => setTxCategoryFilter(e.target.value)}
                    className="bg-transparent text-slate-300 font-bold focus:outline-none w-full cursor-pointer"
                  >
                    <option value="" className="bg-background">All Categories</option>
                    <option value="Rent" className="bg-background">Rent (Needs)</option>
                    <option value="Groceries" className="bg-background">Groceries (Needs)</option>
                    <option value="Utilities" className="bg-background">Utilities (Needs)</option>
                    <option value="Dining Out" className="bg-background">Dining Out (Wants)</option>
                    <option value="Subscriptions" className="bg-background">Subscriptions (Wants)</option>
                    <option value="Shopping" className="bg-background">Shopping (Wants)</option>
                    <option value="Salary" className="bg-background">Salary (Income)</option>
                  </select>
                </div>

                {/* Type select */}
                <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2">
                  <select
                    value={txTypeFilter}
                    onChange={(e) => setTxTypeFilter(e.target.value as any)}
                    className="bg-transparent text-slate-300 font-bold focus:outline-none w-full cursor-pointer"
                  >
                    <option value="all" className="bg-background">All Types</option>
                    <option value="expense" className="bg-background">Expenses Only</option>
                    <option value="income" className="bg-background">Income Only</option>
                  </select>
                </div>

                {/* Start Date filter */}
                <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-slate-400">
                  <span className="text-[9px] uppercase font-bold text-slate-500">Start:</span>
                  <input
                    type="date"
                    value={txStartDate}
                    onChange={(e) => setTxStartDate(e.target.value)}
                    className="bg-transparent text-slate-200 focus:outline-none w-full text-xs font-semibold cursor-pointer"
                  />
                </div>

                {/* End Date filter */}
                <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-slate-400">
                  <span className="text-[9px] uppercase font-bold text-slate-500">End:</span>
                  <input
                    type="date"
                    value={txEndDate}
                    onChange={(e) => setTxEndDate(e.target.value)}
                    className="bg-transparent text-slate-200 focus:outline-none w-full text-xs font-semibold cursor-pointer"
                  />
                </div>
              </div>

              {/* Transactions Table Grid */}
              <div className="rounded-xl border border-slate-800 bg-card overflow-hidden shadow-md">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold">
                      <th className="p-4">Merchant/Description</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Recurring</th>
                      <th className="p-4 text-right">Amount</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transactions
                      .filter(tx => {
                        const matchesSearch = tx.merchant.toLowerCase().includes(txSearch.toLowerCase()) || tx.description.toLowerCase().includes(txSearch.toLowerCase());
                        const matchesCat = txCategoryFilter === '' || tx.category === txCategoryFilter;
                        const matchesType = txTypeFilter === 'all' || tx.type === txTypeFilter;
                        
                        let matchesDates = true;
                        if (txStartDate) matchesDates = matchesDates && new Date(tx.date) >= new Date(txStartDate);
                        if (txEndDate) matchesDates = matchesDates && new Date(tx.date) <= new Date(txEndDate);
                        
                        return matchesSearch && matchesCat && matchesType && matchesDates;
                      })
                      .map((tx) => (
                        <tr key={tx._id} className="hover:bg-slate-800/20 text-slate-300 transition-colors">
                          <td className="p-4 font-bold text-slate-200">
                            {tx.merchant}
                            {tx.description && <span className="block text-[10px] text-slate-500 font-normal mt-0.5">{tx.description}</span>}
                          </td>
                          <td className="p-4 font-semibold text-slate-400">{tx.category}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              tx.type === 'income' ? 'bg-success/20 text-success' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-slate-500">{new Date(tx.date).toLocaleDateString()}</td>
                          <td className="p-4">
                            {tx.recurring ? (
                              <span className="text-[10px] text-primary-500 font-bold border border-primary-500/20 bg-primary-500/10 px-1.5 py-0.5 rounded">Yes</span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className={`p-4 text-right font-black text-sm ${tx.amount > 0 ? 'text-success' : 'text-slate-200'}`}>
                            {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                          </td>
                          {/* Actions columns (edit/delete) */}
                          <td className="p-4 text-center">
                            <div className="flex justify-center space-x-2.5">
                              <button
                                onClick={() => openEditTxModal(tx)}
                                className="p-1 rounded hover:bg-primary-500/20 text-slate-500 hover:text-primary-500 transition-all"
                                title="Edit transaction"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(tx._id)}
                                className="p-1 rounded hover:bg-danger/20 text-slate-500 hover:text-danger transition-all"
                                title="Delete transaction"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Trail Logs Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Rule-Based Audit Trail</h1>
                <p className="text-xs text-slate-400 font-medium">Full transparency report logging every rule evaluated, snapshot state, and recommendation status update.</p>
              </div>

              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div key={log._id} className="rounded-xl border border-slate-800 bg-card p-5 space-y-3">
                    <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-900 border border-slate-800 text-indigo-400 tracking-wider">
                          {log.action}
                        </span>
                        <h4 className="font-bold text-xs text-slate-200 mt-2">Target Ref: {log.entityType} ({log._id})</h4>
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] leading-relaxed">
                      {/* Inputs Evaluated */}
                      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                        <span className="font-bold text-[9px] text-slate-500 uppercase tracking-widest block mb-1">State Evaluated</span>
                        <pre className="text-[10px] text-slate-400 font-mono overflow-x-auto p-1.5 bg-background rounded border border-slate-800/40">
                          {JSON.stringify(log.inputSnapshot, null, 2)}
                        </pre>
                      </div>

                      {/* Outputs Generated */}
                      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                        <span className="font-bold text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Decisions / Engine Outcomes</span>
                        <pre className="text-[10px] text-slate-400 font-mono overflow-x-auto p-1.5 bg-background rounded border border-slate-800/40">
                          {JSON.stringify(log.output, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation Center Tab */}
          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-white">Recommendation Center</h1>
                  <p className="text-xs text-slate-400 font-medium">Deterministic, rule-based suggestions to optimize your cash flow, safety buffer, and goal timelines.</p>
                </div>
                <div className="flex space-x-2 text-xs font-bold border border-slate-800 bg-slate-900/60 px-3 py-1.5 rounded-lg text-indigo-400">
                  <span>Score Velocity: {Math.round(recommendations.reduce((sum, r) => sum + r.score, 0) / (recommendations.length || 1))} average</span>
                </div>
              </div>

              {/* What should I do this month? Summary checklist */}
              <div className="rounded-xl border border-primary-500/30 bg-primary-950/5 p-5 space-y-4">
                <h3 className="font-extrabold text-sm text-slate-200 flex items-center space-x-2">
                  <Check className="h-5 w-5 text-primary-500" />
                  <span>What should I do this month? (Active Checklist)</span>
                </h3>
                {recommendations.filter(r => r.status === 'pending').length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No pending actions. You are fully on track!</p>
                ) : (
                  <div className="space-y-2">
                    {recommendations.filter(r => r.status === 'pending').map((rec) => (
                      <div key={rec._id} className="flex items-start space-x-3 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-slate-800 text-primary-500 focus:ring-0 cursor-pointer h-4 w-4"
                          onChange={() => handleRecommendAction(rec._id, 'accept')}
                        />
                        <div>
                          <span className="font-bold text-slate-200">{rec.suggestedAction}</span>
                          <span className="text-[10px] text-slate-500 ml-2">({rec.title})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Categorised Recommendations Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Risk/Attention Alerts & Emergency Buffers */}
                <div className="rounded-xl border border-slate-800 bg-card p-5 space-y-4">
                  <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center space-x-2">
                    <Shield className="h-4.5 w-4.5 text-danger" />
                    <span>Risk & Safety buffer Alerts</span>
                  </h3>
                  {recommendations.filter(r => r.type === 'emergency_fund').length === 0 ? (
                    <div className="text-xs text-slate-500 italic border border-dashed border-slate-800/80 rounded-lg p-4 text-center">
                      No active safety buffer alerts.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recommendations.filter(r => r.type === 'emergency_fund').map((rec) => (
                        <div key={rec._id} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-xs text-slate-200">{rec.title}</span>
                            <span className="text-[10px] bg-danger/10 text-danger border border-danger/20 px-1.5 py-0.5 rounded font-semibold uppercase">{rec.status}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{rec.explanation}</p>
                          <div className="flex justify-between items-center text-[10px] pt-2 border-t border-slate-800/40">
                            <span className="font-bold text-indigo-400">Score: {rec.score}</span>
                            <div className="flex space-x-2">
                              <button onClick={() => setDetailRec(rec)} className="px-2 py-1 text-slate-500 hover:text-slate-300">Details</button>
                              {rec.status === 'pending' && (
                                <>
                                  <button onClick={() => handleRecommendAction(rec._id, 'reject')} className="px-2 py-1 text-danger">Reject</button>
                                  <button onClick={() => handleRecommendAction(rec._id, 'accept')} className="bg-primary-600 px-3 py-1 rounded text-white font-bold">Accept</button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Goal-Specific Recovery Trim Recommendations */}
                <div className="rounded-xl border border-slate-800 bg-card p-5 space-y-4">
                  <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center space-x-2">
                    <Target className="h-4.5 w-4.5 text-warning" />
                    <span>Goal-Specific Recovery trims</span>
                  </h3>
                  {recommendations.filter(r => r.type === 'goal_acceleration').length === 0 ? (
                    <div className="text-xs text-slate-500 italic border border-dashed border-slate-800/80 rounded-lg p-4 text-center">
                      All goal targets are fully on track.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recommendations.filter(r => r.type === 'goal_acceleration').map((rec) => (
                        <div key={rec._id} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-xs text-slate-200">{rec.title}</span>
                            <span className="text-[10px] bg-warning/10 text-warning border border-warning/20 px-1.5 py-0.5 rounded font-semibold uppercase">{rec.status}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{rec.explanation}</p>
                          <div className="bg-slate-950 p-2 rounded text-[10px] text-indigo-400 font-semibold">
                            🎯 Recovery Target: {rec.suggestedAction}
                          </div>
                          <div className="flex justify-between items-center text-[10px] pt-2 border-t border-slate-800/40">
                            <span className="font-bold text-success">Monthly Impact: +₹{rec.estimatedMonthlyImpact.toLocaleString()}</span>
                            <div className="flex space-x-2">
                              <button onClick={() => setDetailRec(rec)} className="px-2 py-1 text-slate-500 hover:text-slate-300">Details</button>
                              {rec.status === 'pending' && (
                                <>
                                  <button onClick={() => handleRecommendAction(rec._id, 'reject')} className="px-2 py-1 text-danger">Reject</button>
                                  <button onClick={() => handleRecommendAction(rec._id, 'accept')} className="bg-primary-600 px-3 py-1 rounded text-white font-bold">Accept</button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* General Budget Cuts & Subscriptions */}
                <div className="rounded-xl border border-slate-800 bg-card p-5 space-y-4">
                  <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center space-x-2">
                    <DollarSign className="h-4.5 w-4.5 text-primary-500" />
                    <span>General spending optimizations</span>
                  </h3>
                  {recommendations.filter(r => r.type === 'expense_reduction').length === 0 ? (
                    <div className="text-xs text-slate-500 italic border border-dashed border-slate-800/80 rounded-lg p-4 text-center">
                      No active spending optimizations.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recommendations.filter(r => r.type === 'expense_reduction').map((rec) => (
                        <div key={rec._id} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-xs text-slate-200">{rec.title}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded font-semibold uppercase">{rec.status}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{rec.explanation}</p>
                          <div className="flex justify-between items-center text-[10px] pt-2 border-t border-slate-800/40">
                            <span className="font-bold text-success">Monthly Impact: +₹{rec.estimatedMonthlyImpact.toLocaleString()}</span>
                            <div className="flex space-x-2">
                              <button onClick={() => setDetailRec(rec)} className="px-2 py-1 text-slate-500 hover:text-slate-300">Details</button>
                              {rec.status === 'pending' && (
                                <>
                                  <button onClick={() => handleRecommendAction(rec._id, 'reject')} className="px-2 py-1 text-danger">Reject</button>
                                  <button onClick={() => handleRecommendAction(rec._id, 'accept')} className="bg-primary-600 px-3 py-1 rounded text-white font-bold">Accept</button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Progress Updates Log */}
                <div className="rounded-xl border border-slate-800 bg-card p-5 space-y-4">
                  <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center space-x-2">
                    <Activity className="h-4.5 w-4.5 text-success" />
                    <span>Goal Acceleration & speedups</span>
                  </h3>
                  {recommendations.filter(r => r.rulesTriggered.includes('RULE_GOAL_AHEAD_OF_SCHEDULE')).length === 0 ? (
                    <div className="text-xs text-slate-500 italic border border-dashed border-slate-800/80 rounded-lg p-4 text-center">
                      No goals are ahead of schedule yet. Increase savings rate to accelerate goals.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recommendations.filter(r => r.rulesTriggered.includes('RULE_GOAL_AHEAD_OF_SCHEDULE')).map((rec) => (
                        <div key={rec._id} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-xs text-slate-200">{rec.title}</span>
                            <span className="text-[10px] bg-success/10 text-success border border-success/20 px-1.5 py-0.5 rounded font-semibold uppercase">{rec.status}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{rec.explanation}</p>
                          <div className="flex justify-between items-center text-[10px] pt-2 border-t border-slate-800/40">
                            <span className="font-bold text-slate-500">Accelerated pace</span>
                            <div className="flex space-x-2">
                              <button onClick={() => setDetailRec(rec)} className="px-2 py-1 text-slate-500 hover:text-slate-300">Details</button>
                              {rec.status === 'pending' && (
                                <>
                                  <button onClick={() => handleRecommendAction(rec._id, 'reject')} className="px-2 py-1 text-danger">Reject</button>
                                  <button onClick={() => handleRecommendAction(rec._id, 'accept')} className="bg-primary-600 px-3 py-1 rounded text-white font-bold">Accept</button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* --- FORM MODALS --- */}

      {/* Profile Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-card p-6 shadow-2xl relative">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 rounded hover:bg-slate-800 p-1 text-slate-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5 text-primary-500" />
              <span>Assumptions Settings</span>
            </h3>

            <form onSubmit={handleUpdateSettings} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-400 block mb-1.5">Profile Name</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1.5">Base Monthly Income (₹)</label>
                <input
                  type="number"
                  required
                  value={profileIncome}
                  onChange={(e) => setProfileIncome(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1.5">Safety Buffer (Months)</label>
                  <select
                    value={profileBuffer}
                    onChange={(e) => setProfileBuffer(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="1">1 Month</option>
                    <option value="2">2 Months</option>
                    <option value="3">3 Months</option>
                    <option value="4">4 Months</option>
                    <option value="6">6 Months</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1.5">Experience Level</label>
                  <select
                    value={profileExp}
                    onChange={(e) => setProfileExp(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1.5">Employment Status</label>
                <select
                  value={profileEmployment}
                  onChange={(e) => setProfileEmployment(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="student">Student</option>
                  <option value="part-time">Part-Time / Intern</option>
                  <option value="full-time">Full-Time employee</option>
                  <option value="freelancer">Freelancer</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="rounded-lg border border-slate-850 hover:bg-slate-800 px-4 py-2 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2 text-white shadow shadow-primary-600/20"
                >
                  Save settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreateGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-card p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateGoalModal(false)}
              className="absolute top-4 right-4 rounded hover:bg-slate-800 p-1 text-slate-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <Target className="h-5 w-5 text-primary-500" />
              <span>Create Financial Goal</span>
            </h3>

            <form onSubmit={handleCreateGoal} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-400 block mb-1.5">Goal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Buy MacBook Air"
                  value={goalFormName}
                  onChange={(e) => setGoalFormName(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-200 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1.5">Target Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 85000"
                    value={goalFormTarget}
                    onChange={(e) => setGoalFormTarget(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1.5">Initial Savings (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={goalFormCurrent}
                    onChange={(e) => setGoalFormCurrent(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1.5">Deadline (Months)</label>
                  <select
                    value={goalFormDeadline}
                    onChange={(e) => setGoalFormDeadline(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="9">9 Months</option>
                    <option value="12">12 Months</option>
                    <option value="18">18 Months</option>
                    <option value="24">24 Months</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1.5">Priority</label>
                  <select
                    value={goalFormPriority}
                    onChange={(e) => setGoalFormPriority(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1.5">Category</label>
                <select
                  value={goalFormCategory}
                  onChange={(e) => setGoalFormCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="Gadgets">Gadgets</option>
                  <option value="Emergency Fund">Emergency Fund</option>
                  <option value="Education">Education</option>
                  <option value="Travel">Travel</option>
                  <option value="Vehicles">Vehicles</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateGoalModal(false)}
                  className="rounded-lg border border-slate-850 hover:bg-slate-800 px-4 py-2 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2 text-white shadow shadow-primary-600/20"
                >
                  Save & Compare Plans
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-card p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddTxModal(false)}
              className="absolute top-4 right-4 rounded hover:bg-slate-800 p-1 text-slate-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-primary-500" />
              <span>Log Ledger Transaction</span>
            </h3>

            <form onSubmit={handleAddTransaction} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 500"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1.5">Type</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1.5">Merchant Name / Source</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zomato, landlord, Salary pay"
                  value={txMerchant}
                  onChange={(e) => setTxMerchant(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1.5">Category</label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="Rent">Rent (Need)</option>
                    <option value="Groceries">Groceries (Need)</option>
                    <option value="Utilities">Utilities (Need)</option>
                    <option value="Dining Out">Dining Out (Want)</option>
                    <option value="Subscriptions">Subscriptions (Want)</option>
                    <option value="Shopping">Shopping (Want)</option>
                    <option value="Salary">Salary (Income)</option>
                  </select>
                </div>
                
                <div className="flex items-center pt-5 pl-2">
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-400 font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={txRecurring}
                      onChange={(e) => setTxRecurring(e.target.checked)}
                      className="rounded border-slate-800 text-primary-500 focus:ring-0 cursor-pointer h-4 w-4"
                    />
                    <span>Monthly Recurring</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1.5">Transaction Date</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-300 focus:outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1.5">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Weekend dinner out"
                    value={txDesc}
                    onChange={(e) => setTxDesc(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="rounded-lg border border-slate-850 hover:bg-slate-800 px-4 py-2 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2 text-white shadow shadow-primary-600/20"
                >
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-card p-6 shadow-2xl relative">
            <button
              onClick={() => { setShowEditTxModal(false); setEditingTransaction(null); }}
              className="absolute top-4 right-4 rounded hover:bg-slate-800 p-1 text-slate-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <Edit2 className="h-5 w-5 text-primary-500" />
              <span>Edit Ledger Transaction</span>
            </h3>

            <form onSubmit={handleEditTransaction} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1.5">Type</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1.5">Merchant Name / Source</label>
                <input
                  type="text"
                  required
                  value={txMerchant}
                  onChange={(e) => setTxMerchant(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1.5">Category</label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="Rent">Rent (Need)</option>
                    <option value="Groceries">Groceries (Need)</option>
                    <option value="Utilities">Utilities (Need)</option>
                    <option value="Dining Out">Dining Out (Want)</option>
                    <option value="Subscriptions">Subscriptions (Want)</option>
                    <option value="Shopping">Shopping (Want)</option>
                    <option value="Salary">Salary (Income)</option>
                  </select>
                </div>
                
                <div className="flex items-center pt-5 pl-2">
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-400 font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={txRecurring}
                      onChange={(e) => setTxRecurring(e.target.checked)}
                      className="rounded border-slate-800 text-primary-500 focus:ring-0 cursor-pointer h-4 w-4"
                    />
                    <span>Monthly Recurring</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1.5">Transaction Date</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-300 focus:outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1.5">Description (Optional)</label>
                  <input
                    type="text"
                    value={txDesc}
                    onChange={(e) => setTxDesc(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowEditTxModal(false); setEditingTransaction(null); }}
                  className="rounded-lg border border-slate-855 hover:bg-slate-800 px-4 py-2 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2 text-white shadow shadow-primary-600/20"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recommendation Details Modal */}
      {detailRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-card p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setDetailRec(null)}
              className="absolute top-4 right-4 rounded hover:bg-slate-800 p-1 text-slate-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="space-y-1">
              <span className="text-[10px] text-primary-500 font-extrabold uppercase tracking-wider">Engine Recommendation Detail</span>
              <h3 className="text-lg font-bold text-slate-100">{detailRec.title}</h3>
            </div>

            {/* Lifecycle Timeline */}
            <div className="border border-slate-800 bg-slate-900/60 p-4 rounded-xl space-y-3">
              <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-widest">Decision Lifecycle Stage</span>
              <div className="flex items-center justify-between text-xs font-semibold px-4 relative">
                <div className="absolute top-2.5 left-10 right-10 h-0.5 bg-slate-800 z-0"></div>
                
                <div className="flex flex-col items-center z-10 space-y-1">
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    detailRec.status === 'pending' || detailRec.status === 'accepted' || detailRec.status === 'completed'
                      ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-500'
                  }`}>1</span>
                  <span className="text-[9px] text-slate-400">PENDING</span>
                </div>

                <div className="flex flex-col items-center z-10 space-y-1">
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    detailRec.status === 'accepted' || detailRec.status === 'completed'
                      ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-500'
                  }`}>2</span>
                  <span className="text-[9px] text-slate-400">ACCEPTED</span>
                </div>

                <div className="flex flex-col items-center z-10 space-y-1">
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    detailRec.status === 'completed'
                      ? 'bg-success text-white' : 'bg-slate-800 text-slate-500'
                  }`}>3</span>
                  <span className="text-[9px] text-slate-400">COMPLETED</span>
                </div>
              </div>
            </div>

            {/* Engine trigger parameters */}
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 border border-slate-800/80 p-3 rounded-lg">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Evaluation Rules</span>
                  <span className="font-mono text-slate-300 text-[10px]">{detailRec.rulesTriggered.join(', ')}</span>
                </div>
                <div className="bg-slate-900/50 border border-slate-800/80 p-3 rounded-lg">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Feasibility Classification</span>
                  <span className="text-slate-300 font-bold capitalize">{detailRec.feasibility}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Explainable Trigger Context</span>
                <p className="text-slate-400 text-[11px] p-3 bg-slate-900 border border-slate-800/80 rounded-lg">{detailRec.explanation}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Suggested Actions</span>
                <p className="text-slate-300 text-[11px] font-semibold p-3 bg-slate-900 border border-slate-800/80 rounded-lg">💡 {detailRec.suggestedAction}</p>
              </div>
            </div>

            {/* Expected monthly impact and action options */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800 text-xs">
              <span className="text-success font-black text-sm">Monthly Savings Impact: +₹{detailRec.estimatedMonthlyImpact.toLocaleString('en-IN')}</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setDetailRec(null)}
                  className="rounded-lg border border-slate-850 hover:bg-slate-800 px-4 py-2 text-slate-400 font-bold"
                >
                  Close
                </button>
                {detailRec.status === 'pending' && (
                  <button
                    onClick={() => {
                      handleRecommendAction(detailRec._id, 'accept');
                      setDetailRec(null);
                    }}
                    className="rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2 text-white font-bold shadow shadow-primary-600/20"
                  >
                    Accept & Commit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Conversational Assistant */}
      {!isChatOpen ? (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 text-white shadow-xl shadow-primary-600/30 hover:scale-105 transition-all"
          title="Conversational Assistant"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      ) : (
        <div className="fixed bottom-6 right-6 z-45 w-96 rounded-xl border border-slate-800 bg-[#161C2C]/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden max-h-[500px]">
          {/* Chat header */}
          <div className="flex items-center justify-between bg-card px-4 py-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-primary-500" />
              <span className="font-extrabold text-xs text-slate-200">FirstPay Assistant</span>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="rounded p-1 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat logs */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] text-xs font-semibold leading-relaxed">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-2.5 whitespace-pre-line ${
                    msg.sender === 'user'
                      ? 'bg-primary-600 text-white rounded-br-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 border border-slate-800 text-slate-400 rounded-lg p-2.5 flex items-center space-x-2">
                  <Loader className="h-3.5 w-3.5 animate-spin text-primary-500" />
                  <span className="text-[10px] animate-pulse">Running read-only budget tools...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick suggest chips */}
          <div className="px-4 py-2 bg-slate-955/40 border-t border-slate-800 flex flex-wrap gap-1.5 text-[9px] font-bold">
            <button
              onClick={() => handleSendChatMessage(undefined, 'Can I buy a ₹15,000 phone?')}
              className="rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 px-2 py-1 transition-all"
            >
              Can I buy a ₹15k phone?
            </button>
            <button
              onClick={() => handleSendChatMessage(undefined, 'Why am I not reaching my goals?')}
              className="rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 px-2 py-1 transition-all"
            >
              Why delayed?
            </button>
            <button
              onClick={() => handleSendChatMessage(undefined, 'Break down my spending categories')}
              className="rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 px-2 py-1 transition-all"
            >
              Budget details
            </button>
          </div>

          {/* Chat Input form */}
          <form
            onSubmit={handleSendChatMessage}
            className="p-3 bg-card border-t border-slate-800 flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder="Ask FirstPay assistant..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isChatLoading}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:hover:bg-primary-600 rounded p-1.5 text-white transition-all shadow-md"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
