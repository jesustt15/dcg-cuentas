export interface Account {
  id: string;
  name: string;
  balance: number;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description?: string;
  date: string;
  accountId: string;
  accountName?: string;
}

export interface DatabaseState {
  accounts: Account[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
}
