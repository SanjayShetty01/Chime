import { useState } from "react";
import { Transaction, ChatMessage } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles } from "lucide-react";

function generateInsights(transactions: Transaction[]): string {
  const byCategory: Record<string, { spend: number; cashback: number }> = {};
  transactions.forEach((t) => {
    if (!byCategory[t.category]) byCategory[t.category] = { spend: 0, cashback: 0 };
    byCategory[t.category].spend += t.amount;
    byCategory[t.category].cashback += t.cashbackAmount;
  });

  const sorted = Object.entries(byCategory).sort((a, b) => b[1].spend - a[1].spend);
  const topSpend = sorted[0];
  const topCashback = Object.entries(byCategory).sort((a, b) => b[1].cashback - a[1].cashback)[0];
  const totalSpend = transactions.reduce((s, t) => s + t.amount, 0);
  const totalCb = transactions.reduce((s, t) => s + t.cashbackAmount, 0);

  return `Here's a quick summary of your statement:\n\n📊 **Top Spending Category**: ${topSpend[0]} (₹${topSpend[1].spend.toLocaleString("en-IN")})\n💰 **Best Cashback Category**: ${topCashback[0]} (₹${topCashback[1].cashback.toFixed(2)})\n📈 **Effective Cashback Rate**: ${((totalCb / totalSpend) * 100).toFixed(2)}%\n\n💡 **Tip**: Focus your online shopping on this card for the best returns. Consider using a different card for categories with only 1% cashback.`;
}

function mockAnswer(question: string, transactions: Transaction[]): string {
  const q = question.toLowerCase();
  const totalSpend = transactions.reduce((s, t) => s + t.amount, 0);
  const totalCb = transactions.reduce((s, t) => s + t.cashbackAmount, 0);

  if (q.includes("total") && q.includes("spend")) return `Your total spend is ₹${totalSpend.toLocaleString("en-IN")}.`;
  if (q.includes("cashback")) return `Your total expected cashback is ₹${totalCb.toFixed(2)}, an effective rate of ${((totalCb / totalSpend) * 100).toFixed(2)}%.`;
  if (q.includes("category") || q.includes("categories")) {
    const cats = Array.from(new Set(transactions.map((t) => t.category)));
    return `Your transactions span ${cats.length} categories: ${cats.join(", ")}.`;
  }
  if (q.includes("highest") || q.includes("biggest")) {
    const max = transactions.reduce((a, b) => (a.amount > b.amount ? a : b));
    return `Your biggest transaction was "${max.description}" for ₹${max.amount.toLocaleString("en-IN")}.`;
  }
  return `Based on your ${transactions.length} transactions totaling ₹${totalSpend.toLocaleString("en-IN")}, you're earning ₹${totalCb.toFixed(2)} in cashback. Try asking about specific categories, your highest spend, or cashback details!`;
}

const AIChat = ({ transactions }: { transactions: Transaction[] }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", role: "assistant", content: generateInsights(transactions) },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: input };
    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: mockAnswer(input, transactions),
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  };

  return (
    <Card className="flex h-[500px] flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg px-3 py-2 text-sm whitespace-pre-line ${
                m.role === "assistant"
                  ? "bg-muted text-foreground"
                  : "ml-auto max-w-[80%] bg-primary text-primary-foreground"
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your cashback…"
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AIChat;
