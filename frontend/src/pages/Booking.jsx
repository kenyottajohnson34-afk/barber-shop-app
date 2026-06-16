import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api, CATEGORIES, BOOKABLE_SERVICES, STYLISTS, TIME_SLOTS } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";

export default function Booking() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const initialService = useMemo(() => {
    const s = params.get("service");
    const cat = params.get("category");
    if (s && BOOKABLE_SERVICES.some((b) => b.name === s)) return s;
    if (cat) {
      const c = CATEGORIES.find((x) => x.slug === cat && !x.notBookable);
      if (c) return c.services[0];
    }
    return BOOKABLE_SERVICES[0]?.name || "";
  }, [params]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    service: initialService,
    stylist: "No preference",
    date: undefined,
    time: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(false);

  useEffect(() => {
    setForm((f) => ({ ...f, service: initialService }));
  }, [initialService]);

  // Fetch booked slots whenever date or stylist changes (only matters if a stylist is chosen)
  useEffect(() => {
    const stylistChosen = form.stylist && form.stylist !== "No preference";
    if (!form.date || !stylistChosen) {
      setBookedTimes([]);
      return;
    }
    const dateStr = format(form.date, "yyyy-MM-dd");
    setLoadingAvail(true);
    api
      .get("/availability", { params: { date: dateStr, stylist: form.stylist } })
      .then(({ data }) => setBookedTimes(data.booked_times || []))
      .catch(() => setBookedTimes([]))
      .finally(() => setLoadingAvail(false));
  }, [form.date, form.stylist]);

  // If the currently chosen time becomes booked, clear it
  useEffect(() => {
    if (form.time && bookedTimes.includes(form.time)) {
      setForm((f) => ({ ...f, time: "" }));
      toast.warning("That time was just taken — please pick another.");
    }
  }, [bookedTimes]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.service || !form.date || !form.time) {
      toast.error("Please complete every required field.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        stylist: form.stylist === "No preference" ? null : form.stylist,
        date: format(form.date, "yyyy-MM-dd"),
      };
      const { data } = await api.post("/appointments", payload);
      setSuccess(data);
      toast.success("Appointment booked successfully!");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : "Could not book — please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center" data-testid="booking-success">
        <div className="max-w-xl w-full bg-card border border-primary/40 gold-glow p-10 rounded-sm text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/15 flex items-center justify-center mb-6 border border-primary/40">
            <Check className="w-7 h-7 text-primary" />
          </div>
          <div className="overline mb-3">Confirmed</div>
          <h2 className="font-serif text-4xl mb-4 tracking-tighter">See you soon, {success.name.split(" ")[0]}.</h2>
          <p className="text-muted-foreground mb-8">
            Your <span className="gold-text">{success.service}</span> is scheduled for{" "}
            <span className="text-foreground">{success.date}</span> at{" "}
            <span className="text-foreground">{success.time}</span>.
          </p>
          <div className="text-sm text-muted-foreground mb-6 border border-white/10 p-4 rounded-sm text-left space-y-1">
            <div><span className="text-muted-foreground/70 uppercase tracking-widest text-xs">Reference</span><br/><span className="text-foreground font-mono text-xs">{success.id}</span></div>
            {success.stylist && <div className="pt-2"><span className="text-muted-foreground/70 uppercase tracking-widest text-xs">Stylist</span><br/>{success.stylist}</div>}
          </div>
          <div className="flex gap-3 justify-center">
            <Button data-testid="success-home-btn" onClick={() => navigate("/")} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm">
              Back to Home
            </Button>
            <Button
              data-testid="success-another-btn"
              variant="outline"
              onClick={() => { setSuccess(null); setForm({ ...form, date: undefined, time: "" }); }}
              className="border-white/15 rounded-sm"
            >
              Book Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="booking-page" className="min-h-screen pt-28 pb-20 relative overflow-hidden">
      <div className="purple-glow w-[600px] h-[600px] -left-40 top-20 opacity-50" />
      <div className="purple-glow w-[500px] h-[500px] -right-40 bottom-0 opacity-40" />

      <div className="max-w-5xl mx-auto px-6 lg:px-10 relative">
        <div className="overline mb-4">Reserve</div>
        <h1 className="font-serif text-5xl sm:text-6xl tracking-tighter mb-3">Book your appointment</h1>
        <p className="text-muted-foreground mb-12 max-w-xl">
          Tell us a little about you and pick a time that works. We'll lock it in.
        </p>

        <form onSubmit={handleSubmit} className="bg-card/70 backdrop-blur border border-white/10 p-8 sm:p-12 rounded-sm">
          <div className="grid sm:grid-cols-2 gap-6">
            <Field label="Full Name">
              <Input
                data-testid="booking-name-input"
                placeholder="Jane Doe"
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                className="bg-transparent border-white/15 focus:border-primary"
              />
            </Field>
            <Field label="Email">
              <Input
                data-testid="booking-email-input"
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
                className="bg-transparent border-white/15 focus:border-primary"
              />
            </Field>
            <Field label="Phone">
              <Input
                data-testid="booking-phone-input"
                placeholder="+1 555 123 4567"
                value={form.phone}
                onChange={(e) => set("phone")(e.target.value)}
                className="bg-transparent border-white/15 focus:border-primary"
              />
            </Field>
            <Field label="Service">
              <Select value={form.service} onValueChange={set("service")}>
                <SelectTrigger data-testid="booking-service-select" className="bg-transparent border-white/15">
                  <SelectValue placeholder="Pick a service" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {CATEGORIES.filter((c) => !c.notBookable).map((c) => (
                    <SelectGroup key={c.slug}>
                      <SelectLabel className="text-primary text-xs uppercase tracking-widest">{c.name}</SelectLabel>
                      {c.services.map((s) => (
                        <SelectItem
                          key={s}
                          value={s}
                          data-testid={`service-option-${s.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                        >
                          {s}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Preferred Stylist">
              <Select value={form.stylist} onValueChange={set("stylist")}>
                <SelectTrigger data-testid="booking-stylist-select" className="bg-transparent border-white/15">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLISTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={loadingAvail ? "Time (checking availability…)" : "Time"}>
              <Select value={form.time} onValueChange={set("time")}>
                <SelectTrigger data-testid="booking-time-select" className="bg-transparent border-white/15">
                  <SelectValue placeholder="Pick a time" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {TIME_SLOTS.map((t) => {
                    const taken = bookedTimes.includes(t);
                    return (
                      <SelectItem
                        key={t}
                        value={t}
                        disabled={taken}
                        data-testid={`time-option-${t}`}
                      >
                        {t}{taken ? "  ·  booked" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>

            <div className="sm:col-span-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    data-testid="booking-date-trigger"
                    variant="outline"
                    type="button"
                    className="w-full justify-start bg-transparent border-white/15 text-left font-normal hover:bg-white/5"
                  >
                    <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
                    {form.date ? format(form.date, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-white/10" align="start">
                  <Calendar
                    mode="single"
                    selected={form.date}
                    onSelect={set("date")}
                    disabled={(d) => d < new Date(new Date().setHours(0,0,0,0)) || d.getDay() === 1}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="sm:col-span-2">
              <Field label="Notes (optional)">
                <Textarea
                  data-testid="booking-notes-input"
                  rows={4}
                  placeholder="Allergies, preferences, references…"
                  value={form.notes}
                  onChange={(e) => set("notes")(e.target.value)}
                  className="bg-transparent border-white/15 focus:border-primary resize-none"
                />
              </Field>
            </div>
          </div>

          <div className="hairline my-10" />

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <p className="text-xs text-muted-foreground tracking-wide max-w-md">
              By confirming you agree to our 24-hour cancellation policy. We'll send a reminder via email.
            </p>
            <Button
              type="submit"
              data-testid="booking-submit-btn"
              disabled={submitting}
              className="px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm tracking-wide w-full sm:w-auto"
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Booking…</> : "Confirm Appointment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
