import { useState, useRef, useEffect } from "react";
import { useDb } from "@/hooks/DbProvider";
import { db, usd, formatBs, productImageUrl } from "@/lib/db";
import { toast } from "sonner";
import type { Product } from "@/types";
import { Search, Plus, Minus, X, ShoppingCart, Check, Package } from "lucide-react";

type PaymentMethod = "efectivo" | "cuenta" | "pago_movil";
type Category = "all" | "ropa" | "suplementos" | "implementos" | "bebidas";

interface CartItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export default function POS() {
  const { state, refresh } = useDb();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [athleteId, setAthleteId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [showAthleteDropdown, setShowAthleteDropdown] = useState(false);
  const athleteComboRef = useRef<HTMLDivElement>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  // Build image URLs for all products that have images
  useEffect(() => {
    async function buildUrls() {
      const urls: Record<string, string> = {};
      for (const p of state.products) {
        if (p.image_path) {
          const url = await productImageUrl(p.image_path);
          if (url) urls[p.id] = url;
        }
      }
      setImageUrls(urls);
    }
    buildUrls();
  }, [state.products]);

  const filteredProducts = state.products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || p.category === category;
    return matchSearch && matchCat;
  });

  const activeAthletes = state.athletes.filter((a) => a.status === "activo");

  const filteredAthletes = activeAthletes.filter(
    (a) =>
      athleteSearch === "" ||
      a.name.toLowerCase().includes(athleteSearch.toLowerCase()),
  );

  const selectedAthlete = athleteId
    ? state.athletes.find((a) => a.id === athleteId) ?? null
    : null;

  const subtotal = cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { productId: product.id, name: product.name, qty: 1, unitPrice: product.price }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const product = state.products.find((p) => p.id === productId);
          const newQty = i.qty + delta;
          if (newQty <= 0) return null;
          if (product && newQty > product.stock) return i;
          return { ...i, qty: newQty };
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const selectAthlete = (id: string, name: string) => {
    setAthleteId(id);
    setAthleteSearch(name);
    setShowAthleteDropdown(false);
  };

  const clearAthlete = () => {
    setAthleteId("");
    setAthleteSearch("");
    setShowAthleteDropdown(false);
  };

  const handleAthleteInputBlur = () => {
    setTimeout(() => {
      if (
        athleteComboRef.current &&
        !athleteComboRef.current.contains(document.activeElement)
      ) {
        setShowAthleteDropdown(false);
      }
    }, 150);
  };

  const handleAthleteInputChange = (val: string) => {
    setAthleteSearch(val);
    setShowAthleteDropdown(true);
    // Clear selection when search diverges from selected athlete name
    if (selectedAthlete && val !== selectedAthlete.name) {
      setAthleteId("");
    }
    if (val === "") {
      setAthleteId("");
    }
  };

  const confirmSale = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === "cuenta" && !athleteId) {
      setError("Selecciona un atleta para venta a cuenta");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      await db.createSale(
        athleteId || null,
        cart.map((i) => ({ productId: i.productId, qty: i.qty, unitPrice: i.unitPrice })),
        paymentMethod,
      );
      setCart([]);
      setAthleteId("");
      setAthleteSearch("");
      setPaymentMethod("efectivo");
      setSuccess(true);
      toast.success("Venta registrada");
      refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(String(e));
    } finally {
      setProcessing(false);
    }
  };

  const categories: { key: Category; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "ropa", label: "Ropa" },
    { key: "suplementos", label: "Suplementos" },
    { key: "implementos", label: "Implementos" },
    { key: "bebidas", label: "Bebidas" },
  ];

  return (
    <div className="flex gap-6 h-[calc(100vh-2.5rem)]">
      {/* LEFT: Product Grid (60%) */}
      <div className="flex-[3] flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold font-heading tracking-tight text-neutral">
              Punto de Venta
            </h2>
            <p className="text-sm text-neutral-muted mt-1">Registrar venta de productos</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-muted" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0F0F12] border border-divider text-neutral rounded pl-10 pr-4 py-2 focus:border-gold focus:outline-none placeholder:text-neutral-muted"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${
                category === c.key
                  ? "bg-gold text-obsidian-dim"
                  : "bg-surface-high border border-border text-neutral-subtle hover:border-gold hover:text-gold"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-auto grid grid-cols-2 lg:grid-cols-3 gap-3 content-start">
          {filteredProducts.map((p) => {
            const outOfStock = p.stock <= 0;
            const pImgUrl = imageUrls[p.id] || null;
            const showImg = pImgUrl && !imgErrors.has(p.id);
            return (
              <div
                key={p.id}
                className={`bg-[#121215] border border-divider rounded p-3 flex flex-col ${
                  outOfStock ? "opacity-40" : "hover:border-gold/60"
                } transition-colors`}
              >
                {/* Image thumbnail */}
                <div className="w-full aspect-square rounded bg-neutral-800 overflow-hidden mb-2 shrink-0">
                  {showImg ? (
                    <img
                      src={pImgUrl}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={() => setImgErrors((prev) => new Set(prev).add(p.id))}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-muted">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm text-neutral font-medium leading-tight line-clamp-2">{p.name}</span>
                  <span className="uppercase-label px-1.5 py-0.5 rounded bg-surface-high text-neutral-muted shrink-0 ml-2 text-[9px]">
                    {p.category}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-mono font-bold text-base text-gold">{usd(p.price)}</span>
                  <span
                    className={`text-xs font-mono ${
                      p.stock <= p.min_stock ? "text-status-error" : "text-neutral-muted"
                    }`}
                  >
                    {p.stock} uds
                  </span>
                </div>
                <button
                  onClick={() => addToCart(p)}
                  disabled={outOfStock}
                  className="mt-2 w-full py-1.5 text-xs font-bold uppercase rounded bg-surface-high border border-border text-neutral hover:border-gold hover:text-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {outOfStock ? "Sin Stock" : "+ Agregar"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Cart Panel (40%) */}
      <div className="flex-[2] bg-[#121215] border border-divider rounded flex flex-col min-w-[300px]">
        <div className="p-4 border-b border-divider">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-gold" />
            <h3 className="text-sm font-bold font-heading text-neutral uppercase-label">
              Carrito de Venta
            </h3>
          </div>

          {/* Athlete Selector — Searchable Combobox */}
          <div className="mb-3">
            <label className="uppercase-label text-neutral-muted block mb-1.5">
              Atleta
            </label>
            <div ref={athleteComboRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder={athleteId ? "" : "Venta mostrador"}
                  value={athleteSearch}
                  onChange={(e) => handleAthleteInputChange(e.target.value)}
                  onFocus={() => setShowAthleteDropdown(true)}
                  onBlur={handleAthleteInputBlur}
                  className="w-full bg-[#0F0F12] border border-divider text-neutral rounded pl-10 pr-8 py-2 focus:border-gold focus:outline-none text-sm placeholder:text-neutral-muted"
                />
                {athleteSearch && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      clearAthlete();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface-high text-neutral-muted hover:text-neutral transition-colors"
                    tabIndex={-1}
                    aria-label="Limpiar atleta"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filtered dropdown */}
              {showAthleteDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-[#121215] border border-divider rounded-lg shadow-lg max-h-[220px] overflow-y-auto">
                  {activeAthletes.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-neutral-muted">
                      No hay atletas activos
                    </div>
                  ) : filteredAthletes.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-neutral-muted">
                      No se encontraron atletas
                    </div>
                  ) : (
                    <>
                      {athleteSearch === "" && (
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectAthlete("", "");
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-neutral-muted hover:bg-gold/10 transition-colors border-b border-divider"
                        >
                          Venta mostrador
                        </button>
                      )}
                      {filteredAthletes.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectAthlete(a.id, a.name);
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-gold/10 transition-colors flex items-center justify-between gap-2 ${
                            athleteId === a.id ? "bg-gold/5" : ""
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-neutral truncate">
                              {a.name}
                            </div>
                            <div className="text-xs text-neutral-muted">
                              {a.plan}
                            </div>
                          </div>
                          <span
                            className={`font-mono text-xs shrink-0 ${
                              a.balance > 0
                                ? "text-status-error"
                                : "text-neutral-muted"
                            }`}
                          >
                            {usd(a.balance)}
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Selected athlete info */}
            {selectedAthlete && (
              <div className="flex items-center justify-between mt-1.5 px-1">
                <span className="text-xs text-neutral-muted truncate">
                  Atleta:{" "}
                  <span className="text-neutral">{selectedAthlete.name}</span>
                  {" · "}
                  Plan:{" "}
                  <span className="text-neutral">{selectedAthlete.plan}</span>
                  {" · "}
                  Saldo:{" "}
                  <span
                    className={
                      selectedAthlete.balance > 0
                        ? "text-status-error"
                        : "text-neutral"
                    }
                  >
                    {usd(selectedAthlete.balance)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={clearAthlete}
                  className="p-0.5 rounded hover:bg-surface-high text-neutral-muted hover:text-neutral shrink-0 ml-2 transition-colors"
                  title="Quitar atleta"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-8 h-8 mx-auto text-neutral-muted/40 mb-2" />
              <p className="text-sm text-neutral-muted">Carrito vacío</p>
              <p className="uppercase-label text-neutral-muted/60 mt-1">
                Agrega productos para vender
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-2 bg-surface-low rounded p-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral truncate">{item.name}</p>
                  <p className="text-xs text-neutral-muted font-mono">{usd(item.unitPrice)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQty(item.productId, -1)}
                    className="p-1 rounded hover:bg-surface-high text-neutral-muted hover:text-neutral"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono text-sm text-neutral w-6 text-center">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.productId, 1)}
                    className="p-1 rounded hover:bg-surface-high text-neutral-muted hover:text-neutral"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="font-mono text-sm text-neutral w-16 text-right">
                  {usd(item.qty * item.unitPrice)}
                </span>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="p-1 rounded hover:bg-surface-high text-neutral-muted hover:text-status-error"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Totals + Payment */}
        <div className="p-4 border-t border-divider space-y-3">
          <div className="flex justify-between items-center">
            <span className="uppercase-label text-neutral-muted">Subtotal</span>
            <span className="font-mono font-bold text-lg text-neutral">{usd(subtotal)}</span>
          </div>

          {/* Bs Equivalent */}
          <div className="flex justify-between items-center">
            <span className="uppercase-label text-neutral-muted/60">≈ Bs</span>
            <span className="font-mono text-sm text-neutral-muted">{formatBs(subtotal, state.usdVes)}</span>
          </div>

          {/* Pago Móvil Bs prominent */}
          {paymentMethod === "pago_movil" && (
            <div className="flex justify-between items-center bg-status-info/10 rounded px-3 py-2 border border-status-info/20">
              <span className="uppercase-label text-status-info">Total Bs</span>
              <span className="font-mono font-bold text-lg text-status-info">{formatBs(subtotal, state.usdVes)}</span>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="uppercase-label text-neutral-muted block mb-2">Método de Pago</label>
            <div className="grid grid-cols-3 gap-2">
              {(["efectivo", "cuenta", "pago_movil"] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  disabled={m === "cuenta" && !athleteId}
                  className={`py-2 text-xs font-bold uppercase rounded border transition-colors ${
                    paymentMethod === m
                      ? m === "pago_movil"
                        ? "bg-status-info/10 text-status-info border-status-info"
                        : "bg-gold text-obsidian-dim border-gold"
                      : "bg-surface-high border-border text-neutral-subtle hover:border-gold hover:text-gold"
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  {m === "cuenta" ? "A Cuenta" : m === "pago_movil" ? "Pago Móvil" : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-status-error">{error}</p>
          )}

          {success && (
            <div className="flex items-center gap-2 text-status-success text-sm">
              <Check className="w-4 h-4" />
              <span>Venta registrada exitosamente</span>
            </div>
          )}

          <button
            onClick={confirmSale}
            disabled={cart.length === 0 || processing}
            className="w-full py-3 text-sm font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? "Procesando..." : `Confirmar Venta — ${usd(subtotal)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
