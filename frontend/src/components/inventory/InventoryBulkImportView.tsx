import { useState, useRef, ChangeEvent } from 'react';
import { InventoryItem, CategoryType } from '../../types';
import {
  UploadCloud, FileSpreadsheet, Download, CheckCircle2,
  AlertTriangle, ShieldAlert, Sparkles, RefreshCw, FileText, X
} from 'lucide-react';

interface InventoryBulkImportViewProps {
  existingItems: InventoryItem[];
  userRole?: string;
  onBulkImportItems: (newItems: Omit<InventoryItem, 'id'>[]) => void;
}

interface ParsedImportRow {
  rowIndex: number;
  sku: string;
  name: string;
  category: CategoryType;
  quantity: number;
  unitWeight: number;
  minStockLevel: number;
  location: string;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
}

export default function InventoryBulkImportView({
  existingItems,
  userRole,
  onBulkImportItems,
}: InventoryBulkImportViewProps) {
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [hasImported, setHasImported] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample CSV Template Generator
  const handleDownloadSampleCsv = () => {
    const sampleCsv = `sku,name,category,quantity,unitWeight,minStockLevel,location
ENG-BLT-501,Turbine Drive Belt Assembly,Spare Parts,12,3.5,4,Kuala Lumpur HQ Depot
AV-GPS-802,GPS Telemetry Transceiver Unit,Electronics,8,1.2,2,Kuala Lumpur HQ Depot
MED-OXY-104,Emergency Flight Oxygen Cylinder,Hazmat,15,8.0,5,Penang Regional Hub
TOOL-WRENCH-99,Precision Hydraulic Torque Wrench,Tools,6,4.2,2,Kuala Lumpur HQ Depot`;

    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_inventory_import_manifest.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV Content
  const parseCsvContent = (csvText: string) => {
    setHasImported(false);
    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    const existingSkus = new Set(existingItems.map(i => i.sku.toLowerCase()));
    const batchSkus = new Set<string>();

    const rows: ParsedImportRow[] = [];

    // Skip header row if present
    const startIndex = lines[0].toLowerCase().includes('sku') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 2) continue;

      const sku = parts[0] || '';
      const name = parts[1] || '';
      const category = (parts[2] || 'Cargo') as CategoryType;
      const quantity = Math.max(0, parseInt(parts[3] || '1', 10));
      const unitWeight = Math.max(0.1, parseFloat(parts[4] || '1.0'));
      const minStockLevel = Math.max(1, parseInt(parts[5] || '5', 10));
      const location = parts[6] || 'Kuala Lumpur HQ Depot';

      const errors: string[] = [];
      if (!sku) errors.push('Missing SKU code');
      if (!name) errors.push('Missing Item Name');
      if (isNaN(quantity)) errors.push('Invalid quantity number');
      if (isNaN(unitWeight)) errors.push('Invalid unit weight number');

      const isDupExisting = existingSkus.has(sku.toLowerCase());
      const isDupBatch = batchSkus.has(sku.toLowerCase());
      const isDuplicate = isDupExisting || isDupBatch;

      if (sku) batchSkus.add(sku.toLowerCase());

      rows.push({
        rowIndex: i + 1,
        sku,
        name,
        category,
        quantity: isNaN(quantity) ? 1 : quantity,
        unitWeight: isNaN(unitWeight) ? 1.0 : unitWeight,
        minStockLevel: isNaN(minStockLevel) ? 5 : minStockLevel,
        location,
        isValid: errors.length === 0 && !isDuplicate,
        isDuplicate,
        errors,
      });
    }

    setParsedRows(rows);
  };

  // Handle File Upload
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawCsvText(content);
        parseCsvContent(content);
      }
    };
    reader.readAsText(file);
  };

  // Commit valid import rows
  const handleCommitImport = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    const newItemsPayload: Omit<InventoryItem, 'id'>[] = validRows.map(r => ({
      name: r.name,
      sku: r.sku,
      category: r.category,
      quantity: r.quantity,
      unitWeight: r.unitWeight,
      minStockLevel: r.minStockLevel,
      location: r.location,
    }));

    onBulkImportItems(newItemsPayload);

    setImportedCount(validRows.length);
    setHasImported(true);
    setParsedRows([]);
    setRawCsvText('');
  };

  const validRowsCount = parsedRows.filter(r => r.isValid).length;
  const duplicateRowsCount = parsedRows.filter(r => r.isDuplicate).length;
  const invalidRowsCount = parsedRows.filter(r => r.errors.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
            <UploadCloud className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">Bulk Inventory SKU Import Engine</h3>
              <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-400/40 uppercase tracking-wider">
                CSV Data Pipeline
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Batch import multiple inventory SKUs via CSV file upload or direct text paste with automated field validation and duplicate checking.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadSampleCsv}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-sm transition cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" /> Download Sample CSV
        </button>
      </div>

      {/* Success Toast Banner */}
      {hasImported && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Bulk Import Executed Successfully!</h4>
              <p className="text-xs text-emerald-700">
                Successfully imported {importedCount} new SKU items into the inventory master catalog and logged a bulk import movement record.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHasImported(false)}
            className="p-1 text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* File Upload & Text Input Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Drag & Drop File Upload */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Option 1: Upload CSV File
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">Select a `.csv` manifest file from your device.</p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/20 p-6 rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
          >
            <UploadCloud className="w-8 h-8 text-indigo-500" />
            <p className="text-xs font-bold text-slate-700">Click to Browse CSV File</p>
            <span className="text-[10px] text-slate-400">Supported format: .csv (Max 5MB)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Raw CSV Text Paste */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" /> Option 2: Paste Raw CSV Content
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">Paste comma-separated rows with header line.</p>
          </div>

          <textarea
            value={rawCsvText}
            onChange={(e) => {
              setRawCsvText(e.target.value);
              parseCsvContent(e.target.value);
            }}
            placeholder="sku,name,category,quantity,unitWeight,minStockLevel,location&#10;SKU-101,Spare Propeller,Spare Parts,10,2.5,3,Kuala Lumpur HQ Depot"
            rows={4}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Validation Preview Table & Commit Action */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-4 p-5">
          {/* Summary KPIs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900">Import Validation & Field Mapping Preview</h4>
              <p className="text-xs text-slate-500">Review validated rows before committing into the live system.</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                {validRowsCount} Valid SKUs
              </span>
              {duplicateRowsCount > 0 && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                  {duplicateRowsCount} Duplicates
                </span>
              )}
              {invalidRowsCount > 0 && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800">
                  {invalidRowsCount} Invalid
                </span>
              )}

              {userRole !== 'viewer' && (
                <button
                  type="button"
                  disabled={validRowsCount === 0}
                  onClick={handleCommitImport}
                  className={`px-5 py-2 rounded-xl text-xs font-extrabold transition shadow-sm flex items-center gap-1.5 cursor-pointer ${
                    validRowsCount > 0
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-4 h-4" /> Commit Import ({validRowsCount} Items)
                </button>
              )}
            </div>
          </div>

          {/* Validation Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="p-2.5">Row #</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">SKU</th>
                  <th className="p-2.5">Item Name</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-center">Weight</th>
                  <th className="p-2.5">Location</th>
                  <th className="p-2.5">Validation Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {parsedRows.map((row) => (
                  <tr key={row.rowIndex} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono text-slate-400 font-bold">#{row.rowIndex}</td>

                    <td className="p-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                        row.isValid
                          ? 'bg-emerald-100 text-emerald-800'
                          : row.isDuplicate
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}>
                        {row.isValid && <CheckCircle2 className="w-3 h-3" />}
                        {row.isDuplicate && <AlertTriangle className="w-3 h-3" />}
                        {!row.isValid && !row.isDuplicate && <ShieldAlert className="w-3 h-3" />}
                        {row.isValid ? 'READY' : row.isDuplicate ? 'DUPLICATE' : 'INVALID'}
                      </span>
                    </td>

                    <td className="p-2.5 font-mono font-bold text-slate-800">{row.sku || '—'}</td>
                    <td className="p-2.5 font-bold text-slate-800">{row.name || '—'}</td>
                    <td className="p-2.5 text-slate-600">{row.category}</td>
                    <td className="p-2.5 text-center font-mono font-bold">{row.quantity}</td>
                    <td className="p-2.5 text-center font-mono text-slate-600">{row.unitWeight} kg</td>
                    <td className="p-2.5 text-slate-700">{row.location}</td>

                    <td className="p-2.5">
                      {row.isDuplicate ? (
                        <span className="text-[10px] text-amber-700 font-bold">SKU already exists in catalog</span>
                      ) : row.errors.length > 0 ? (
                        <span className="text-[10px] text-rose-700 font-bold">{row.errors.join(', ')}</span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-bold">Passed validation checks</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
