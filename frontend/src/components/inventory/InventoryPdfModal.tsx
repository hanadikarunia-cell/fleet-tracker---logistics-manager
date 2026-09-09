import { useMemo } from 'react';
import { InventoryItem, InventoryMovement } from '../../types';
import {
  Printer, X, FileText, CheckCircle2, ShieldAlert,
  Download, Building2, Calendar, User, Package
} from 'lucide-react';

interface InventoryPdfModalProps {
  items: InventoryItem[];
  movements: InventoryMovement[];
  onClose: () => void;
}

const CATEGORY_UNIT_COSTS: Record<string, number> = {
  Electronics: 450,
  'Spare Parts': 1200,
  Cargo: 85,
  Tools: 180,
  Hazmat: 320,
};

export default function InventoryPdfModal({
  items,
  movements,
  onClose,
}: InventoryPdfModalProps) {
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const reportRef = `INV-AUDIT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

  // Valuation summary calculations
  const totalValue = useMemo(() => {
    return items.reduce((sum, item) => {
      const unitCost = CATEGORY_UNIT_COSTS[item.category] || 150;
      return sum + (item.quantity * unitCost);
    }, 0);
  }, [items]);

  const totalUnits = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const lowStockItems = useMemo(() => items.filter(i => i.quantity <= (i.minStockLevel || 5)), [items]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-white max-w-4xl w-full rounded-2xl border border-slate-200 shadow-2xl p-8 space-y-6 max-h-[92vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0">
        
        {/* Action Header (Hidden during actual print) */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Inventory Stock Audit & Valuation Report</h3>
              <p className="text-xs text-slate-500">Official printable PDF manifest for regulatory audit & financial ledger.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable PDF Content Sheet */}
        <div className="space-y-6 text-slate-900 font-sans">
          {/* Corporate Letterhead Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-black text-sm">
                  AA
                </div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Tangerang Fleet Logistics</h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Global Cargo & Aviation Maintenance Depot Management Division
              </p>
            </div>

            <div className="text-right text-xs">
              <span className="font-mono font-bold text-slate-800 block">Ref: {reportRef}</span>
              <span className="text-slate-500 block">{reportDate}</span>
              <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase rounded">
                Verified Audit Manifest
              </span>
            </div>
          </div>

          {/* Report Executive Summary Metrics */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Total Catalog SKUs</span>
              <span className="font-mono font-extrabold text-base text-slate-900">{items.length} SKUs</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Total Stock Volume</span>
              <span className="font-mono font-extrabold text-base text-slate-900">{totalUnits.toLocaleString()} units</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Total Valuation (USD)</span>
              <span className="font-mono font-extrabold text-base text-indigo-700">${totalValue.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Stockout Risk Items</span>
              <span className={`font-mono font-extrabold text-base ${lowStockItems.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {lowStockItems.length} SKUs
              </span>
            </div>
          </div>

          {/* Master Stock Inventory Table */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-xs uppercase text-slate-800 tracking-wider">Master Inventory Stock Ledger</h4>
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-200 text-slate-800 font-bold uppercase text-[10px]">
                  <th className="p-2 border border-slate-300">SKU Code</th>
                  <th className="p-2 border border-slate-300">Item Name</th>
                  <th className="p-2 border border-slate-300">Category</th>
                  <th className="p-2 border border-slate-300 text-center">Qty</th>
                  <th className="p-2 border border-slate-300 text-right">Est. Unit Value</th>
                  <th className="p-2 border border-slate-300 text-right">Total Value</th>
                  <th className="p-2 border border-slate-300">Location Depot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-[11px]">
                {items.map((item) => {
                  const unitCost = CATEGORY_UNIT_COSTS[item.category] || 150;
                  const itemVal = item.quantity * unitCost;

                  return (
                    <tr key={item.id}>
                      <td className="p-2 border border-slate-300 font-mono font-bold">{item.sku}</td>
                      <td className="p-2 border border-slate-300 font-bold">{item.name}</td>
                      <td className="p-2 border border-slate-300">{item.category}</td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold">{item.quantity}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono">${unitCost}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-bold">${itemVal.toLocaleString()}</td>
                      <td className="p-2 border border-slate-300">{item.location}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Critical Low Stock Warning Section */}
          {lowStockItems.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs">
              <h4 className="font-bold text-rose-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" /> Depletion Risk & Reorder Action Items ({lowStockItems.length})
              </h4>
              <ul className="list-disc list-inside space-y-1 text-rose-800 text-[11px]">
                {lowStockItems.map(i => (
                  <li key={i.id}>
                    <span className="font-mono font-bold">{i.sku}</span> - {i.name}: Current Qty <strong>{i.quantity}</strong> (Min Buffer: {i.minStockLevel || 5})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sign-off Auditor Signature Section */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-xs">
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold text-slate-800">Inventory Logistics Manager</p>
              <p className="text-slate-500 text-[10px]">Name: Hafiz Rahim</p>
              <p className="text-slate-500 text-[10px]">Date & Signature: ______________________</p>
            </div>

            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold text-slate-800">Chief Quality Auditor</p>
              <p className="text-slate-500 text-[10px]">Name: Sarah Lin (ICAO Compliance)</p>
              <p className="text-slate-500 text-[10px]">Date & Signature: ______________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
