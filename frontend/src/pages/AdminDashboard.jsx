import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Calendar, LogOut, RefreshCw, Trash2, Check, X, Clock, Filter } from "lucide-react";
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
                    <div className="text-xs text-muted-foreground">{a.phone}</div>
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
    </div>
  );
}
