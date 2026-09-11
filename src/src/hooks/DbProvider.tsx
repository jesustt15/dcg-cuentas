import { createContext, useContext, useReducer, useEffect } from "react";
import type { DatabaseState } from "../types";
import { db } from "../lib/db";

const initialState: DatabaseState = {
  accounts: [],
  transactions: [],
  loading: true,
  error: null,
};

type Action =
  | { type: "SET_DATA"; payload: { accounts: import("../types").Account[]; transactions: import("../types").Transaction[] } }
  | { type: "ADD_TRANSACTION"; payload: import("../types").Transaction }
  | { type: "DELETE_TRANSACTION"; payload: string }
  | { type: "ERROR"; payload: string };

function reducer(state: DatabaseState, action: Action): DatabaseState {
  switch (action.type) {
    case "SET_DATA":
      return { ...state, loading: false, accounts: action.payload.accounts, transactions: action.payload.transactions };
    case "ADD_TRANSACTION":
      return { ...state, transactions: [action.payload, ...state.transactions] };
    case "DELETE_TRANSACTION":
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.payload) };
    case "ERROR":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

const DbContext = createContext<{
  state: DatabaseState;
  dispatch: React.Dispatch<Action>;
  refresh: () => void;
}>({ state: initialState, dispatch: () => {}, refresh: () => {} });

export function DbProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  
  const loadData = async () => {
    try {
      await db.init();
      const [accounts, transactions] = await Promise.all([
        db.getAllAccounts(),
        db.getTransactions(),
      ]);
      dispatch({ type: "SET_DATA", payload: { accounts, transactions } });
    } catch (e) {
      dispatch({ type: "ERROR", payload: e instanceof Error ? e.message : String(e) });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <DbContext.Provider value={{ state, dispatch, refresh: loadData }}>
      {children}
    </DbContext.Provider>
  );
}

export function useDb() {
  return useContext(DbContext);
}



