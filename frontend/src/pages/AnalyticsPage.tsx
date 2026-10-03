import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAnalytics, updateReconciliation } from "@/services/api";
import { AnalyticsSummary, DiscrepancyItem } from "@/types";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  PieChart as PieIcon,
  Loader2,
  DollarSign,
  Edit2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#0072BC", "#FC8019", "#E20000", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899"];

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Reconciliation Modal state
  const [editingItem, setEditingItem] = useState<DiscrepancyItem | null>(null);
  const [actualInput, setActualInput] = useState("");
  const [savingRec, setSavingRec] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetchAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const val = parseFloat(actualInput);
    if (isNaN(val) || val < 0) return;

    setSavingRec(true);
    try {
      await updateReconciliation(editingItem.uploadId, val);
      toast({
        title: "Reconciliation updated!",
        description: `Set actual credited cashback to ₹${val.toFixed(2)}`,
      });
      setEditingItem(null);
      loadData();
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingRec(false);
    }
  };

  const formatMonthLabel = (m: string) => {
    const [year, month] = m.split("-");
    if (!year || !month) return m;
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString("en-IN", { month: "short", year: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">Multi-Month Analytics & Trends</h1>
          <p className="text-sm text-muted-foreground">
            Aggregate spending insights and cashback performance across all your credit cards
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !data || data.summary.uploadCount === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No Statements Analyzed Yet</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Upload your credit card statements to unlock multi-month cashback analytics and track potential bank discrepancies!
              </p>
              <Button onClick={() => navigate("/upload")}>Upload Statement</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* ── Lifetime Summary KPI Grid ─────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Lifetime Spend</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{data.summary.totalSpend.toLocaleString("en-IN")}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Across {data.summary.totalTransactions} transactions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Lifetime Cashback</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">₹{data.summary.totalCashback.toFixed(2)}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Effective Rate: <span className="font-semibold text-foreground">{data.summary.effectiveRate}%</span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Statements Uploaded</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.uploadCount}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Across {data.cardBreakdown.length} card types
                  </p>
                </CardContent>
              </Card>

              <Card className={data.summary.totalUndercredited > 0 ? "border-amber-500/50 bg-amber-500/5" : ""}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Reconciliation Status</CardTitle>
                  {data.summary.totalUndercredited > 0 ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${data.summary.totalUndercredited > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                    {data.summary.totalUndercredited > 0
                      ? `₹${data.summary.totalUndercredited.toFixed(2)}`
                      : "Verified"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {data.summary.totalUndercredited > 0
                      ? "Underpaid cashback flagged"
                      : "No missing cashback detected"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ── Charts Grid ───────────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Monthly Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Monthly Spend & Cashback Trend</CardTitle>
                  <CardDescription>Historical breakdown over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.monthlyTrends.map((t) => ({
                          ...t,
                          label: formatMonthLabel(t.month),
                        }))}
                      >
                        <XAxis dataKey="label" stroke="#888888" fontSize={12} />
                        <YAxis stroke="#888888" fontSize={12} />
                        <Tooltip
                          formatter={(val: number) => `₹${val.toLocaleString("en-IN")}`}
                          contentStyle={{ backgroundColor: "var(--background)", borderRadius: "8px" }}
                        />
                        <Legend />
                        <Bar dataKey="spend" name="Total Spend" fill="#0072BC" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cashback" name="Cashback" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Card Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Card Performance Comparison</CardTitle>
                  <CardDescription>Cashback earned per credit card</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.cardBreakdown}
                          dataKey="cashback"
                          nameKey="cardName"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={(entry) => `${entry.cardName}: ₹${entry.cashback.toFixed(0)}`}
                        >
                          {data.cardBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.cardColor || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => `₹${val.toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Feature 4: Cashback Reconciliation & Discrepancy Detector ─ */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Cashback Reconciliation & Discrepancy Detector</CardTitle>
                  <CardDescription>
                    Compare expected cashback calculated by Chime against actual cashback credited by banks
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent>
                {data.discrepancies.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    <p>No reconciliation records yet.</p>
                    <p className="mt-1 text-xs">
                      Enter actual credited cashback on your statements to verify if your bank undercredited cashback!
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                        <tr>
                          <th className="p-3">Card / Month</th>
                          <th className="p-3">Expected (Chime)</th>
                          <th className="p-3">Actual (Bank)</th>
                          <th className="p-3">Difference</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.discrepancies.map((item) => (
                          <tr key={item.uploadId} className="hover:bg-muted/30">
                            <td className="p-3 font-medium">
                              {item.cardName} ({item.month})
                            </td>
                            <td className="p-3 font-semibold">₹{item.expectedCashback.toFixed(2)}</td>
                            <td className="p-3">₹{item.actualCashback.toFixed(2)}</td>
                            <td className={`p-3 font-semibold ${item.difference > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
                              {item.difference > 0 ? `-₹${item.difference.toFixed(2)}` : "₹0.00"}
                            </td>
                            <td className="p-3">
                              {item.status === "UNDERPAID" && (
                                <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600">
                                  Underpaid by Bank
                                </Badge>
                              )}
                              {item.status === "MATCHED" && (
                                <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                                  Verified Match
                                </Badge>
                              )}
                              {item.status === "OVERPAID" && (
                                <Badge variant="secondary">Overpaid</Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingItem(item);
                                  setActualInput(item.actualCashback.toString());
                                }}
                                className="h-8 gap-1 text-xs"
                              >
                                <Edit2 className="h-3.5 w-3.5" /> Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Edit Reconciliation Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconcile Cashback</DialogTitle>
            <DialogDescription>
              Enter the exact cashback amount credited by the bank for {editingItem?.cardName} ({editingItem?.month}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateReconciliation} className="space-y-4 pt-2">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="text-muted-foreground">Expected Cashback calculated by Chime:</p>
              <p className="text-lg font-bold text-primary">₹{editingItem?.expectedCashback.toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual-cashback">Actual Credited Cashback (₹)</Label>
              <Input
                id="actual-cashback"
                type="number"
                step="0.01"
                placeholder="e.g. 1450.00"
                value={actualInput}
                onChange={(e) => setActualInput(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingRec}>
                {savingRec ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Reconciliation"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnalyticsPage;
