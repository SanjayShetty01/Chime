import { Transaction, CashbackResult, CashbackSummary, CategoryBreakdown } from "@/types";
import { getCardById } from "@/config/cards";

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "1", date: "2025-01-03", description: "Swiggy Order", category: "Dining", amount: 450, cashbackRate: 5, cashbackAmount: 22.5 },
  { id: "2", date: "2025-01-05", description: "Amazon.in Purchase", category: "Online Shopping", amount: 2999, cashbackRate: 3, cashbackAmount: 89.97 },
  { id: "3", date: "2025-01-07", description: "BigBasket Groceries", category: "Groceries", amount: 1820, cashbackRate: 2, cashbackAmount: 36.4 },
  { id: "4", date: "2025-01-08", description: "Uber Ride", category: "Travel", amount: 320, cashbackRate: 1, cashbackAmount: 3.2 },
  { id: "5", date: "2025-01-10", description: "Netflix Subscription", category: "Entertainment", amount: 649, cashbackRate: 1, cashbackAmount: 6.49 },
  { id: "6", date: "2025-01-12", description: "Reliance Fresh", category: "Groceries", amount: 980, cashbackRate: 2, cashbackAmount: 19.6 },
  { id: "7", date: "2025-01-14", description: "Zomato Gold Dining", category: "Dining", amount: 1250, cashbackRate: 5, cashbackAmount: 62.5 },
  { id: "8", date: "2025-01-16", description: "Flipkart Electronics", category: "Online Shopping", amount: 4500, cashbackRate: 3, cashbackAmount: 135 },
  { id: "9", date: "2025-01-18", description: "IRCTC Booking", category: "Travel", amount: 1800, cashbackRate: 1, cashbackAmount: 18 },
  { id: "10", date: "2025-01-20", description: "Myntra Clothing", category: "Online Shopping", amount: 2100, cashbackRate: 3, cashbackAmount: 63 },
  { id: "11", date: "2025-01-22", description: "DMart Monthly", category: "Groceries", amount: 3200, cashbackRate: 2, cashbackAmount: 64 },
  { id: "12", date: "2025-01-24", description: "Ola Auto", category: "Travel", amount: 150, cashbackRate: 1, cashbackAmount: 1.5 },
  { id: "13", date: "2025-01-26", description: "Starbucks Coffee", category: "Dining", amount: 580, cashbackRate: 5, cashbackAmount: 29 },
  { id: "14", date: "2025-01-28", description: "Jio Recharge", category: "Utilities", amount: 399, cashbackRate: 1, cashbackAmount: 3.99 },
  { id: "15", date: "2025-01-30", description: "BookMyShow Tickets", category: "Entertainment", amount: 700, cashbackRate: 1, cashbackAmount: 7 },
];

function buildSummary(transactions: Transaction[]): CashbackSummary {
  const totalSpend = transactions.reduce((s, t) => s + t.amount, 0);
  const totalCashback = transactions.reduce((s, t) => s + t.cashbackAmount, 0);

  const catMap: Record<string, CategoryBreakdown> = {};
  for (const t of transactions) {
    if (!catMap[t.category]) {
      catMap[t.category] = { category: t.category, spend: 0, cashback: 0, transactionCount: 0 };
    }
    catMap[t.category].spend += t.amount;
    catMap[t.category].cashback += t.cashbackAmount;
    catMap[t.category].transactionCount += 1;
  }

  return {
    totalTransactions: transactions.length,
    totalSpend,
    totalCashback,
    effectiveCashbackPercent: totalSpend > 0 ? (totalCashback / totalSpend) * 100 : 0,
    categoryBreakdown: Object.values(catMap),
  };
}

export function getMockResult(cardId: string): CashbackResult {
  const card = getCardById(cardId)!;
  return {
    card,
    transactions: MOCK_TRANSACTIONS,
    summary: buildSummary(MOCK_TRANSACTIONS),
  };
}
