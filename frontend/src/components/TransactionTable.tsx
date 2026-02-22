import { useState } from "react";
import { Transaction } from "@/types";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  transactions: Transaction[];
}

type SortKey = "date" | "amount" | "cashbackAmount";

const TransactionTable = ({ transactions }: Props) => {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = Array.from(new Set(transactions.map((t) => t.category)));

  const filtered = filterCategory === "all" ? transactions : transactions.filter((t) => t.category === filterCategory);
  const sorted = [...filtered].sort((a, b) => {
    const mul = sortAsc ? 1 : -1;
    if (sortKey === "date") return mul * a.date.localeCompare(b.date);
    return mul * (a[sortKey] - b[sortKey]);
  });

  const totalSpend = sorted.reduce((s, t) => s + t.amount, 0);
  const totalCashback = sorted.reduce((s, t) => s + t.cashbackAmount, 0);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const exportData = (format: "csv" | "xlsx" | "txt") => {
    const rows = sorted.map((t) => ({
      Date: t.date,
      Description: t.description,
      Category: t.category,
      Amount: t.amount,
      "Cashback Rate (%)": t.cashbackRate,
      "Cashback Amount": t.cashbackAmount,
    }));

    if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      XLSX.writeFile(wb, "chime-transactions.xlsx");
      return;
    }

    const headers = Object.keys(rows[0]);
    const sep = format === "csv" ? "," : "\t";
    const lines = [headers.join(sep), ...rows.map((r) => headers.map((h) => (r as Record<string, unknown>)[h]).join(sep))];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chime-transactions.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          {(["csv", "xlsx", "txt"] as const).map((f) => (
            <Button key={f} variant="outline" size="sm" onClick={() => exportData(f)}>
              <Download className="mr-1 h-3 w-3" />
              {f.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                Date <ArrowUpDown className="ml-1 inline h-3 w-3" />
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => handleSort("amount")}>
                Amount (₹) <ArrowUpDown className="ml-1 inline h-3 w-3" />
              </TableHead>
              <TableHead className="text-right">Rate (%)</TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => handleSort("cashbackAmount")}>
                Cashback (₹) <ArrowUpDown className="ml-1 inline h-3 w-3" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs">{t.date}</TableCell>
                <TableCell>{t.description}</TableCell>
                <TableCell>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{t.category}</span>
                </TableCell>
                <TableCell className="text-right font-mono">₹{t.amount.toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-right">{t.cashbackRate}%</TableCell>
                <TableCell className="text-right font-mono text-primary">₹{t.cashbackAmount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right font-mono">₹{totalSpend.toLocaleString("en-IN")}</TableCell>
              <TableCell />
              <TableCell className="text-right font-mono text-primary">₹{totalCashback.toFixed(2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TransactionTable;
