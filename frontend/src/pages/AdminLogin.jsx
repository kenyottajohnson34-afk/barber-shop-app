import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@candc.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("cc_admin_token", data.token);
      localStorage.setItem("cc_admin_email", data.email);
      toast.success("Welcome back.");
      navigate("/admin");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="admin-login-page" className="min-h-screen pt-44 pb-20 flex items-center justify-center px-6 relative overflow-hidden">
      <div className="purple-glow w-[500px] h-[500px] -left-20 top-20 opacity-50" />
      <div className="purple-glow w-[500px] h-[500px] -right-20 bottom-0 opacity-40" />

      <form onSubmit={submit} className="relative w-full max-w-md bg-card border border-white/10 p-10 rounded-sm">
        <div className="flex items-center gap-3 mb-2">
          <Lock className="w-4 h-4 text-primary" />
          <span className="overline">Admin</span>
        </div>
        <h1 className="font-serif text-3xl mb-2">Sign in</h1>
        <p className="text-sm text-muted-foreground mb-8">Manage appointments and bookings.</p>

        <div className="space-y-5">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Email</Label>
            <Input
              data-testid="admin-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-transparent border-white/15 focus:border-primary"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Password</Label>
            <Input
              data-testid="admin-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-transparent border-white/15 focus:border-primary"
            />
          </div>
        </div>

        <Button
          type="submit"
          data-testid="admin-login-submit-btn"
          disabled={loading}
          className="w-full mt-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm tracking-wide"
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in…</> : "Sign In"}
        </Button>
      </form>
    </div>
  );
}
