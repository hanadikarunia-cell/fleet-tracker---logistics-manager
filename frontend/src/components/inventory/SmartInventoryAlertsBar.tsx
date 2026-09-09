import { useState, useMemo } from 'react';
import { InventoryItem, Vehicle } from '../../types';
import {
  AlertTriangle, ShieldAlert, Sparkles, ChevronDown, ChevronUp,
  X, CheckCircle2, ArrowRight, Truck, Coins, Flame, BellRing
} from 'lucide-react';

interface SmartInventoryAlertsBarProps {
  items: InventoryItem[];
  vehicles: Vehicle[];
  onTriggerReorderForSku?: (sku: string) => void;
  onFilterCatalogByTerm?: (term: string) => void;
}

export interface InventorySmartAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  sku?: string;
  actionLabel?: string;
  actionType?: 'reorder' | 'filter' | 'assign';
}

export default function SmartInventoryAlertsBar({
  items,
  vehicles,
  onTriggerReorderForSku,
  onFilterCatalogByTerm,
}: SmartInventoryAlertsBarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Generate Smart Alerts based on real-time inventory scan
  const activeAlerts: InventorySmartAlert[] = useMemo(() => {
    const list: InventorySmartAlert[] = [];

    // 1. Critical Low Stock Alerts
    items.forEach((item) => {
      const minLevel = item.minStockLevel || 5;
      if (item.quantity <= minLevel) {
        list.push({
          id: `alert_low_${item.id}`,
          severity: 'critical',
          title: `Critical Stockout Risk: ${item.name}`,
          description: `Current quantity (${item.quantity} units) is below reorder threshold (${minLevel} units). Immediate supplier PO reorder recommended.`,
          sku: item.sku,
          actionLabel: 'Reorder SKU',
          actionType: 'reorder',
        });
      }
    });

    // 2. Hazmat Transport Safety Alerts
    const hazmatItems = items.filter(i => i.category === 'Hazmat');
    hazmatItems.forEach(hItem => {
      if (!hItem.assignedVehicleId) {
        list.push({
          id: `alert_hazmat_${hItem.id}`,
          severity: 'warning',
          title: `Unassigned Hazmat Cargo: ${hItem.name}`,
          description: `Flight oxygen / hazardous material sitting unassigned in depot. Require certified hazmat transport vehicle assignment.`,
          sku: hItem.sku,
          actionLabel: 'Locate Item',
          actionType: 'filter',
        });
      }
    });

    // 3. Overstocked Holding Capital Alert
    items.forEach(item => {
      const minLevel = item.minStockLevel || 5;
      if (item.quantity >= minLevel * 5) {
        list.push({
          id: `alert_overstock_${item.id}`,
          severity: 'info',
          title: `Overstocked Capital Alert: ${item.name}`,
          description: `Stock level (${item.quantity} units) exceeds 5x minimum buffer. Holding idle operational capital.`,
          sku: item.sku,
          actionLabel: 'Inspect Holding',
          actionType: 'filter',
        });
      }
    });

    return list;
  }, [items, vehicles]);

  // Filter out dismissed alerts
  const visibleAlerts = useMemo(() => {
    return activeAlerts.filter(a => !dismissedIds.has(a.id));
  }, [activeAlerts, dismissedIds]);

  const criticalCount = visibleAlerts.filter(a => a.severity === 'critical').length;

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-300/60 rounded-2xl p-4 shadow-sm space-y-3 transition">
      {/* Alert Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm animate-pulse">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
              Smart Inventory Proactive Alerts ({visibleAlerts.length} Active)
              {criticalCount > 0 && (
                <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-bounce">
                  {criticalCount} Critical
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-600">
              Real-time predictive scan detecting reorder thresholds, hazmat compliance, and capital holding risks.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/50 cursor-pointer flex items-center gap-1 text-xs font-bold"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {isExpanded ? 'Collapse' : 'Show All'}
        </button>
      </div>

      {/* Alert List */}
      {isExpanded && (
        <div className="space-y-2 pt-1">
          {visibleAlerts.map((alert) => {
            const isCrit = alert.severity === 'critical';
            const isWarn = alert.severity === 'warning';

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-medium ${
                  isCrit
                    ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                    : isWarn
                      ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                      : 'bg-indigo-50/90 border-indigo-200 text-indigo-900'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {isCrit && <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                  {isWarn && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                  {!isCrit && !isWarn && <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{alert.title}</span>
                      {alert.sku && (
                        <span className="font-mono text-[10px] bg-white/80 px-1.5 py-0.5 rounded border border-black/10">
                          {alert.sku}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] opacity-80 mt-0.5">{alert.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {alert.actionType === 'reorder' && alert.sku && onTriggerReorderForSku && (
                    <button
                      type="button"
                      onClick={() => onTriggerReorderForSku(alert.sku!)}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Reorder
                    </button>
                  )}

                  {alert.actionType === 'filter' && alert.sku && onFilterCatalogByTerm && (
                    <button
                      type="button"
                      onClick={() => onFilterCatalogByTerm(alert.sku!)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-[11px] rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      Locate <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setDismissedIds(prev => new Set(prev).add(alert.id))}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    title="Dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
