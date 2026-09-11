import { useParams, Link } from "react-router-dom";
import { ArrowUpCircle, ArrowDownCircle, Plus } from "lucide-react";
import { useDb } from "@/hooks/DbProvider";
import type { Transaction } from "../types";

function signedAmount(tx: Transaction): number {
  return tx.type === "income" ? Math.abs(tx.amount) : -Math.abs(tx.amount);
}

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>()!;
  const { state } = useDb();
  const account = state.accounts.find((a) => a.id === id);

  if (!account) {
    return <div className="text-center py-12">Cuenta no encontrada</div>;
  }

  const transactions = state.transactions
    .filter((tx) => tx.accountId === id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const net = transactions.reduce((sum, tx) => sum + signedAmount(tx), 0);
  const initialBalance = account.balance - net;

  const runningByTx = new Map<string, number>();
  let running = initialBalance;
  [...transactions]
    .reverse()
    .forEach((tx) => {
      running += signedAmount(tx);
      runningByTx.set(tx.id, running);
    });

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm text-blue-600 hover:text-blue-800">&larr; Volver al dashboard</Link>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{account.name}</h2>
          <p className={`text-xl font-semibold ${account.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
            ${account.balance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <Link to="/transactions/new" className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Nueva transacción
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Sin movimientos</div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${tx.type === "income" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                  {tx.type === "income" ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{tx.description || "Sin descripción"}</p>
                  <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString("es-AR")}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`font-semibold ${tx.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                  {tx.type === "income" ? "+" : "-"}${Math.abs(tx.amount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
                <p className="text-xs text-gray-400 mt-1">Saldo: ${runningByTx.get(tx.id)!.toFixed(2)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}