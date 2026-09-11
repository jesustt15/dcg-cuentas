import { Link } from "react-router-dom";
import { Plus, ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react";
import { useDb } from "@/hooks/DbProvider";

export default function Dashboard() {
  const { state } = useDb();

  const totalIn = state.transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalOut = state.transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const balance = state.accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Resumen de tus cuentas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Ingresos"
          amount={totalIn}
          icon={<ArrowUpCircle className="w-5 h-5" />}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          label="Gastos"
          amount={totalOut}
          icon={<ArrowDownCircle className="w-5 h-5" />}
          color="text-red-600"
          bg="bg-red-50"
        />
        <StatCard
          label="Balance"
          amount={balance}
          icon={<Wallet className="w-5 h-5" />}
          color={balance >= 0 ? "text-blue-600" : "text-red-600"}
          bg={balance >= 0 ? "bg-blue-50" : "bg-red-50"}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cuentas</h3>
          <Link
            to="/accounts/new"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nueva cuenta
          </Link>
        </div>
        {state.accounts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500">No hay cuentas configuradas</p>
            <p className="text-sm text-gray-400 mt-1">
              Hacé clic en &quot;Nueva cuenta&quot; para empezar
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.accounts.map((acc) => (
              <Link
                key={acc.id}
                to={`/accounts/${acc.id}`}
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <p className="font-medium text-gray-900">{acc.name}</p>
                <p className={`text-lg font-semibold mt-1 ${acc.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  ${acc.balance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Últimas transacciones</h3>
          <Link
            to="/transactions/new"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nueva
          </Link>
        </div>
        {state.transactions.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500">Sin transacciones aún</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {state.transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${tx.type === "income" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                    {tx.type === "income" ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description || tx.accountName}</p>
                    <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString("es-AR")}</p>
                  </div>
                </div>
                <span className={`font-semibold ${tx.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                  {tx.type === "income" ? "+" : "-"}${Math.abs(tx.amount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  amount: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

function StatCard({ label, amount, icon, color, bg }: StatCardProps) {
  return (
    <div className="bg-white p-6 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`p-2 rounded-full ${bg} ${color}`}>{icon}</div>
      </div>
      <p className={`text-2xl font-bold ${color}`}>
        ${amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}