import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { db, usd } from "@/lib/db";
import type { Athlete, Plan } from "@/types";

interface EditAthleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete: Athlete | null;
  plans: Plan[];
  onSave: () => void;
}

export default function EditAthleteModal({
  isOpen,
  onClose,
  athlete,
  plans,
  onSave,
}: EditAthleteModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [planExpiresAt, setPlanExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const dialogRef = useRef<HTMLDivElement>(null);

  // Initialize form with athlete data when modal opens
  useEffect(() => {
    if (athlete && isOpen) {
      setName(athlete.name);
      setPhone(athlete.phone);
      setPlan(athlete.plan);
      setCreditLimit(athlete.credit_limit.toString());
      setPlanExpiresAt(athlete.plan_expires_at || "");
      setError("");
    }
  }, [athlete, isOpen]);

  // Escape key closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, saving]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !saving) {
        onClose();
      }
    },
    [onClose, saving],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!athlete) return;
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    const parsedCreditLimit = parseFloat(creditLimit);
    if (isNaN(parsedCreditLimit) || parsedCreditLimit < 0) {
      setError("El límite de crédito debe ser un número positivo");
      return;
    }

    if (!plan) {
      setError("Debes seleccionar un plan");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await db.updateAthlete(
        athlete.id,
        name.trim(),
        phone.trim(),
        plan,
        parsedCreditLimit,
        planExpiresAt || null,
      );
      onSave();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !athlete) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-athlete-title"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl mx-4 bg-surface-low border border-divider rounded-lg shadow-2xl animate-in zoom-in-95 fade-in duration-200"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={saving}
          className="absolute top-3 right-3 text-neutral-muted hover:text-neutral transition-colors disabled:opacity-50"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Title */}
          <h3
            id="edit-athlete-title"
            className="text-base font-bold font-heading text-neutral uppercase-label mb-4"
          >
            Editar Atleta
          </h3>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-status-error/10 border border-status-error/30 rounded text-sm text-status-error">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="uppercase-label text-neutral-muted block mb-1.5">
                  Nombre
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none placeholder:text-neutral-muted"
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="uppercase-label text-neutral-muted block mb-1.5">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none placeholder:text-neutral-muted"
                  placeholder="0414-1234567"
                />
              </div>
              <div>
                <label className="uppercase-label text-neutral-muted block mb-1.5">
                  Plan
                </label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none"
                >
                  {plans.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name} — {usd(p.price)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="uppercase-label text-neutral-muted block mb-1.5">
                  Límite de Crédito ($)
                </label>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none font-mono placeholder:text-neutral-muted"
                  placeholder="150"
                />
              </div>
              <div>
                <label className="uppercase-label text-neutral-muted block mb-1.5">
                  Vencimiento del Plan
                </label>
                <input
                  type="date"
                  value={planExpiresAt}
                  onChange={(e) => setPlanExpiresAt(e.target.value)}
                  className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none font-mono"
                />
                <p className="text-xs text-neutral-muted mt-1">
                  Dejá vacío si no tiene vencimiento.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-surface-high border border-border text-neutral rounded hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
