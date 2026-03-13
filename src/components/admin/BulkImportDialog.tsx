import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export interface ColumnMapping {
  /** The key used in the parsed row object */
  key: string;
  /** Human-readable label shown in template */
  label: string;
  /** Whether this field is required */
  required?: boolean;
  /** Example value for the template */
  example?: string;
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  columns: ColumnMapping[];
  /** Called with parsed rows. Should return { success: number; errors: string[] } */
  onImport: (rows: Record<string, string>[]) => Promise<{ success: number; errors: string[] }>;
}

export default function BulkImportDialog({ open, onOpenChange, title, columns, onImport }: BulkImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  const reset = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const parseFile = async (f: File) => {
    const data = await f.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonRows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (jsonRows.length === 0) {
      toast.error("File is empty or has no data rows");
      return;
    }

    // Normalize headers: lowercase, trim, replace spaces with underscores
    const normalized = jsonRows.map((row) => {
      const out: Record<string, string> = {};
      for (const [key, val] of Object.entries(row)) {
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, "_");
        out[normalizedKey] = String(val).trim();
      }
      return out;
    });

    // Validate required columns exist
    const fileKeys = Object.keys(normalized[0]);
    const missing = columns
      .filter((c) => c.required)
      .filter((c) => !fileKeys.includes(c.key));

    if (missing.length > 0) {
      toast.error(`Missing required columns: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }

    setFile(f);
    setPreview(normalized.slice(0, 5));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonRows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const normalized = jsonRows.map((row) => {
        const out: Record<string, string> = {};
        for (const [key, val] of Object.entries(row)) {
          out[key.trim().toLowerCase().replace(/\s+/g, "_")] = String(val).trim();
        }
        return out;
      });

      const res = await onImport(normalized);
      setResult(res);
      if (res.success > 0) toast.success(`${res.success} items imported successfully`);
      if (res.errors.length > 0) toast.error(`${res.errors.length} rows had errors`);
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      Object.fromEntries(columns.map((c) => [c.label, c.example || ""])),
    ]);
    // Set header row to use labels
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${title.toLowerCase().replace(/\s+/g, "-")}-template.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Bulk Import — {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Download template */}
          <Button variant="outline" size="sm" className="w-full" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template (.xlsx)
          </Button>

          {/* Required columns info */}
          <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
            <p className="font-medium text-foreground mb-1">Required columns:</p>
            <p>{columns.filter((c) => c.required).map((c) => c.label).join(", ")}</p>
            <p className="mt-1">Optional: {columns.filter((c) => !c.required).map((c) => c.label).join(", ") || "None"}</p>
          </div>

          {/* File drop zone */}
          {!file ? (
            <label
              className="flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium text-foreground">Drop CSV or Excel file here</span>
              <span className="text-xs text-muted-foreground mt-1">or click to browse</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
              <FileSpreadsheet className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{preview.length > 0 ? `Preview: ${preview.length} rows shown` : "Processing..."}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={reset}>Change</Button>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && !result && (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/50">
                    {columns.map((c) => (
                      <th key={c.key} className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap">
                        {c.label}{c.required ? " *" : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {columns.map((c) => (
                        <td key={c.key} className="px-3 py-2 text-muted-foreground whitespace-nowrap max-w-[150px] truncate">
                          {row[c.key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">{result.success} items imported successfully</span>
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 max-h-32 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-destructive mb-1">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Import button */}
          {file && !result && (
            <Button className="w-full" onClick={handleImport} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {importing ? "Importing..." : "Import All Rows"}
            </Button>
          )}

          {result && (
            <Button className="w-full" variant="outline" onClick={() => { reset(); handleClose(false); }}>
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
