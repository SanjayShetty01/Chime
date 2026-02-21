import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { CashbackResult } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import TransactionTable from "@/components/TransactionTable";
import SummaryCards from "@/components/SummaryCards";
import CategoryCharts from "@/components/CategoryCharts";
import AiSuggestions from "@/components/AiSuggestions";
import ThemeToggle from "@/components/ThemeToggle";

const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result as CashbackResult | undefined;

  if (!result) return <Navigate to="/upload" replace />;

  const { card, transactions, summary } = result;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Card banner */}
      <header
        className="border-b"
        style={{ backgroundColor: `hsl(${card.color} / 0.08)` }}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/upload")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{card.bank}</p>
            <h1 className="text-xl font-semibold text-foreground">
              {card.icon} {card.name} — Cashback Report
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <SummaryCards summary={summary} cardColor={card.color} />

        <Tabs defaultValue="transactions" className="mt-8">
          <TabsList>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1">
              <Sparkles className="h-3.5 w-3.5" /> AI Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <TransactionTable transactions={transactions} />
          </TabsContent>

          <TabsContent value="dashboard">
            <CategoryCharts breakdown={summary.categoryBreakdown} />
          </TabsContent>

          <TabsContent value="ai">
            <AiSuggestions summary={summary} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ResultsPage;
