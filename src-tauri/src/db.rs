use calamine::{open_workbook, Data, Reader, Xlsx};
use rusqlite::{params, Connection, OptionalExtension};
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
  pub plan_expires_at: Option<String>,
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
  pub image_path: Option<String>,
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
  pub expiring_athletes: Vec<Athlete>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SalesChartPoint {
  pub day: String,
  pub total: f64,
  pub count: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CXCAging {
  pub current: f64,
  pub days_31_60: f64,
  pub days_61_90: f64,
  pub over_90: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DebtorRow {
  pub id: String,
  pub name: String,
  pub phone: String,
  pub plan: String,
  pub balance: f64,
  pub credit_limit: f64,
  pub days_overdue: i32,
  pub last_payment_date: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct SaleItemInput {
  pub product_id: String,
  pub qty: i32,
  pub unit_price: f64,
}

// ─── Income Report Types ─────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IncomeReport {
  pub period: String,
  pub start_date: String,
  pub end_date: String,
  pub memberships_total: f64,
  pub memberships_count: i32,
  pub pos_total: f64,
  pub pos_count: i32,
  pub pos_by_category: Vec<CategoryBreakdown>,
  pub total_income: f64,
  pub daily_breakdown: Vec<DailyIncome>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CategoryBreakdown {
  pub category: String,
  pub total: f64,
  pub count: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DailyIncome {
  pub date: String,
  pub memberships: f64,
  pub pos: f64,
}

// ─── Excel Import Types ──────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportResult {
  pub total_rows: usize,
  pub imported: usize,
  pub skipped: usize,
  pub errors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExcelRow {
  pub row_number: usize,
  pub nombre: String,
  pub telefono: String,
  pub plan: String,
  pub valid: bool,
  pub error: Option<String>,
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
        min_stock INTEGER NOT NULL DEFAULT 5,
        image_path TEXT
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

      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        athlete_id TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT 'whatsapp',
        FOREIGN KEY (athlete_id) REFERENCES athletes(id)
      );
      ",
    )
    .map_err(|e| e.to_string())?;

  // Migration: add image_path column to existing products tables
  // Ignore error if column already exists
  let _ = conn.execute_batch("ALTER TABLE products ADD COLUMN image_path TEXT;");

  // Migration: add plan_expires_at column to athletes table
  let _ = conn.execute_batch("ALTER TABLE athletes ADD COLUMN plan_expires_at TEXT;");

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

  // Unconditional 4DIAS seed — idempotent migration for existing databases
  conn
    .execute(
      "INSERT OR IGNORE INTO plans (code, name, price) VALUES ('4DIAS', 'Plan 4 Días', 35)",
      [],
    )
    .map_err(|e| e.to_string())?;

  // Seed settings
  conn
    .execute(
      "INSERT OR IGNORE INTO settings (key, value) VALUES ('usd_ves', '36.50')",
      [],
    )
    .map_err(|e| e.to_string())?;

  conn
    .execute(
      "INSERT OR IGNORE INTO settings (key, value) VALUES ('reminder_template', 'Hola {nombre}! Te recordamos que tu plan {plan} vence el {vence}. Monto: ${monto}. Por favor realiza tu pago para mantener tu acceso activo. Gracias!')",
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

fn validate_plan_input(name: &str, price: f64) -> Result<(), String> {
  if name.trim().is_empty() {
    return Err("El nombre es requerido".to_string());
  }
  if price <= 0.0 {
    return Err("El precio debe ser mayor a 0".to_string());
  }
  Ok(())
}

#[tauri::command]
pub fn save_plan(
  app: tauri::AppHandle,
  code: String,
  name: String,
  price: f64,
) -> Result<(), String> {
  validate_plan_input(&name, price)?;
  let normalized_code = code.trim().to_uppercase();
  if normalized_code.is_empty() {
    return Err("El código es requerido".to_string());
  }
  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  let exists: bool = conn
    .query_row(
      "SELECT COUNT(*) FROM plans WHERE code = ?1",
      params![&normalized_code],
      |row| row.get::<_, i32>(0),
    )
    .map_err(|e| e.to_string())?
    > 0;
  if exists {
    return Err("El código ya existe".to_string());
  }

  conn
    .execute(
      "INSERT INTO plans (code, name, price) VALUES (?1, ?2, ?3)",
      params![&normalized_code, &name.trim(), &price],
    )
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn update_plan(
  app: tauri::AppHandle,
  code: String,
  name: String,
  price: f64,
) -> Result<(), String> {
  validate_plan_input(&name, price)?;
  let normalized_code = code.trim().to_uppercase();
  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  let rows_affected = conn
    .execute(
      "UPDATE plans SET name = ?1, price = ?2 WHERE code = ?3",
      params![&name.trim(), &price, &normalized_code],
    )
    .map_err(|e| e.to_string())?;

  if rows_affected == 0 {
    return Err("Plan no encontrado".to_string());
  }
  Ok(())
}

#[tauri::command]
pub fn delete_plan(app: tauri::AppHandle, code: String) -> Result<(), String> {
  let normalized_code = code.trim().to_uppercase();
  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  let ref_count: i32 = conn
    .query_row(
      "SELECT COUNT(*) FROM athletes WHERE plan = ?1",
      params![&normalized_code],
      |row| row.get(0),
    )
    .map_err(|e| e.to_string())?;
  if ref_count > 0 {
    return Err(format!("Plan en uso por {ref_count} atletas"));
  }

  conn
    .execute("DELETE FROM plans WHERE code = ?1", params![&normalized_code])
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn get_athletes(app: tauri::AppHandle) -> Result<Vec<Athlete>, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let mut stmt = conn
    .prepare(
      "SELECT id, name, phone, plan, status, balance, credit_limit, plan_expires_at, created_at
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
        plan_expires_at: row.get(7)?,
        created_at: row.get(8)?,
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
      "SELECT id, name, phone, plan, status, balance, credit_limit, plan_expires_at, created_at
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
          plan_expires_at: row.get(7)?,
          created_at: row.get(8)?,
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
  plan_expires_at: Option<String>,
) -> Result<String, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let id = uuid::Uuid::new_v4().to_string();
  let created_at = chrono::Utc::now().to_rfc3339();
  let limit = credit_limit.unwrap_or(150.0);
  conn
    .execute(
      "INSERT INTO athletes (id, name, phone, plan, status, balance, credit_limit, plan_expires_at, created_at)
       VALUES (?1, ?2, ?3, ?4, 'activo', 0, ?5, ?6, ?7)",
      params![&id, &name, &phone, &plan, &limit, &plan_expires_at, &created_at],
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
  let valid_payment_methods = ["efectivo", "pago_movil"];
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
pub fn pay_monthly_plan(
  app: tauri::AppHandle,
  athlete_id: String,
  amount: f64,
  method: String,
) -> Result<(), String> {
  let valid_payment_methods = ["efectivo", "pago_movil"];
  if !valid_payment_methods.contains(&method.as_str()) {
    return Err(format!("Invalid payment method: {method}"));
  }
  if amount <= 0.0 {
    return Err("Amount must be positive".to_string());
  }

  let mut conn = connect(&app)?;
  ensure_schema(&conn)?;

  // Validate athlete exists and is active
  let status: String = conn
    .query_row(
      "SELECT status FROM athletes WHERE id = ?1",
      [&athlete_id],
      |row| row.get(0),
    )
    .map_err(|_| "Athlete not found".to_string())?;
  if status != "activo" {
    return Err("Athlete must be active to pay monthly plan".to_string());
  }

  let tx = conn.transaction().map_err(|e| e.to_string())?;

  // Extend plan_expires_at:
  // - NULL or past → today + 1 month
  // - today or future → current + 1 month
  tx.execute(
    "UPDATE athletes SET plan_expires_at = CASE
       WHEN plan_expires_at IS NULL OR DATE(plan_expires_at) < DATE('now')
         THEN DATE('now', '+1 month')
       ELSE DATE(DATE(plan_expires_at), '+1 month')
     END
     WHERE id = ?1",
    params![&athlete_id],
  )
  .map_err(|e| e.to_string())?;

  // Insert payment record (same as regular payment)
  let payment_id = uuid::Uuid::new_v4().to_string();
  let created_at = chrono::Utc::now().to_rfc3339();
  tx.execute(
    "INSERT INTO payments (id, athlete_id, amount, method, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)",
    params![&payment_id, &athlete_id, &amount, &method, &created_at],
  )
  .map_err(|e| e.to_string())?;

  // Reduce athlete balance (same as regular payment)
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
      "SELECT id, name, category, price, cost, stock, min_stock, image_path
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
        image_path: row.get(7)?,
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
pub fn update_product(
  app: tauri::AppHandle,
  id: String,
  name: String,
  category: String,
  price: f64,
  cost: f64,
  stock: i32,
  min_stock: i32,
) -> Result<(), String> {
  let valid_categories = ["ropa", "suplementos", "implementos", "bebidas"];
  if !valid_categories.contains(&category.as_str()) {
    return Err(format!("Invalid category: {category}"));
  }
  if price < 0.0 {
    return Err("Price cannot be negative".to_string());
  }
  if cost < 0.0 {
    return Err("Cost cannot be negative".to_string());
  }
  if stock < 0 {
    return Err("Stock cannot be negative".to_string());
  }
  if min_stock < 0 {
    return Err("Minimum stock cannot be negative".to_string());
  }

  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  // Check if product exists
  let exists: bool = conn
    .query_row("SELECT COUNT(*) FROM products WHERE id = ?1", params![&id], |row| {
      row.get::<_, i32>(0)
    })
    .map_err(|e| e.to_string())?
    > 0;
  if !exists {
    return Err(format!("Product not found: {id}"));
  }

  let rows_affected = conn
    .execute(
      "UPDATE products SET name = ?1, category = ?2, price = ?3, cost = ?4, stock = ?5, min_stock = ?6 WHERE id = ?7",
      params![&name, &category, &price, &cost, &stock, &min_stock, &id],
    )
    .map_err(|e| e.to_string())?;

  if rows_affected == 0 {
    return Err(format!("Failed to update product: {id}"));
  }

  Ok(())
}

#[tauri::command]
pub fn delete_product(app: tauri::AppHandle, id: String) -> Result<(), String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  // Check if product exists
  let exists: bool = conn
    .query_row("SELECT COUNT(*) FROM products WHERE id = ?1", params![&id], |row| {
      row.get::<_, i32>(0)
    })
    .map_err(|e| e.to_string())?
    > 0;
  if !exists {
    return Err(format!("Product not found: {id}"));
  }

  // Check if product is referenced in sale_items
  let ref_count: i32 = conn
    .query_row(
      "SELECT COUNT(*) FROM sale_items WHERE product_id = ?1",
      params![&id],
      |row| row.get(0),
    )
    .map_err(|e| e.to_string())?;
  if ref_count > 0 {
    return Err(format!(
      "Cannot delete: this product is referenced in {ref_count} sale(s). Remove those records first."
    ));
  }

  conn
    .execute("DELETE FROM products WHERE id = ?1", params![&id])
    .map_err(|e| e.to_string())?;
  Ok(())
}

// ─── Image Upload ────────────────────────────────────────────────────────────

fn images_dir_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let dir = app
    .path()
    .app_data_dir()
    .map_err(|e| e.to_string())?
    .join("images");
  std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  Ok(dir)
}

#[tauri::command]
pub fn upload_product_image(
  app: tauri::AppHandle,
  product_id: String,
  image_data: Vec<u8>,
  extension: String,
) -> Result<String, String> {
  // Validate extension
  let ext = extension.to_lowercase();
  let valid_extensions = ["jpg", "jpeg", "png", "webp"];
  if !valid_extensions.contains(&ext.as_str()) {
    return Err(format!("Invalid image format: {ext}. Allowed: jpg, png, webp"));
  }

  // Validate size (max 5 MB)
  const MAX_SIZE: usize = 5 * 1024 * 1024;
  if image_data.len() > MAX_SIZE {
    return Err(format!(
      "Image too large ({} KB). Maximum size is 5 MB.",
      image_data.len() / 1024
    ));
  }

  let images_dir = images_dir_path(&app)?;

  // Check if product exists
  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  let exists: bool = conn
    .query_row(
      "SELECT COUNT(*) FROM products WHERE id = ?1",
      params![&product_id],
      |row| row.get::<_, i32>(0),
    )
    .map_err(|e| e.to_string())?
    > 0;
  if !exists {
    return Err(format!("Product not found: {product_id}"));
  }

  // Get old image path to clean up
  let old_path: Option<String> = conn
    .query_row(
      "SELECT image_path FROM products WHERE id = ?1",
      params![&product_id],
      |row| row.get(0),
    )
    .ok();

  // Generate filename: {product_id}_{timestamp}.{ext}
  let timestamp = chrono::Utc::now().timestamp_millis();
  let filename = format!("{product_id}_{timestamp}.{ext}");
  let file_path = images_dir.join(&filename);

  // Write image file
  std::fs::write(&file_path, &image_data).map_err(|e| format!("Failed to write image: {e}"))?;

  // Delete old image file if it exists
  if let Some(ref old_p) = old_path {
    if !old_p.is_empty() {
      let old_full = images_dir.join(old_p);
      let _ = std::fs::remove_file(&old_full);
    }
  }

  // Update product's image_path in database
  conn
    .execute(
      "UPDATE products SET image_path = ?1 WHERE id = ?2",
      params![&filename, &product_id],
    )
    .map_err(|e| e.to_string())?;

  Ok(filename)
}

#[tauri::command]
pub fn get_images_dir(app: tauri::AppHandle) -> Result<String, String> {
  let dir = images_dir_path(&app)?;
  Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn create_sale(
  app: tauri::AppHandle,
  athlete_id: Option<String>,
  items: Vec<SaleItemInput>,
  payment_method: String,
) -> Result<String, String> {
  let valid_methods = ["efectivo", "cuenta", "pago_movil"];
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
pub fn get_athlete_payments(app: tauri::AppHandle, athlete_id: String) -> Result<Vec<Payment>, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let mut stmt = conn
    .prepare(
      "SELECT id, athlete_id, amount, method, created_at
       FROM payments
       WHERE athlete_id = ?1
       ORDER BY created_at DESC",
    )
    .map_err(|e| e.to_string())?;
  let payments = stmt
    .query_map([&athlete_id], |row| {
      Ok(Payment {
        id: row.get(0)?,
        athlete_id: row.get(1)?,
        amount: row.get(2)?,
        method: row.get(3)?,
        created_at: row.get(4)?,
      })
    })
    .map_err(|e| e.to_string())?;
  Ok(payments.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn get_all_payments(app: tauri::AppHandle) -> Result<Vec<Payment>, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let mut stmt = conn
    .prepare(
      "SELECT id, athlete_id, amount, method, created_at
       FROM payments
       ORDER BY created_at DESC",
    )
    .map_err(|e| e.to_string())?;
  let payments = stmt
    .query_map([], |row| {
      Ok(Payment {
        id: row.get(0)?,
        athlete_id: row.get(1)?,
        amount: row.get(2)?,
        method: row.get(3)?,
        created_at: row.get(4)?,
      })
    })
    .map_err(|e| e.to_string())?;
  Ok(payments.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn get_expiring_athletes(app: tauri::AppHandle) -> Result<Vec<Athlete>, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let mut stmt = conn
    .prepare(
      "SELECT id, name, phone, plan, status, balance, credit_limit, plan_expires_at, created_at
       FROM athletes
       WHERE status = 'activo'
         AND plan_expires_at IS NOT NULL
         AND (DATE(plan_expires_at) < DATE('now', '+4 days'))
       ORDER BY plan_expires_at ASC",
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
        plan_expires_at: row.get(7)?,
        created_at: row.get(8)?,
      })
    })
    .map_err(|e| e.to_string())?;
  Ok(athletes.filter_map(|r| r.ok()).collect())
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

  // Expiring athletes (expiring within 3 days or already expired)
  let mut exp_stmt = conn
    .prepare(
      "SELECT id, name, phone, plan, status, balance, credit_limit, plan_expires_at, created_at
       FROM athletes
       WHERE status = 'activo'
         AND plan_expires_at IS NOT NULL
         AND (DATE(plan_expires_at) < DATE('now', '+4 days'))
       ORDER BY plan_expires_at ASC",
    )
    .map_err(|e| e.to_string())?;
  let expiring_athletes: Vec<Athlete> = exp_stmt
    .query_map([], |row| {
      Ok(Athlete {
        id: row.get(0)?,
        name: row.get(1)?,
        phone: row.get(2)?,
        plan: row.get(3)?,
        status: row.get(4)?,
        balance: row.get(5)?,
        credit_limit: row.get(6)?,
        plan_expires_at: row.get(7)?,
        created_at: row.get(8)?,
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
    expiring_athletes,
  })
}

#[tauri::command]
pub fn get_sales_period(app: tauri::AppHandle, period: String) -> Result<f64, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  let range = match period.as_str() {
    "week" => "-7 days",
    "month" => "-1 month",
    "year" => "-1 year",
    _ => return Err(format!("Unknown period: {}", period)),
  };

  let total: f64 = conn
    .query_row(
      "SELECT COALESCE(SUM(total), 0) FROM sales WHERE DATE(created_at) >= DATE('now', ?1)",
      [&range],
      |row| row.get(0),
    )
    .map_err(|e| e.to_string())?;

  Ok(total)
}

#[tauri::command]
pub fn get_sales_chart_data(app: tauri::AppHandle) -> Result<Vec<SalesChartPoint>, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  let mut stmt = conn
    .prepare(
      "SELECT DATE(created_at) as day, SUM(total) as total, COUNT(*) as count
       FROM sales
       WHERE DATE(created_at) >= DATE('now', '-30 days')
       GROUP BY DATE(created_at)
       ORDER BY day ASC",
    )
    .map_err(|e| e.to_string())?;

  let points: Vec<SalesChartPoint> = stmt
    .query_map([], |row| {
      Ok(SalesChartPoint {
        day: row.get(0)?,
        total: row.get(1)?,
        count: row.get(2)?,
      })
    })
    .map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

  Ok(points)
}

#[tauri::command]
pub fn get_cxc_aging(app: tauri::AppHandle) -> Result<CXCAging, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  let mut stmt = conn
    .prepare(
      "SELECT balance, julianday('now') - julianday(created_at) as days
       FROM athletes WHERE balance > 0",
    )
    .map_err(|e| e.to_string())?;

  let mut aging = CXCAging {
    current: 0.0,
    days_31_60: 0.0,
    days_61_90: 0.0,
    over_90: 0.0,
  };

  let rows = stmt
    .query_map([], |row| {
      Ok((row.get::<_, f64>(0)?, row.get::<_, f64>(1)?))
    })
    .map_err(|e| e.to_string())?;

  for row in rows {
    let (balance, days) = row.map_err(|e| e.to_string())?;
    let days = days as i64;
    if days <= 30 {
      aging.current += balance;
    } else if days <= 60 {
      aging.days_31_60 += balance;
    } else if days <= 90 {
      aging.days_61_90 += balance;
    } else {
      aging.over_90 += balance;
    }
  }

  Ok(aging)
}

#[tauri::command]
pub fn get_debtors_detailed(app: tauri::AppHandle) -> Result<Vec<DebtorRow>, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  let mut stmt = conn
    .prepare(
      "SELECT a.id, a.name, a.phone, a.plan, a.balance, a.credit_limit, a.plan_expires_at, a.created_at,
              (SELECT MAX(created_at) FROM payments p WHERE p.athlete_id = a.id) as last_payment_date
       FROM athletes a
       WHERE a.balance > 0
       ORDER BY a.balance DESC",
    )
    .map_err(|e| e.to_string())?;

  let rows: Vec<DebtorRow> = stmt
    .query_map([], |row| {
      let id: String = row.get(0)?;
      let name: String = row.get(1)?;
      let phone: String = row.get(2)?;
      let plan: String = row.get(3)?;
      let balance: f64 = row.get(4)?;
      let credit_limit: f64 = row.get(5)?;
      let plan_expires_at: Option<String> = row.get(6)?;
      let _created_at: String = row.get(7)?;
      let last_payment_date: Option<String> = row.get(8)?;

      // Calculate days overdue: if plan_expires_at exists and is past
      let days_overdue = match &plan_expires_at {
        Some(expires) => {
          // Parse date and calculate days since expiry
          let exp_date = chrono::NaiveDate::parse_from_str(expires, "%Y-%m-%d").ok();
          match exp_date {
            Some(ed) => {
              let today = chrono::Utc::now().date_naive();
              let diff = (today - ed).num_days();
              if diff > 0 { diff as i32 } else { 0 }
            }
            None => 0,
          }
        }
        None => 0,
      };

      Ok(DebtorRow {
        id,
        name,
        phone,
        plan,
        balance,
        credit_limit,
        days_overdue,
        last_payment_date,
      })
    })
    .map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

  Ok(rows)
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

// ─── BCV Exchange Rate Fetch ─────────────────────────────────────────────────

const BCV_API_URL: &str = "https://ve.dolarapi.com/v1/dolares/oficial";

/// Internal helper: fetch rate from API and persist to settings.
/// Called by both manual and auto-fetch commands.
async fn do_fetch_and_save(app: &tauri::AppHandle) -> Result<f64, String> {
  let client = reqwest::Client::builder()
    .timeout(std::time::Duration::from_secs(10))
    .build()
    .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

  let resp = client
    .get(BCV_API_URL)
    .send()
    .await
    .map_err(|e| format!("Network error: {}", e))?;

  if !resp.status().is_success() {
    return Err(format!("API returned HTTP {}", resp.status()));
  }

  let json: serde_json::Value = resp
    .json()
    .await
    .map_err(|e| format!("Failed to parse API response: {}", e))?;

  let rate = json["promedio"]
    .as_f64()
    .ok_or_else(|| "Missing 'promedio' field in API response".to_string())?;

  if rate <= 0.0 {
    return Err(format!("Invalid rate from API: {}", rate));
  }

  // Persist rate + timestamp
  let conn = connect(app)?;
  ensure_schema(&conn)?;

  conn
    .execute(
      "INSERT INTO settings (key, value) VALUES ('usd_ves', ?1)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      params![&rate.to_string()],
    )
    .map_err(|e| format!("Failed to save rate: {}", e))?;

  let now = chrono::Utc::now().to_rfc3339();
  conn
    .execute(
      "INSERT INTO settings (key, value) VALUES ('last_bcv_fetch', ?1)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      params![&now],
    )
    .map_err(|e| format!("Failed to save timestamp: {}", e))?;

  println!("BCV rate updated: {:.4} at {}", rate, now);
  Ok(rate)
}

#[tauri::command]
pub async fn fetch_bcv_rate(app: tauri::AppHandle) -> Result<f64, String> {
  do_fetch_and_save(&app).await
}

#[tauri::command]
pub async fn maybe_auto_fetch_bcv(app: tauri::AppHandle) -> Result<Option<f64>, String> {
  // Check if we need to fetch (sync DB read, drop connection before async)
  let needs_fetch = {
    let conn = connect(&app)?;
    ensure_schema(&conn)?;

    let last_fetch: Option<String> = conn
      .query_row(
        "SELECT value FROM settings WHERE key = 'last_bcv_fetch'",
        [],
        |row| row.get(0),
      )
      .ok();

    match last_fetch {
      Some(ts) => {
        match chrono::DateTime::parse_from_rfc3339(&ts) {
          Ok(parsed) => {
            let hours = chrono::Utc::now()
              .signed_duration_since(parsed.with_timezone(&chrono::Utc))
              .num_hours();
            hours >= 24
          }
          Err(_) => true, // Invalid timestamp, re-fetch
        }
      }
      None => true, // Never fetched before
    }
  };

  if !needs_fetch {
    return Ok(None);
  }

  // Fetch (connection is dropped, safe to hold across await)
  match do_fetch_and_save(&app).await {
    Ok(rate) => Ok(Some(rate)),
    Err(e) => {
      println!("Auto-fetch failed (non-fatal): {}", e);
      Ok(None) // Silent failure for auto-fetch
    }
  }
}

#[tauri::command]
pub fn update_athlete(
  app: tauri::AppHandle,
  id: String,
  name: String,
  phone: String,
  plan: String,
  credit_limit: f64,
  plan_expires_at: Option<String>,
) -> Result<(), String> {
  if name.trim().is_empty() {
    return Err("Name cannot be empty".to_string());
  }
  if credit_limit < 0.0 {
    return Err("Credit limit cannot be negative".to_string());
  }

  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  // Check that the plan code exists in the plans table
  let plan_exists: bool = conn
    .query_row(
      "SELECT COUNT(*) FROM plans WHERE code = ?1",
      params![&plan],
      |row| row.get::<_, i32>(0),
    )
    .map_err(|e| e.to_string())?
    > 0;
  if !plan_exists {
    return Err(format!("Invalid plan: {plan}"));
  }

  // Check that the athlete exists
  let exists: bool = conn
    .query_row(
      "SELECT COUNT(*) FROM athletes WHERE id = ?1",
      params![&id],
      |row| row.get::<_, i32>(0),
    )
    .map_err(|e| e.to_string())?
    > 0;
  if !exists {
    return Err(format!("Athlete not found: {id}"));
  }

  let rows_affected = conn
    .execute(
      "UPDATE athletes SET name = ?1, phone = ?2, plan = ?3, credit_limit = ?4, plan_expires_at = ?5 WHERE id = ?6",
      params![&name, &phone, &plan, &credit_limit, &plan_expires_at, &id],
    )
    .map_err(|e| e.to_string())?;

  if rows_affected == 0 {
    return Err(format!("Failed to update athlete: {id}"));
  }

  Ok(())
}

#[tauri::command]
pub fn delete_athlete(app: tauri::AppHandle, id: String) -> Result<(), String> {
  let mut conn = connect(&app)?;
  ensure_schema(&conn)?;

  // Check if athlete exists
  let exists: bool = conn
    .query_row("SELECT COUNT(*) FROM athletes WHERE id = ?1", params![&id], |row| {
      row.get::<_, i32>(0)
    })
    .map_err(|e| e.to_string())?
    > 0;
  if !exists {
    return Err(format!("Athlete not found: {id}"));
  }

  // Cascade delete in transaction
  let tx = conn.transaction().map_err(|e| e.to_string())?;

  // 1. Delete sale_items for this athlete's sales
  let sale_items_deleted = tx
    .execute(
      "DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE athlete_id = ?1)",
      params![&id],
    )
    .map_err(|e| e.to_string())?;

  // 2. Delete sales for this athlete
  let sales_deleted = tx
    .execute("DELETE FROM sales WHERE athlete_id = ?1", params![&id])
    .map_err(|e| e.to_string())?;

  // 3. Delete payments for this athlete
  let payments_deleted = tx
    .execute("DELETE FROM payments WHERE athlete_id = ?1", params![&id])
    .map_err(|e| e.to_string())?;

  // 4. Delete the athlete
  let athletes_deleted = tx
    .execute("DELETE FROM athletes WHERE id = ?1", params![&id])
    .map_err(|e| e.to_string())?;

  tx.commit().map_err(|e| e.to_string())?;

  // Log the cascade delete
  println!(
    "Deleted athlete {}: {} sales, {} payments, {} sale_items",
    id, sales_deleted, payments_deleted, sale_items_deleted
  );

  if athletes_deleted == 0 {
    return Err(format!("Failed to delete athlete: {id}"));
  }

  Ok(())
}

// ─── Excel Import ────────────────────────────────────────────────────────────

/// Extract a string value from a calamine Data cell.
fn cell_to_string(cell: &Data) -> String {
  match cell {
    Data::String(s) => s.trim().to_string(),
    Data::Int(i) => i.to_string(),
    Data::Float(f) => f.to_string(),
    Data::Bool(b) => b.to_string(),
    Data::DateTime(dt) => dt.to_string(),
    Data::DateTimeIso(s) => s.clone(),
    _ => String::new(),
  }
}

/// Parse Excel rows into ExcelRow structs with validation against known plan codes.
fn parse_excel_rows(
  range: &calamine::Range<Data>,
  valid_plans: &std::collections::HashSet<String>,
) -> Vec<ExcelRow> {
  let mut rows_out = Vec::new();
  // Skip header row (index 0)
  for (idx, row) in range.rows().skip(1).enumerate() {
    let row_number = idx + 2; // 1-indexed, +1 for header

    let nombre = if row.len() > 0 { cell_to_string(&row[0]) } else { String::new() };
    let telefono = if row.len() > 1 { cell_to_string(&row[1]) } else { String::new() };
    let plan = if row.len() > 2 { cell_to_string(&row[2]) } else { String::new() };

    // Validate
    let (valid, error) = if nombre.trim().is_empty() {
      (false, Some("Nombre vacío".to_string()))
    } else if plan.trim().is_empty() {
      (false, Some("Plan vacío".to_string()))
    } else if !valid_plans.contains(&plan.to_uppercase()) {
      (false, Some(format!("Plan inválido: {plan}")))
    } else {
      (true, None)
    };

    rows_out.push(ExcelRow {
      row_number,
      nombre,
      telefono,
      plan: plan.to_uppercase(),
      valid,
      error,
    });
  }
  rows_out
}

#[tauri::command]
pub fn preview_excel_athletes(app: tauri::AppHandle, file_path: String) -> Result<Vec<ExcelRow>, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  // Load valid plan codes
  let mut stmt = conn.prepare("SELECT code FROM plans").map_err(|e| e.to_string())?;
  let valid_plans: std::collections::HashSet<String> = stmt
    .query_map([], |row| row.get::<_, String>(0))
    .map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

  // Open workbook
  let mut workbook: Xlsx<_> = open_workbook(&file_path)
    .map_err(|e| format!("No se pudo abrir el archivo: {e}"))?;

  // Get first sheet
  let sheet_names = workbook.sheet_names();
  if sheet_names.is_empty() {
    return Err("El archivo no tiene hojas".to_string());
  }
  let first_sheet = sheet_names[0].clone();
  let range = workbook
    .worksheet_range(&first_sheet)
    .map_err(|e| format!("Error leyendo hoja '{first_sheet}': {e}"))?;

  Ok(parse_excel_rows(&range, &valid_plans))
}

#[tauri::command]
pub fn import_athletes_from_excel(
  app: tauri::AppHandle,
  file_path: String,
) -> Result<ImportResult, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  // Load valid plan codes
  let mut stmt = conn.prepare("SELECT code FROM plans").map_err(|e| e.to_string())?;
  let valid_plans: std::collections::HashSet<String> = stmt
    .query_map([], |row| row.get::<_, String>(0))
    .map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

  // Open workbook
  let mut workbook: Xlsx<_> = open_workbook(&file_path)
    .map_err(|e| format!("No se pudo abrir el archivo: {e}"))?;

  let sheet_names = workbook.sheet_names();
  if sheet_names.is_empty() {
    return Err("El archivo no tiene hojas".to_string());
  }
  let first_sheet = sheet_names[0].clone();
  let range = workbook
    .worksheet_range(&first_sheet)
    .map_err(|e| format!("Error leyendo hoja '{first_sheet}': {e}"))?;

  let rows = parse_excel_rows(&range, &valid_plans);
  let total_rows = rows.len();
  let mut imported: usize = 0;
  let mut skipped: usize = 0;
  let mut errors: Vec<String> = Vec::new();

  for row in &rows {
    if !row.valid {
      skipped += 1;
      errors.push(format!(
        "Fila {}: {}",
        row.row_number,
        row.error.as_deref().unwrap_or("error desconocido")
      ));
      continue;
    }

    // Check duplicate name
    let exists: bool = conn
      .query_row(
        "SELECT COUNT(*) FROM athletes WHERE LOWER(name) = LOWER(?1)",
        params![&row.nombre],
        |row| row.get::<_, i32>(0),
      )
      .map_err(|e| e.to_string())?
      > 0;

    if exists {
      skipped += 1;
      errors.push(format!("Fila {}: Atleta duplicado '{}'", row.row_number, row.nombre));
      continue;
    }

    // Insert athlete
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();
    let plan_expires_at = chrono::Utc::now()
      .checked_add_months(chrono::Months::new(1))
      .map(|d| d.to_rfc3339())
      .unwrap_or(created_at.clone());

    match conn.execute(
      "INSERT INTO athletes (id, name, phone, plan, status, balance, credit_limit, plan_expires_at, created_at)
       VALUES (?1, ?2, ?3, ?4, 'activo', 0, 150, ?5, ?6)",
      params![&id, &row.nombre, &row.telefono, &row.plan, &plan_expires_at, &created_at],
    ) {
      Ok(_) => imported += 1,
      Err(e) => {
        skipped += 1;
        errors.push(format!("Fila {}: Error DB: {}", row.row_number, e));
      }
    }
  }

  Ok(ImportResult {
    total_rows,
    imported,
    skipped,
    errors,
  })
}

// ─── Settings (generic) ──────────────────────────────────────────────────────

#[tauri::command]
pub fn get_setting(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let val: Option<String> = conn
    .query_row(
      "SELECT value FROM settings WHERE key = ?1",
      params![&key],
      |row| row.get(0),
    )
    .optional()
    .map_err(|e| e.to_string())?;
  Ok(val)
}

#[tauri::command]
pub fn set_setting(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  conn
    .execute(
      "INSERT INTO settings (key, value) VALUES (?1, ?2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      params![&key, &value],
    )
    .map_err(|e| e.to_string())?;
  Ok(())
}

// ─── Reminders ───────────────────────────────────────────────────────────────

#[tauri::command]
pub fn log_reminder(
  app: tauri::AppHandle,
  athlete_id: String,
  channel: String,
) -> Result<(), String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;
  let id = uuid::Uuid::new_v4().to_string();
  let now = chrono::Utc::now().to_rfc3339();
  conn
    .execute(
      "INSERT INTO reminders (id, athlete_id, sent_at, channel) VALUES (?1, ?2, ?3, ?4)",
      params![&id, &athlete_id, &now, &channel],
    )
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn get_pending_reminders(app: tauri::AppHandle) -> Result<Vec<Athlete>, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  // Athletes whose plan expires today or tomorrow (or already expired),
  // and who have NOT been reminded today.
  let mut stmt = conn
    .prepare(
      "SELECT id, name, phone, plan, status, balance, credit_limit, plan_expires_at, created_at
       FROM athletes
       WHERE status = 'activo'
         AND plan_expires_at IS NOT NULL
         AND DATE(plan_expires_at) <= DATE('now', '+1 day')
          AND NOT EXISTS (
            SELECT 1 FROM reminders r
            WHERE r.athlete_id = athletes.id
              AND DATE(r.sent_at) = DATE('now')
          )
        ORDER BY plan_expires_at ASC",
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
        plan_expires_at: row.get(7)?,
        created_at: row.get(8)?,
      })
    })
    .map_err(|e| e.to_string())?;
  Ok(athletes.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn get_income_report(app: tauri::AppHandle, period: String) -> Result<IncomeReport, String> {
  let conn = connect(&app)?;
  ensure_schema(&conn)?;

  let range = match period.as_str() {
    "day" => "-1 days",
    "week" => "-7 days",
    "month" => "-30 days",
    _ => return Err(format!("Unknown period: {}", period)),
  };

  // ── Memberships total (payments in period) ──
  let (memberships_total, memberships_count): (f64, i32) = conn
    .query_row(
      "SELECT COALESCE(SUM(amount), 0), COUNT(*)
       FROM payments
       WHERE DATE(created_at) >= DATE('now', ?1)",
      [&range],
      |row| Ok((row.get::<_, f64>(0)?, row.get::<_, i32>(1)?)),
    )
    .map_err(|e| e.to_string())?;

  // ── POS total (sales in period) ──
  let (pos_total, pos_count): (f64, i32) = conn
    .query_row(
      "SELECT COALESCE(SUM(total), 0), COUNT(*)
       FROM sales
       WHERE DATE(created_at) >= DATE('now', ?1)",
      [&range],
      |row| Ok((row.get::<_, f64>(0)?, row.get::<_, i32>(1)?)),
    )
    .map_err(|e| e.to_string())?;

  // ── POS by category ──
  let mut cat_stmt = conn
    .prepare(
      "SELECT p.category,
              COALESCE(SUM(si.qty * si.unit_price), 0) as total,
              COUNT(DISTINCT si.sale_id) as sale_count
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.id
       JOIN products p ON si.product_id = p.id
       WHERE DATE(s.created_at) >= DATE('now', ?1)
       GROUP BY p.category
       ORDER BY total DESC",
    )
    .map_err(|e| e.to_string())?;

  let pos_by_category: Vec<CategoryBreakdown> = cat_stmt
    .query_map([&range], |row| {
      Ok(CategoryBreakdown {
        category: row.get(0)?,
        total: row.get(1)?,
        count: row.get(2)?,
      })
    })
    .map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

  // ── Daily breakdown: memberships vs POS per day ──
  let mut daily_stmt = conn
    .prepare(
      "SELECT
        d.date,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE DATE(p.created_at) = d.date), 0) as memberships,
        COALESCE((SELECT SUM(s.total) FROM sales s WHERE DATE(s.created_at) = d.date), 0) as pos
       FROM (
         SELECT DISTINCT DATE(created_at) as date FROM payments WHERE DATE(created_at) >= DATE('now', ?1)
         UNION
         SELECT DISTINCT DATE(created_at) as date FROM sales WHERE DATE(created_at) >= DATE('now', ?1)
       ) d
       ORDER BY d.date ASC",
    )
    .map_err(|e| e.to_string())?;

  let daily_breakdown: Vec<DailyIncome> = daily_stmt
    .query_map([&range], |row| {
      Ok(DailyIncome {
        date: row.get(0)?,
        memberships: row.get(1)?,
        pos: row.get(2)?,
      })
    })
    .map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

  let total_income = memberships_total + pos_total;

  let end_date = chrono::Utc::now().format("%Y-%m-%d").to_string();
  let start_date = conn
    .query_row(
      "SELECT DATE('now', ?1)",
      [&range],
      |row| row.get::<_, String>(0),
    )
    .unwrap_or_else(|_| end_date.clone());

  Ok(IncomeReport {
    period,
    start_date,
    end_date,
    memberships_total,
    memberships_count,
    pos_total,
    pos_count,
    pos_by_category,
    total_income,
    daily_breakdown,
  })
}
