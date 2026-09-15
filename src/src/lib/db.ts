import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { join, appDataDir } from "@tauri-apps/api/path";
import type { Plan, Athlete, Product, Sale, SaleItem, Payment, DashboardStats, ImportResult, ExcelRow } from "../types";

export const db = {
  async init(): Promise<void> {
    await invoke("init_db");
  },

  // Plans
  async getPlans(): Promise<Plan[]> {
    return invoke("get_plans");
  },

  // Athletes
  async getAthletes(): Promise<Athlete[]> {
    return invoke("get_athletes");
  },

  async getAthlete(id: string): Promise<Athlete> {
    return invoke("get_athlete", { id });
  },

  async createAthlete(
    name: string,
    phone: string,
    plan: string,
    creditLimit?: number,
    planExpiresAt?: string | null,
  ): Promise<string> {
    return invoke("create_athlete", { name, phone, plan, creditLimit, planExpiresAt });
  },

  async updateAthleteStatus(id: string, status: string): Promise<void> {
    await invoke("update_athlete_status", { id, status });
  },

  async updateAthlete(
    id: string,
    name: string,
    phone: string,
    plan: string,
    creditLimit: number,
    planExpiresAt?: string | null,
  ): Promise<void> {
    await invoke("update_athlete", { id, name, phone, plan, creditLimit, planExpiresAt });
  },

  async deleteAthlete(id: string): Promise<void> {
    await invoke("delete_athlete", { id });
  },

  async addPayment(athleteId: string, amount: number, method: string): Promise<void> {
    await invoke("add_payment", { athleteId, amount, method });
  },

  async payMonthlyPlan(athleteId: string, amount: number, method: string): Promise<void> {
    await invoke("pay_monthly_plan", { athleteId, amount, method });
  },

  async getAthletePayments(athleteId: string): Promise<Payment[]> {
    return invoke("get_athlete_payments", { athleteId });
  },

  async getAllPayments(): Promise<Payment[]> {
    return invoke("get_all_payments");
  },

  async getAthleteSales(athleteId: string): Promise<Sale[]> {
    return invoke("get_athlete_sales", { athleteId });
  },

  // Products
  async getProducts(): Promise<Product[]> {
    return invoke("get_products");
  },

  async createProduct(
    name: string,
    category: string,
    price: number,
    cost: number,
    stock: number,
    minStock: number,
  ): Promise<string> {
    return invoke("create_product", { name, category, price, cost, stock, minStock });
  },

  async updateProduct(
    id: string,
    name: string,
    category: string,
    price: number,
    cost: number,
    stock: number,
    minStock: number,
  ): Promise<void> {
    await invoke("update_product", { id, name, category, price, cost, stock, minStock });
  },

  async deleteProduct(id: string): Promise<void> {
    await invoke("delete_product", { id });
  },

  async uploadProductImage(
    productId: string,
    imageData: number[],
    extension: string,
  ): Promise<string> {
    return invoke("upload_product_image", { productId, imageData, extension });
  },

  async getImagesDir(): Promise<string> {
    return invoke("get_images_dir");
  },

  // Sales
  async createSale(
    athleteId: string | null,
    items: { productId: string; qty: number; unitPrice: number }[],
    paymentMethod: string,
  ): Promise<string> {
    return invoke("create_sale", {
      athleteId,
      items: items.map((i) => ({
        product_id: i.productId,
        qty: i.qty,
        unit_price: i.unitPrice,
      })),
      paymentMethod,
    });
  },

  async getSales(): Promise<Sale[]> {
    return invoke("get_sales");
  },

  async getSaleItems(saleId: string): Promise<SaleItem[]> {
    return invoke("get_sale_items", { saleId });
  },

  // Dashboard
  async getDashboard(): Promise<DashboardStats> {
    return invoke("get_dashboard");
  },

  async getExpiringAthletes(): Promise<Athlete[]> {
    return invoke("get_expiring_athletes");
  },

  // Settings
  async getUsdVes(): Promise<number> {
    return invoke("get_usd_ves");
  },

  async setUsdVes(rate: number): Promise<void> {
    await invoke("set_usd_ves", { rate });
  },

  async fetchBcvRate(): Promise<number> {
    return invoke("fetch_bcv_rate");
  },

  async maybeAutoFetchBcv(): Promise<number | null> {
    return invoke("maybe_auto_fetch_bcv");
  },

  // Excel Import
  async previewExcelAthletes(filePath: string): Promise<ExcelRow[]> {
    return invoke("preview_excel_athletes", { filePath });
  },

  async importAthletesFromExcel(filePath: string): Promise<ImportResult> {
    return invoke("import_athletes_from_excel", { filePath });
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export async function productImageUrl(filename: string | null): Promise<string | null> {
  if (!filename) return null;
  const base = await appDataDir();
  const fullPath = await join(base, "images", filename);
  return convertFileSrc(fullPath);
}

export function usd(x: number): string {
  return "$" + x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatBs(amount: number, rate: number): string {
  return `Bs ${(amount * rate).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function methodLabel(method: string): string {
  if (method === "pago_movil") return "PAGO MÓVIL";
  if (method === "cuenta") return "A CUENTA";
  return method.toUpperCase();
}

export function methodBadgeClass(method: string): string {
  if (method === "pago_movil") return "bg-status-info/10 text-status-info";
  return "bg-surface-high text-neutral-subtle";
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}
