import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Calendar, LogOut, RefreshCw, Trash2, Check, X, Clock, Filter, MessageSquare, Phone, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";

const STATUSES = ["all", "pending", "confirmed", "completed", "cancelled"];
const STATUS_COLOR = {
  pending: "bg-primary/15 text-primary border-primary/40",
  confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  cancelled: "bg-red-500/15 text-red-300 border-red-500/40",
  completed: "bg-purple-500/15 text-purple-300 border-purple-500/40",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [smsTarget, setSmsTarget] = useState(null); // { id, name, phone }
  const [smsBody, setSmsBody] = useState("");
  const [smsSending, setSmsSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/appointments");
      setAppts(data);
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem("cc_admin_token");
        navigate("/admin/login");
        return;
      }
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("cc_admin_token")) {
      navigate("/admin/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    localStorage.removeItem("cc_admin_token");
    localStorage.removeItem("cc_admin_email");
    navigate("/admin/login");
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/appointments/${id}`, { status });
      toast.success(`Marked as ${status}`);
      load();
    } catch {
      toast.error("Failed to update");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await api.delete(`/appointments/${id}`);
      toast.success("Deleted");
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const openSms = (a, template = "default") => {
    const first = a.name.split(" ")[0];
    const templates = {
      default: `Hola ${first}! This is C&C Barbería. `,
      reminder: `Hola ${first}! Friendly reminder of your ${a.service} on ${a.date} at ${a.time}. Reply CONFIRM to confirm, or call us to reschedule. — C&C`,
      thanks: `Hola ${first}! Thank you for visiting C&C Barbería today — we hope you loved your ${a.service}. Tag us @candcbarberia for a free drink on your next visit ✨`,
      followup: `Hola ${first}! It's been a while — ready for a fresh ${a.service}? Book at our shop in Costambar or reply YES and we'll set you up. — C&C`,
    };
    setSmsTarget(a);
    setSmsBody(templates[template] || templates.default);
  };

  const sendSms = async () => {
    if (!smsTarget || !smsBody.trim()) return;
    setSmsSending(true);
    try {
      const { data } = await api.post(`/appointments/${smsTarget.id}/sms`, { message: smsBody });
      if (data.sent) {
        toast.success(`Text sent to ${smsTarget.name}`);
      } else if (!data.twilio_configured) {
        toast.warning("Twilio not configured — message logged but not sent. Add TWILIO keys in backend/.env to enable.");
      } else {
        toast.error("Could not send text — check phone number");
      }
      setSmsTarget(null);
      setSmsBody("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to send");
    } finally {
      setSmsSending(false);
    }
  };

  const filtered = useMemo(
    () => (filter === "all" ? appts : appts.filter((a) => a.status === filter)),
    [appts, filter]
  );

  const stats = useMemo(() => {
    return {
      total: appts.length,
      pending: appts.filter((a) => a.status === "pending").length,
      confirmed: appts.filter((a) => a.status === "confirmed").length,
      cancelled: appts.filter((a) => a.status === "cancelled").length,
    };
  }, [appts]);

  return (
    <div data-testid="admin-dashboard" className="min-h-screen pt-28 pb-16 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <div>
            <div className="overline mb-2">Control Room</div>
            <h1 className="font-serif text-4xl sm:text-5xl tracking-tighter">Appointments</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Signed in as <span className="text-foreground">{localStorage.getItem("cc_admin_email") || "admin"}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={load} data-testid="refresh-btn" variant="outline" className="border-white/15 rounded-sm">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button onClick={logout} data-testid="logout-btn" variant="outline" className="border-white/15 rounded-sm">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            ["Total", stats.total, "text-foreground"],
            ["Pending", stats.pending, "text-primary"],
            ["Confirmed", stats.confirmed, "text-emerald-400"],
            ["Cancelled", stats.cancelled, "text-red-400"],
          ].map(([l, v, c]) => (
            <div key={l} className="bg-card border border-white/10 p-6 rounded-sm" data-testid={`stat-${l.toLowerCase()}`}>
              <div className="overline mb-2">{l}</div>
              <div className={`font-serif text-4xl ${c}`}>{v}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {STATUSES.map((s) => (
            <button
              key={s}
              data-testid={`filter-${s}`}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 text-xs uppercase tracking-widest border rounded-sm transition-colors ${
                filter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card border border-white/10 rounded-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Client</TableHead>
                <TableHead className="text-muted-foreground">Service</TableHead>
                <TableHead className="text-muted-foreground">Date / Time</TableHead>
                <TableHead className="text-muted-foreground">Stylist</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-3 text-primary/40" />
                  No appointments {filter !== "all" ? `with status "${filter}"` : "yet"}.
                </TableCell></TableRow>
              )}
              {!loading && filtered.map((a) => (
                <TableRow key={a.id} className="border-white/5 hover:bg-white/[0.02]" data-testid={`row-${a.id}`}>
                  <TableCell>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.email}</div>
                    <a
                      href={`tel:${a.phone}`}
                      className="text-xs text-primary hover:text-foreground inline-flex items-center gap-1"
                      data-testid={`call-${a.id}`}
                    >
                      <Phone className="w-3 h-3" /> {a.phone}
                    </a>
                  </TableCell>
                  <TableCell><span className="gold-text">{a.service}</span></TableCell>
                  <TableCell>
                    <div>{a.date}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{a.time}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.stylist || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`${STATUS_COLOR[a.status] || ""} border rounded-sm uppercase text-[10px] tracking-widest`}>
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button data-testid={`actions-${a.id}`} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-white/10">
                        <DropdownMenuLabel>Status</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => updateStatus(a.id, "confirmed")}><Check className="w-3 h-3 mr-2 text-emerald-400" />Confirm</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(a.id, "completed")}><Check className="w-3 h-3 mr-2 text-purple-300" />Complete</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(a.id, "cancelled")}><X className="w-3 h-3 mr-2 text-red-400" />Cancel</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Text Customer</DropdownMenuLabel>
                        <DropdownMenuItem data-testid={`sms-default-${a.id}`} onClick={() => openSms(a, "default")}><MessageSquare className="w-3 h-3 mr-2 text-primary" />Custom message</DropdownMenuItem>
                        <DropdownMenuItem data-testid={`sms-reminder-${a.id}`} onClick={() => openSms(a, "reminder")}><MessageSquare className="w-3 h-3 mr-2 text-primary" />Send reminder</DropdownMenuItem>
                        <DropdownMenuItem data-testid={`sms-thanks-${a.id}`} onClick={() => openSms(a, "thanks")}><MessageSquare className="w-3 h-3 mr-2 text-primary" />Thank-you note</DropdownMenuItem>
                        <DropdownMenuItem data-testid={`sms-followup-${a.id}`} onClick={() => openSms(a, "followup")}><MessageSquare className="w-3 h-3 mr-2 text-primary" />Win-back follow-up</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => remove(a.id)} className="text-red-400 focus:text-red-300">
                          <Trash2 className="w-3 h-3 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* SMS dialog */}
      <Dialog open={!!smsTarget} onOpenChange={(o) => !o && setSmsTarget(null)}>
        <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-lg" data-testid="sms-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Text {smsTarget?.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Sending to <span className="text-primary">{smsTarget?.phone}</span>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            data-testid="sms-textarea"
            rows={6}
            value={smsBody}
            onChange={(e) => setSmsBody(e.target.value)}
            className="bg-transparent border-white/15 focus:border-primary resize-none"
            maxLength={480}
          />
          <div className="text-xs text-muted-foreground text-right">{smsBody.length} / 480</div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSmsTarget(null)}
              className="border-white/15 rounded-sm"
              data-testid="sms-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              onClick={sendSms}
              disabled={smsSending || !smsBody.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm"
              data-testid="sms-send-btn"
            >
              {smsSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : <><MessageSquare className="w-4 h-4 mr-2" />Send Text</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
