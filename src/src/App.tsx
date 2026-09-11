import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import TransactionForm from "@/pages/TransactionForm";
import AccountForm from "@/pages/AccountForm";
import AccountDetail from "@/pages/AccountDetail";

export default function App() {
  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold text-gray-900">
            DCG Cuentas
          </Link>
          <ul className="flex gap-6">
            <li>
              <Link
                to="/"
                className="text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Inicio
              </Link>
            </li>
            <li>
              <Link
                to="/transactions"
                className="text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Transacciones
              </Link>
            </li>
          </ul>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/new" element={<TransactionForm />} />
          <Route path="/accounts/new" element={<AccountForm />} />
          <Route path="/accounts/:id" element={<AccountDetail />} />
        </Routes>
      </main>
    </div>
  );
}