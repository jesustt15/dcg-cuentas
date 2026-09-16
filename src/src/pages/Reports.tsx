import { useState, useEffect } from "react";
import { db, usd, formatBs } from "@/lib/db";
import { useDb } from "@/hooks/DbProvider";
import type { IncomeReport } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Users,
  ShoppingCart,
  Calendar,
} from "lucide-react";

type Period = "day" | "week" | "month";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Hoy" },
  { key: "week", label: "Esta Semana" },
  { key: "month", label: "Este Mes" },
];

export default function Reports() {
  const { state } = useDb();
  const [period, setPeriod] = useState<Period>("week");
  const [report, setReport] = useState<IncomeReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    db.getIncomeReport(period)
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .catch(() => {
        if (!cancelled) setReport(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* HEADER */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold font-heading tracking-tight text-neutral">
            Reportes de Ingresos
          </h2>
          <p className="text-sm text-neutral-muted mt-1">
            Desglose membresías vs ventas POS
          </p>
        </div>

        {/* Period Tabs */}
        <div className="flex gap-1 bg-[#121215] border border-divider rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                period === p.key
                  ? "bg-gold text-obsidian-dim"
                  : "text-neutral-muted hover:text-neutral"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-neutral-muted text-sm animate-pulse">
          Cargando reporte...
        </div>
      )}

      {report && !loading && (
        <>
          {/* Date range */}
          <div className="flex items-center gap-2 text-xs text-neutral-muted">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {formatDateRange(report.start_date, report.end_date, period)}
            </span>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ReportKpi
              label="Ingreso Total"
              value={usd(report.total_income)}
              sub={formatBs(report.total_income, state.usdVes)}
              icon={<DollarSign className="w-4 h-4" />}
              accent="border-t-2 border-t-gold"
            />
            <ReportKpi
              label="Membresías"
              value={usd(report.memberships_total)}
              sub={`${report.memberships_count} pago${report.memberships_count !== 1 ? "s" : ""}`}
              icon={<Users className="w-4 h-4" />}
              accent="border-t-2 border-t-emerald-500"
            />
            <ReportKpi
              label="Ventas POS"
              value={usd(report.pos_total)}
              sub={`${report.pos_count} venta${report.pos_count !== 1 ? "s" : ""}`}
              icon={<ShoppingCart className="w-4 h-4" />}
              accent="border-t-2 border-t-status-info"
            />
          </div>

          {/* Proportion bar */}
          {report.total_income > 0 && (
            <div className="bg-[#121215] border border-divider rounded p-4">
              <p className="uppercase-label text-neutral-muted mb-3">
                Proporción del Ingreso
              </p>
              <div className="flex h-4 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 transition-all"
                  style={{
                    width: `${(report.memberships_total / report.total_income) * 100}%`,
                  }}
                  title={`Membresías: ${pct(report.memberships_total, report.total_income)}%`}
                />
                <div
                  className="bg-status-info transition-all"
                  style={{
                    width: `${(report.pos_total / report.total_income) * 100}%`,
                  }}
                  title={`POS: ${pct(report.pos_total, report.total_income)}%`}
                />
              </div>
              <div className="flex items-center gap-6 mt-2">
                <LegendDot color="bg-emerald-500" label={`Membresías ${pct(report.memberships_total, report.total_income)}%`} />
                <LegendDot color="bg-status-info" label={`POS ${pct(report.pos_total, report.total_income)}%`} />
              </div>
            </div>
          )}

          {/* DAILY BREAKDOWN CHART */}
          {report.daily_breakdown.length > 0 && period !== "day" && (
            <div className="bg-[#121215] border border-divider rounded p-5">
              <h3 className="uppercase-label text-neutral-muted mb-4">
                Ingresos por Día
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={report.daily_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => formatShortDate(d)}
                    tick={{ fontSize: 10, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#888" }}
                    formatter={(value: unknown, name: unknown) => [
                      usd(Number(value)),
                      name === "memberships" ? "Membresías" : "POS",
                    ]}
                    labelFormatter={(label: unknown) => formatDate(String(label))}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value === "memberships" ? "Membresías" : "POS"
                    }
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  <Bar dataKey="memberships" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="pos" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* BOTTOM ROW: Category breakdown + Daily table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* POS by Category */}
            <div className="bg-[#121215] border border-divider rounded p-5">
              <h3 className="uppercase-label text-neutral-muted mb-4">
                POS por Categoría
              </h3>
              {report.pos_by_category.length === 0 ? (
                <p className="text-neutral-muted italic text-sm text-center py-4">
                  Sin ventas en este período
                </p>
              ) : (
                <div className="space-y-3">
                  {report.pos_by_category.map((cat) => {
                    const maxCat = Math.max(
                      ...report.pos_by_category.map((c) => c.total),
                    );
                    return (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-neutral capitalize">
                            {cat.category}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="uppercase-label text-neutral-muted">
                              {cat.count} venta{cat.count !== 1 ? "s" : ""}
                            </span>
                            <span className="font-mono text-sm text-neutral font-semibold">
                              {usd(cat.total)}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-surface-high rounded-full overflow-hidden">
                          <div
                            className="h-full bg-status-info rounded-full transition-all"
                            style={{
                              width: `${(cat.total / maxCat) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Daily Table */}
            <div className="bg-[#121215] border border-divider rounded overflow-hidden">
              <div className="px-5 py-3 border-b border-divider">
                <h3 className="uppercase-label text-neutral-muted">
                  Resumen Diario
                </h3>
              </div>
              {report.daily_breakdown.length === 0 ? (
                <p className="text-neutral-muted italic text-sm text-center py-6">
                  Sin movimientos en este período
                </p>
              ) : (
                <div className="max-h-[280px] overflow-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[#121215]">
                      <tr className="border-b border-divider">
                        <th className="text-left px-4 py-2 uppercase-label text-neutral-muted text-xs">
                          Fecha
                        </th>
                        <th className="text-right px-4 py-2 uppercase-label text-neutral-muted text-xs">
                          Memb.
                        </th>
                        <th className="text-right px-4 py-2 uppercase-label text-neutral-muted text-xs">
                          POS
                        </th>
                        <th className="text-right px-4 py-2 uppercase-label text-neutral-muted text-xs">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...report.daily_breakdown]
                        .reverse()
                        .map((d) => (
                          <tr
                            key={d.date}
                            className="border-b border-divider/50 last:border-0 hover:bg-surface-high/30 transition-colors"
                          >
                            <td className="px-4 py-2 text-sm text-neutral">
                              {formatDate(d.date)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-sm text-emerald-400">
                              {d.memberships > 0 ? usd(d.memberships) : "—"}
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-sm text-status-info">
                              {d.pos > 0 ? usd(d.pos) : "—"}
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-sm text-neutral font-semibold">
                              {usd(d.memberships + d.pos)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!report && !loading && (
        <div className="text-center py-16 border border-divider rounded bg-surface-low">
          <TrendingUp className="w-8 h-8 text-neutral-muted mx-auto mb-3" />
          <p className="text-neutral-muted text-sm">
            No se pudo cargar el reporte
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function ReportKpi({
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
    <div className={`bg-[#121215] border border-divider rounded p-5 overflow-hidden ${accent}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-neutral-muted">{icon}</span>}
        <p className="uppercase-label text-neutral-muted">{label}</p>
      </div>
      <p className="text-2xl font-bold font-mono tracking-tight text-neutral">
        {value}
      </p>
      {sub && <p className="text-xs text-neutral-muted mt-1 font-mono">{sub}</p>}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-xs text-neutral-muted">{label}</span>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(part: number, total: number): string {
  if (total === 0) return "0";
  return ((part / total) * 100).toFixed(1);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function formatDateRange(start: string, end: string, period: Period): string {
  if (period === "day") return formatDate(end);
  return `${formatDate(start)} — ${formatDate(end)}`;
}
