import { useDb } from "@/hooks/DbProvider";
import { usd, methodLabel, methodBadgeClass } from "@/lib/db";
import { DollarSign, Users, AlertTriangle, TrendingUp, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { state } = useDb();
  const d = state.dashboard;
  const navigate = useNavigate();

  if (!d) {
    return <div className="text-neutral-muted text-sm">Cargando...</div>;
  }

  // Plan distribution: count athletes per plan
  const planMap = new Map<string, number>();
  for (const a of state.athletes) {
    planMap.set(a.plan, (planMap.get(a.plan) || 0) + 1);
  }
  const planDistribution = state.plans.map((p) => ({
    ...p,
    count: planMap.get(p.code) || 0,
  }));
  const maxCount = Math.max(1, ...planDistribution.map((p) => p.count));

  const planName = (code: string) => state.plans.find((p) => p.code === code)?.name || code;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* HEADER */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold font-heading tracking-tight text-neutral">
              Dashboard
            </h2>
            <span className="inline-block w-2 h-2 rounded-sm bg-status-success animate-pulse" />
          </div>
          <p className="text-sm text-neutral-muted font-body">
            Resumen operativo del box
          </p>
        </div>
        <div className="uppercase-label text-neutral-muted">
          {new Date().toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <MetricCard
          label="Ventas Hoy"
          value={usd(d.today_sales_total)}
          sub={`${d.today_sales_count} ventas`}
          icon={<DollarSign className="w-4 h-4" />}
          accent="bg-status-success"
        />
        <MetricCard
          label="Atletas Activos"
          value={String(d.active_athletes)}
          sub={`${state.athletes.length} total`}
          icon={<Users className="w-4 h-4" />}
          accent="bg-gold"
        />
        <MetricCard
          label="Deuda Total"
          value={usd(d.total_debt)}
          sub="saldos pendientes"
          icon={<TrendingUp className="w-4 h-4" />}
          accent="border-t-2 border-t-gold"
          special
        />
        <MetricCard
          label="Stock Bajo"
          value={String(d.low_stock_count)}
          sub="productos a reordenar"
          icon={<AlertTriangle className="w-4 h-4" />}
          accent={d.low_stock_count > 0 ? "bg-status-error" : "bg-neutral-muted"}
        />
      </div>

      {/* EXPIRING PLANS PANEL */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-gold" />
          <h3 className="text-xl font-bold font-heading text-gold tracking-tight">
            Planes por Vencer
          </h3>
        </div>
        {d.expiring_athletes.length === 0 ? (
          <div className="bg-[#121215] border border-divider rounded p-6">
            <p className="text-neutral-muted italic text-sm text-center py-2">
              No hay planes por vencer en los pr&oacute;ximos 3 d&iacute;as
            </p>
          </div>
        ) : (
          <div className="bg-[#121215] border border-divider rounded overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-divider">
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Nombre</th>
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Plan</th>
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Vence</th>
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Estado</th>
                </tr>
              </thead>
              <tbody>
                {d.expiring_athletes.map((a) => {
                  const badge = getExpiryBadge(a.plan_expires_at);
                  const rowBg =
                    badge.kind === "expired"
                      ? "bg-status-error/5 hover:bg-status-error/10"
                      : badge.kind === "today"
                        ? "bg-gold/5 hover:bg-gold/10"
                        : "hover:bg-surface-low/50";
                  return (
                    <tr
                      key={a.id}
                      className={`border-b border-divider last:border-0 cursor-pointer transition-colors ${rowBg}`}
                      onClick={() => navigate(`/athletes/${a.id}`)}
                    >
                      <td className="px-5 py-3 text-sm text-neutral font-medium">{a.name}</td>
                      <td className="px-5 py-3">
                        <span className="uppercase-label px-2 py-1 rounded bg-surface-high text-gold">
                          {planName(a.plan)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-neutral-muted font-mono">
                        {formatExpiryDate(a.plan_expires_at)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TWO-COL: Recent Sales + Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div>
          <h3 className="text-lg font-bold font-heading text-neutral tracking-tight mb-4">
            Últimas Ventas
          </h3>
          {d.recent_sales.length === 0 ? (
            <div className="text-center py-12 border border-divider rounded bg-surface-low">
              <p className="text-neutral-muted text-sm">Sin ventas registradas</p>
            </div>
          ) : (
            <div className="bg-[#121215] border border-divider rounded overflow-hidden divide-y divide-divider">
              {d.recent_sales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral truncate">
                      {sale.athlete_name || "Mostrador"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="uppercase-label text-neutral-muted">
                        {formatTimeAgo(sale.created_at)}
                      </span>
                      <span className="text-neutral-muted">&middot;</span>
                      <span className="text-neutral-muted">{sale.item_count} items</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className={`uppercase-label px-2 py-0.5 rounded ${methodBadgeClass(sale.payment_method)}`}>
                      {methodLabel(sale.payment_method)}
                    </span>
                    <span className="font-mono font-semibold text-sm text-neutral">
                      {usd(sale.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plan Distribution */}
        <div>
          <h3 className="text-lg font-bold font-heading text-neutral tracking-tight mb-4">
            Distribución por Plan
          </h3>
          <div className="bg-[#121215] border border-divider rounded p-5 space-y-4">
            {planDistribution.map((p) => (
              <div key={p.code}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-neutral">{p.name}</span>
                  <span className="font-mono text-sm text-neutral-muted">{p.count}</span>
                </div>
                <div className="h-1.5 bg-surface-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold rounded-full transition-all duration-500"
                    style={{ width: `${(p.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getExpiryBadge(expiresAt: string | null): { label: string; className: string; kind: "expired" | "today" | "upcoming" } {
  if (!expiresAt) return { label: "Sin fecha", className: "bg-surface-high text-neutral-muted", kind: "upcoming" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiresAt + "T00:00:00");
  const diffDays = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "Vencido", className: "bg-status-error/20 text-status-error", kind: "expired" };
  }
  if (diffDays === 0) {
    return { label: "Vence hoy", className: "bg-gold/20 text-gold", kind: "today" };
  }
  return {
    label: `Vence en ${diffDays} d&iacute;a${diffDays !== 1 ? "s" : ""}`,
    className: "bg-surface-high text-neutral",
    kind: "upcoming",
  };
}

function formatExpiryDate(expiresAt: string | null): string {
  if (!expiresAt) return "—";
  const d = new Date(expiresAt + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  accent: string;
  special?: boolean;
}

function MetricCard({ label, value, sub, icon, accent, special }: MetricCardProps) {
  return (
    <div
      className={`relative bg-[#121215] border border-divider rounded p-5 overflow-hidden ${
        special ? "border-t-2 border-t-gold" : ""
      }`}
    >
      {!special && <div className={`absolute top-0 left-0 w-full h-[2px] ${accent}`} />}
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-neutral-muted">{icon}</span>}
        <p className="uppercase-label text-neutral-muted">{label}</p>
      </div>
      <p className="text-2xl font-bold font-mono tracking-tight text-neutral">{value}</p>
      {sub && <p className="text-xs text-neutral-muted mt-1">{sub}</p>}
    </div>
  );
}
