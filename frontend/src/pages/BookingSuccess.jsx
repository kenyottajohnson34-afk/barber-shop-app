import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";

export default function BookingSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState({ loading: true, paid: false, error: null, data: null });
  const attemptsRef = useRef(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      setState({ loading: false, paid: false, error: "Missing session id", data: null });
      return;
    }

    const poll = async () => {
      if (stoppedRef.current) return;
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") {
          stoppedRef.current = true;
          setState({ loading: false, paid: true, error: null, data });
          return;
        }
        if (data.status === "expired") {
          stoppedRef.current = true;
          setState({ loading: false, paid: false, error: "Session expired", data });
          return;
        }
        attemptsRef.current += 1;
        if (attemptsRef.current >= 12) {
          stoppedRef.current = true;
          setState({ loading: false, paid: false, error: "Timed out — check your email or call us", data });
          return;
        }
        setTimeout(poll, 2500);
      } catch (err) {
        attemptsRef.current += 1;
        if (attemptsRef.current >= 5) {
          stoppedRef.current = true;
          setState({ loading: false, paid: false, error: err?.response?.data?.detail || "Error checking status", data: null });
          return;
        }
        setTimeout(poll, 2500);
      }
    };

    poll();
    return () => { stoppedRef.current = true; };
  }, [sessionId]);

  const pending = JSON.parse(sessionStorage.getItem("cc_pending_appt") || "null");

  return (
    <div data-testid="booking-success-page" className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center relative overflow-hidden">
      <div className="purple-glow w-[500px] h-[500px] -left-20 top-20 opacity-50" />
      <div className="purple-glow w-[500px] h-[500px] -right-20 bottom-0 opacity-40" />

      <div className="relative max-w-xl w-full bg-card border border-white/10 p-10 rounded-sm text-center">
        {state.loading && (
          <>
            <Loader2 className="w-10 h-10 mx-auto mb-6 text-primary animate-spin" />
            <h2 className="font-serif text-3xl mb-3 tracking-tighter">Confirming payment…</h2>
            <p className="text-muted-foreground text-sm">Hang tight while we verify with Stripe.</p>
          </>
        )}

        {!state.loading && state.paid && (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-primary/15 flex items-center justify-center mb-6 border border-primary/40">
              <Check className="w-7 h-7 text-primary" />
            </div>
            <div className="overline mb-3">Deposit received</div>
            <h2 className="font-serif text-4xl mb-3 tracking-tighter">
              {pending ? `See you soon, ${pending.name.split(" ")[0]}.` : "Payment confirmed."}
            </h2>
            <p className="text-muted-foreground mb-6">
              Your <span className="gold-text">{state.data?.currency?.toUpperCase()} {(state.data?.amount_total/100).toFixed(2)}</span> deposit is in.
              {pending && (
                <>
                  {" "}Your <span className="gold-text">{pending.service}</span> is locked in for{" "}
                  <span className="text-foreground">{pending.date}</span> at{" "}
                  <span className="text-foreground">{pending.time}</span>.
                </>
              )}
            </p>
            <div className="text-xs text-muted-foreground mb-8 border border-white/10 p-4 rounded-sm">
              The deposit will be applied to your final bill at the shop.
            </div>
            <div className="flex gap-3 justify-center">
              <Link to="/" data-testid="success-home-link"><Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm">Back to Home</Button></Link>
              <Link to="/book" data-testid="success-another-link">
                <Button variant="outline" className="border-white/15 rounded-sm">
                  Book Another <ArrowRight className="w-3 h-3 ml-2" />
                </Button>
              </Link>
            </div>
          </>
        )}

        {!state.loading && !state.paid && state.error && (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-6 border border-red-500/40">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <div className="overline mb-3 text-red-300">Payment not complete</div>
            <h2 className="font-serif text-3xl mb-3 tracking-tighter">{state.error}</h2>
            <p className="text-muted-foreground mb-8 text-sm">
              If your card was charged, contact us at <span className="gold-text">849-581-7990</span>.
            </p>
            <Link to="/book"><Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm">Try again</Button></Link>
          </>
        )}
      </div>
    </div>
  );
}
