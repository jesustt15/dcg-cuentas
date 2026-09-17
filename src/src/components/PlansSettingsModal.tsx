import { useState, useEffect, useRef, useCallback } from "react";
import { X, Pencil, Trash2, Plus, CreditCard } from "lucide-react";
import { db, usd } from "@/lib/db";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Plan } from "@/types";

interface PlansSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlansChange: () => void;
}

interface PlanForm {
  code: string;
  name: string;
  price: string;
}

const EMPTY_FORM: PlanForm = { code: "", name: "", price: "" };

export default function PlansSettingsModal({
  isOpen,
  onClose,
  onPlansChange,
}: PlansSettingsModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PlanForm>(EMPTY_FORM);
  const [newForm, setNewForm] = useState<PlanForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Fetch plans when modal opens
  useEffect(() => {
    if (isOpen) {
      db.getPlans().then(setPlans).catch(() => {});
    } else {
      setEditingCode(null);
      setEditForm(EMPTY_FORM);
      setNewForm(EMPTY_FORM);
      setPlanToDelete(null);
    }
  }, [isOpen]);

  // Escape key closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting && !deleting) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, submitting, deleting]);

  // Body scroll lock
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
      if (e.target === e.currentTarget && !submitting && !deleting) {
        onClose();
      }
    },
    [onClose, submitting, deleting],
  );

  const refetch = async () => {
    const updated = await db.getPlans();
    setPlans(updated);
  };

  // ─── Create ──────────────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newForm.code.trim().toUpperCase();
    const name = newForm.name.trim();
    const price = parseFloat(newForm.price);

    if (!code) {
      toast.error("El código es requerido");
      return;
    }
    if (!name) {
      toast.error("El nombre es requerido");
      return;
    }
    if (!price || price <= 0) {
      toast.error("El precio debe ser mayor a 0");
      return;
    }

    setSubmitting(true);
    try {
      await db.savePlan(code, name, price);
      toast.success("Plan creado");
      setNewForm(EMPTY_FORM);
      await refetch();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Edit ────────────────────────────────────────────────────────────────

  const startEdit = (plan: Plan) => {
    setEditingCode(plan.code);
    setEditForm({ code: plan.code, name: plan.name, price: String(plan.price) });
  };

  const cancelEdit = () => {
    setEditingCode(null);
    setEditForm(EMPTY_FORM);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCode) return;
    const name = editForm.name.trim();
    const price = parseFloat(editForm.price);

    if (!name) {
      toast.error("El nombre es requerido");
      return;
    }
    if (!price || price <= 0) {
      toast.error("El precio debe ser mayor a 0");
      return;
    }

    setSubmitting(true);
    try {
      await db.updatePlan(editingCode, name, price);
      toast.success("Plan actualizado");
      cancelEdit();
      await refetch();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!planToDelete) return;
    setDeleting(true);
    try {
      await db.deletePlan(planToDelete.code);
      toast.success("Plan eliminado");
      setPlanToDelete(null);
      await refetch();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    onPlansChange();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plans-modal-title"
      >
        <div
          ref={dialogRef}
          className="relative w-full max-w-2xl mx-4 bg-surface-low border border-divider rounded-lg shadow-2xl animate-in zoom-in-95 fade-in duration-200 max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-divider shrink-0">
            <CreditCard className="w-5 h-5 text-gold" />
            <h2 id="plans-modal-title" className="text-lg font-bold font-heading text-gold tracking-tight">
              Gestionar Planes
            </h2>
            <button
              onClick={handleClose}
              disabled={submitting || deleting}
              className="ml-auto p-2 rounded-lg hover:bg-surface-high text-neutral-muted hover:text-neutral transition-colors disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Plan list */}
            <div className="space-y-2">
              <h3 className="uppercase-label text-neutral-muted text-xs font-bold mb-3">
                Planes ({plans.length})
              </h3>
              {plans.length === 0 && (
                <p className="text-neutral-muted italic text-sm text-center py-4">
                  No hay planes registrados
                </p>
              )}
              {plans.map((plan) => (
                <div
                  key={plan.code}
                  className="flex items-center gap-3 bg-[#121215] border border-divider rounded-lg px-4 py-3"
                >
                  {editingCode === plan.code ? (
                    <form onSubmit={handleUpdate} className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={plan.code}
                        disabled
                        className="w-24 bg-surface-high border border-divider rounded px-2 py-1 text-xs font-mono text-neutral-muted uppercase"
                      />
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Nombre"
                        className="flex-1 bg-obsidian-dim border border-gold/40 rounded px-2 py-1 text-sm text-neutral focus:outline-none focus:border-gold"
                        autoFocus
                      />
                      <input
                        type="number"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        placeholder="Precio"
                        min="0.01"
                        step="0.01"
                        className="w-24 bg-obsidian-dim border border-gold/40 rounded px-2 py-1 text-sm text-gold font-mono text-right focus:outline-none focus:border-gold"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-3 py-1 text-xs font-bold uppercase bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors disabled:opacity-50"
                      >
                        {submitting ? "..." : "Guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={submitting}
                        className="px-3 py-1 text-xs font-bold uppercase bg-surface-high border border-divider text-neutral rounded hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="font-mono text-xs text-neutral-muted bg-surface-high px-2 py-0.5 rounded">
                        {plan.code}
                      </span>
                      <span className="flex-1 text-sm text-neutral font-medium">
                        {plan.name}
                      </span>
                      <span className="font-mono text-sm text-gold font-bold">
                        {usd(plan.price)}
                      </span>
                      <button
                        onClick={() => startEdit(plan)}
                        className="p-1.5 rounded text-neutral-muted hover:text-gold hover:bg-surface-high transition-colors"
                        title="Editar plan"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPlanToDelete(plan)}
                        className="p-1.5 rounded text-neutral-muted hover:text-status-error hover:bg-surface-high transition-colors"
                        title="Eliminar plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* New Plan Form */}
            <div className="border-t border-divider pt-4">
              <h3 className="uppercase-label text-neutral-muted text-xs font-bold mb-3 flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" />
                Nuevo Plan
              </h3>
              <form onSubmit={handleCreate} className="flex items-end gap-3">
                <div className="flex-1 min-w-0">
                  <label className="block uppercase-label text-neutral-muted text-[10px] mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    value={newForm.code}
                    onChange={(e) =>
                      setNewForm({ ...newForm, code: e.target.value.toUpperCase() })
                    }
                    placeholder="Ej: 7DIAS"
                    className="w-full bg-obsidian-dim border border-divider rounded px-3 py-2 text-sm font-mono text-neutral placeholder:text-neutral-muted/40 focus:outline-none focus:border-gold uppercase"
                  />
                </div>
                <div className="flex-[2] min-w-0">
                  <label className="block uppercase-label text-neutral-muted text-[10px] mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={newForm.name}
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    placeholder="Nombre del plan"
                    className="w-full bg-obsidian-dim border border-divider rounded px-3 py-2 text-sm text-neutral placeholder:text-neutral-muted/40 focus:outline-none focus:border-gold"
                  />
                </div>
                <div className="w-28">
                  <label className="block uppercase-label text-neutral-muted text-[10px] mb-1">
                    Precio ($)
                  </label>
                  <input
                    type="number"
                    value={newForm.price}
                    onChange={(e) => setNewForm({ ...newForm, price: e.target.value })}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    className="w-full bg-obsidian-dim border border-divider rounded px-3 py-2 text-sm text-gold font-mono text-right placeholder:text-neutral-muted/40 focus:outline-none focus:border-gold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold uppercase bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors disabled:opacity-50 shrink-0"
                >
                  {submitting ? "..." : "Crear"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={planToDelete !== null}
        onClose={() => setPlanToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Plan"
        message={
          planToDelete
            ? `¿Estás seguro de eliminar "${planToDelete.name}" (${planToDelete.code})? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleting}
      />
    </>
  );
}
