import { useState, useEffect, useRef } from "react";
import { Transaction } from "@/types";
import { saveBatchOverrides, updateTransactionOverride } from "@/services/api";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Download, RotateCcw, Save, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface ExtendedTransaction extends Transaction {
  baseCashbackRate?: number;
}

interface Props {
  transactions: Transaction[];
  uploadId?: string;
  onTransactionsChange?: (updated: Transaction[]) => void;
  onSaveComplete?: (totalCashback: number, effectiveRate: number) => void;
}

type SortKey = "date" | "amount" | "cashbackAmount";

const TransactionTable = ({
  transactions: initialTransactions,
  uploadId,
  onTransactionsChange,
  onSaveComplete,
}: Props) => {
  const { toast } = useToast();
  const [txns, setTxns] = useState<ExtendedTransaction[]>(() =>
    initialTransactions.map((t) => ({
      ...t,
      baseCashbackRate: t.cashbackRate,
    }))
  );
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [unsavedIds, setUnsavedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setTxns(
      initialTransactions.map((t) => ({
        ...t,
        baseCashbackRate: t.cashbackRate,
      }))
    );
  }, [initialTransactions]);

  const categories = Array.from(new Set(txns.map((t) => t.category)));

  const filtered = filterCategory === "all" ? txns : txns.filter((t) => t.category === filterCategory);
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

  const handleOverrideRate = (id: string, valueStr: string) => {
    setSaveSuccess(false);
    const nextTxns = txns.map((t) => {
      if (t.id !== id) return t;
      const baseRate = t.baseCashbackRate ?? t.cashbackRate;

      if (valueStr.trim() === "") {
        const origCb = Math.round(t.amount * (baseRate / 100) * 100) / 100;
        return {
          ...t,
          userOverrideRate: undefined,
          cashbackAmount: origCb,
        };
      }

      const rate = parseFloat(valueStr);
      if (isNaN(rate) || rate < 0) return t;

      const cbAmount = Math.round(t.amount * (rate / 100) * 100) / 100;
      return {
        ...t,
        userOverrideRate: rate,
        cashbackAmount: cbAmount,
      };
    });

    setTxns(nextTxns);
    setUnsavedIds((prev) => new Set(prev).add(id));

    if (onTransactionsChange) {
      onTransactionsChange(nextTxns);
    }
  };

  const handleSaveAll = async () => {
    if (!uploadId) {
      toast({
        variant: "destructive",
        title: "Statement ID missing",
        description: "Cannot save custom rates without a valid statement upload record.",
      });
      return;
    }

    if (unsavedIds.size === 0) return;

    setIsSaving(true);
    try {
      const items = Array.from(unsavedIds).map((id) => {
        const t = txns.find((x) => x.id === id);
        return {
          transaction_id: id,
          user_override_rate:
            t?.userOverrideRate !== undefined && t?.userOverrideRate !== null
              ? t.userOverrideRate
              : null,
        };
      });

      const res = await saveBatchOverrides(uploadId, items);

      setUnsavedIds(new Set());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      toast({
        title: "Custom rates saved successfully!",
        description: `Statement totals updated (Cashback: ₹${res.total_cashback.toFixed(2)}, Effective Rate: ${res.effective_rate.toFixed(2)}%). History summary is now synchronized.`,
      });

      if (onSaveComplete) {
        onSaveComplete(res.total_cashback, res.effective_rate);
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to save custom rates",
        description: err.message || "An error occurred while saving custom overrides.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const exportData = (format: "csv" | "xlsx" | "txt") => {
    const rows = sorted.map((t) => ({
      Date: t.date,
      Description: t.description,
      Category: t.category,
      Amount: t.amount,
      "Base Rate (%)": t.baseCashbackRate ?? t.cashbackRate,
      "User Override (%)": t.userOverrideRate !== undefined ? t.userOverrideRate : "",
      "Effective Rate (%)": t.userOverrideRate !== undefined ? t.userOverrideRate : t.cashbackRate,
      "Cashback Amount": t.cashbackAmount,
      "User Override": t.userOverrideRate !== undefined ? "Yes" : "No",
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
        <div className="flex items-center gap-3">
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

          <p className="hidden text-xs text-muted-foreground sm:block">
            Tip: Enter custom % in the override column, then click "Save Custom Rates" or press Enter.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {uploadId && (
            <Button
              size="sm"
              onClick={handleSaveAll}
              disabled={isSaving || unsavedIds.size === 0}
              variant={unsavedIds.size > 0 ? "default" : "outline"}
              className={
                unsavedIds.size > 0
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all"
                  : saveSuccess
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : ""
              }
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save Custom Rates {unsavedIds.size > 0 ? `(${unsavedIds.size})` : ""}
                </>
              )}
            </Button>
          )}

          {(["csv", "xlsx", "txt"] as const).map((f) => (
            <Button key={f} variant="outline" size="sm" onClick={() => exportData(f)}>
              <Download className="mr-1 h-3 w-3" />
              {f.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                Date <ArrowUpDown className="ml-1 inline h-3 w-3" />
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Classifier Confidence</TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => handleSort("amount")}>
                Amount (₹) <ArrowUpDown className="ml-1 inline h-3 w-3" />
              </TableHead>
              <TableHead className="text-right">Auto Rate (%)</TableHead>
              <TableHead className="w-36 text-center">User Custom % Override</TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => handleSort("cashbackAmount")}>
                Cashback (₹) <ArrowUpDown className="ml-1 inline h-3 w-3" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((t) => {
              const confPercent = Math.round((t.confidence ?? 1.0) * 100);
              const matchType = t.matchType || "rule";
              const isRule = matchType === "rule";
              const isSemantic = matchType === "semantic";
              const isOverridden = t.userOverrideRate !== undefined && t.userOverrideRate !== null;
              const isUnsaved = unsavedIds.has(t.id);
              const autoRate = t.baseCashbackRate ?? t.cashbackRate;

              return (
                <TableRow
                  key={t.id}
                  className={
                    isUnsaved
                      ? "bg-amber-500/10 dark:bg-amber-500/15"
                      : isOverridden
                      ? "bg-purple-500/5 dark:bg-purple-500/10"
                      : ""
                  }
                >
                  <TableCell className="font-mono text-xs">{t.date}</TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{t.category}</span>
                  </TableCell>
                  <TableCell>
                    <span
                      title={`Match method: ${matchType}`}
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${
                        isRule
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : isSemantic
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {confPercent}% {isRule ? "Rule" : isSemantic ? "AI" : "Default"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">₹{t.amount.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right">{autoRate}%</TableCell>

                  {/* User Custom % Override Cell */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        placeholder={`${autoRate}%`}
                        value={t.userOverrideRate !== undefined && t.userOverrideRate !== null ? t.userOverrideRate : ""}
                        onChange={(e) => handleOverrideRate(t.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveAll();
                          }
                        }}
                        className={`h-7 w-20 text-center text-xs font-semibold ${
                          isUnsaved
                            ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/40"
                            : isOverridden
                            ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300"
                            : ""
                        }`}
                      />
                      {isUnsaved && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-amber-600 hover:text-amber-700 hover:bg-amber-500/20"
                          title="Save this change (Enter)"
                          onClick={handleSaveAll}
                          disabled={isSaving}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      )}
                      {isOverridden && !isUnsaved && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          title="Reset to default category rate"
                          onClick={() => handleOverrideRate(t.id, "")}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right font-mono font-semibold text-primary">
                    ₹{t.cashbackAmount.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={4}>Total ({sorted.length} txns)</TableCell>
              <TableCell className="text-right font-mono">₹{totalSpend.toLocaleString("en-IN")}</TableCell>
              <TableCell colSpan={2} className="text-right text-xs text-muted-foreground">
                Recalculated Total Cashback:
              </TableCell>
              <TableCell className="text-right font-mono text-lg text-primary">
                ₹{totalCashback.toFixed(2)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TransactionTable;
