import { useLocation, useNavigate, Navigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { CashbackResult } from "@/types";
import { fetchUploadDetail } from "@/services/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionTable from "@/components/TransactionTable";
import SummaryCards from "@/components/SummaryCards";
import CategoryCharts from "@/components/CategoryCharts";
import AIChat from "@/components/AIChat";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();

  // Mode 1: Result passed via Router state (fresh upload)
  const stateResult = location.state?.result as CashbackResult | undefined;

  // Mode 2: Load from DB via URL param
  const [dbResult, setDbResult] = useState<CashbackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id && !stateResult) {
      setLoading(true);
      fetchUploadDetail(id)
        .then(setDbResult)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id, stateResult]);

  const result = stateResult || dbResult;

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

  if (!result) return <Navigate to="/upload" replace />;

  const backPath = id ? "/history" : "/upload";
  const backLabel = id ? "Back to History" : "Back to Upload";

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.username}</span>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
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
          <TabsTrigger value="ai">AI Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          <TransactionTable transactions={result.transactions} />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-4 space-y-6">
          <SummaryCards result={result} />
          <CategoryCharts transactions={result.transactions} />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AIChat transactions={result.transactions} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResultsPage;
