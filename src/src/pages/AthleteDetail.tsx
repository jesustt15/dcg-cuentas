import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { db, usd, formatBs, methodLabel, methodBadgeClass } from "@/lib/db";
import type { Athlete, Sale, SaleItem } from "@/types";
import { ArrowLeft, CreditCard, DollarSign, ChevronRight } from "lucide-react";
import { useDb } from "@/hooks/DbProvider";

export default function AthleteDetail() {
  const { id } = useParams<{ id: string }>();
  const { state } = useDb();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());
  const [saleItems, setSaleItems] = useState<Record<string, SaleItem[]>>({});

  const load = async () => {
    if (!id) return;
    try {
      const [a, s] = await Promise.all([db.getAthlete(id), db.getAthleteSales(id)]);
      setAthlete(a);
      setSales(s);
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
  const [method, setMethod] = useState<"efectivo" | "zelle" | "pago_movil">("efectivo");
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
            onChange={(e) => setMethod(e.target.value as "efectivo" | "zelle" | "pago_movil")}
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none"
          >
            <option value="efectivo">Efectivo</option>
            <option value="zelle">Zelle</option>
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
