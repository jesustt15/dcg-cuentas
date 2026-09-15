export interface Plan {
  code: string;
  name: string;
  price: number;
}

export interface Athlete {
  id: string;
  name: string;
  phone: string;
  plan: string;
  status: "activo" | "suspendido";
  balance: number;
  credit_limit: number;
  plan_expires_at: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: "ropa" | "suplementos" | "implementos" | "bebidas";
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  image_path: string | null;
}

export interface Sale {
  id: string;
  athlete_id: string | null;
  athlete_name: string | null;
  subtotal: number;
  total: number;
  payment_method: "efectivo" | "cuenta" | "pago_movil";
  created_at: string;
  item_count: number;
}

export interface SaleItem {
  id: number;
  sale_id: string;
  product_id: string;
  product_name: string | null;
  qty: number;
  unit_price: number;
}

export interface SaleItemInput {
  productId: string;
  qty: number;
  unitPrice: number;
}

export interface Payment {
  id: string;
  athlete_id: string;
  amount: number;
  method: "efectivo" | "pago_movil";
  created_at: string;
}

export interface DashboardStats {
  today_sales_total: number;
  today_sales_count: number;
  active_athletes: number;
  total_debt: number;
  low_stock_count: number;
  recent_sales: Sale[];
  expiring_athletes: Athlete[];
}

export interface ImportResult {
  total_rows: number;
  imported: number;
  skipped: number;
  errors: string[];
}

export interface ExcelRow {
  row_number: number;
  nombre: string;
  telefono: string;
  plan: string;
  valid: boolean;
  error: string | null;
}

export interface DatabaseState {
  plans: Plan[];
  athletes: Athlete[];
  products: Product[];
  sales: Sale[];
  dashboard: DashboardStats | null;
  usdVes: number;
  pendingReminders: Athlete[];
  loading: boolean;
  error: string | null;
}
