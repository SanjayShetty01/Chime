import { useState } from "react";
import { Transaction, ChatMessage } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Construction } from "lucide-react";

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

  if (q.includes("total") && q.includes("spend")) {
    return `Your total spend across all ${transactions.length} transactions is ₹${totalSpend.toLocaleString("en-IN")}.`;
  }
  if (q.includes("cashback") && (q.includes("total") || q.includes("expected") || q.includes("rate"))) {
    return `Your total expected cashback is ₹${totalCb.toFixed(2)}, which represents an effective return rate of ${((totalCb / totalSpend) * 100).toFixed(2)}%.`;
  }
  if (q.includes("category") || q.includes("categories") || q.includes("breakdown")) {
    const byCategory: Record<string, number> = {};
    transactions.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });
    const summaryList = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `• **${cat}**: ₹${amt.toLocaleString("en-IN")}`)
      .join("\n");
    return `Here is your spending breakdown across ${Object.keys(byCategory).length} categories:\n\n${summaryList}`;
  }
  if (q.includes("highest") || q.includes("biggest") || q.includes("largest")) {
    const max = transactions.reduce((a, b) => (a.amount > b.amount ? a : b));
    return `Your single largest transaction was **${max.description}** on ${max.date} for ₹${max.amount.toLocaleString("en-IN")} (${max.category}, ₹${max.cashbackAmount.toFixed(2)} cashback).`;
  }
  if (q.includes("maximize") || q.includes("improve") || q.includes("card") || q.includes("tip")) {
    return `To maximize your rewards:\n\n1. Ensure high-rate categories (like 5% online on SBI Cashback or 25% Airtel bills) don't exceed monthly caps.\n2. Move categories earning only 1% to dedicated cards (e.g. Amazon Pay ICICI for 5% on Amazon or HDFC Millennia for dining).\n3. Avoid excluded spends like fuel or rent on cards that do not reward them.`;
  }
  return `Based on your ${transactions.length} transactions totaling ₹${totalSpend.toLocaleString("en-IN")}, you are earning ₹${totalCb.toFixed(2)} in cashback. Try clicking one of the suggested prompt buttons below!`;
}

const SUGGESTED_PROMPTS = [
  "What is my total spend?",
  "What is my total cashback?",
  "What was my biggest purchase?",
  "Category breakdown",
  "How can I maximize my cashback?",
];

const AIChat = ({ transactions }: { transactions: Transaction[] }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", role: "assistant", content: generateInsights(transactions) },
  ]);
  const [input, setInput] = useState("");

  const handleSend = (text: string) => {
    const query = text.trim();
    if (!query) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: query };
    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: mockAnswer(query, transactions),
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  };

  return (
    <Card className="flex h-[540px] flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> AI Assistant & Insights
          </CardTitle>
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1.5 font-medium text-xs">
            <Construction className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> Work in Progress
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden pt-3">
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

        {/* Suggested Quick Prompt Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-primary transition-colors hover:bg-primary/15 hover:border-primary/40 focus:outline-none"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form
          className="flex gap-2 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question or select a prompt above..."
            className="flex-1 text-sm"
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AIChat;

