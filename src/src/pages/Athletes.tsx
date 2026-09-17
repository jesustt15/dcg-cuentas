import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDb } from "@/hooks/DbProvider";
import { db, usd } from "@/lib/db";
import { toast } from "sonner";
import { Plus, Search, Phone, UserX, UserCheck, Trash2, Pencil, AlertTriangle, Upload } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import EditAthleteModal from "@/components/EditAthleteModal";
import ImportAthletesModal from "@/components/ImportAthletesModal";
import type { Athlete } from "@/types";

export default function Athletes() {
  const { state, refresh } = useDb();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [onlyDebtors, setOnlyDebtors] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; athlete: Athlete | null }>({
    isOpen: false,
    athlete: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const handleDelete = async () => {
    if (!deleteConfirm.athlete) return;
    setDeleting(true);
    try {
      await db.deleteAthlete(deleteConfirm.athlete.id);
      setDeleteConfirm({ isOpen: false, athlete: null });
      refresh();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setDeleting(false);
    }
  };

  const debtorCount = useMemo(
    () => state.athletes.filter((a) => a.balance > 0).length,
    [state.athletes],
  );

  const filtered = state.athletes.filter((a) => {
    const matchesName = a.name.toLowerCase().includes(search.toLowerCase());
    const matchesDebt = !onlyDebtors || a.balance > 0;
    return matchesName && matchesDebt;
  });

  const planName = (code: string) => state.plans.find((p) => p.code === code)?.name || code;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-heading tracking-tight text-neutral">
            Atletas
          </h2>
          <p className="text-sm text-neutral-muted mt-1">
            Gestión de socios y membresías
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-surface-high border border-divider text-neutral rounded hover:border-gold hover:text-gold transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar Excel
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Atleta
          </button>
        </div>
      </div>

      {/* CREATE FORM */}
      {showForm && (
        <CreateForm
          plans={state.plans}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}

      {/* SEARCH + FILTERS */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-muted" />
          <input
            type="text"
            placeholder="Buscar atleta por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded pl-10 pr-4 py-2 focus:border-gold focus:outline-none placeholder:text-neutral-muted"
          />
        </div>
        <button
          onClick={() => setOnlyDebtors(!onlyDebtors)}
          title="Mostrar solo atletas con deuda"
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border transition-colors shrink-0 ${
            onlyDebtors
              ? "bg-gold/15 border-gold text-gold"
              : "bg-surface-high border-divider text-neutral-muted hover:border-gold hover:text-gold"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Deudores
          {debtorCount > 0 && (
            <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
              onlyDebtors ? "bg-gold/30 text-gold" : "bg-surface-low text-neutral-muted"
            }`}>
              {debtorCount}
            </span>
          )}
        </button>
      </div>

      {/* TABLE */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-divider rounded bg-surface-low">
          <p className="text-neutral-muted text-sm">No se encontraron atletas</p>
        </div>
      ) : (
        <div className="bg-[#121215] border border-divider rounded overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-divider">
                <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Nombre</th>
                <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Teléfono</th>
                <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Plan</th>
                <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Estado</th>
                <th className="text-right px-5 py-3 uppercase-label text-neutral-muted">Saldo</th>
                <th className="text-right px-5 py-3 uppercase-label text-neutral-muted">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-divider last:border-0 hover:bg-surface-low/50 cursor-pointer"
                  onClick={() => navigate(`/athletes/${a.id}`)}
                >
                  <td className="px-5 py-3 text-sm text-neutral font-medium">{a.name}</td>
                  <td className="px-5 py-3 text-sm text-neutral-muted">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />
                      {a.phone || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="uppercase-label px-2 py-1 rounded bg-surface-high text-gold">
                        {planName(a.plan)}
                      </span>
                      <PlanStatusBadge planExpiresAt={a.plan_expires_at} />
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`uppercase-label px-2 py-1 rounded ${
                        a.status === "activo"
                          ? "bg-status-success/15 text-status-success"
                          : "bg-surface-high text-neutral-muted"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-sm">
                    <span className={a.balance > 0 ? "text-status-error" : "text-status-success"}>
                      {usd(a.balance)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newStatus = a.status === "activo" ? "suspendido" : "activo";
                          db.updateAthleteStatus(a.id, newStatus).then(() => refresh());
                        }}
                        className="p-1.5 rounded hover:bg-surface-high text-neutral-muted hover:text-neutral transition-colors"
                        title={a.status === "activo" ? "Suspender" : "Activar"}
                      >
                        {a.status === "activo" ? (
                          <UserX className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAthlete(a);
                        }}
                        className="text-neutral-muted hover:text-gold transition-colors p-1 rounded hover:bg-gold/10"
                        title="Editar atleta"
                        aria-label={`Editar ${a.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ isOpen: true, athlete: a });
                        }}
                        className="text-neutral-muted hover:text-status-error transition-colors p-1 rounded hover:bg-status-error/10"
                        title="Eliminar atleta"
                        aria-label={`Eliminar ${a.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, athlete: null })}
        onConfirm={handleDelete}
        title="Eliminar atleta"
        message={
          deleteConfirm.athlete
            ? `¿Estás seguro de que quieres eliminar "${deleteConfirm.athlete.name}"? Se eliminarán también todas sus ventas y pagos registrados. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleting}
      />

      {/* EDIT ATHLETE MODAL */}
      <EditAthleteModal
        isOpen={editingAthlete !== null}
        onClose={() => setEditingAthlete(null)}
        athlete={editingAthlete}
        plans={state.plans}
        onSave={refresh}
      />

      {/* IMPORT ATHLETES MODAL */}
      <ImportAthletesModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={refresh}
      />
    </div>
  );
}

function CreateForm({
  plans,
  onClose,
  onCreated,
}: {
  plans: { code: string; name: string; price: number }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState(plans[0]?.code || "");
  const [creditLimit, setCreditLimit] = useState("150");
  const [planExpiresAt, setPlanExpiresAt] = useState(getDefaultExpiryDate());
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await db.createAthlete(
        name.trim(),
        phone.trim(),
        plan,
        parseFloat(creditLimit) || 150,
        planExpiresAt || null,
      );
      toast.success("Atleta creado");
      onCreated();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#121215] border border-divider rounded p-5 space-y-4"
    >
      <h3 className="text-sm font-bold font-heading text-neutral uppercase-label">
        Nuevo Atleta
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="uppercase-label text-neutral-muted block mb-1.5">Nombre</label>
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
          <label className="uppercase-label text-neutral-muted block mb-1.5">Teléfono</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none placeholder:text-neutral-muted"
            placeholder="0414-1234567"
          />
        </div>
        <div>
          <label className="uppercase-label text-neutral-muted block mb-1.5">Plan</label>
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
            step="10"
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none font-mono"
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
            Se calcula automáticamente 1 mes desde hoy. Podés cambiarlo.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Crear Atleta"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-surface-high border border-border text-neutral rounded hover:border-gold hover:text-gold transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function getDefaultExpiryDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

function PlanStatusBadge({ planExpiresAt }: { planExpiresAt: string | null }) {
  if (!planExpiresAt) {
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface-high text-neutral-muted" title="Sin fecha de vencimiento">
        —
      </span>
    );
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expires = new Date(planExpiresAt + "T00:00:00");
  const diffDays = Math.round((expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-status-error/15 text-status-error" title={`Vencido hace ${Math.abs(diffDays)} día(s)`}>
        Vencido
      </span>
    );
  }
  if (diffDays === 0) {
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gold/15 text-gold" title="Vence hoy">
        Hoy
      </span>
    );
  }
  if (diffDays <= 3) {
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-status-success/15 text-status-success" title={`Vence en ${diffDays} día(s)`}>
        {diffDays}d
      </span>
    );
  }
  return (
    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-status-success/10 text-status-success" title={`Vence en ${diffDays} día(s)`}>
      {diffDays}d
    </span>
  );
}
