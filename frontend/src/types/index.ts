export interface CardConfig {
  id: string;
  name: string;
  bank: string;
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  cashbackRate: number;
  cashbackAmount: number;
  confidence?: number;
  matchType?: string;
  userOverrideRate?: number;
}

export interface CashbackResult {
  uploadId?: string;
  month?: string;
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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface AnalyticsSummary {
  summary: {
    totalSpend: number;
    totalCashback: number;
    effectiveRate: number;
    totalTransactions: number;
    uploadCount: number;
    totalUndercredited: number;
  };
  monthlyTrends: Array<{
    month: string;
    spend: number;
    cashback: number;
    transactions: number;
    effectiveRate: number;
  }>;
  cardBreakdown: Array<{
    cardId: string;
    cardName: string;
    cardBank: string;
    cardColor: string;
    cardIcon: string;
    spend: number;
    cashback: number;
    statementCount: number;
    effectiveRate: number;
  }>;
  categoryBreakdown: CategoryBreakdown[];
  discrepancies: DiscrepancyItem[];
}

export interface DiscrepancyItem {
  uploadId: string;
  cardName: string;
  month: string;
  expectedCashback: number;
  actualCashback: number;
  difference: number;
  status: "MATCHED" | "UNDERPAID" | "OVERPAID";
}

export interface UserProfile {
  username: string;
  security_question?: string;
  created_at: string;
}
