import { useState, useMemo, FormEvent } from 'react';
import { InventoryItem, InventoryMovement } from '../../types';
import {
  History, Search, Filter, Download, Plus, ArrowLeftRight,
  RefreshCw, Package, Truck, ShieldAlert, FileText, CheckCircle2,
  X, Calendar, User, Sparkles
} from 'lucide-react';

interface InventoryMovementHistoryViewProps {
  movements: InventoryMovement[];
  items: InventoryItem[];
  userRole?: string;
  onRecordMovement: (movement: Omit<InventoryMovement, 'id' | 'timestamp'>) => void;
  onEditItemQuantity: (itemId: string, newQty: number) => void;
}

export default function InventoryMovementHistoryView({
  movements,
  items,
  userRole,
  onRecordMovement,
  onEditItemQuantity,
}: InventoryMovementHistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showRecordModal, setShowRecordModal] = useState(false);

  // Manual movement form states
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [movementType, setMovementType] = useState<'restock' | 'transfer' | 'dispatch' | 'audit_adjustment'>('transfer');
  const [quantityDelta, setQuantityDelta] = useState<number>(10);
  const [fromLocation, setFromLocation] = useState('Tangerang HQ Depot');
  const [toLocation, setToLocation] = useState('Rapid Van 01 (V-101)');
  const [performedBy, setPerformedBy] = useState('Hafiz Rahim (Inventory Lead)');
  const [notes, setNotes] = useState('');

  // Filtered movements list
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term ||
        m.sku.toLowerCase().includes(term) ||
        m.itemName.toLowerCase().includes(term) ||
        m.performedBy.toLowerCase().includes(term) ||
        m.fromLocation.toLowerCase().includes(term) ||
        m.toLocation.toLowerCase().includes(term) ||
        (m.notes && m.notes.toLowerCase().includes(term));

      const matchesType = typeFilter === 'all' || m.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [movements, searchTerm, typeFilter]);

  // Handle Export CSV
  const handleExportCsv = () => {
    const headers = ['ID', 'Timestamp', 'SKU', 'Item Name', 'Type', 'Quantity Delta', 'Prev Stock', 'New Stock', 'From', 'To', 'Performed By', 'Notes'];
    const rows = filteredMovements.map(m => [
      m.id,
      m.timestamp,
      `"${m.sku}"`,
      `"${m.itemName}"`,
      m.type,
      m.quantityDelta,
      m.previousQuantity,
      m.newQuantity,
      `"${m.fromLocation}"`,
      `"${m.toLocation}"`,
      `"${m.performedBy}"`,
      `"${m.notes || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventory_movement_history_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit manual movement form
  const handleSubmitMovement = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return;

    const targetItem = items.find(i => i.id === selectedItemId);
    if (!targetItem) return;

    const delta = Number(quantityDelta);
    const prevQty = targetItem.quantity;
    const newQty = Math.max(0, prevQty + delta);

    // Record movement entry
    onRecordMovement({
      itemId: targetItem.id,
      sku: targetItem.sku,
      itemName: targetItem.name,
      type: movementType,
      quantityDelta: delta,
      previousQuantity: prevQty,
      newQuantity: newQty,
      fromLocation,
      toLocation,
      performedBy,
      notes,
    });

    // Update item quantity
    onEditItemQuantity(targetItem.id, newQty);

    // Reset & close
    setShowRecordModal(false);
    setNotes('');
  };

  // Movement type badge renderer
  const renderTypeBadge = (type: InventoryMovement['type']) => {
    switch (type) {
      case 'restock':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <RefreshCw className="w-3 h-3" /> RESTOCK
          </span>
        );
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
            <ArrowLeftRight className="w-3 h-3" /> TRANSFER
          </span>
        );
      case 'dispatch':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
            <Truck className="w-3 h-3" /> DISPATCH
          </span>
        );
      case 'audit_adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
            <ShieldAlert className="w-3 h-3" /> ADJUSTMENT
          </span>
        );
      case 'bulk_import':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <FileText className="w-3 h-3" /> BULK IMPORT
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              Inventory Movement Audit History Log
            </h3>
            <p className="text-xs text-slate-500">
              Complete chain-of-custody audit trial tracking restocks, vehicle transfers, dispatches, and inventory count adjustments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer border border-slate-200"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>

          {userRole !== 'viewer' && (
            <button
              type="button"
              onClick={() => {
                if (items.length > 0 && !selectedItemId) {
                  setSelectedItemId(items[0].id);
                }
                setShowRecordModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Record Movement Log
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search SKU, Item, Operator, Location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 px-3 py-1.5 outline-none cursor-pointer"
          >
            <option value="all">All Movement Types</option>
            <option value="restock">Restock Orders</option>
            <option value="transfer">Vehicle Transfers</option>
            <option value="dispatch">Dispatches</option>
            <option value="audit_adjustment">Audit Adjustments</option>
            <option value="bulk_import">Bulk Imports</option>
          </select>
        </div>
      </div>

      {/* Movement Log Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3">Timestamp & ID</th>
                <th className="p-3">Movement Type</th>
                <th className="p-3">SKU & Item Name</th>
                <th className="p-3 text-center">Change (Delta)</th>
                <th className="p-3 text-center">Stock Levels</th>
                <th className="p-3">Transfer Route (From → To)</th>
                <th className="p-3">Operator / Performed By</th>
                <th className="p-3">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredMovements.map((log) => {
                const isPositive = log.quantityDelta > 0;

                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-slate-400 block">{log.id}</span>
                        <span className="text-slate-700 text-[11px] font-bold flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" /> {log.timestamp}
                        </span>
                      </div>
                    </td>

                    <td className="p-3">
                      {renderTypeBadge(log.type)}
                    </td>

                    <td className="p-3">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{log.sku}</span>
                        <p className="font-bold text-slate-800 text-xs">{log.itemName}</p>
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <span className={`font-mono font-extrabold text-xs px-2 py-0.5 rounded-md ${
                        isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {isPositive ? `+${log.quantityDelta}` : log.quantityDelta}
                      </span>
                    </td>

                    <td className="p-3 text-center font-mono text-slate-600">
                      <span>{log.previousQuantity}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span className="font-bold text-slate-900">{log.newQuantity}</span>
                    </td>

                    <td className="p-3">
                      <div className="text-xs">
                        <span className="text-slate-500 font-medium">{log.fromLocation}</span>
                        <span className="mx-1 text-purple-600 font-bold">→</span>
                        <span className="text-slate-800 font-bold">{log.toLocation}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="text-slate-700 font-bold flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" /> {log.performedBy}
                      </span>
                    </td>

                    <td className="p-3">
                      <p className="text-[11px] text-slate-500 italic max-w-xs truncate" title={log.notes}>
                        {log.notes || '—'}
                      </p>
                    </td>
                  </tr>
                );
              })}

              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No matching movement audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Movement Record Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleSubmitMovement} className="bg-white max-w-lg w-full rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Record Stock Movement Audit Entry</h3>
                  <p className="text-[11px] text-slate-500">Manual transfer, stock count adjustment, or dispatch logging.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRecordModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Target SKU</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                >
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      [{item.sku}] {item.name} — Current: {item.quantity} units
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Movement Type</label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                  >
                    <option value="transfer">Vehicle / Location Transfer</option>
                    <option value="restock">Restock Order</option>
                    <option value="dispatch">Dispatch Issue</option>
                    <option value="audit_adjustment">Audit Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Quantity Delta (+/-)</label>
                  <input
                    type="number"
                    value={quantityDelta}
                    onChange={(e) => setQuantityDelta(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Origin (From)</label>
                  <input
                    type="text"
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Destination (To)</label>
                  <input
                    type="text"
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Performed By / Operator</label>
                <input
                  type="text"
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Audit Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for movement or reference ticket number..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRecordModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-sm"
              >
                Commit Audit Log
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
