import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { DatabaseState } from "../types";
import { db } from "../lib/db";

const initialState: DatabaseState = {
  plans: [],
  athletes: [],
  products: [],
  sales: [],
  dashboard: null,
  usdVes: 36.5,
  loading: true,
  error: null,
};

const DbContext = createContext<{
  state: DatabaseState;
  dispatch: () => void;
  refresh: () => void;
}>({ state: initialState, dispatch: () => {}, refresh: () => {} });

export function DbProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DatabaseState>(initialState);

  const loadData = useCallback(async () => {
    try {
      await db.init();
      const [plans, athletes, products, sales, dashboard, usdVes] = await Promise.all([
        db.getPlans(),
        db.getAthletes(),
        db.getProducts(),
        db.getSales(),
        db.getDashboard(),
        db.getUsdVes(),
      ]);
      setState({ plans, athletes, products, sales, dashboard, usdVes, loading: false, error: null });
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      }));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <DbContext.Provider value={{ state, dispatch: loadData, refresh: loadData }}>
      {children}
    </DbContext.Provider>
  );
}

export function useDb() {
  return useContext(DbContext);
}
