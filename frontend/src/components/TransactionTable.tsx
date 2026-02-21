import { useState, useMemo } from "react";
import { Transaction } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  transactions: Transaction[];
}

type SortField = "date" | "amount" | "cashbackAmount";

const TransactionTable = ({ transactions }: Props) => {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortAsc, setSortAsc] = useState(true);

  const categories = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.category))),
    [transactions],
  );

  const filtered = useMemo(() => {
    let list = categoryFilter === "all" ? transactions : transactions.filter((t) => t.category === categoryFilter);
    list = [...list].sort((a, b) => {
      const av = sortField === "date" ? new Date(a.date).getTime() : a[sortField];
      const bv = sortField === "date" ? new Date(b.date).getTime() : b[sortField];
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [transactions, categoryFilter, sortField, sortAsc]);

  const totalSpend = filtered.reduce((s, t) => s + t.amount, 0);
  const totalCashback = filtered.reduce((s, t) => s + t.cashbackAmount, 0);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" size="sm" className="px-0" onClick={() => toggleSort("date")}>
                  Date <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" size="sm" className="px-0" onClick={() => toggleSort("amount")}>
                  Amount <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" size="sm" className="px-0" onClick={() => toggleSort("cashbackAmount")}>
                  Cashback <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap text-sm">{t.date}</TableCell>
                <TableCell className="font-medium">{t.description}</TableCell>
                <TableCell><Badge variant="secondary">{t.category}</Badge></TableCell>
                <TableCell className="text-right">₹{t.amount.toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-right">{t.cashbackRate}%</TableCell>
                <TableCell className="text-right font-medium">₹{t.cashbackAmount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="font-semibold">Total</TableCell>
              <TableCell className="text-right font-semibold">₹{totalSpend.toLocaleString("en-IN")}</TableCell>
              <TableCell />
              <TableCell className="text-right font-semibold">₹{totalCashback.toFixed(2)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
};

export default TransactionTable;
