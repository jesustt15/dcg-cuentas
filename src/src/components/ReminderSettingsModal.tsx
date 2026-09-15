import { useState, useEffect, useRef, useCallback } from "react";
import { X, Eye } from "lucide-react";
import { db } from "@/lib/db";
import { renderReminder } from "@/lib/reminder";

const DEFAULT_TEMPLATE =
  "Hola {nombre}! Te recordamos que tu plan {plan} vence el {vence}. Monto: ${monto}. Por favor realiza tu pago para mantener tu acceso activo. Gracias!";

const SAMPLE_VARS: Record<string, string> = {
  nombre: "Juan Pérez",
  plan: "Plan Familiar",
  vence: "2026-09-20",
  monto: "35",
  dias: "5",
};

interface ReminderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReminderSettingsModal({
  isOpen,
  onClose,
}: ReminderSettingsModalProps) {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Load current template when modal opens
  useEffect(() => {
    if (isOpen) {
      db.getSetting("reminder_template")
        .then((val) => {
          if (val) setTemplate(val);
          else setTemplate(DEFAULT_TEMPLATE);
        })
        .catch(() => setTemplate(DEFAULT_TEMPLATE));
      setError("");
      setSaved(false);
    }
  }, [isOpen]);

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
      if (e.target === e.currentTarget && !saving) onClose();
    },
    [onClose, saving],
  );

  const handleSave = async () => {
    if (!template.trim()) {
      setError("La plantilla no puede estar vacía");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await db.setSetting("reminder_template", template.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const preview = renderReminder(template, SAMPLE_VARS);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminder-settings-title"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl mx-4 bg-surface-low border border-divider rounded-lg shadow-2xl animate-in zoom-in-95 fade-in duration-200"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={saving}
          className="absolute top-3 right-3 text-neutral-muted hover:text-neutral transition-colors disabled:opacity-50"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-6">
          <h3
            id="reminder-settings-title"
            className="text-base font-bold font-heading text-neutral uppercase-label mb-4"
          >
            Plantilla de Recordatorio WhatsApp
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-status-error/10 border border-status-error/30 rounded text-sm text-status-error">
              {error}
            </div>
          )}

          {saved && (
            <div className="mb-4 p-3 bg-status-success/10 border border-status-success/30 rounded text-sm text-status-success">
              Plantilla guardada correctamente
            </div>
          )}

          {/* Available placeholders */}
          <div className="mb-4 p-3 bg-surface-high/50 border border-divider rounded">
            <p className="uppercase-label text-neutral-muted text-xs mb-2">
              Placeholders disponibles
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SAMPLE_VARS).map(([key]) => (
                <code
                  key={key}
                  className="px-2 py-0.5 bg-obsidian-dim border border-divider rounded text-xs text-gold font-mono"
                >
                  {`{${key}}`}
                </code>
              ))}
            </div>
          </div>

          {/* Template editor */}
          <div className="mb-4">
            <label className="uppercase-label text-neutral-muted block mb-1.5">
              Plantilla
            </label>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={4}
              className="w-full bg-[#0F0F12] border border-divider text-neutral rounded px-3 py-2 focus:border-gold focus:outline-none placeholder:text-neutral-muted font-mono text-sm resize-none"
              placeholder="Escribe tu plantilla de recordatorio..."
            />
          </div>

          {/* Live preview */}
          <div className="mb-6">
            <label className="uppercase-label text-neutral-muted block mb-1.5 flex items-center gap-1.5">
              <Eye className="w-3 h-3" />
              Vista previa
            </label>
            <div className="bg-[#0F0F12] border border-divider rounded p-3 text-sm text-neutral font-body leading-relaxed">
              {preview}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-divider">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-surface-high border border-border text-neutral rounded hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
            >
              Cerrar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : saved ? "Guardado" : "Guardar Plantilla"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
