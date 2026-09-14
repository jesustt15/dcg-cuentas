import { Routes, Route, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, ShoppingCart, Package, Pencil, Check } from "lucide-react";
import { useState } from "react";
import Dashboard from "@/pages/Dashboard";
import Athletes from "@/pages/Athletes";
import AthleteDetail from "@/pages/AthleteDetail";
import POS from "@/pages/POS";
import Products from "@/pages/Products";
import { useDb } from "@/hooks/DbProvider";
import { db } from "@/lib/db";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Atletas", path: "/athletes", icon: Users },
  { label: "POS", path: "/pos", icon: ShoppingCart },
  { label: "Productos", path: "/products", icon: Package },
];

export default function App() {
  const location = useLocation();
  const { state, refresh } = useDb();
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(state.usdVes));

  const saveRate = async () => {
    const val = parseFloat(rateInput);
    if (!val || val <= 0) return;
    await db.setUsdVes(val);
    setEditingRate(false);
    refresh();
  };

  return (
    <div className="flex min-h-screen">
      {/* SIDEBAR */}
      <aside className="w-64 bg-obsidian-dim border-r border-divider flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-white p-1 flex items-center justify-center shadow-md shadow-black/40 border border-gold/40 shrink-0">
            <img src="/logo.png" alt="DCG BOX" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-heading tracking-tight text-gold leading-none">
              DCG BOX
            </h1>
            <p className="uppercase-label text-neutral-muted mt-1">
              Centro Operativo
            </p>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded ${
                  isActive
                    ? "bg-gold/10 text-gold"
                    : "text-neutral-subtle hover:bg-obsidian-base hover:text-neutral"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium uppercase-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-divider space-y-3">
          {/* Rate Chip */}
          <div className="flex items-center justify-between bg-surface-high rounded px-3 py-2">
            <span className="uppercase-label text-neutral-muted">TASA Bs/USD</span>
            {editingRate ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveRate()}
                  className="w-20 bg-obsidian-dim border border-gold text-gold rounded px-2 py-0.5 text-right font-mono text-sm focus:outline-none"
                  min="0.01"
                  step="0.01"
                  autoFocus
                />
                <button
                  onClick={saveRate}
                  className="p-0.5 text-gold hover:text-gold-light"
                  title="Guardar"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm text-gold font-bold">{state.usdVes.toFixed(2)}</span>
                <button
                  onClick={() => { setRateInput(String(state.usdVes)); setEditingRate(true); }}
                  className="p-0.5 text-neutral-muted hover:text-gold transition-colors"
                  title="Editar tasa"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <p className="uppercase-label text-neutral-muted">DCG BOX — Centro Operativo</p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-5 overflow-auto">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="/athletes" element={<Athletes />} />
          <Route path="/athletes/:id" element={<AthleteDetail />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/products" element={<Products />} />
        </Routes>
      </main>
    </div>
  );
}
