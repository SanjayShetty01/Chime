import { useState, useEffect } from "react";
import { fetchUserProfile, changePassword, updateSecurityQuestion } from "@/services/api";
import { UserProfile } from "@/types";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, ShieldQuestion, Loader2, CheckCircle2 } from "lucide-react";

const SECURITY_QUESTIONS = [
  "What's your crush name?",
  "What year you passed 10th?",
  "Name of your first love",
];

const SettingsPage = () => {
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Change Password state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Update Security Question state
  const [secCurrentPw, setSecCurrentPw] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [secLoading, setSecLoading] = useState(false);

  useEffect(() => {
    fetchUserProfile()
      .then((data) => {
        setProfile(data);
        if (data.security_question) {
          setSelectedQuestion(data.security_question);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast({
        title: "Passwords do not match",
        description: "Please check your new password and confirmation.",
        variant: "destructive",
      });
      return;
    }

    setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      toast({
        title: "Password updated!",
        description: "Your account password was changed successfully.",
      });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setPwLoading(false);
    }
  };

  const handleUpdateSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secCurrentPw || !securityAnswer.trim()) return;

    setSecLoading(true);
    try {
      await updateSecurityQuestion(secCurrentPw, selectedQuestion, securityAnswer.trim());
      toast({
        title: "Security question updated!",
        description: "Your secret recovery question and answer have been updated.",
      });
      setSecCurrentPw("");
      setSecurityAnswer("");
      fetchUserProfile().then(setProfile);
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSecLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">User Settings & Security</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account credentials, password, and recovery security questions
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Account Overview Card ──────────────────────── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-primary" /> Account Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Username</p>
                  <p className="mt-0.5 text-base font-semibold">{profile?.username}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Current Security Question</p>
                  <p className="mt-0.5 font-medium text-foreground">
                    {profile?.security_question || "Not configured"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ── Change Password Form ───────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-4 w-4 text-primary" /> Change Password
                </CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-pw">Current Password</Label>
                    <Input
                      id="current-pw"
                      type="password"
                      placeholder="Enter current password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="new-pw">New Password</Label>
                      <Input
                        id="new-pw"
                        type="password"
                        placeholder="Enter new password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-pw">Confirm New Password</Label>
                      <Input
                        id="confirm-pw"
                        type="password"
                        placeholder="Re-enter new password"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={pwLoading} className="mt-2">
                    {pwLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* ── Update Security Question Form ──────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldQuestion className="h-4 w-4 text-primary" /> Update Security Question
                </CardTitle>
                <CardDescription>
                  Change your secret recovery question used for password resets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateSecurityQuestion} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sec-current-pw">Current Password (for Verification)</Label>
                    <Input
                      id="sec-current-pw"
                      type="password"
                      placeholder="Verify your password"
                      value={secCurrentPw}
                      onChange={(e) => setSecCurrentPw(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sec-question">Security Question</Label>
                    <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
                      <SelectTrigger id="sec-question">
                        <SelectValue placeholder="Select a question" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECURITY_QUESTIONS.map((q) => (
                          <SelectItem key={q} value={q}>
                            {q}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sec-answer">New Secret Answer</Label>
                    <Input
                      id="sec-answer"
                      type="text"
                      placeholder="Enter new secret answer"
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={secLoading} className="mt-2">
                    {secLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Security Question"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default SettingsPage;
