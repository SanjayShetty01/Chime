import { useLocation, useNavigate, Navigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { CashbackResult, Transaction } from "@/types";
import { fetchUploadDetail } from "@/services/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionTable from "@/components/TransactionTable";
import SummaryCards from "@/components/SummaryCards";
import CategoryCharts from "@/components/CategoryCharts";
import AIChat from "@/components/AIChat";
import AiSuggestions from "@/components/AiSuggestions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  // Mode 1: Result passed via Router state (fresh upload)
  const stateResult = location.state?.result as CashbackResult | undefined;

  // Active result state (allows real-time recalculations if user overrides rates)
  const [activeResult, setActiveResult] = useState<CashbackResult | null>(stateResult || null);
  const [loading, setLoading] = useState<boolean>(Boolean(id && !stateResult));
  const [error, setError] = useState("");

  useEffect(() => {
    if (stateResult) {
      setActiveResult(stateResult);
      setLoading(false);
    } else if (id) {
      setLoading(true);
      setError("");
      fetchUploadDetail(id)
        .then((res) => {
          setActiveResult(res);
        })
        .catch((err) => setError(err.message || "Failed to load statement details"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id, stateResult]);

  const handleTransactionsChange = (updatedTxns: Transaction[]) => {
    if (!activeResult) return;
    const totalSpend = updatedTxns.reduce((s, t) => s + t.amount, 0);
    const totalCashback = updatedTxns.reduce((s, t) => s + t.cashbackAmount, 0);
    const effectiveRate = totalSpend > 0 ? (totalCashback / totalSpend * 100) : 0;

    // Re-aggregate category breakdown
    const catMap: Record<string, { spend: number; cashback: number; count: number }> = {};
    updatedTxns.forEach((t) => {
      if (!catMap[t.category]) catMap[t.category] = { spend: 0, cashback: 0, count: 0 };
      catMap[t.category].spend += t.amount;
      catMap[t.category].cashback += t.cashbackAmount;
      catMap[t.category].count += 1;
    });

    const categoryBreakdown = Object.entries(catMap).map(([cat, vals]) => ({
      category: cat,
      spend: roundNum(vals.spend),
      cashback: roundNum(vals.cashback),
      transactionCount: vals.count,
    }));

    setActiveResult({
      ...activeResult,
      transactions: updatedTxns,
      summary: {
        ...activeResult.summary,
        totalSpend: roundNum(totalSpend),
        totalCashback: roundNum(totalCashback),
        effectiveCashbackPercent: roundNum(effectiveRate),
        categoryBreakdown,
      },
    });
  };

  const handleSaveComplete = (newTotalCashback: number, newEffectiveRate: number) => {
    if (!activeResult) return;
    setActiveResult((prev) =>
      prev
        ? {
            ...prev,
            summary: {
              ...prev.summary,
              totalCashback: roundNum(newTotalCashback),
              effectiveCashbackPercent: roundNum(newEffectiveRate),
            },
          }
        : null
    );
  };

  const roundNum = (n: number) => Math.round(n * 100) / 100;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => navigate("/history")}>
          Back to History
        </Button>
      </div>
    );
  }

  if (!activeResult) return <Navigate to="/upload" replace />;

  const result = activeResult;
  const backPath = id ? "/history" : "/upload";
  const backLabel = id ? "Back to History" : "Back to Upload";

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <Navbar />

      <div className="container max-w-6xl py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </Button>
        </div>

        {/* Card Banner */}
        <div
          className="flex items-center gap-3 rounded-lg px-5 py-4 text-primary-foreground"
          style={{ backgroundColor: result.card.color }}
        >
          <span className="text-2xl">{result.card.icon}</span>
          <div>
            <h2 className="text-lg font-semibold">{result.card.name}</h2>
            <p className="text-sm opacity-90">
              {result.card.bank}
              {result.month && ` · ${result.month}`}
            </p>
          </div>
        </div>

        <Tabs defaultValue="transactions">
          <TabsList>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="ai">AI Suggestions</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-4">
            <TransactionTable
              transactions={result.transactions}
              uploadId={result.uploadId || id}
              onTransactionsChange={handleTransactionsChange}
              onSaveComplete={handleSaveComplete}
            />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-4 space-y-6">
            <SummaryCards result={result} />
            <CategoryCharts transactions={result.transactions} />
          </TabsContent>

          <TabsContent value="ai" className="mt-4 space-y-6">
            <AiSuggestions summary={result.summary} />
            <AIChat transactions={result.transactions} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ResultsPage;
