import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchHistory, deleteUpload, UploadSummary } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, FileText, Loader2 } from "lucide-react";
import ChimeLogo from "@/components/ChimeLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { LogOut } from "lucide-react";

const HistoryPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [uploads, setUploads] = useState<UploadSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchHistory()
            .then(setUploads)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string) => {
        setDeleting(id);
        try {
            await deleteUpload(id);
            setUploads((prev) => prev.filter((u) => u.id !== id));
        } catch (err) {
            console.error("Failed to delete:", err);
        } finally {
            setDeleting(null);
        }
    };

    // Group uploads by month
    const grouped = uploads.reduce<Record<string, UploadSummary[]>>((acc, u) => {
        if (!acc[u.month]) acc[u.month] = [];
        acc[u.month].push(u);
        return acc;
    }, {});

    const formatMonth = (m: string) => {
        const [year, month] = m.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleString("en-IN", { month: "long", year: "numeric" });
    };

    return (
        <div className="min-h-screen bg-muted/30">
            <header className="border-b bg-background">
                <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <ChimeLogo size={22} />
                        <h1 className="text-lg font-semibold text-foreground">Chime</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{user?.username}</span>
                        <ThemeToggle />
                        <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }}>
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Upload History</h2>
                        <p className="text-sm text-muted-foreground">Your past statement uploads</p>
                    </div>
                    <Button variant="outline" onClick={() => navigate("/upload")} className="gap-1">
                        <ArrowLeft className="h-4 w-4" /> Upload New
                    </Button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : uploads.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-3 py-12">
                            <FileText className="h-10 w-10 text-muted-foreground" />
                            <p className="text-muted-foreground">No uploads yet. Upload your first statement!</p>
                            <Button onClick={() => navigate("/upload")}>Upload Statement</Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(grouped)
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([month, items]) => (
                                <div key={month}>
                                    <h3 className="mb-3 text-lg font-semibold text-foreground">
                                        {formatMonth(month)}
                                    </h3>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {items.map((u) => (
                                            <Card
                                                key={u.id}
                                                className="cursor-pointer transition-shadow hover:shadow-md"
                                                onClick={() => navigate(`/results/${u.id}`)}
                                            >
                                                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                                                    <div
                                                        className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                                                        style={{ backgroundColor: u.cardColor + "20", color: u.cardColor }}
                                                    >
                                                        {u.cardIcon}
                                                    </div>
                                                    <div className="flex-1">
                                                        <CardTitle className="text-sm font-semibold">{u.cardName}</CardTitle>
                                                        <p className="text-xs text-muted-foreground">{u.cardBank}</p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(u.id);
                                                        }}
                                                        disabled={deleting === u.id}
                                                    >
                                                        {deleting === u.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </CardHeader>
                                                <CardContent className="pt-0">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground">
                                                            {u.totalTransactions} transactions
                                                        </span>
                                                        <span className="font-medium">
                                                            ₹{u.totalSpend.toLocaleString("en-IN")}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground">Cashback</span>
                                                        <span className="font-medium text-primary">
                                                            ₹{u.totalCashback.toFixed(2)} ({u.effectiveRate.toFixed(2)}%)
                                                        </span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default HistoryPage;
