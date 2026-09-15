import { useState, useEffect, useRef, useCallback } from "react";
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { db } from "@/lib/db";
import type { ExcelRow, ImportResult } from "@/types";

interface ImportAthletesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Step = "select" | "preview" | "importing" | "done";

export default function ImportAthletesModal({
  isOpen,
  onClose,
  onImported,
}: ImportAthletesModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [previewRows, setPreviewRows] = useState<ExcelRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep("select");
      setFilePath(null);
      setFileName("");
      setPreviewRows([]);
      setImportResult(null);
      setError("");
      setLoadingPreview(false);
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step !== "importing") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, step]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && step !== "importing") onClose();
    },
    [onClose, step],
  );

  const handleSelectFile = async () => {
    const selected = await open({
      filters: [{ name: "Excel", extensions: ["xlsx", "xls"] }],
      multiple: false,
    });
    if (!selected) return;

    const path = typeof selected === "string" ? selected : selected[0];
    setFilePath(path);
    setFileName(path.split(/[/\\]/).pop() || "archivo.xlsx");
    setError("");
    setLoadingPreview(true);

    try {
      const rows = await db.previewExcelAthletes(path);
      setPreviewRows(rows);
      setStep("preview");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleImport = async () => {
    if (!filePath) return;
    setStep("importing");
    setError("");

    try {
      const result = await db.importAthletesFromExcel(filePath);
      setImportResult(result);
      setStep("done");
      onImported();
    } catch (err) {
      setError(String(err));
      setStep("preview");
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  const validRows = previewRows.filter((r) => r.valid);
  const invalidRows = previewRows.filter((r) => !r.valid);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-athletes-title"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl mx-4 bg-surface-low border border-divider rounded-lg shadow-2xl animate-in zoom-in-95 fade-in duration-200 max-h-[90vh] flex flex-col"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={step === "importing"}
          className="absolute top-3 right-3 text-neutral-muted hover:text-neutral transition-colors disabled:opacity-50"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <h3
            id="import-athletes-title"
            className="text-base font-bold font-heading text-neutral uppercase-label mb-4"
          >
            Importar Atletas desde Excel
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-status-error/10 border border-status-error/30 rounded text-sm text-status-error">
              {error}
            </div>
          )}

          {/* STEP 1: File Selection */}
          {step === "select" && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-muted">
                Selecciona un archivo Excel con las columnas:{" "}
                <span className="text-neutral font-semibold">Nombre</span>,{" "}
                <span className="text-neutral font-semibold">Teléfono</span>,{" "}
                <span className="text-neutral font-semibold">Plan</span>.
              </p>

              {/* Format reference */}
              <div className="bg-[#121215] border border-divider rounded p-4">
                <p className="uppercase-label text-neutral-muted text-xs mb-2">
                  Formato esperado
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-divider">
                      <th className="text-left py-1.5 text-neutral-muted font-medium">Nombre</th>
                      <th className="text-left py-1.5 text-neutral-muted font-medium">Teléfono</th>
                      <th className="text-left py-1.5 text-neutral-muted font-medium">Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-neutral-muted">
                      <td className="py-1.5">Juan Pérez</td>
                      <td className="py-1.5">0414-1234567</td>
                      <td className="py-1.5">6DIAS</td>
                    </tr>
                    <tr className="text-neutral-muted">
                      <td className="py-1.5">María López</td>
                      <td className="py-1.5">0424-9876543</td>
                      <td className="py-1.5">3DIAS</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleSelectFile}
                disabled={loadingPreview}
                className="w-full flex items-center justify-center gap-3 px-4 py-4 border-2 border-dashed border-divider rounded-lg text-neutral-muted hover:border-gold hover:text-gold transition-colors"
              >
                {loadingPreview ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Leyendo archivo...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-5 h-5" />
                    Seleccionar archivo Excel
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="w-4 h-4 text-gold" />
                <span className="text-neutral font-medium truncate">{fileName}</span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-status-success">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {validRows.length} para importar
                </span>
                {invalidRows.length > 0 && (
                  <span className="flex items-center gap-1.5 text-status-error">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {invalidRows.length} con errores
                  </span>
                )}
              </div>

              {/* Preview table */}
              <div className="bg-[#121215] border border-divider rounded overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-[#121215]">
                    <tr className="border-b border-divider">
                      <th className="text-left px-4 py-2 uppercase-label text-neutral-muted text-xs">#</th>
                      <th className="text-left px-4 py-2 uppercase-label text-neutral-muted text-xs">Nombre</th>
                      <th className="text-left px-4 py-2 uppercase-label text-neutral-muted text-xs">Teléfono</th>
                      <th className="text-left px-4 py-2 uppercase-label text-neutral-muted text-xs">Plan</th>
                      <th className="text-left px-4 py-2 uppercase-label text-neutral-muted text-xs">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr
                        key={row.row_number}
                        className={`border-b border-divider last:border-0 ${
                          !row.valid
                            ? "bg-status-error/10 border-l-2 border-l-status-error"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-2 text-xs text-neutral-muted font-mono">
                          {row.row_number}
                        </td>
                        <td className="px-4 py-2 text-sm text-neutral font-medium truncate max-w-[180px]">
                          {row.nombre || "—"}
                        </td>
                        <td className="px-4 py-2 text-sm text-neutral-muted truncate max-w-[120px]">
                          {row.telefono || "—"}
                        </td>
                        <td className="px-4 py-2">
                          <span className="uppercase-label px-1.5 py-0.5 rounded bg-surface-high text-gold text-[10px]">
                            {row.plan || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {row.valid ? (
                            <span className="text-status-success">OK</span>
                          ) : (
                            <span className="text-status-error" title={row.error || ""}>
                              {row.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-surface-high border border-border text-neutral rounded hover:border-gold hover:text-gold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={validRows.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importar {validRows.length} atleta{validRows.length !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-gold" />
              <p className="text-sm text-neutral-muted">Importando atletas...</p>
            </div>
          )}

          {/* STEP 4: Done */}
          {step === "done" && importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-status-success/10 border border-status-success/30 rounded">
                <CheckCircle2 className="w-6 h-6 text-status-success shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-status-success">
                    Importación completada
                  </p>
                  <p className="text-xs text-neutral-muted mt-0.5">
                    {importResult.imported} de {importResult.total_rows} atletas importados
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#121215] border border-divider rounded p-3 text-center">
                  <p className="text-2xl font-bold text-neutral">{importResult.total_rows}</p>
                  <p className="text-xs text-neutral-muted uppercase-label">Total filas</p>
                </div>
                <div className="bg-[#121215] border border-divider rounded p-3 text-center">
                  <p className="text-2xl font-bold text-status-success">{importResult.imported}</p>
                  <p className="text-xs text-neutral-muted uppercase-label">Importados</p>
                </div>
                <div className="bg-[#121215] border border-divider rounded p-3 text-center">
                  <p className="text-2xl font-bold text-status-error">{importResult.skipped}</p>
                  <p className="text-xs text-neutral-muted uppercase-label">Omitidos</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="uppercase-label text-neutral-muted text-xs">
                    Errores ({importResult.errors.length})
                  </p>
                  <div className="bg-[#121215] border border-divider rounded p-3 max-h-40 overflow-y-auto space-y-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-status-error flex items-start gap-1.5">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        {err}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gold text-obsidian-dim rounded hover:bg-gold-light transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
