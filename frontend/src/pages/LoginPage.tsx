import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { loginUser, fetchSecurityQuestion, resetPassword } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import ChimeLogo from "@/components/ChimeLogo";
import ThemeToggle from "@/components/ThemeToggle";

type AuthMode = "login" | "forgot_step1" | "forgot_step2";

const LoginPage = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // Forgot Password state
  const [forgotUsername, setForgotUsername] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const data = await loginUser(username.trim(), password);
      login(data.token, data.user);
      navigate("/upload");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotUsername.trim()) return;
    setLoading(true);
    setError("");

    try {
      const data = await fetchSecurityQuestion(forgotUsername.trim());
      setSecurityQuestion(data.security_question);
      setMode("forgot_step2");
    } catch (err: any) {
      setError(err.message || "User not found");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityAnswer.trim() || !newPassword) return;
    setLoading(true);
    setError("");

    try {
      await resetPassword(forgotUsername.trim(), securityAnswer.trim(), newPassword);
      setSuccessMsg("Password reset successfully! Please sign in with your new password.");
      setUsername(forgotUsername.trim());
      setPassword("");
      setMode("login");
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    setMode("login");
    setError("");
    setForgotUsername("");
    setSecurityQuestion("");
    setSecurityAnswer("");
    setNewPassword("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="flex justify-end p-3">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ChimeLogo size={28} />
            </div>
            {mode === "login" && (
              <>
                <CardTitle className="text-2xl">Welcome to Chime</CardTitle>
                <CardDescription>Sign in to track your cashback</CardDescription>
              </>
            )}
            {mode === "forgot_step1" && (
              <>
                <CardTitle className="text-2xl">Reset Password</CardTitle>
                <CardDescription>Enter your username to find your security question</CardDescription>
              </>
            )}
            {mode === "forgot_step2" && (
              <>
                <CardTitle className="text-2xl">Security Verification</CardTitle>
                <CardDescription>Answer your security question to set a new password</CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent>
            {successMsg && mode === "login" && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="e.g. sanjay"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotUsername(username);
                        setError("");
                        setMode("forgot_step1");
                      }}
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            )}

            {mode === "forgot_step1" && (
              <form onSubmit={handleForgotStep1} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-username">Username</Label>
                  <Input
                    id="forgot-username"
                    type="text"
                    placeholder="Enter your registered username"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={resetToLogin}
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking…
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {mode === "forgot_step2" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <p className="font-medium text-muted-foreground">Security Question:</p>
                  <p className="mt-1 font-semibold text-foreground">{securityQuestion}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-answer">Your Answer</Label>
                  <Input
                    id="reset-answer"
                    type="text"
                    placeholder="Enter secret answer"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setError("");
                      setMode("forgot_step1");
                    }}
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting…
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {mode === "login" && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
                  Create one
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
