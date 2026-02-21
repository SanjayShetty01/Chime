export interface CardConfig {
  id: string;
  name: string;
  bank: string;
  color: string; // HSL accent color
  icon: string; // Lucide icon name or emoji
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  cashbackRate: number;
  cashbackAmount: number;
}

export interface CashbackResult {
  card: CardConfig;
  transactions: Transaction[];
  summary: CashbackSummary;
}

export interface CashbackSummary {
  totalTransactions: number;
  totalSpend: number;
  totalCashback: number;
  effectiveCashbackPercent: number;
  categoryBreakdown: CategoryBreakdown[];
}

export interface CategoryBreakdown {
  category: string;
  spend: number;
  cashback: number;
  transactionCount: number;
}

export interface UploadRequest {
  cardId: string;
  file: File;
  password: string;
}
