import { useEffect, useRef, useCallback } from "react";
import { AlertTriangle, Info, AlertCircle, X } from "lucide-react";

type Variant = "danger" | "warning" | "info" | "default";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  loading?: boolean;
  customBody?: React.ReactNode;
}

const variantConfig: Record<Variant, { icon: typeof AlertTriangle; accent: string; btnBg: string; btnHover: string }> = {
  danger: {
    icon: AlertTriangle,
    accent: "text-status-error",
    btnBg: "bg-status-error",
    btnHover: "hover:bg-status-error/90",
  },
  warning: {
    icon: AlertCircle,
    accent: "text-amber-400",
    btnBg: "bg-amber-500",
    btnHover: "hover:bg-amber-500/90",
  },
  info: {
    icon: Info,
    accent: "text-status-info",
    btnBg: "bg-status-info",
    btnHover: "hover:bg-status-info/90",
  },
  default: {
    icon: Info,
    accent: "text-gold",
    btnBg: "bg-gold",
    btnHover: "hover:bg-gold-light",
  },
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
  customBody,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cfg = variantConfig[variant];
  const Icon = cfg.icon;

  // Escape key closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, loading]);

  // Focus trap: focus confirm button when opened
  useEffect(() => {
    if (isOpen) {
      confirmBtnRef.current?.focus();
    }
  }, [isOpen]);

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
      if (e.target === e.currentTarget && !loading) {
        onClose();
      }
    },
    [onClose, loading],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-md mx-4 bg-surface-low border border-divider rounded-lg shadow-2xl animate-in zoom-in-95 fade-in duration-200"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-3 right-3 text-neutral-muted hover:text-neutral transition-colors disabled:opacity-50"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 mt-0.5 ${cfg.accent}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3
                id="confirm-dialog-title"
                className="text-base font-bold font-heading text-neutral"
              >
                {title}
              </h3>
              <p className="mt-2 text-sm text-neutral-muted leading-relaxed">
                {message}
              </p>
              {customBody && <div className="mt-3">{customBody}</div>}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-surface-high border border-border text-neutral rounded hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmBtnRef}
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider text-obsidian-dim rounded transition-colors disabled:opacity-50 ${cfg.btnBg} ${cfg.btnHover}`}
            >
              {loading ? "Procesando..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
