import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { CashbackResult } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionTable from "@/components/TransactionTable";
import SummaryCards from "@/components/SummaryCards";
import CategoryCharts from "@/components/CategoryCharts";
import AIChat from "@/components/AIChat";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const result = location.state?.result as CashbackResult | undefined;

  if (!result) return <Navigate to="/upload" replace />;

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/upload")} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Upload
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.name}</span>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Card Banner */}
      <div
        className="flex items-center gap-3 rounded-lg px-5 py-4 text-primary-foreground"
        style={{ backgroundColor: `hsl(${result.card.color})` }}
      >
        <span className="text-2xl">{result.card.icon}</span>
        <div>
          <h2 className="text-lg font-semibold">{result.card.name}</h2>
          <p className="text-sm opacity-90">{result.card.bank}</p>
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
