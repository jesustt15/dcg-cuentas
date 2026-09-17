import { useState, useEffect, useCallback } from "react";
import { useDb } from "@/hooks/DbProvider";
import { db, productImageUrl } from "@/lib/db";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Package, Camera, Loader2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import EditProductModal from "@/components/EditProductModal";
import type { Product } from "@/types";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";

// Allowed image extensions for the file picker
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export default function Products() {
  const { state, refresh } = useDb();
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; product: Product | null }>({
    isOpen: false,
    product: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

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

  const handleDelete = async () => {
    if (!deleteConfirm.product) return;
    setDeleting(true);
    try {
      await db.deleteProduct(deleteConfirm.product.id);
      setDeleteConfirm({ isOpen: false, product: null });
      refresh();
      toast.success("Producto eliminado");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleUploadImage = useCallback(async (productId: string) => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Images", extensions: IMAGE_EXTENSIONS }],
        title: "Seleccionar imagen del producto",
      });
      if (!selected || typeof selected !== "string") return;

      setUploadingId(productId);

      // Read file bytes
      const bytes = await readFile(selected);

      // Extract extension from filename
      const ext = selected.split(".").pop()?.toLowerCase() || "jpg";

      // Upload to backend
      await db.uploadProductImage(productId, Array.from(bytes), ext);

      // Refresh to get updated product data and rebuild URLs
      refresh();
      toast.success("Imagen actualizada");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setUploadingId(null);
    }
  }, [refresh]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-heading tracking-tight text-neutral">
            Productos
          </h2>
          <p className="text-sm text-neutral-muted mt-1">
            Inventario de la tienda del box
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo Producto
        </button>
      </div>

      {/* CREATE FORM */}
      {showForm && (
        <CreateForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}

      {/* CARD GRID */}
      {state.products.length === 0 ? (
        <div className="text-center py-16 border border-divider rounded bg-surface-low">
          <p className="text-neutral-muted text-sm">No hay productos registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {state.products.map((p) => {
            const lowStock = p.stock <= p.min_stock;
            const isUploading = uploadingId === p.id;
            return (
              <ProductCard
                key={p.id}
                product={p}
                imageUrl={imageUrls[p.id] || null}
                isUploading={isUploading}
                lowStock={lowStock}
                onUploadImage={() => handleUploadImage(p.id)}
                onEdit={() => setEditingProduct(p)}
                onDelete={() => setDeleteConfirm({ isOpen: true, product: p })}
              />
            );
          })}
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, product: null })}
        onConfirm={handleDelete}
        title="Eliminar producto"
        message={
          deleteConfirm.product
            ? `¿Estás seguro de que quieres eliminar "${deleteConfirm.product.name}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleting}
      />

      {/* EDIT PRODUCT MODAL */}
      <EditProductModal
        isOpen={editingProduct !== null}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        onSave={refresh}
      />
    </div>
  );
}

// ─── Product Card ────────────────────────────────────────────────────────────

function ProductCard({
  product,
  imageUrl,
  isUploading,
  lowStock,
  onUploadImage,
  onEdit,
  onDelete,
}: {
  product: Product;
  imageUrl: string | null;
  isUploading: boolean;
  lowStock: boolean;
  onUploadImage: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const showImg = imageUrl && !imgError;

  // Reset error state when image URL changes (e.g., after re-upload)
  useEffect(() => setImgError(false), [imageUrl]);

  return (
    <div className="bg-surface-high border border-divider rounded-xl overflow-hidden flex flex-col group">
      {/* IMAGE AREA */}
      <div className="relative aspect-square bg-neutral-800 overflow-hidden">
        {showImg ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-muted gap-2">
            <Package className="w-8 h-8" />
            <span className="text-xs uppercase-label">Sin imagen</span>
          </div>
        )}

        {/* Upload overlay */}
        <button
          onClick={onUploadImage}
          disabled={isUploading}
          className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-50 cursor-pointer"
          title="Cambiar imagen"
          aria-label={`Cambiar imagen de ${product.name}`}
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-gold animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-neutral" />
          )}
        </button>

        {/* Low stock badge */}
        {lowStock && (
          <span className="absolute top-2 left-2 uppercase-label px-1.5 py-0.5 rounded bg-status-error/90 text-white text-[10px]">
            Reorden
          </span>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-3 flex flex-col flex-1 gap-1.5">
        <h3 className="text-sm font-heading font-bold text-neutral leading-tight line-clamp-2">
          {product.name}
        </h3>
        <span className="uppercase-label px-1.5 py-0.5 rounded bg-surface-highest text-neutral-subtle text-[10px] w-fit">
          {product.category}
        </span>
        <div className="flex items-baseline justify-between mt-auto pt-1">
          <span className="font-mono text-sm text-gold font-bold">
            ${product.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-xs text-neutral-muted">
            Stock: {product.stock}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-2 border-t border-divider mt-1">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-muted hover:text-gold transition-colors rounded hover:bg-gold/10"
            title="Editar"
          >
            <Pencil className="w-3 h-3" />
            Editar
          </button>
          <button
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-muted hover:text-status-error transition-colors rounded hover:bg-status-error/10"
            title="Eliminar"
          >
            <Trash2 className="w-3 h-3" />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Form ─────────────────────────────────────────────────────────────

function CreateForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("implementos");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("5");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await db.createProduct(
        name.trim(),
        category,
        parseFloat(price) || 0,
        parseFloat(cost) || 0,
        parseInt(stock) || 0,
        parseInt(minStock) || 5,
      );
      toast.success("Producto creado");
      onCreated();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#121215] border border-divider rounded p-5 space-y-4"
    >
      <h3 className="text-sm font-bold font-heading text-neutral uppercase-label">
        Nuevo Producto
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="uppercase-label text-neutral-muted block mb-1.5">Nombre</label>
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
          <label className="uppercase-label text-neutral-muted block mb-1.5">Categoría</label>
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
          <label className="uppercase-label text-neutral-muted block mb-1.5">Precio PVP ($)</label>
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
          <label className="uppercase-label text-neutral-muted block mb-1.5">Costo ($)</label>
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
          <label className="uppercase-label text-neutral-muted block mb-1.5">Stock Inicial</label>
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
          <label className="uppercase-label text-neutral-muted block mb-1.5">Stock Mínimo</label>
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
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Crear Producto"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-surface-high border border-border text-neutral rounded hover:border-gold hover:text-gold transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
