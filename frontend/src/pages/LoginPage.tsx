import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ChimeLogo from "@/components/ChimeLogo";
import ThemeToggle from "@/components/ThemeToggle";

const LoginPage = () => {
  const [name, setName] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      login(name.trim());
      navigate("/upload");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="flex justify-end p-3">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ChimeLogo size={28} />
            </div>
            <CardTitle className="text-2xl">Welcome to Chime</CardTitle>
            <CardDescription>Enter your name to start tracking cashback</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g. Sanjaya"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Get Started
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
