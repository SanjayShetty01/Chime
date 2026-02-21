import { CashbackSummary, CategoryBreakdown } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";

interface Props {
  summary: CashbackSummary;
}

interface Suggestion {
  icon: React.ElementType;
  title: string;
  description: string;
  type: "tip" | "warning" | "recommendation";
}

const generateSuggestions = (summary: CashbackSummary): Suggestion[] => {
  const suggestions: Suggestion[] = [];
  const { categoryBreakdown, effectiveCashbackPercent, totalSpend } = summary;

  // Sort categories by spend descending
  const sorted = [...categoryBreakdown].sort((a, b) => b.spend - a.spend);
  const topCategory = sorted[0];
  const lowCashbackCategories = sorted.filter(
    (c) => c.spend > 0 && (c.cashback / c.spend) * 100 < 1
  );

  // Overall cashback rate feedback
  if (effectiveCashbackPercent < 1) {
    suggestions.push({
      icon: AlertTriangle,
      title: "Low overall cashback rate",
      description: `Your effective cashback is only ${effectiveCashbackPercent.toFixed(2)}%. Consider using a card that offers higher rewards for your top spending categories like ${topCategory?.category ?? "general spending"}.`,
      type: "warning",
    });
  } else if (effectiveCashbackPercent >= 2) {
    suggestions.push({
      icon: TrendingUp,
      title: "Great cashback rate!",
      description: `You're earning ${effectiveCashbackPercent.toFixed(2)}% effective cashback — that's above average. Keep using this card for your high-reward categories.`,
      type: "tip",
    });
  }

  // Top spending category insight
  if (topCategory) {
    const rate = (topCategory.cashback / topCategory.spend) * 100;
    suggestions.push({
      icon: Lightbulb,
      title: `Highest spend: ${topCategory.category}`,
      description: `You spent ₹${topCategory.spend.toLocaleString("en-IN")} on ${topCategory.category} (${rate.toFixed(1)}% cashback). ${rate < 1.5 ? "A card like HDFC Millennia or Amazon Pay ICICI may offer better rewards here." : "This category is already well-optimized."}`,
      type: rate < 1.5 ? "recommendation" : "tip",
    });
  }

  // Low cashback categories
  if (lowCashbackCategories.length > 0) {
    const names = lowCashbackCategories.slice(0, 3).map((c) => c.category).join(", ");
    suggestions.push({
      icon: Sparkles,
      title: "Opportunity to improve",
      description: `Categories like ${names} are earning less than 1% cashback. Look for cards that specialize in these areas — e.g., SBI CashBack for online spends, Axis ACE for bill payments.`,
      type: "recommendation",
    });
  }

  // General tip
  suggestions.push({
    icon: Lightbulb,
    title: "Stack your cards",
    description:
      "Using multiple cards for different categories can maximize total cashback. For example, use Amazon Pay ICICI for Amazon, HDFC MoneyBack+ for UPI, and SBI CashBack for online shopping.",
    type: "tip",
  });

  return suggestions;
};

const typeBadge = (type: Suggestion["type"]) => {
  switch (type) {
    case "warning":
      return <Badge variant="destructive">Alert</Badge>;
    case "recommendation":
      return <Badge className="bg-primary/15 text-primary border-0">Suggestion</Badge>;
    default:
      return <Badge variant="secondary">Tip</Badge>;
  }
};

const AiSuggestions = ({ summary }: Props) => {
  const suggestions = generateSuggestions(summary);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Based on your spending patterns, here are some recommendations to maximize your cashback.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {suggestions.map((s, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold">{s.title}</CardTitle>
                  {typeBadge(s.type)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{s.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AiSuggestions;
