import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { db, usd, formatBs, methodLabel, methodBadgeClass } from "@/lib/db";
import type { Athlete, Sale, SaleItem, Payment } from "@/types";
import { ArrowLeft, CreditCard, DollarSign, ChevronRight, Calendar, CheckCircle } from "lucide-react";
import { useDb } from "@/hooks/DbProvider";

export default function AthleteDetail() {
  const { id } = useParams<{ id: string }>();
  const { state } = useDb();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());
  const [saleItems, setSaleItems] = useState<Record<string, SaleItem[]>>({});

  const load = async () => {
    if (!id) return;
    try {
      const [a, s, p] = await Promise.all([
        db.getAthlete(id),
        db.getAthleteSales(id),
        db.getAthletePayments(id),
      ]);
      setAthlete(a);
      setSales(s);
      setPayments(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const toggleExpand = async (saleId: string) => {
    setExpandedSales((prev) => {
      const next = new Set(prev);
      if (next.has(saleId)) {
        next.delete(saleId);
      } else {
        next.add(saleId);
        // Lazy load items on first expand
        if (!saleItems[saleId]) {
          db.getSaleItems(saleId).then((items) => {
            setSaleItems((s) => ({ ...s, [saleId]: items }));
          });
        }
      }
      return next;
    });
  };

  if (loading) {
    return <div className="text-neutral-muted text-sm">Cargando...</div>;
  }

  if (!athlete) {
    return (
      <div className="text-neutral-muted text-sm">
        Atleta no encontrado.{" "}
        <Link to="/athletes" className="text-gold hover:underline">
          Volver
        </Link>
      </div>
    );
  }

  const creditPct = Math.min(100, (athlete.balance / Math.max(1, athlete.credit_limit)) * 100);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* BACK + HEADER */}
      <div className="flex items-center gap-3">
        <Link
          to="/athletes"
          className="p-2 rounded hover:bg-surface-high text-neutral-muted hover:text-neutral transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold font-heading tracking-tight text-neutral">
            {athlete.name}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="uppercase-label px-2 py-1 rounded bg-surface-high text-gold">
              {athlete.plan}
            </span>
            <span
              className={`uppercase-label px-2 py-1 rounded ${
                athlete.status === "activo"
                  ? "bg-status-success/15 text-status-success"
                  : "bg-surface-high text-neutral-muted"
              }`}
            >
              {athlete.status}
            </span>
            {athlete.phone && (
              <span className="text-sm text-neutral-muted">{athlete.phone}</span>
            )}
            <span className="text-xs text-neutral-muted">
              Miembro desde {new Date(athlete.created_at).toLocaleDateString("es-ES")}
            </span>
          </div>
        </div>
      </div>

      {/* BALANCE + CREDIT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Balance */}
        <div className="bg-[#121215] border border-divider rounded p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="uppercase-label text-neutral-muted flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5" />
              Saldo Pendiente
            </p>
            <button
              onClick={() => setShowPayment(!showPayment)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors"
            >
              <CreditCard className="w-3 h-3" />
              Abonar
            </button>
          </div>
          <p
            className={`text-3xl font-bold font-mono tracking-tight ${
              athlete.balance > 0 ? "text-status-error" : "text-status-success"
            }`}
          >
            {usd(athlete.balance)}
          </p>
          <p className="font-mono text-sm text-neutral-muted mt-1">
            ≈ {formatBs(athlete.balance, state.usdVes)}
          </p>

          {showPayment && (
            <PaymentForm
              athleteId={athlete.id}
              onSuccess={() => {
                setShowPayment(false);
                load();
              }}
              onCancel={() => setShowPayment(false)}
            />
          )}
        </div>

        {/* Credit Limit */}
        <div className="bg-[#121215] border border-divider rounded p-5">
          <p className="uppercase-label text-neutral-muted mb-3">Límite de Crédito</p>
          <div className="flex items-end justify-between mb-2">
            <span className="font-mono text-lg text-neutral">{usd(athlete.balance)}</span>
            <span className="font-mono text-sm text-neutral-muted">/ {usd(athlete.credit_limit)}</span>
          </div>
          <div className="h-2 bg-surface-high rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                creditPct >= 80 ? "bg-status-error" : creditPct >= 50 ? "bg-gold" : "bg-status-success"
              }`}
              style={{ width: `${creditPct}%` }}
            />
          </div>
          <p className="text-xs text-neutral-muted mt-2">
            Disponible: {usd(Math.max(0, athlete.credit_limit - athlete.balance))}
          </p>
        </div>
      </div>

      {/* PLAN STATUS + MONTHLY PAYMENT */}
      <div className="bg-[#121215] border border-divider rounded p-5 space-y-4">
        <h3 className="text-sm font-bold font-heading text-neutral uppercase-label flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gold" />
          Pagar Mensualidad
        </h3>
        <PlanStatusCard athlete={athlete} plan={state.plans.find((p) => p.code === athlete.plan)} />
        <MonthlyPaymentForm
          athleteId={athlete.id}
          planPrice={state.plans.find((p) => p.code === athlete.plan)?.price ?? 0}
          planExpiresAt={athlete.plan_expires_at}
          onSuccess={() => load()}
        />
      </div>

      {/* PURCHASE HISTORY */}
      <div>
        <h3 className="text-lg font-bold font-heading text-neutral tracking-tight mb-4">
          Historial de Compras
        </h3>
        {sales.length === 0 ? (
          <div className="text-center py-12 border border-divider rounded bg-surface-low">
            <p className="text-neutral-muted text-sm">Sin compras registradas</p>
          </div>
        ) : (
          <div className="bg-[#121215] border border-divider rounded overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-divider">
                  <th className="w-8 px-3 py-3"></th>
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Fecha</th>
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Items</th>
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Método</th>
                  <th className="text-right px-5 py-3 uppercase-label text-neutral-muted">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const isExpanded = expandedSales.has(s.id);
                  const items = saleItems[s.id];
                  return (
                    <>
                      <tr
                        key={s.id}
                        className="border-b border-divider last:border-0 cursor-pointer hover:bg-surface-high/40 transition-colors"
                        onClick={() => toggleExpand(s.id)}
                      >
                        <td className="px-3 py-3">
                          <ChevronRight
                            className={`w-4 h-4 text-neutral-muted transition-transform duration-200 ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        </td>
                        <td className="px-5 py-3 text-sm text-neutral">
                          {new Date(s.created_at).toLocaleDateString("es-ES")}
                        </td>
                        <td className="px-5 py-3 text-sm text-neutral-muted">{s.item_count}</td>
                        <td className="px-5 py-3">
                          <span className={`uppercase-label px-2 py-1 rounded ${methodBadgeClass(s.payment_method)}`}>
                            {methodLabel(s.payment_method)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-sm text-neutral">
                          {usd(s.total)}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-divider last:border-0">
                          <td colSpan={5} className="px-0 py-0">
                            <div className="bg-surface-low/50 border-l-2 border-gold/30 ml-6">
                              {!items ? (
                                <div className="px-5 py-3 text-xs text-neutral-muted">Cargando...</div>
                              ) : items.length === 0 ? (
                                <div className="px-5 py-3 text-xs text-neutral-muted">Sin items</div>
                              ) : (
                                <table className="w-full">
                                  <thead>
                                    <tr>
                                      <th className="text-left px-5 py-2 text-[10px] uppercase tracking-wider font-mono font-semibold text-neutral-muted">Producto</th>
                                      <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-mono font-semibold text-neutral-muted">Cant.</th>
                                      <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-mono font-semibold text-neutral-muted">P/U</th>
                                      <th className="text-right px-5 py-2 text-[10px] uppercase tracking-wider font-mono font-semibold text-neutral-muted">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((item) => (
                                      <tr key={item.id} className="border-t border-divider/50">
                                        <td className="px-5 py-2 text-sm text-neutral">
                                          {item.product_name ?? "—"}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-neutral-muted font-mono text-right">
                                          {item.qty}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-neutral-muted font-mono text-right">
                                          {usd(item.unit_price)}
                                        </td>
                                        <td className="px-5 py-2 text-sm text-neutral font-mono text-right font-medium">
                                          {usd(item.qty * item.unit_price)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAYMENT HISTORY */}
      <div>
        <h3 className="text-lg font-bold font-heading text-neutral tracking-tight mb-4">
          Historial de Abonos
        </h3>
        {payments.length === 0 ? (
          <div className="text-center py-12 border border-divider rounded bg-surface-low">
            <p className="text-neutral-muted text-sm italic">Sin abonos registrados</p>
          </div>
        ) : (
          <div className="bg-[#121215] border border-divider rounded overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-divider">
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Fecha</th>
                  <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Método</th>
                  <th className="text-right px-5 py-3 uppercase-label text-neutral-muted">Monto ($)</th>
                  <th className="text-right px-5 py-3 uppercase-label text-neutral-muted">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-divider last:border-0">
                    <td className="px-5 py-3 text-sm text-neutral">
                      {new Date(p.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`uppercase-label px-2 py-1 rounded ${methodBadgeClass(p.method)}`}>
                        {methodLabel(p.method)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-gold">
                      {usd(p.amount)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-neutral-muted">
                      {formatBs(p.amount, state.usdVes)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-divider bg-surface-high/30">
                  <td colSpan={2} className="px-5 py-3 uppercase-label text-neutral-muted">
                    Total Abonado
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-sm font-bold text-gold">
                    {usd(payments.reduce((sum, p) => sum + p.amount, 0))}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-sm font-bold text-neutral-muted">
                    {formatBs(payments.reduce((sum, p) => sum + p.amount, 0), state.usdVes)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentForm({
  athleteId,
  onSuccess,
  onCancel,
}: {
  athleteId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"efectivo" | "pago_movil">("efectivo");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    try {
      await db.addPayment(athleteId, amt, method);
      onSuccess();
    } catch (err) {
      alert(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-divider space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="uppercase-label text-neutral-muted block mb-1.5">Monto ($)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="0.01"
            step="0.01"
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none font-mono placeholder:text-neutral-muted"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="uppercase-label text-neutral-muted block mb-1.5">Método</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as "efectivo" | "pago_movil")}
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none"
          >
            <option value="efectivo">Efectivo</option>
            <option value="pago_movil">Pago Móvil</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {saving ? "Procesando..." : "Registrar Abono"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-surface-high border border-border text-neutral rounded hover:border-gold hover:text-gold transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── Plan Status Card ────────────────────────────────────────────────────────

function getPlanStatus(planExpiresAt: string | null): {
  label: string;
  color: string;
  bgColor: string;
  days: number | null;
} {
  if (!planExpiresAt) {
    return { label: "Sin fecha", color: "text-neutral-muted", bgColor: "bg-surface-high", days: null };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expires = new Date(planExpiresAt + "T00:00:00");
  const diffMs = expires.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `Vencido hace ${Math.abs(diffDays)} día${Math.abs(diffDays) !== 1 ? "s" : ""}`,
      color: "text-status-error",
      bgColor: "bg-status-error/15",
      days: diffDays,
    };
  }
  if (diffDays === 0) {
    return { label: "Vence hoy", color: "text-gold", bgColor: "bg-gold/15", days: 0 };
  }
  return {
    label: `Activo — Vence en ${diffDays} día${diffDays !== 1 ? "s" : ""}`,
    color: "text-status-success",
    bgColor: "bg-status-success/15",
    days: diffDays,
  };
}

function getNextExpiryDate(planExpiresAt: string | null): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!planExpiresAt) {
    today.setMonth(today.getMonth() + 1);
    return today.toISOString().split("T")[0];
  }

  const expires = new Date(planExpiresAt + "T00:00:00");
  if (expires.getTime() < today.getTime()) {
    // Expired → today + 1 month
    today.setMonth(today.getMonth() + 1);
    return today.toISOString().split("T")[0];
  }
  // Active → current + 1 month
  expires.setMonth(expires.getMonth() + 1);
  return expires.toISOString().split("T")[0];
}

function PlanStatusCard({
  athlete,
  plan,
}: {
  athlete: Athlete;
  plan?: { code: string; name: string; price: number };
}) {
  const status = getPlanStatus(athlete.plan_expires_at);
  const expiresDisplay = athlete.plan_expires_at
    ? new Date(athlete.plan_expires_at + "T00:00:00").toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "No establecida";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <p className="uppercase-label text-neutral-muted mb-1">Plan</p>
        <span className="uppercase-label px-2 py-1 rounded bg-surface-high text-gold">
          {plan?.name ?? athlete.plan}
        </span>
      </div>
      <div>
        <p className="uppercase-label text-neutral-muted mb-1">Estado</p>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
          {status.label}
        </span>
      </div>
      <div>
        <p className="uppercase-label text-neutral-muted mb-1">Vencimiento</p>
        <p className="text-sm text-neutral font-mono">{expiresDisplay}</p>
      </div>
    </div>
  );
}

// ─── Monthly Payment Form ────────────────────────────────────────────────────

function MonthlyPaymentForm({
  athleteId,
  planPrice,
  planExpiresAt,
  onSuccess,
}: {
  athleteId: string;
  planPrice: number;
  planExpiresAt: string | null;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(planPrice > 0 ? String(planPrice) : "");
  const [method, setMethod] = useState<"efectivo" | "pago_movil">("efectivo");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const nextExpiry = getNextExpiryDate(planExpiresAt);
  const nextExpiryDisplay = new Date(nextExpiry + "T00:00:00").toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      await db.payMonthlyPlan(athleteId, amt, method);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSuccess();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="pt-3 border-t border-divider space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="uppercase-label text-neutral-muted block mb-1.5">Monto ($)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="0.01"
            step="0.01"
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none font-mono placeholder:text-neutral-muted"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="uppercase-label text-neutral-muted block mb-1.5">Método</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as "efectivo" | "pago_movil")}
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none"
          >
            <option value="efectivo">Efectivo</option>
            <option value="pago_movil">Pago Móvil</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {saving ? "Procesando..." : "Pagar Mensualidad"}
        </button>
      </div>

      <p className="text-xs text-neutral-muted">
        Al pagar, se extenderá el plan automáticamente hasta{" "}
        <span className="text-gold font-semibold">{nextExpiryDisplay}</span>
      </p>

      {success && (
        <div className="flex items-center gap-2 text-status-success text-sm font-medium">
          <CheckCircle className="w-4 h-4" />
          Mensualidad registrada. Plan extendido hasta {nextExpiryDisplay}.
        </div>
      )}
      {error && (
        <div className="text-status-error text-sm">{error}</div>
      )}
    </form>
  );
}
