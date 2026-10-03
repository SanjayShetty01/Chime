import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getCardsByBank } from "@/config/cards";
import { uploadStatement, fetchCards } from "@/services/api";
import { CashbackResult, CardConfig } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, FileText, Loader2, LogOut, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

const UploadPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [cardId, setCardId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [cards, setCards] = useState<CardConfig[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  useEffect(() => {
    fetchCards()
      .then((data) => {
        setCards(data);
        setCardsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch cards:", err);
        setCardsLoading(false);
      });
  }, []);

  const cardsByBank = getCardsByBank(cards);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardId || !file) return;
    setLoading(true);
    try {
      const result: CashbackResult = await uploadStatement({ cardId, file, password });
      toast({
        title: "Statement parsed successfully!",
        description: `Found ${result.summary.totalTransactions} transactions.`,
      });
      if (result.uploadId) {
        navigate(`/results/${result.uploadId}`, { state: { result } });
      } else {
        navigate("/results", { state: { result } });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Parsing Error",
        description: err.message || "Something went wrong while processing your statement.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type === "application/pdf") setFile(f);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="mx-auto max-w-xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Upload Statement</CardTitle>
            <CardDescription>Select your card, upload your PDF statement, and enter the file password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Card selector */}
              <div className="space-y-2">
                <Label>Credit Card</Label>
                <Select value={cardId} onValueChange={setCardId} disabled={cardsLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={cardsLoading ? "Loading cards..." : "Select a card"} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(cardsByBank).map(([bank, cards]) => (
                      <SelectGroup key={bank}>
                        <SelectLabel>{bank}</SelectLabel>
                        {cards.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.icon} {c.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* PDF upload */}
              <div className="space-y-2">
                <Label>Statement PDF</Label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-input p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
                >
                  {file ? (
                    <>
                      <FileText className="h-8 w-8 text-primary" />
                      <span className="text-sm font-medium text-foreground">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Drag & drop your PDF or <span className="font-medium text-primary">browse</span>
                      </span>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFile(f);
                  }}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="pdf-password">PDF Password</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Only required if your bank statement is encrypted.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="pdf-password"
                  type="password"
                  placeholder="Enter statement password (Optional)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={!cardId || !file || loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                  </>
                ) : (
                  "Calculate Cashback"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UploadPage;
