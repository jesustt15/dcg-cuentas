import { invoke } from "@tauri-apps/api/core";
import type { Plan, Athlete, Product, Sale, SaleItem, DashboardStats } from "../types";

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
  ): Promise<string> {
    return invoke("create_athlete", { name, phone, plan, creditLimit });
  },

  async updateAthleteStatus(id: string, status: string): Promise<void> {
    await invoke("update_athlete_status", { id, status });
  },

  async addPayment(athleteId: string, amount: number, method: string): Promise<void> {
    await invoke("add_payment", { athleteId, amount, method });
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

  // Settings
  async getUsdVes(): Promise<number> {
    return invoke("get_usd_ves");
  },

  async setUsdVes(rate: number): Promise<void> {
    await invoke("set_usd_ves", { rate });
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
