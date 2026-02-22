import { CashbackResult } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, IndianRupee, Percent, CreditCard } from "lucide-react";

const SummaryCards = ({ result }: { result: CashbackResult }) => {
  const items = [
    { label: "Total Transactions", value: result.summary.totalTransactions, icon: Receipt },
    { label: "Total Spend", value: `₹${result.summary.totalSpend.toLocaleString("en-IN")}`, icon: IndianRupee },
    { label: "Total Cashback", value: `₹${result.summary.totalCashback.toFixed(2)}`, icon: CreditCard },
    { label: "Effective Rate", value: `${result.summary.effectiveCashbackPercent.toFixed(2)}%`, icon: Percent },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
            <item.icon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SummaryCards;
