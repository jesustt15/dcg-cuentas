use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct Account {
  pub id: String,
  pub name: String,
  pub balance: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Transaction {
  pub id: String,
  pub r#type: String,
  pub amount: f64,
  pub description: Option<String>,
  pub date: String,
  pub account_id: String,
  pub account_name: Option<String>,
}

fn get_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let dir = app
    .path()
    .data_dir()
    .map_err(|e| e.to_string())?
    .join("dcg-cuentas");
  std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  Ok(dir.join("cuentas.db"))
}

fn connect(app: &tauri::AppHandle) -> Result<Connection, String> {
  Connection::open(get_db_path(app)?).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn init_db(_app: tauri::AppHandle) {
  // Lazy init — schema created on first query
}

#[tauri::command]
pub fn get_accounts(app: tauri::AppHandle) -> Result<Vec<Account>, String> {
  let conn = connect(&app)?;
  conn.execute_batch(
    "CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, 
      balance REAL NOT NULL DEFAULT 0, 
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
  ).map_err(|e| e.to_string())?;

  let mut stmt = conn.prepare("SELECT id, name, balance FROM accounts ORDER BY name")
    .map_err(|e| e.to_string())?;
  let accounts = stmt.query_map([], |row| {
    Ok(Account {
      id: row.get(0)?,
      name: row.get(1)?,
      balance: row.get(2)?,
    })
  }).map_err(|e| e.to_string())?;
  Ok(accounts.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn get_transactions(app: tauri::AppHandle) -> Result<Vec<Transaction>, String> {
  let conn = connect(&app)?;
  conn.execute_batch(
    "CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL, description TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP, account_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )",
  ).map_err(|e| e.to_string())?;

  let mut stmt = conn.prepare(
    "SELECT t.id, t.type, t.amount, t.description, t.date, t.account_id, a.name as account_name
     FROM transactions t JOIN accounts a ON t.account_id = a.id
     ORDER BY t.date DESC"
  ).map_err(|e| e.to_string())?;
  let txs = stmt.query_map([], |row| {
    Ok(Transaction {
      id: row.get(0)?,
      r#type: row.get(1)?,
      amount: row.get(2)?,
      description: row.get(3)?,
      date: row.get(4)?,
      account_id: row.get(5)?,
      account_name: row.get(6)?,
    })
  }).map_err(|e| e.to_string())?;
  Ok(txs.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn add_transaction(
  app: tauri::AppHandle,
  r#type: String,
  amount: f64,
  description: Option<String>,
  date: Option<String>,
  account_id: String,
) -> Result<(), String> {
  if r#type != "income" && r#type != "expense" {
    return Err(format!("Invalid transaction type: {type}"));
  }
  let mut conn = connect(&app)?;
  let id = uuid::Uuid::new_v4().to_string();
  let tx_date = date
    .filter(|d| !d.is_empty())
    .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

  let tx = conn.transaction().map_err(|e| e.to_string())?;
  tx.execute(
    "INSERT INTO transactions (id, type, amount, description, date, account_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    params![&id, &r#type, &amount, description.as_deref(), &tx_date, &account_id],
  ).map_err(|e| e.to_string())?;
  if r#type == "income" {
    tx.execute(
      "UPDATE accounts SET balance = balance + ?1 WHERE id = ?2",
      params![amount, &account_id],
    ).map_err(|e| e.to_string())?;
  } else {
    tx.execute(
      "UPDATE accounts SET balance = balance - ?1 WHERE id = ?2",
      params![amount, &account_id],
    ).map_err(|e| e.to_string())?;
  }
  tx.commit().map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn delete_transaction(app: tauri::AppHandle, id: String) -> Result<(), String> {
  let mut conn = connect(&app)?;
  let tx = conn.transaction().map_err(|e| e.to_string())?;

  let row = tx
    .query_row(
      "SELECT type, amount, account_id FROM transactions WHERE id = ?1",
      [&id],
      |row| Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?, row.get::<_, String>(2)?)),
    )
    .optional()
    .map_err(|e| e.to_string())?;

  if let Some((tx_type, amount, account_id)) = row {
    tx.execute("DELETE FROM transactions WHERE id = ?1", [&id])
      .map_err(|e| e.to_string())?;
    if tx_type == "income" {
      tx.execute(
        "UPDATE accounts SET balance = balance - ?1 WHERE id = ?2",
        params![amount, account_id],
      ).map_err(|e| e.to_string())?;
    } else {
      tx.execute(
        "UPDATE accounts SET balance = balance + ?1 WHERE id = ?2",
        params![amount, account_id],
      ).map_err(|e| e.to_string())?;
    }
  }

  tx.commit().map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn create_account(
  app: tauri::AppHandle,
  name: String,
  initial_balance: f64,
) -> Result<(), String> {
  let conn = connect(&app)?;
  let id = uuid::Uuid::new_v4().to_string();
  conn.execute(
    "INSERT INTO accounts (id, name, balance) VALUES (?1, ?2, ?3)",
    params![&id, &name, &initial_balance],
  ).map_err(|e| e.to_string())?;
  Ok(())
}
