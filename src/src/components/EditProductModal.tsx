import { useState, useEffect, useRef, useCallback } from "react";
import { X, Camera, Loader2, Package } from "lucide-react";
import { db, productImageUrl } from "@/lib/db";
import { toast } from "sonner";
import type { Product } from "@/types";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSave: () => void;
}

export default function EditProductModal({
  isOpen,
  onClose,
  product,
  onSave,
}: EditProductModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("implementos");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Initialize form with product data when modal opens
  useEffect(() => {
    if (product && isOpen) {
      setName(product.name);
      setCategory(product.category);
      setPrice(product.price.toString());
      setCost(product.cost.toString());
      setStock(product.stock.toString());
      setMinStock(product.min_stock.toString());
      setError("");

      // Build image URL
      if (product.image_path) {
        productImageUrl(product.image_path).then(setImageUrl);
        setImgError(false);
      } else {
        setImageUrl(null);
      }
    }
  }, [product, isOpen]);

  // Escape key closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, saving]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !saving) {
        onClose();
      }
    },
    [onClose, saving],
  );

  const handleUploadImage = async () => {
    if (!product) return;
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Images", extensions: IMAGE_EXTENSIONS }],
        title: "Seleccionar imagen del producto",
      });
      if (!selected || typeof selected !== "string") return;

      setUploading(true);
      setError("");

      const bytes = await readFile(selected);
      const ext = selected.split(".").pop()?.toLowerCase() || "jpg";
      await db.uploadProductImage(product.id, Array.from(bytes), ext);

      // Rebuild URL and save
      onSave();
      // Close modal since parent will refresh and reopen with new data
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    const parsedPrice = parseFloat(price);
    const parsedCost = parseFloat(cost);
    const parsedStock = parseInt(stock);
    const parsedMinStock = parseInt(minStock);

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError("El precio debe ser un número positivo");
      return;
    }
    if (isNaN(parsedCost) || parsedCost < 0) {
      setError("El costo debe ser un número positivo");
      return;
    }
    if (isNaN(parsedStock) || parsedStock < 0) {
      setError("El stock debe ser un número positivo");
      return;
    }
    if (isNaN(parsedMinStock) || parsedMinStock < 0) {
      setError("El stock mínimo debe ser un número positivo");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await db.updateProduct(
        product.id,
        name.trim(),
        category,
        parsedPrice,
        parsedCost,
        parsedStock,
        parsedMinStock,
      );
      onSave();
      onClose();
      toast.success("Producto editado");
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-product-title"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl mx-4 bg-surface-low border border-divider rounded-lg shadow-2xl animate-in zoom-in-95 fade-in duration-200"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={saving || uploading}
          className="absolute top-3 right-3 text-neutral-muted hover:text-neutral transition-colors disabled:opacity-50"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Title */}
          <h3
            id="edit-product-title"
            className="text-base font-bold font-heading text-neutral uppercase-label mb-4"
          >
            Editar Producto
          </h3>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-status-error/10 border border-status-error/30 rounded text-sm text-status-error">
              {error}
            </div>
          )}

          {/* Image preview + upload */}
          <div className="mb-4 flex items-start gap-4">
            <div className="relative w-28 h-28 rounded-lg overflow-hidden bg-neutral-800 shrink-0 border border-divider">
              {imageUrl && !imgError ? (
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-muted gap-1">
                  <Package className="w-6 h-6" />
                  <span className="text-[9px] uppercase-label">Sin imagen</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleUploadImage}
                disabled={uploading}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-surface-high border border-divider text-neutral rounded hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                {uploading ? "Subiendo..." : imageUrl ? "Cambiar imagen" : "Subir imagen"}
              </button>
              <p className="text-[10px] text-neutral-muted max-w-[200px]">
                JPG, PNG o WebP. Máximo 5 MB.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="uppercase-label text-neutral-muted block mb-1.5">
                  Nombre
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none placeholder:text-neutral-muted"
                  placeholder="Nombre del producto"
                />
              </div>
              <div>
                <label className="uppercase-label text-neutral-muted block mb-1.5">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none"
                >
                  <option value="ropa">Ropa</option>
                  <option value="suplementos">Suplementos</option>
                  <option value="implementos">Implementos</option>
                  <option value="bebidas">Bebidas</option>
                </select>
              </div>
              <div>
                <label className="uppercase-label text-neutral-muted block mb-1.5">
                  Precio PVP ($)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none font-mono placeholder:text-neutral-muted"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="uppercase-label text-neutral-muted block mb-1.5">
                  Costo ($)
                </label>
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none font-mono placeholder:text-neutral-muted"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="uppercase-label text-neutral-muted block mb-1.5">
                  Stock
                </label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  min="0"
                  className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none font-mono placeholder:text-neutral-muted"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="uppercase-label text-neutral-muted block mb-1.5">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  min="0"
                  className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none font-mono placeholder:text-neutral-muted"
                  placeholder="5"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || uploading}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-surface-high border border-border text-neutral rounded hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
