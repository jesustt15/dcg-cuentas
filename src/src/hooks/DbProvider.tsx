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
  pendingReminders: [],
  weekSalesTotal: 0,
  monthSalesTotal: 0,
  yearSalesTotal: 0,
  salesChart: [],
  cxcAging: { current: 0, days_31_60: 0, days_61_90: 0, over_90: 0 },
  debtors: [],
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
      const [plans, athletes, products, sales, dashboard, usdVes, pendingReminders, weekSalesTotal, monthSalesTotal, yearSalesTotal, salesChart, cxcAging, debtors] = await Promise.all([
        db.getPlans(),
        db.getAthletes(),
        db.getProducts(),
        db.getSales(),
        db.getDashboard(),
        db.getUsdVes(),
        db.getPendingReminders(),
        db.getSalesPeriod("week"),
        db.getSalesPeriod("month"),
        db.getSalesPeriod("year"),
        db.getSalesChartData(),
        db.getCXCAging(),
        db.getDebtorsDetailed(),
      ]);
      setState({ plans, athletes, products, sales, dashboard, usdVes, pendingReminders, weekSalesTotal, monthSalesTotal, yearSalesTotal, salesChart, cxcAging, debtors, loading: false, error: null });
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
    // Auto-fetch BCV rate if > 24h since last fetch (silent, non-blocking)
    db.maybeAutoFetchBcv()
      .then((rate) => {
        if (rate !== null) {
          console.log(`BCV rate auto-updated: ${rate}`);
          // Refresh to pick up the new rate
          loadData();
        }
      })
      .catch((e) => console.warn("BCV auto-fetch failed:", e));
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
