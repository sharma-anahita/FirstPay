# FirstPay

FirstPay is a full-stack financial planning and recommendation platform designed for first-time earners and students. Instead of a generic AI chatbot, it uses a robust, rule-based recommendation engine to provide explainable financial insights and goals tracking, while respecting minimum safety buffer constraints.

## Tech Stack
- **Frontend:** React (Vite + TypeScript), Tailwind CSS, Recharts
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB (Mongoose ODM)

---

## Directory Structure

```
razorpay/
├── backend/            # Express REST API, Mongoose Models, Recommendation Engine
│   ├── src/
│   │   ├── config/     # Database and env configs
│   │   ├── models/     # User, Transaction, Goal, Recommendation, Plan, AuditLog models
│   │   └── seed.ts     # Database seed script for synthetic demo profiles
├── frontend/           # React single-page application (to be implemented)
└── package.json        # Root script orchestrator
```

---

## Database Schema Specs

FirstPay defines six core schemas:
1. **User**: Financial experience, monthly income, employment details, and safety buffer preferences.
2. **Transaction**: Income & expenses detailing date, merchant, amounts, recurring tags, and 50/30/20 category classifications.
3. **FinancialGoal**: Individual goals containing target amounts, priority, projected timeline, and status.
4. **Recommendation**: Fully explainable, rule-based advice with priority scores and specific rule audit keys.
5. **FinancialPlan**: Multi-strategy goal planner outcomes (Conservative, Balanced, Aggressive) detailing specific spending adjustments.
6. **AuditLog**: Fully transparent logs tracking engine evaluations, snapshot states, and accepted/rejected states.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) running locally (port `27017`) or a remote MongoDB Atlas URI.

### Installation

1. Clone or navigate to the project directory:
   ```bash
   cd d:/razorpay
   ```

2. Install dependencies for the root, backend, and frontend directories:
   ```bash
   npm run install:all
   ```

3. Configure environment variables in `backend/.env`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/firstpay
   NODE_ENV=development
   ```

### Seeding Synthetic Demo Data
To populate your local MongoDB instance with 5 distinct mock profiles, run the seeding script:
```bash
npm run seed
```
This seeds Aarav Patel (student), Sneha Reddy (freelancer), Vikram Malhotra (junior engineer), Priya Sharma (intern), and Rohan Das (careless spender) with 2 months of transaction history, active financial goals, pending recommendations, and audit logs.

### Running in Development
To run both the React frontend and Node/Express backend in development mode concurrently:
```bash
npm run dev
```
- Frontend will run on `http://localhost:5173` (once implemented).
- Backend will run on `http://localhost:5000`.
- Backend health check API is available at `http://localhost:5000/api/health`.

---

## API Documentation

All endpoints return a consistent JSON format:
```json
{
  "success": true,
  "message": "Optional feedback message",
  "data": { ... }
}
```

### 1. Auth/User Endpoints
- **Get User Profile**
  - `GET /api/users/:id`
- **Update User Profile**
  - `PUT /api/users/:id`
  - Body: `{ name?: string, monthlyIncome?: number, employmentType?: string, experienceLevel?: string, minimumSafetyBuffer?: number }`

### 2. Transaction Endpoints
- **Get User Transactions**
  - `GET /api/users/:id/transactions`
  - Query parameters: `search` (merchant or description regex), `category` (exact category), `type` ('income' | 'expense'), `startDate`, `endDate`, `limit`, `page`.
- **Create Transaction**
  - `POST /api/users/:id/transactions`
  - Body: `{ amount: number, type: 'income' | 'expense', category: string, merchant: string, description?: string, date?: string, recurring?: boolean }`
- **Update Transaction**
  - `PUT /api/transactions/:id`
  - Body: `{ amount?, type?, category?, merchant?, description?, date?, recurring? }`
- **Delete Transaction**
  - `DELETE /api/transactions/:id`
- **Get Category Budget Summary**
  - `GET /api/users/:id/transactions/summary`
  - Returns current 30-day Needs vs Wants vs Savings actuals compared with 50/30/20 targets.

### 3. Financial Goal Endpoints
- **Get User Goals**
  - `GET /api/users/:id/goals`
  - Returns goal progress %, target completion forecasts, and monthly required savings.
- **Create Goal**
  - `POST /api/users/:id/goals`
  - Body: `{ name: string, targetAmount: number, currentAmount?: number, targetDate: string, priority: 'low' | 'medium' | 'high', category: string }`
- **Update Goal**
  - `PUT /api/goals/:id`
  - Body: `{ name?, targetAmount?, currentAmount?, targetDate?, priority?, category?, status? }`
- **Delete Goal**
  - `DELETE /api/goals/:id`
- **Get Goal Progress Detail**
  - `GET /api/goals/:id/progress`

### 4. Financial Summary
- **Get Dashboard Summary**
  - `GET /api/users/:id/dashboard`
  - Returns a unified payload containing current balances, savings rates, 30-day budget actuals, active goals progress, safety buffers (months of expenses), and recent pending recommendations.

### 5. Recommendation Endpoints
- **Get Pending Recommendations**
  - `GET /api/users/:id/recommendations`
- **Generate Recommendations**
  - `POST /api/users/:id/recommendations/generate`
  - Triggers the rule-based engine to re-evaluate financial state and generate new recommendations.
- **Accept Recommendation**
  - `POST /api/recommendations/:id/accept`
  - Updates recommendation status to `accepted` and appends to the Audit Log.
- **Reject Recommendation**
  - `POST /api/recommendations/:id/reject`
  - Updates recommendation status to `rejected` and appends to the Audit Log.

### 6. Goal Strategy Plans (Multi-Plan Planner)
- **Generate Strategies**
  - `POST /api/goals/:id/plans`
  - Computes and saves the Conservative, Balanced, and Aggressive plan strategies for achieving a goal.
- **Get Strategies**
  - `GET /api/goals/:id/plans`
- **Select Strategy**
  - `POST /api/plans/:id/select`
  - Sets the strategy as active and records the choice in the Audit Log.

### 7. Audit Trail
- **Get User Audit Logs**
  - `GET /api/users/:id/audit-log`
  - Returns the persistent audit list of rule checks, plan selections, and recommendation feedback events.

