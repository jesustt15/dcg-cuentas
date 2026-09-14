import { useState } from "react";
import { useDb } from "@/hooks/DbProvider";
import { db, usd } from "@/lib/db";
import { Plus } from "lucide-react";

export default function Products() {
  const { state, refresh } = useDb();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-heading tracking-tight text-neutral">
            Productos
          </h2>
          <p className="text-sm text-neutral-muted mt-1">
            Inventario de la tienda del box
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo Producto
        </button>
      </div>

      {/* CREATE FORM */}
      {showForm && (
        <CreateForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}

      {/* TABLE */}
      {state.products.length === 0 ? (
        <div className="text-center py-16 border border-divider rounded bg-surface-low">
          <p className="text-neutral-muted text-sm">No hay productos registrados</p>
        </div>
      ) : (
        <div className="bg-[#121215] border border-divider rounded overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-divider">
                <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Nombre</th>
                <th className="text-left px-5 py-3 uppercase-label text-neutral-muted">Categoría</th>
                <th className="text-right px-5 py-3 uppercase-label text-neutral-muted">Precio</th>
                <th className="text-right px-5 py-3 uppercase-label text-neutral-muted">Costo</th>
                <th className="text-right px-5 py-3 uppercase-label text-neutral-muted">Stock</th>
                <th className="text-right px-5 py-3 uppercase-label text-neutral-muted">Mín.</th>
              </tr>
            </thead>
            <tbody>
              {state.products.map((p) => {
                const lowStock = p.stock <= p.min_stock;
                return (
                  <tr key={p.id} className="border-b border-divider last:border-0">
                    <td className="px-5 py-3 text-sm text-neutral font-medium">{p.name}</td>
                    <td className="px-5 py-3">
                      <span className="uppercase-label px-2 py-1 rounded bg-surface-high text-neutral-subtle">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-neutral">
                      {usd(p.price)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-neutral-muted">
                      {usd(p.cost)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={`font-mono text-sm ${
                            lowStock ? "text-status-error" : "text-neutral"
                          }`}
                        >
                          {p.stock}
                        </span>
                        {lowStock && (
                          <span className="uppercase-label px-1.5 py-0.5 rounded bg-status-error/15 text-status-error">
                            REORDEN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-neutral-muted">
                      {p.min_stock}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreateForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("implementos");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("5");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await db.createProduct(
        name.trim(),
        category,
        parseFloat(price) || 0,
        parseFloat(cost) || 0,
        parseInt(stock) || 0,
        parseInt(minStock) || 5,
      );
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
        Nuevo Producto
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="uppercase-label text-neutral-muted block mb-1.5">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none placeholder:text-neutral-muted"
            placeholder="Nombre del producto"
          />
        </div>
        <div>
          <label className="uppercase-label text-neutral-muted block mb-1.5">Categoría</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none"
          >
            <option value="ropa">Ropa</option>
            <option value="suplementos">Suplementos</option>
            <option value="implementos">Implementos</option>
            <option value="bebidas">Bebidas</option>
          </select>
        </div>
        <div>
          <label className="uppercase-label text-neutral-muted block mb-1.5">Precio PVP ($)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            min="0"
            step="0.01"
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none font-mono placeholder:text-neutral-muted"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="uppercase-label text-neutral-muted block mb-1.5">Costo ($)</label>
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            min="0"
            step="0.01"
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none font-mono placeholder:text-neutral-muted"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="uppercase-label text-neutral-muted block mb-1.5">Stock Inicial</label>
          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            min="0"
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none font-mono placeholder:text-neutral-muted"
            placeholder="0"
          />
        </div>
        <div>
          <label className="uppercase-label text-neutral-muted block mb-1.5">Stock Mínimo</label>
          <input
            type="number"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            min="0"
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none font-mono placeholder:text-neutral-muted"
            placeholder="5"
          />
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Crear Producto"}
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
