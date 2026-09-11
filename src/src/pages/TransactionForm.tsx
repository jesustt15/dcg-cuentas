import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useDb } from "@/hooks/DbProvider";
import { db } from "@/lib/db";

export default function TransactionForm() {
  const navigate = useNavigate();
  const { state, refresh } = useDb();
  const [form, setForm] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    description: "",
    accountId: state.accounts[0]?.id || "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.accountId) return;
    try {
      await db.addTransaction({
        type: form.type,
        amount: Math.abs(parseFloat(form.amount)),
        description: form.description,
        accountId: form.accountId,
      });
      await refresh();
      navigate("/");
    } catch (err) {
      console.error("Failed to add transaction:", err);
    }
  };

  if (state.accounts.length === 0) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-gray-500">Necesitás al menos una cuenta para registrar transacciones</p>
        <Link
          to="/accounts/new"
          className="inline-flex px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Crear cuenta
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Nueva transacción</h2>
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <fieldset className="flex gap-4 p-4 bg-gray-50 rounded-lg">
          {(["expense", "income"] as const).map((t) => (
            <label key={t} className="flex flex-col items-center gap-2 cursor-pointer flex-1">
              <input
                type="radio"
                name="type"
                value={t}
                checked={form.type === t}
                onChange={(e) => setForm({ ...form, type: e.target.value as "income" | "expense" })}
                className="sr-only"
              />
              <div className={`p-3 rounded-full ${form.type === t ? (t === "income" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600") : "bg-gray-200 text-gray-400"}`}>
                {t === "income" ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
              </div>
              <span className="text-sm font-medium">{t === "income" ? "Ingreso" : "Gasto"}</span>
            </label>
          ))}
        </fieldset>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta</label>
          <select
            required
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {state.accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Compra supermercado"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={() => navigate(-1)} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}