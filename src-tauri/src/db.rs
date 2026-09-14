use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

// ─── Domain Types ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Plan {
  pub code: String,
  pub name: String,
  pub price: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Athlete {
  pub id: String,
  pub name: String,
  pub phone: String,
  pub plan: String,
  pub status: String,
  pub balance: f64,
  pub credit_limit: f64,
  pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Product {
  pub id: String,
  pub name: String,
  pub category: String,
  pub price: f64,
  pub cost: f64,
  pub stock: i32,
  pub min_stock: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Sale {
  pub id: String,
  pub athlete_id: Option<String>,
  pub athlete_name: Option<String>,
  pub subtotal: f64,
  pub total: f64,
  pub payment_method: String,
  pub created_at: String,
  pub item_count: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaleItem {
  pub id: i32,
  pub sale_id: String,
  pub product_id: String,
  pub product_name: Option<String>,
  pub qty: i32,
  pub unit_price: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Payment {
  pub id: String,
  pub athlete_id: String,
  pub amount: f64,
  pub method: String,
  pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DashboardStats {
  pub today_sales_total: f64,
  pub today_sales_count: i32,
  pub active_athletes: i32,
  pub total_debt: f64,
  pub low_stock_count: i32,
  pub recent_sales: Vec<Sale>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct SaleItemInput {
  pub product_id: String,
  pub qty: i32,
  pub unit_price: f64,
}

// ─── DB Path & Connection ────────────────────────────────────────────────────

fn get_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let dir = app
    .path()
    .data_dir()
    .map_err(|e| e.to_string())?
    .join("dcg-cuentas");
  std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  Ok(dir.join("dcgbox.db"))
}

fn connect(app: &tauri::AppHandle) -> Result<Connection, String> {
  Connection::open(get_db_path(app)?).map_err(|e| e.to_string())
}

// ─── Schema & Seed ───────────────────────────────────────────────────────────

fn ensure_schema(conn: &Connection) -> Result<(), String> {
  conn
    .execute_batch(
      "
      CREATE TABLE IF NOT EXISTS plans (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS athletes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL DEFAULT '',
        plan TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'activo',
        balance REAL NOT NULL DEFAULT 0,
        credit_limit REAL NOT NULL DEFAULT 150,
        created_at TEXT NOT NULL,
        FOREIGN KEY (plan) REFERENCES plans(code)
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        cost REAL NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER NOT NULL DEFAULT 5
      );

      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        athlete_id TEXT,
        subtotal REAL NOT NULL,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (athlete_id) REFERENCES athletes(id)
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        qty INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        athlete_id TEXT NOT NULL,
        amount REAL NOT NULL,
        method TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (athlete_id) REFERENCES athletes(id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      ",
    )
    .map_err(|e| e.to_string())?;

  // Seed plans if empty
  let plan_count: i32 = conn
    .query_row("SELECT COUNT(*) FROM plans", [], |row| row.get(0))
    .map_err(|e| e.to_string())?;
  if plan_count == 0 {
    conn
      .execute(
        "INSERT INTO plans (code, name, price) VALUES
         ('FAMILIAR', 'Plan Familiar', 35),
         ('6DIAS', 'Plan 6 Días', 45),
         ('5DIAS', 'Plan 5 Días', 40),
         ('3DIAS', 'Plan 3 Días', 30),
         ('KIDS', 'Plan Kids', 25)",
        [],
      )
      .map_err(|e| e.to_string())?;
  }

  // Seed settings
  conn
    .execute(
      "INSERT OR IGNORE INTO settings (key, value) VALUES ('usd_ves', '36.50')",
      [],
    )
    .map_err(|e| e.to_string())?;

  // Seed products if empty
  let prod_count: i32 = conn
    .query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0))
    .map_err(|e| e.to_string())?;
  if prod_count == 0 {
    conn
      .execute(
        "INSERT INTO products (id, name, category, price, cost, stock, min_stock) VALUES
         ('p01', 'Calleras de Carbono', 'implementos', 45, 25, 20, 5),
         ('p02', 'Proteína Whey 2lb', 'suplementos', 65, 40, 15, 5),
         ('p03', 'Creatina 300g', 'suplementos', 27, 15, 25, 5),
         ('p04', 'Franela Oficial DCG', 'ropa', 28, 12, 30, 5),
         ('p05', 'Hoodie Titan Box', 'ropa', 55, 30, 10, 3),
         ('p06', 'Gorra Snapback', 'ropa', 20, 8, 20, 5),
         ('p07', 'Bebida NOCCO', 'bebidas', 3.50, 1.80, 50, 10),
         ('p08', 'Gatorade', 'bebidas', 2.50, 1.20, 60, 10),
         ('p09', 'Barrita Proteica', 'suplementos', 2.75, 1.30, 40, 10),
         ('p10', 'Tape Deportivo', 'implementos', 6, 2.50, 35, 8),
         ('p11', 'Bloque de Magnesio', 'implementos', 4, 1.50, 25, 5),
         ('p12', 'Rodilleras 7mm', 'implementos', 50, 28, 12, 3)",
        [],
      )
      .map_err(|e| e.to_string())?;
  }

  Ok(())
}

// ─── Tauri Commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn init_db(app: tauri::AppHandle) -> Result<(), String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)
}

#[tauri::command]
pub fn get_plans(app: tauri::AppHandle) -> Result<Vec<Plan>, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let mut stmt = conn
    .prepare("SELECT code, name, price FROM plans ORDER BY price DESC")
    .map_err(|e| e.to_string())?;
  let plans = stmt
    .query_map([], |row| {
      Ok(Plan {
        code: row.get(0)?,
        name: row.get(1)?,
        price: row.get(2)?,
      })
    })
    .map_err(|e| e.to_string())?;
  Ok(plans.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn get_athletes(app: tauri::AppHandle) -> Result<Vec<Athlete>, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let mut stmt = conn
    .prepare(
      "SELECT id, name, phone, plan, status, balance, credit_limit, created_at
       FROM athletes ORDER BY name",
    )
    .map_err(|e| e.to_string())?;
  let athletes = stmt
    .query_map([], |row| {
      Ok(Athlete {
        id: row.get(0)?,
        name: row.get(1)?,
        phone: row.get(2)?,
        plan: row.get(3)?,
        status: row.get(4)?,
        balance: row.get(5)?,
        credit_limit: row.get(6)?,
        created_at: row.get(7)?,
      })
    })
    .map_err(|e| e.to_string())?;
  Ok(athletes.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn get_athlete(app: tauri::AppHandle, id: String) -> Result<Athlete, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  conn
    .query_row(
      "SELECT id, name, phone, plan, status, balance, credit_limit, created_at
       FROM athletes WHERE id = ?1",
      [&id],
      |row| {
        Ok(Athlete {
          id: row.get(0)?,
          name: row.get(1)?,
          phone: row.get(2)?,
          plan: row.get(3)?,
          status: row.get(4)?,
          balance: row.get(5)?,
          credit_limit: row.get(6)?,
          created_at: row.get(7)?,
        })
      },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_athlete(
  app: tauri::AppHandle,
  name: String,
  phone: String,
  plan: String,
  credit_limit: Option<f64>,
) -> Result<String, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let id = uuid::Uuid::new_v4().to_string();
  let created_at = chrono::Utc::now().to_rfc3339();
  let limit = credit_limit.unwrap_or(150.0);
  conn
    .execute(
      "INSERT INTO athletes (id, name, phone, plan, status, balance, credit_limit, created_at)
       VALUES (?1, ?2, ?3, ?4, 'activo', 0, ?5, ?6)",
      params![&id, &name, &phone, &plan, &limit, &created_at],
    )
    .map_err(|e| e.to_string())?;
  Ok(id)
}

#[tauri::command]
pub fn update_athlete_status(app: tauri::AppHandle, id: String, status: String) -> Result<(), String> {
  if status != "activo" && status != "suspendido" {
    return Err(format!("Invalid status: {status}"));
  }
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  conn
    .execute("UPDATE athletes SET status = ?1 WHERE id = ?2", params![&status, &id])
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn add_payment(
  app: tauri::AppHandle,
  athlete_id: String,
  amount: f64,
  method: String,
) -> Result<(), String> {
  let valid_payment_methods = ["efectivo", "zelle", "pago_movil"];
  if !valid_payment_methods.contains(&method.as_str()) {
    return Err(format!("Invalid payment method: {method}"));
  }
  if amount <= 0.0 {
    return Err("Amount must be positive".to_string());
  }
  let mut conn = connect(&app)?;
  ensure_schema(&conn)?;
  let tx = conn.transaction().map_err(|e| e.to_string())?;
  let id = uuid::Uuid::new_v4().to_string();
  let created_at = chrono::Utc::now().to_rfc3339();
  tx.execute(
    "INSERT INTO payments (id, athlete_id, amount, method, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)",
    params![&id, &athlete_id, &amount, &method, &created_at],
  )
  .map_err(|e| e.to_string())?;
  tx.execute(
    "UPDATE athletes SET balance = MAX(0, balance - ?1) WHERE id = ?2",
    params![&amount, &athlete_id],
  )
  .map_err(|e| e.to_string())?;
  tx.commit().map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn get_products(app: tauri::AppHandle) -> Result<Vec<Product>, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let mut stmt = conn
    .prepare(
      "SELECT id, name, category, price, cost, stock, min_stock
       FROM products ORDER BY category, name",
    )
    .map_err(|e| e.to_string())?;
  let products = stmt
    .query_map([], |row| {
      Ok(Product {
        id: row.get(0)?,
        name: row.get(1)?,
        category: row.get(2)?,
        price: row.get(3)?,
        cost: row.get(4)?,
        stock: row.get(5)?,
        min_stock: row.get(6)?,
      })
    })
    .map_err(|e| e.to_string())?;
  Ok(products.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn create_product(
  app: tauri::AppHandle,
  name: String,
  category: String,
  price: f64,
  cost: f64,
  stock: i32,
  min_stock: i32,
) -> Result<String, String> {
  let valid_categories = ["ropa", "suplementos", "implementos", "bebidas"];
  if !valid_categories.contains(&category.as_str()) {
    return Err(format!("Invalid category: {category}"));
  }
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let id = uuid::Uuid::new_v4().to_string();
  conn
    .execute(
      "INSERT INTO products (id, name, category, price, cost, stock, min_stock)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
      params![&id, &name, &category, &price, &cost, &stock, &min_stock],
    )
    .map_err(|e| e.to_string())?;
  Ok(id)
}

#[tauri::command]
pub fn create_sale(
  app: tauri::AppHandle,
  athlete_id: Option<String>,
  items: Vec<SaleItemInput>,
  payment_method: String,
) -> Result<String, String> {
  let valid_methods = ["efectivo", "zelle", "cuenta", "pago_movil"];
  if !valid_methods.contains(&payment_method.as_str()) {
    return Err(format!("Invalid payment method: {payment_method}"));
  }
  if payment_method == "cuenta" && athlete_id.is_none() {
    return Err("Payment method 'cuenta' requires an athlete".to_string());
  }
  if items.is_empty() {
    return Err("Sale must have at least one item".to_string());
  }

  let mut conn = connect(&app)?;
  ensure_schema(&conn)?;
  let tx = conn.transaction().map_err(|e| e.to_string())?;

  // Validate stock availability and calculate totals
  let mut subtotal: f64 = 0.0;
  for item in &items {
    if item.qty <= 0 {
      return Err(format!("Quantity must be positive for product {}", item.product_id));
    }
    let stock: i32 = tx
      .query_row(
        "SELECT stock FROM products WHERE id = ?1",
        [&item.product_id],
        |row| row.get(0),
      )
      .map_err(|e| format!("Product not found: {}", e))?;
    if stock < item.qty {
      return Err(format!("Insufficient stock for product {}", item.product_id));
    }
    subtotal += item.unit_price * item.qty as f64;
  }

  let sale_id = uuid::Uuid::new_v4().to_string();
  let created_at = chrono::Utc::now().to_rfc3339();
  let total = subtotal; // No tax for MVP

  // Insert sale
  tx.execute(
    "INSERT INTO sales (id, athlete_id, subtotal, total, payment_method, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    params![&sale_id, &athlete_id, &subtotal, &total, &payment_method, &created_at],
  )
  .map_err(|e| e.to_string())?;

  // Insert sale items and decrement stock
  for item in &items {
    tx.execute(
      "INSERT INTO sale_items (sale_id, product_id, qty, unit_price)
       VALUES (?1, ?2, ?3, ?4)",
      params![&sale_id, &item.product_id, &item.qty, &item.unit_price],
    )
    .map_err(|e| e.to_string())?;
    tx.execute(
      "UPDATE products SET stock = stock - ?1 WHERE id = ?2",
      params![&item.qty, &item.product_id],
    )
    .map_err(|e| e.to_string())?;
  }

  // If payment_method = 'cuenta', add to athlete balance
  if payment_method == "cuenta" {
    if let Some(ref aid) = athlete_id {
      tx.execute(
        "UPDATE athletes SET balance = balance + ?1 WHERE id = ?2",
        params![&total, aid],
      )
      .map_err(|e| e.to_string())?;
    }
  }

  tx.commit().map_err(|e| e.to_string())?;
  Ok(sale_id)
}

#[tauri::command]
pub fn get_sales(app: tauri::AppHandle) -> Result<Vec<Sale>, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let mut stmt = conn
    .prepare(
      "SELECT s.id, s.athlete_id, a.name, s.subtotal, s.total, s.payment_method, s.created_at,
              (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as item_count
       FROM sales s
       LEFT JOIN athletes a ON s.athlete_id = a.id
       ORDER BY s.created_at DESC",
    )
    .map_err(|e| e.to_string())?;
  let sales = stmt
    .query_map([], |row| {
      Ok(Sale {
        id: row.get(0)?,
        athlete_id: row.get(1)?,
        athlete_name: row.get(2)?,
        subtotal: row.get(3)?,
        total: row.get(4)?,
        payment_method: row.get(5)?,
        created_at: row.get(6)?,
        item_count: row.get(7)?,
      })
    })
    .map_err(|e| e.to_string())?;
  Ok(sales.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn get_sale_items(app: tauri::AppHandle, sale_id: String) -> Result<Vec<SaleItem>, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let mut stmt = conn
    .prepare(
      "SELECT si.id, si.sale_id, si.product_id, p.name, si.qty, si.unit_price
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?1
       ORDER BY si.id",
    )
    .map_err(|e| e.to_string())?;
  let items = stmt
    .query_map([&sale_id], |row| {
      Ok(SaleItem {
        id: row.get(0)?,
        sale_id: row.get(1)?,
        product_id: row.get(2)?,
        product_name: row.get(3)?,
        qty: row.get(4)?,
        unit_price: row.get(5)?,
      })
    })
    .map_err(|e| e.to_string())?;
  Ok(items.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn get_athlete_sales(app: tauri::AppHandle, athlete_id: String) -> Result<Vec<Sale>, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let mut stmt = conn
    .prepare(
      "SELECT s.id, s.athlete_id, a.name, s.subtotal, s.total, s.payment_method, s.created_at,
              (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as item_count
       FROM sales s
       LEFT JOIN athletes a ON s.athlete_id = a.id
       WHERE s.athlete_id = ?1
       ORDER BY s.created_at DESC",
    )
    .map_err(|e| e.to_string())?;
  let sales = stmt
    .query_map([&athlete_id], |row| {
      Ok(Sale {
        id: row.get(0)?,
        athlete_id: row.get(1)?,
        athlete_name: row.get(2)?,
        subtotal: row.get(3)?,
        total: row.get(4)?,
        payment_method: row.get(5)?,
        created_at: row.get(6)?,
        item_count: row.get(7)?,
      })
    })
    .map_err(|e| e.to_string())?;
  Ok(sales.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn get_dashboard(app: tauri::AppHandle) -> Result<DashboardStats, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

  let today_sales_total: f64 = conn
    .query_row(
      "SELECT COALESCE(SUM(total), 0) FROM sales WHERE DATE(created_at) = ?1",
      [&today],
      |row| row.get(0),
    )
    .map_err(|e| e.to_string())?;

  let today_sales_count: i32 = conn
    .query_row(
      "SELECT COUNT(*) FROM sales WHERE DATE(created_at) = ?1",
      [&today],
      |row| row.get(0),
    )
    .map_err(|e| e.to_string())?;

  let active_athletes: i32 = conn
    .query_row("SELECT COUNT(*) FROM athletes WHERE status = 'activo'", [], |row| {
      row.get(0)
    })
    .map_err(|e| e.to_string())?;

  let total_debt: f64 = conn
    .query_row("SELECT COALESCE(SUM(balance), 0) FROM athletes", [], |row| {
      row.get(0)
    })
    .map_err(|e| e.to_string())?;

  let low_stock_count: i32 = conn
    .query_row(
      "SELECT COUNT(*) FROM products WHERE stock <= min_stock",
      [],
      |row| row.get(0),
    )
    .map_err(|e| e.to_string())?;

  // Recent 5 sales
  let mut stmt = conn
    .prepare(
      "SELECT s.id, s.athlete_id, a.name, s.subtotal, s.total, s.payment_method, s.created_at,
              (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as item_count
       FROM sales s
       LEFT JOIN athletes a ON s.athlete_id = a.id
       ORDER BY s.created_at DESC
       LIMIT 5",
    )
    .map_err(|e| e.to_string())?;
  let recent_sales: Vec<Sale> = stmt
    .query_map([], |row| {
      Ok(Sale {
        id: row.get(0)?,
        athlete_id: row.get(1)?,
        athlete_name: row.get(2)?,
        subtotal: row.get(3)?,
        total: row.get(4)?,
        payment_method: row.get(5)?,
        created_at: row.get(6)?,
        item_count: row.get(7)?,
      })
    })
    .map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

  Ok(DashboardStats {
    today_sales_total,
    today_sales_count,
    active_athletes,
    total_debt,
    low_stock_count,
    recent_sales,
  })
}

#[tauri::command]
pub fn get_usd_ves(app: tauri::AppHandle) -> Result<f64, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let val: String = conn
    .query_row(
      "SELECT value FROM settings WHERE key = 'usd_ves'",
      [],
      |row| row.get(0),
    )
    .unwrap_or_else(|_| "36.50".to_string());
  val.parse::<f64>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_usd_ves(app: tauri::AppHandle, rate: f64) -> Result<(), String> {
  if rate <= 0.0 {
    return Err("Rate must be positive".to_string());
  }
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  conn
    .execute(
      "INSERT INTO settings (key, value) VALUES ('usd_ves', ?1)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      params![&rate.to_string()],
    )
    .map_err(|e| e.to_string())?;
  Ok(())
}
