import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpCircle, ArrowDownCircle, Trash2 } from "lucide-react";
import { useDb } from "@/hooks/DbProvider";
import { db } from "@/lib/db";

export default function Transactions() {
  const { state, dispatch } = useDb();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = state.transactions.filter((tx) => {
    if (filter !== "all" && tx.type !== filter) return false;
    if (search && !tx.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    try {
      await db.deleteTransaction(id);
      dispatch({ type: "DELETE_TRANSACTION", payload: id });
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transacciones</h2>
          <p className="text-gray-500 mt-1">{state.transactions.length} transacciones</p>
        </div>
        <Link
          to="/transactions/new"
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Nueva transacción
        </Link>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todas</option>
          <option value="income">Ingresos</option>
          <option value="expense">Gastos</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">No se encontraron transacciones</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {filtered.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-4 flex-1">
                <div className={`p-2 rounded-full ${tx.type === "income" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                  {tx.type === "income" ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{tx.description || tx.accountName}</p>
                  <p className="text-sm text-gray-500">
                    {tx.accountName} · {new Date(tx.date).toLocaleDateString("es-AR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`font-semibold min-w-[100px] text-right ${tx.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                  {tx.type === "income" ? "+" : "-"}${Math.abs(tx.amount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
                <button
                  onClick={() => handleDelete(tx.id)}
                  className="p-2 text-gray-400 hover:text-red-600"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}