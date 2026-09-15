import { useDb } from "@/hooks/DbProvider";
import { usd, methodLabel, methodBadgeClass } from "@/lib/db";
import { db } from "@/lib/db";
import { DollarSign, Users, AlertTriangle, TrendingUp, AlertCircle, MessageCircle, Settings, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { normalizeVePhone, buildWaLink } from "@/lib/phone";
import { renderReminder } from "@/lib/reminder";
import { openUrl } from "@tauri-apps/plugin-opener";
import ReminderSettingsModal from "@/components/ReminderSettingsModal";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { DebtorRow } from "@/types";

export default function Dashboard() {
  const { state, refresh } = useDb();
  const d = state.dashboard;
  const navigate = useNavigate();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

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
    <div className="space-y-8 max-w-7xl">
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Ventas Hoy"
          value={usd(d.today_sales_total)}
          sub={`${d.today_sales_count} ventas`}
          icon={<DollarSign className="w-4 h-4" />}
          accent="bg-status-success"
        />
        <MetricCard
          label="Esta Semana"
          value={usd(state.weekSalesTotal)}
          icon={<TrendingUp className="w-4 h-4" />}
          accent="bg-status-success"
        />
        <MetricCard
          label="Este Mes"
          value={usd(state.monthSalesTotal)}
          icon={<TrendingUp className="w-4 h-4" />}
          accent="bg-status-success"
        />
        <MetricCard
          label="Este Año"
          value={usd(state.yearSalesTotal)}
          icon={<TrendingUp className="w-4 h-4" />}
          accent="bg-status-success"
        />
        <MetricCard
          label="CXC Total"
          value={usd(d.total_debt)}
          sub="saldos pendientes"
          icon={<AlertTriangle className="w-4 h-4" />}
          accent="border-t-2 border-t-gold"
          special
        />
        <MetricCard
          label="Deudores"
          value={String(state.debtors.length)}
          sub={`${state.athletes.length} total`}
          icon={<Users className="w-4 h-4" />}
          accent="bg-gold"
        />
      </div>

      {/* SALES CHART + CXC AGING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales chart: last 30 days */}
        <div className="bg-[#121215] border border-divider rounded p-5">
          <h3 className="uppercase-label text-neutral-muted mb-4">Ventas últimas 30 días</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={state.salesChart}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <Area type="monotone" dataKey="total" stroke="#D4AF37" fill="url(#goldGrad)" strokeWidth={2} />
              <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#888" }}
                formatter={(value: unknown) => [usd(Number(value)), "Total"]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* CXC por antigüedad */}
        <div className="bg-[#121215] border border-divider rounded p-5">
          <h3 className="uppercase-label text-neutral-muted mb-4">CXC por Antigüedad</h3>
          {(() => {
            const cxc = state.cxcAging;
            const total = cxc.current + cxc.days_31_60 + cxc.days_61_90 + cxc.over_90;
            return (
              <div className="space-y-4 mt-2">
                <AgingBar label="0-30 días" value={cxc.current} total={total} color="bg-status-success" />
                <AgingBar label="31-60 días" value={cxc.days_31_60} total={total} color="bg-gold" />
                <AgingBar label="61-90 días" value={cxc.days_61_90} total={total} color="bg-orange-500" />
                <AgingBar label="90+ días" value={cxc.over_90} total={total} color="bg-status-error" />
                {total === 0 && (
                  <p className="text-neutral-muted italic text-sm text-center py-2">No hay cuentas por cobrar</p>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* CUENTAS POR COBRAR */}
      <div>
        <h3 className="text-lg font-bold font-heading text-neutral tracking-tight mb-4">
          Cuentas por Cobrar
        </h3>
        {state.debtors.length === 0 ? (
          <div className="bg-[#121215] border border-divider rounded p-6">
            <p className="text-neutral-muted italic text-sm text-center py-2">
              No hay cuentas por cobrar
            </p>
          </div>
        ) : (
          <div className="bg-[#121215] border border-divider rounded overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-divider">
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Nombre</th>
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Teléfono</th>
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Plan</th>
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Deuda</th>
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Días Vencido</th>
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Último Pago</th>
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Acción</th>
                </tr>
              </thead>
              <tbody>
                {state.debtors.map((debtor: DebtorRow) => (
                  <tr
                    key={debtor.id}
                    onClick={() => navigate(`/athletes/${debtor.id}`)}
                    className="border-b border-divider last:border-0 cursor-pointer hover:bg-surface-high/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-sm text-neutral font-medium">{debtor.name}</td>
                    <td className="px-5 py-3 text-sm text-neutral-muted">{debtor.phone || "—"}</td>
                    <td className="px-5 py-3">
                      <span className="uppercase-label px-2 py-1 rounded bg-surface-high text-gold">
                        {state.plans.find((p) => p.code === debtor.plan)?.name || debtor.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-sm text-status-error font-semibold">
                      {usd(debtor.balance)}
                    </td>
                    <td className="px-5 py-3 text-sm text-neutral-muted">
                      {debtor.days_overdue > 0 ? (
                        <span className="text-status-error font-semibold">{debtor.days_overdue}d</span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-neutral-muted">
                      {debtor.last_payment_date ? formatDate(debtor.last_payment_date) : "Sin pagos"}
                    </td>
                    <td className="px-5 py-3">
                      {debtor.phone && normalizeVePhone(debtor.phone) && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const phone = normalizeVePhone(debtor.phone)!;
                            const plan = state.plans.find((p) => p.code === debtor.plan);
                            const message = `Hola ${debtor.name}! Te recordamos que tienes un saldo pendiente de ${usd(debtor.balance)} ${plan?.name ? `en tu plan ${plan.name}` : ""}. ¿Podrías realizar tu pago? Gracias!`;
                            await openUrl(buildWaLink(phone, message));
                          }}
                          className="p-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 transition-colors"
                          title="Enviar recordatorio por WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PENDING REMINDERS BANNER */}
      {state.pendingReminders.length > 0 && (
        <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 flex items-center gap-3">
          <MessageCircle className="w-5 h-5 text-gold flex-shrink-0" />
          <p className="text-sm text-gold flex-1">
            <strong>{state.pendingReminders.length}</strong> atleta
            {state.pendingReminders.length !== 1 ? "s" : ""} necesita
            {state.pendingReminders.length !== 1 ? "n" : ""} recordatorio hoy
          </p>
          <button
            onClick={() => setShowBatchModal(true)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors shrink-0"
          >
            Preparar todos
          </button>
        </div>
      )}

      {/* EXPIRING PLANS PANEL */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-gold" />
          <h3 className="text-xl font-bold font-heading text-gold tracking-tight">
            Planes por Vencer
          </h3>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="ml-auto p-2 rounded-lg bg-surface-high hover:bg-surface-higher text-neutral-muted transition-colors"
            title="Configurar plantilla de recordatorio"
          >
            <Settings className="w-4 h-4" />
          </button>
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
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Acción</th>
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
                      <td className="px-5 py-3">
                        {a.phone && normalizeVePhone(a.phone) && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const phone = normalizeVePhone(a.phone)!;
                              const plan = state.plans.find((p) => p.code === a.plan);
                              const vars: Record<string, string> = {
                                nombre: a.name,
                                plan: plan?.name || a.plan,
                                vence: a.plan_expires_at || "sin fecha",
                                monto: String(plan?.price || 0),
                                dias: a.plan_expires_at
                                  ? String(
                                      Math.ceil(
                                        (new Date(a.plan_expires_at).getTime() - Date.now()) /
                                          (1000 * 60 * 60 * 24),
                                      ),
                                    )
                                  : "0",
                              };
                              const template =
                                (await db.getSetting("reminder_template")) ||
                                "Hola {nombre}! Te recordamos que tu plan {plan} vence el {vence}. Monto: ${monto}.";
                              const message = renderReminder(template, vars);
                              await openUrl(buildWaLink(phone, message));
                              await db.logReminder(a.id, "whatsapp");
                              refresh();
                            }}
                            className="p-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 transition-colors"
                            title="Enviar recordatorio por WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
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
              {d.recent_sales.map((sale) => {
                const hasAthlete = !!sale.athlete_id;
                return (
                  <div
                    key={sale.id}
                    onClick={() => {
                      if (sale.athlete_id) navigate(`/athletes/${sale.athlete_id}`);
                    }}
                    className={`flex items-center justify-between px-4 py-3 transition-colors ${
                      hasAthlete
                        ? "cursor-pointer hover:bg-surface-high/50"
                        : "cursor-default"
                    }`}
                    title={hasAthlete ? "Ver detalle del atleta" : ""}
                  >
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
                      {hasAthlete && (
                        <ChevronRight className="w-4 h-4 text-neutral-muted ml-1" />
                      )}
                    </div>
                  </div>
                );
              })}
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

      <ReminderSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
      <BatchSendModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        athletes={state.pendingReminders}
        plans={state.plans}
        onSent={() => {
          setShowBatchModal(false);
          refresh();
        }}
      />
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
    label: `Vence en ${diffDays} día${diffDays !== 1 ? "s" : ""}`,
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

import type { Athlete, Plan } from "@/types";

function BatchSendModal({
  isOpen,
  onClose,
  athletes,
  plans,
  onSent,
}: {
  isOpen: boolean;
  onClose: () => void;
  athletes: Athlete[];
  plans: Plan[];
  onSent: () => void;
}) {
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const getVars = (a: Athlete) => {
    const plan = plans.find((p) => p.code === a.plan);
    const expiresAt = a.plan_expires_at ? new Date(a.plan_expires_at + "T00:00:00") : null;
    const daysUntil = expiresAt
      ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;
    return {
      nombre: a.name,
      plan: plan?.name || a.plan,
      vence: a.plan_expires_at || "sin fecha",
      monto: String(plan?.price || 0),
      dias: String(Math.max(0, daysUntil)),
    };
  };

  const handleMessageSent = async (a: Athlete) => {
    const phone = normalizeVePhone(a.phone);
    if (!phone) return;
    const vars = getVars(a);
    const template =
      (await db.getSetting("reminder_template")) ||
      "Hola {nombre}! Te recordamos que tu plan {plan} vence el {vence}. Monto: ${monto}.";
    const message = renderReminder(template, vars);
    await openUrl(buildWaLink(phone, message));
    await db.logReminder(a.id, "whatsapp");
    setSentIds((prev) => new Set(prev).add(a.id));
  };

  const pending = athletes.filter((a) => !sentIds.has(a.id));
  const allSent = pending.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-divider rounded-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-gold" />
            <h3 className="text-lg font-bold font-heading text-gold">Enviar recordatorios</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-high text-neutral-muted transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
          {allSent ? (
            <div className="text-center py-8">
              <p className="text-neutral text-sm">Todos los recordatorios fueron enviados.</p>
              <button
                onClick={onSent}
                className="mt-4 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            athletes.map((a) => {
              const isSent = sentIds.has(a.id);
              const phone = normalizeVePhone(a.phone);
              if (!phone) return null;
              const vars = getVars(a);
              const template =
                "Hola {nombre}! Te recordamos que tu plan {plan} vence el {vence}. Monto: ${monto}.";
              const message = renderReminder(template, vars);

              if (isSent) {
                return (
                  <div
                    key={a.id}
                    className="bg-[#121215] border border-divider rounded-lg p-4 opacity-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral truncate">{a.name}</p>
                        <p className="text-xs text-neutral-muted mt-0.5">{plans.find((p) => p.code === a.plan)?.name || a.plan}</p>
                      </div>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-status-success/20 text-status-success">
                        Enviado
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={a.id}
                  onClick={() => handleMessageSent(a)}
                  className="bg-[#121215] border border-divider rounded-lg p-4 cursor-pointer hover:border-green-600/40 hover:bg-green-600/5 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral truncate">{a.name}</p>
                      <p className="text-xs text-neutral-muted mt-0.5">{plans.find((p) => p.code === a.plan)?.name || a.plan}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-green-600/20 text-green-400 rounded group-hover:bg-green-600/30 transition-colors shrink-0">
                      <MessageCircle className="w-3.5 h-3.5" />
                      Enviar
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-muted line-clamp-2">{message}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function AgingBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-neutral-muted">{label}</span>
        <span className="font-mono text-neutral">{usd(value)}</span>
      </div>
      <div className="h-2 bg-surface-high rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
