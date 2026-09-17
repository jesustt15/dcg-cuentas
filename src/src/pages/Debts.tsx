import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDb } from "@/hooks/DbProvider";
import { db, usd, formatBs } from "@/lib/db";
import { toast } from "sonner";
import type { Athlete } from "@/types";
import {
  Search,
  AlertTriangle,
  DollarSign,
  Users,
  TrendingUp,
  ArrowUpDown,
  ExternalLink,
  CreditCard,
  ChevronDown,
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

type SortKey = "balance_desc" | "balance_asc" | "name" | "plan" | "oldest";

export default function Debts() {
  const { state, refresh } = useDb();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("balance_desc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [paymentAthlete, setPaymentAthlete] = useState<Athlete | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "pago_movil">("efectivo");
  const [paying, setPaying] = useState(false);

  const debtors = useMemo(() => {
    let list = state.athletes.filter((a) => a.balance > 0);

    // Filter by name search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q));
    }

    // Sort
    switch (sort) {
      case "balance_desc":
        list.sort((a, b) => b.balance - a.balance);
        break;
      case "balance_asc":
        list.sort((a, b) => a.balance - b.balance);
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "plan":
        list.sort((a, b) => a.plan.localeCompare(b.plan));
        break;
      case "oldest":
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
    }
    return list;
  }, [state.athletes, search, sort]);

  const stats = useMemo(() => {
    const all = state.athletes.filter((a) => a.balance > 0);
    const total = all.reduce((s, a) => s + a.balance, 0);
    const count = all.length;
    const avg = count > 0 ? total / count : 0;
    const max = count > 0 ? Math.max(...all.map((a) => a.balance)) : 0;
    return { total, count, avg, max };
  }, [state.athletes]);

  const planName = (code: string) =>
    state.plans.find((p) => p.code === code)?.name || code;

  const handlePayment = async () => {
    if (!paymentAthlete) return;
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) return;
    setPaying(true);
    try {
      await db.addPayment(paymentAthlete.id, amt, paymentMethod);
      setPaymentAthlete(null);
      setPaymentAmount("");
      refresh();
      toast.success("Deuda registrada");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setPaying(false);
    }
  };

  const sortLabels: Record<SortKey, string> = {
    balance_desc: "Mayor deuda",
    balance_asc: "Menor deuda",
    name: "Nombre",
    plan: "Plan",
    oldest: "Más antiguo",
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* HEADER */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <AlertTriangle className="w-6 h-6 text-status-error" />
          <h2 className="text-3xl font-bold font-heading tracking-tight text-neutral">
            Deudas
          </h2>
        </div>
        <p className="text-sm text-neutral-muted">
          Saldos pendientes y gestión de cobros
        </p>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatCard
          label="Deuda Total"
          value={usd(stats.total)}
          sub={`${formatBs(stats.total, state.usdVes)}`}
          icon={<DollarSign className="w-4 h-4" />}
          accent="text-status-error"
        />
        <StatCard
          label="Deudores"
          value={String(stats.count)}
          sub={`de ${state.athletes.length} atletas`}
          icon={<Users className="w-4 h-4" />}
          accent="text-gold"
        />
        <StatCard
          label="Deuda Promedio"
          value={usd(stats.avg)}
          sub="por atleta"
          icon={<TrendingUp className="w-4 h-4" />}
          accent="text-neutral"
        />
        <StatCard
          label="Deuda Máxima"
          value={usd(stats.max)}
          sub="saldo más alto"
          icon={<AlertTriangle className="w-4 h-4" />}
          accent="text-status-error"
        />
      </div>

      {/* FILTER BAR */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded pl-10 pr-4 py-2 focus:border-gold focus:outline-none placeholder:text-neutral-muted"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-surface-high border border-divider text-neutral-muted rounded hover:border-gold hover:text-gold transition-colors shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortLabels[sort]}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showSortMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSortMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-obsidian-dim border border-divider rounded shadow-lg shadow-black/40 min-w-[160px] overflow-hidden">
                {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSort(key);
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs uppercase-label transition-colors ${
                      sort === key
                        ? "bg-gold/10 text-gold"
                        : "text-neutral-muted hover:bg-surface-high hover:text-neutral"
                    }`}
                  >
                    {sortLabels[key]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* TABLE */}
      {debtors.length === 0 ? (
        <div className="text-center py-16 border border-divider rounded bg-surface-low">
          <AlertTriangle className="w-8 h-8 text-neutral-muted mx-auto mb-3" />
          <p className="text-neutral-muted text-sm">
            {search ? "No se encontraron deudores con ese nombre" : "No hay atletas con deuda pendiente"}
          </p>
        </div>
      ) : (
        <div className="bg-[#121215] border border-divider rounded overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-divider">
                <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">
                  Nombre
                </th>
                <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">
                  Teléfono
                </th>
                <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">
                  Plan
                </th>
                <th className="text-right px-5 py-3 uppercase-label text-neutral-muted">
                  Deuda
                </th>
                <th className="text-right px-5 py-3 uppercase-label text-neutral-muted">
                  Antigüedad
                </th>
                <th className="text-right px-5 py-3 uppercase-label text-neutral-muted">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {debtors.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-divider last:border-0 hover:bg-surface-high/40 transition-colors"
                >
                  <td className="px-5 py-3">
                    <Link
                      to={`/athletes/${a.id}`}
                      className="text-sm text-neutral font-medium hover:text-gold transition-colors"
                    >
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-neutral-muted">
                    {a.phone || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className="uppercase-label px-2 py-1 rounded bg-surface-high text-gold">
                      {planName(a.plan)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-sm">
                    <span className="text-status-error font-semibold">
                      {usd(a.balance)}
                    </span>
                    <span className="block text-[10px] text-neutral-muted font-mono">
                      {formatBs(a.balance, state.usdVes)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-neutral-muted font-mono">
                    {daysSince(a.created_at)}d
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/athletes/${a.id}`)}
                        className="p-1.5 rounded hover:bg-surface-high text-neutral-muted hover:text-gold transition-colors"
                        title="Ver detalle"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPaymentAthlete(a)}
                        className="p-1.5 rounded hover:bg-gold/10 text-neutral-muted hover:text-gold transition-colors"
                        title="Registrar pago"
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PAYMENT MODAL */}
      <ConfirmDialog
        isOpen={paymentAthlete !== null}
        onClose={() => {
          setPaymentAthlete(null);
          setPaymentAmount("");
        }}
        onConfirm={handlePayment}
        title={`Registrar pago — ${paymentAthlete?.name || ""}`}
        message=""
        confirmLabel={paying ? "Procesando..." : "Registrar Pago"}
        variant="default"
        loading={paying}
        customBody={
          paymentAthlete ? (
            <div className="space-y-4">
              <div className="bg-surface-low rounded p-3 border border-divider">
                <p className="text-xs uppercase-label text-neutral-muted mb-1">Deuda actual</p>
                <p className="text-xl font-bold font-mono text-status-error">
                  {usd(paymentAthlete.balance)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="uppercase-label text-neutral-muted block mb-1.5">
                    Monto ($)
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none font-mono placeholder:text-neutral-muted"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="uppercase-label text-neutral-muted block mb-1.5">
                    Método
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as "efectivo" | "pago_movil")
                    }
                    className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="pago_movil">Pago Móvil</option>
                  </select>
                </div>
              </div>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="relative bg-[#121215] border border-divider rounded p-5 overflow-hidden border-t-2 border-t-gold/30">
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-neutral-muted">{icon}</span>}
        <p className="uppercase-label text-neutral-muted">{label}</p>
      </div>
      <p className={`text-2xl font-bold font-mono tracking-tight ${accent}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-neutral-muted mt-1 font-mono">{sub}</p>}
    </div>
  );
}
