import { Card, CardContent } from "@/components/ui/card";
import { CashbackSummary } from "@/types";
import { IndianRupee, Receipt, TrendingUp, Percent } from "lucide-react";

interface Props {
  summary: CashbackSummary;
  cardColor: string;
}

const stats = (s: CashbackSummary) => [
  {
    label: "Total Transactions",
    value: s.totalTransactions.toString(),
    icon: Receipt,
  },
  {
    label: "Total Spend",
    value: `₹${s.totalSpend.toLocaleString("en-IN")}`,
    icon: IndianRupee,
  },
  {
    label: "Total Cashback",
    value: `₹${s.totalCashback.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    icon: TrendingUp,
  },
  {
    label: "Effective Cashback",
    value: `${s.effectiveCashbackPercent.toFixed(2)}%`,
    icon: Percent,
  },
];

const SummaryCards = ({ summary }: Props) => {
  const items = stats(summary);

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex flex-col gap-1 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <item.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{item.label}</span>
            </div>
            <span className="text-xl font-bold text-foreground">{item.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SummaryCards;
