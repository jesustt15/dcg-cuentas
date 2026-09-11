import { invoke } from "@tauri-apps/api/core";
import type { Account, Transaction } from "../types";

export const db = {
  async init(): Promise<void> {
    await invoke("init_db");
  },

  async getAllAccounts(): Promise<Account[]> {
    return invoke<any[]>("get_accounts").then((rows) => rows.map(rowToAccount));
  },

  async getTransactions(): Promise<Transaction[]> {
    return invoke<any[]>("get_transactions").then((rows) => rows.map(rowToTransaction));
  },

  async addTransaction(data: Omit<Transaction, "id" | "date" | "accountName">): Promise<void> {
    await invoke("add_transaction", { 
      type: data.type, 
      amount: data.amount, 
      description: data.description,
      date: new Date().toISOString(),
      accountId: data.accountId,
    });
  },

  async deleteTransaction(id: string): Promise<void> {
    await invoke("delete_transaction", { id });
  },

  async createAccount(name: string, initialBalance?: number): Promise<void> {
    await invoke("create_account", { name, initialBalance: initialBalance || 0 });
  },
};

function rowToAccount(row: any): Account {
  return { id: row.id, name: row.name, balance: parseFloat(row.balance) || 0 };
}

function rowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: parseFloat(row.amount),
    description: row.description || undefined,
    date: row.date,
    accountId: row.account_id,
    accountName: row.account_name,
  };
}
