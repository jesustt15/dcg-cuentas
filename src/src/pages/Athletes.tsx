import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDb } from "@/hooks/DbProvider";
import { db, usd } from "@/lib/db";
import { Plus, Search, Phone, UserX, UserCheck } from "lucide-react";

export default function Athletes() {
  const { state, refresh } = useDb();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filtered = state.athletes.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()),
  );

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
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo Atleta
        </button>
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

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-muted" />
        <input
          type="text"
          placeholder="Buscar atleta por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#0F0F12] border border-divider text-neutral rounded pl-10 pr-4 py-2 focus:border-gold focus:outline-none placeholder:text-neutral-muted"
        />
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
                    <span className="uppercase-label px-2 py-1 rounded bg-surface-high text-gold">
                      {planName(a.plan)}
                    </span>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await db.createAthlete(name.trim(), phone.trim(), plan, parseFloat(creditLimit) || 150);
      onCreated();
    } catch (err) {
      alert(String(err));
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
