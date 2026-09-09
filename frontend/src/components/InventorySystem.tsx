import { useState, FormEvent, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { InventoryItem, Vehicle, CategoryType, InventoryMovement } from '../types';
import { api } from '../api';
import InventoryForecastingView from './inventory/InventoryForecastingView';
import InventoryMovementHistoryView from './inventory/InventoryMovementHistoryView';
import InventoryDensityMapView from './inventory/InventoryDensityMapView';
import InventoryBulkImportView from './inventory/InventoryBulkImportView';
import InventoryCostAnalyticsView from './inventory/InventoryCostAnalyticsView';
import SmartInventoryAlertsBar from './inventory/SmartInventoryAlertsBar';
import InventoryPdfModal from './inventory/InventoryPdfModal';
import { 
  Package, Plus, Search, Filter, Trash2, Edit, Truck, 
  ArrowLeftRight, Info, AlertTriangle, ShieldCheck, X, 
  AlertCircle, PlusCircle, Tag, RefreshCw,
  Bell, QrCode, Zap, ZapOff, Volume2, VolumeX,
  PieChart as PieChartIcon, BarChart3, Scan, CheckCircle2,
  ChevronDown, ChevronUp, Flame, ShoppingCart, Sparkles,
  Calculator, FileText, Printer, CheckSquare, Square,
  Clock, Coins, PackageCheck, Grid3X3, LayoutGrid,
  ArrowUpRight, TrendingDown, Sliders, TrendingUp, History, Layers, UploadCloud, DollarSign
} from 'lucide-react';

interface InventorySystemProps {
  items: InventoryItem[];
  vehicles: Vehicle[];
  userRole?: string;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  onEditItem: (id: string, updated: Partial<InventoryItem>) => void;
  onDeleteItem: (id: string) => void;
  onAssignItemToVehicle: (itemId: string, vehicleId: string | undefined) => void;
}

const DEFAULT_CATEGORIES: string[] = ['Electronics', 'Spare Parts', 'Cargo', 'Tools', 'Hazmat'];

// Estimated unit price catalog for Smart Reorder Purchase Order calculation
const ESTIMATED_UNIT_COSTS: Record<string, number> = {
  Electronics: 450,
  'Spare Parts': 1200,
  Cargo: 85,
  Tools: 180,
  Hazmat: 320,
};

export default function InventorySystem({
  items,
  vehicles,
  userRole,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onAssignItemToVehicle,
}: InventorySystemProps) {
  // Inventory Sub-Tab State
  const [inventorySubTab, setInventorySubTab] = useState<'catalog' | 'analytics' | 'forecast' | 'movements' | 'density' | 'import'>('catalog');
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Inventory Movements State, loaded from and persisted to the backend.
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  useEffect(() => {
    api.inventoryMovements.list().then(setMovements).catch((err) => console.error('Failed to load inventory movements:', err));
  }, []);

  const handleRecordMovement = async (entry: Omit<InventoryMovement, 'id' | 'timestamp'>) => {
    const newMovement = await api.inventoryMovements.create(entry);
    setMovements(prev => [newMovement, ...prev]);
  };

  const handleBulkImportItems = (newItemsPayload: Omit<InventoryItem, 'id'>[]) => {
    newItemsPayload.forEach(item => {
      onAddItem(item);
      handleRecordMovement({
        itemId: 'NEW-BULK',
        sku: item.sku,
        itemName: item.name,
        type: 'bulk_import',
        quantityDelta: item.quantity,
        previousQuantity: 0,
        newQuantity: item.quantity,
        fromLocation: 'Bulk CSV Manifest',
        toLocation: item.location,
        performedBy: 'System Import Pipeline',
        notes: 'Automated bulk CSV import entry.',
      });
    });
  };
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [locationFilter, setLocationFilter] = useState<string>('All');
  const [stockAlertFilter, setStockAlertFilter] = useState<'all' | 'low_only' | 'out_only'>('all');

  // View & Analytics Panels state
  const [showCharts, setShowCharts] = useState(true);
  const [showHeatmapSection, setShowHeatmapSection] = useState(true);
  const [heatmapType, setHeatmapType] = useState<'matrix' | 'sku_tiles'>('matrix');

  // Categories state (allows dynamic creation)
  const [customCategories, setCustomCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Add / Edit Item Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState<CategoryType>('Cargo');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formUnitWeight, setFormUnitWeight] = useState(1.0);
  const [formLocation, setFormLocation] = useState('Tangerang HQ Depot');
  const [formVehicleId, setFormVehicleId] = useState<string>('');
  const [formMinStockLevel, setFormMinStockLevel] = useState(5);

  // QR / Barcode Scanner Modal states
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [scannerSound, setScannerSound] = useState(true);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [manualScanCode, setManualScanCode] = useState('');
  const [scannedResult, setScannedResult] = useState<{
    code: string;
    item: InventoryItem | null;
    timestamp: string;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Smart Stock Reorder Modal states
  const [showSmartReorderModal, setShowSmartReorderModal] = useState(false);
  const [leadTimeDays, setLeadTimeDays] = useState(5);
  const [burnRateLevel, setBurnRateLevel] = useState<'normal' | 'high' | 'peak'>('normal');
  const [customOrderQtys, setCustomOrderQtys] = useState<Record<string, number>>({});
  const [selectedReorderIds, setSelectedReorderIds] = useState<string[]>([]);
  const [showPoExportDraft, setShowPoExportDraft] = useState(false);
  const [poReferenceCode, setPoReferenceCode] = useState('');

  // Combine default & custom categories with any unique categories from existing items
  const allCategories = useMemo(() => {
    const set = new Set([...customCategories]);
    items.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [customCategories, items]);

  // Audio beep feedback synthesizer for QR scanner
  const playBeepSound = () => {
    if (!scannerSound) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      // Audio playback disabled or unavailable
    }
  };

  // Process QR / Barcode scan action
  const handleScanCode = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    setIsScanning(true);

    setTimeout(() => {
      setIsScanning(false);
      playBeepSound();

      // Search matching SKU or Item Name or ID
      const matched = items.find(
        (i) =>
          i.sku.toLowerCase() === cleanCode.toLowerCase() ||
          i.id.toLowerCase() === cleanCode.toLowerCase() ||
          i.name.toLowerCase().includes(cleanCode.toLowerCase())
      ) || null;

      setScannedResult({
        code: cleanCode.toUpperCase(),
        item: matched,
        timestamp: new Date().toLocaleTimeString(),
      });
    }, 400);
  };

  // Handle Add Category
  const handleAddCategory = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    if (!allCategories.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      setCustomCategories(prev => [...prev, trimmed]);
      setFormCategory(trimmed);
    }
    setNewCategoryName('');
    setShowAddCategoryModal(false);
  };

  // Submit Add / Edit Form handler
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formName || !formSku) return;

    const itemPayload = {
      name: formName,
      sku: formSku,
      category: formCategory,
      quantity: Number(formQuantity),
      unitWeight: Number(formUnitWeight),
      minStockLevel: Number(formMinStockLevel),
      location: formVehicleId 
        ? (vehicles.find(v => v.id === formVehicleId)?.name || 'Vehicle')
        : formLocation,
      assignedVehicleId: formVehicleId || undefined,
    };

    if (editingItemId) {
      onEditItem(editingItemId, itemPayload);
      setEditingItemId(null);
    } else {
      onAddItem(itemPayload);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormName('');
    setFormSku('');
    setFormCategory('Cargo');
    setFormQuantity(1);
    setFormUnitWeight(1.0);
    setFormMinStockLevel(5);
    setFormLocation('Tangerang HQ Depot');
    setFormVehicleId('');
    setShowAddForm(false);
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setFormName(item.name);
    setFormSku(item.sku);
    setFormCategory(item.category);
    setFormQuantity(item.quantity);
    setFormUnitWeight(item.unitWeight);
    setFormMinStockLevel(item.minStockLevel ?? 5);
    setFormLocation(item.location);
    setFormVehicleId(item.assignedVehicleId || '');
    setShowAddForm(true);
  };

  // Stock status helper
  const getStockStatus = (item: InventoryItem) => {
    const minThreshold = item.minStockLevel ?? 5;
    if (item.quantity === 0) return 'out_of_stock';
    if (item.quantity <= minThreshold) return 'low_stock';
    return 'normal';
  };

  // Stock metrics
  const outOfStockItems = useMemo(() => items.filter(i => i.quantity === 0), [items]);
  const lowStockItems = useMemo(() => items.filter(i => {
    const threshold = i.minStockLevel ?? 5;
    return i.quantity > 0 && i.quantity <= threshold;
  }), [items]);
  const normalStockItems = useMemo(() => items.filter(i => {
    const threshold = i.minStockLevel ?? 5;
    return i.quantity > threshold;
  }), [items]);

  const totalStockAlerts = outOfStockItems.length + lowStockItems.length;

  // Pie chart data for Stock Status
  const stockPieData = useMemo(() => [
    { name: 'Healthy Stock', value: normalStockItems.length, color: '#10b981', statusKey: 'normal' },
    { name: 'Low Stock Warning', value: lowStockItems.length, color: '#f59e0b', statusKey: 'low_only' },
    { name: 'Out of Stock', value: outOfStockItems.length, color: '#f43f5e', statusKey: 'out_only' },
  ].filter(d => d.value > 0), [normalStockItems, lowStockItems, outOfStockItems]);

  // Bar chart data for Category Cargo Weight Breakdown
  const categoryWeightData = useMemo(() => {
    return allCategories.map((cat) => {
      const categoryItems = items.filter((i) => i.category === cat);
      const warehouseWeight = categoryItems
        .filter((i) => !i.assignedVehicleId)
        .reduce((sum, i) => sum + i.quantity * i.unitWeight, 0);
      const fleetWeight = categoryItems
        .filter((i) => i.assignedVehicleId)
        .reduce((sum, i) => sum + i.quantity * i.unitWeight, 0);

      return {
        category: cat,
        Warehouse: Math.round(warehouseWeight * 10) / 10,
        OnFleet: Math.round(fleetWeight * 10) / 10,
        Total: Math.round((warehouseWeight + fleetWeight) * 10) / 10,
      };
    }).filter(d => d.Total > 0 || customCategories.includes(d.category));
  }, [allCategories, items, customCategories]);

  // --- HEATMAP COMPUTATION ---
  // List of distinct location hubs (HQ Warehouse + Active Vehicles)
  const locationHubs = useMemo(() => {
    const hubs: Array<{ id: string; name: string; type: 'warehouse' | 'vehicle' }> = [
      { id: 'warehouse_hq', name: 'Tangerang HQ Depot', type: 'warehouse' },
    ];
    vehicles.forEach(v => {
      hubs.push({
        id: v.id,
        name: `${v.name} (${v.licensePlate})`,
        type: 'vehicle',
      });
    });
    return hubs;
  }, [vehicles]);

  // Matrix cells: Location Hub x Category
  const heatmapMatrix = useMemo(() => {
    return locationHubs.map(hub => {
      const categoryCells = allCategories.map(cat => {
        const cellItems = items.filter(item => {
          const matchesCategory = item.category === cat;
          let matchesHub = false;
          if (hub.type === 'warehouse') {
            matchesHub = !item.assignedVehicleId;
          } else {
            matchesHub = item.assignedVehicleId === hub.id;
          }
          return matchesCategory && matchesHub;
        });

        const skuCount = cellItems.length;
        const totalQty = cellItems.reduce((sum, i) => sum + i.quantity, 0);
        const totalWeight = cellItems.reduce((sum, i) => sum + (i.quantity * i.unitWeight), 0);
        const hasOut = cellItems.some(i => i.quantity === 0);
        const hasLow = cellItems.some(i => {
          const t = i.minStockLevel ?? 5;
          return i.quantity > 0 && i.quantity <= t;
        });

        let heatStatus: 'out' | 'low' | 'healthy' | 'empty' = 'empty';
        if (cellItems.length > 0) {
          if (hasOut) heatStatus = 'out';
          else if (hasLow) heatStatus = 'low';
          else heatStatus = 'healthy';
        }

        return {
          category: cat,
          skuCount,
          totalQty,
          totalWeight: Math.round(totalWeight * 10) / 10,
          heatStatus,
          items: cellItems,
        };
      });

      return {
        hub,
        categories: categoryCells,
      };
    });
  }, [locationHubs, allCategories, items]);

  // --- SMART REORDER CALCULATIONS ---
  const burnRateMultiplier = burnRateLevel === 'peak' ? 3.0 : burnRateLevel === 'high' ? 1.8 : 1.0;

  const smartReorderList = useMemo(() => {
    return items.map((item) => {
      const minLevel = item.minStockLevel ?? 5;
      const dailyBurnEstimate = Math.max(1, Math.ceil((minLevel / 4) * burnRateMultiplier));
      const leadTimeNeed = dailyBurnEstimate * leadTimeDays;
      const targetStock = minLevel + leadTimeNeed + 10;
      
      const suggestedReorderQty = Math.max(0, targetStock - item.quantity);
      const isCritical = item.quantity === 0;
      const isLow = item.quantity > 0 && item.quantity <= minLevel;
      const needsReorder = suggestedReorderQty > 0 || isCritical || isLow;

      const estimatedUnitPrice = ESTIMATED_UNIT_COSTS[item.category] || 150;
      const effectiveOrderQty = customOrderQtys[item.id] !== undefined 
        ? customOrderQtys[item.id] 
        : (needsReorder ? Math.max(suggestedReorderQty, 10) : 0);

      const estimatedLineCost = effectiveOrderQty * estimatedUnitPrice;
      const estimatedLineWeight = effectiveOrderQty * item.unitWeight;
      const daysUntilStockout = item.quantity > 0 ? Math.round(item.quantity / dailyBurnEstimate) : 0;

      return {
        item,
        minLevel,
        dailyBurnEstimate,
        leadTimeNeed,
        targetStock,
        suggestedReorderQty,
        effectiveOrderQty,
        isCritical,
        isLow,
        needsReorder,
        estimatedUnitPrice,
        estimatedLineCost,
        estimatedLineWeight,
        daysUntilStockout,
      };
    });
  }, [items, leadTimeDays, burnRateMultiplier, customOrderQtys]);

  // Filter reorder candidates that need reorder or are manually checked
  const reorderCandidates = useMemo(() => {
    return smartReorderList.filter(r => r.needsReorder || r.effectiveOrderQty > 0);
  }, [smartReorderList]);

  // Initialize selected items for PO when modal opens
  const openSmartReorderModal = () => {
    const candidatesToSelect = smartReorderList
      .filter(r => r.needsReorder)
      .map(r => r.item.id);
    setSelectedReorderIds(candidatesToSelect);
    setShowSmartReorderModal(true);
  };

  // Reorder Totals
  const selectedReorderCandidateRows = useMemo(() => {
    return reorderCandidates.filter(r => selectedReorderIds.includes(r.item.id));
  }, [reorderCandidates, selectedReorderIds]);

  const totalReorderUnits = useMemo(() => {
    return selectedReorderCandidateRows.reduce((sum, r) => sum + r.effectiveOrderQty, 0);
  }, [selectedReorderCandidateRows]);

  const totalReorderCost = useMemo(() => {
    return selectedReorderCandidateRows.reduce((sum, r) => sum + r.estimatedLineCost, 0);
  }, [selectedReorderCandidateRows]);

  const totalReorderWeight = useMemo(() => {
    return selectedReorderCandidateRows.reduce((sum, r) => sum + r.estimatedLineWeight, 0);
  }, [selectedReorderCandidateRows]);

  // Execute Reorder Action (Replenishes stock levels directly)
  const handleExecuteSmartReorder = () => {
    if (selectedReorderCandidateRows.length === 0) return;

    selectedReorderCandidateRows.forEach((row) => {
      const newQty = row.item.quantity + row.effectiveOrderQty;
      onEditItem(row.item.id, { quantity: newQty });

      handleRecordMovement({
        itemId: row.item.id,
        sku: row.item.sku,
        itemName: row.item.name,
        type: 'restock',
        quantityDelta: row.effectiveOrderQty,
        previousQuantity: row.item.quantity,
        newQuantity: newQty,
        fromLocation: `Supplier PO (${poReferenceCode || 'PO-AUTO'})`,
        toLocation: row.item.location,
        performedBy: 'Smart Reorder Pipeline',
        notes: `Smart Reorder PO execution. Lead time: ${leadTimeDays} days.`,
      });
    });

    setShowSmartReorderModal(false);
    setShowPoExportDraft(false);
    setCustomOrderQtys({});
  };

  // Generate Purchase Order Reference Code
  const handleOpenPoDraft = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    setPoReferenceCode(`PO-${dateStr}-${randNum}`);
    setShowPoExportDraft(true);
  };

  // Filter items for main table
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const term = searchTerm.trim().toLowerCase();
      
      const assignedVehicle = item.assignedVehicleId 
        ? vehicles.find(v => v.id === item.assignedVehicleId) 
        : null;
      
      const vehicleStatusText = assignedVehicle 
        ? `loaded on ${assignedVehicle.name} ${assignedVehicle.licensePlate} assigned` 
        : `unassigned warehouse ${item.location} idle`;

      const matchesSearch = !term || 
        item.name.toLowerCase().includes(term) || 
        item.sku.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        vehicleStatusText.toLowerCase().includes(term);

      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      
      let matchesLocation = true;
      if (locationFilter !== 'All') {
        if (locationFilter === 'Warehouses') {
          matchesLocation = !item.assignedVehicleId;
        } else {
          matchesLocation = item.assignedVehicleId === locationFilter;
        }
      }

      const status = getStockStatus(item);
      let matchesStockAlert = true;
      if (stockAlertFilter === 'low_only') {
        matchesStockAlert = status === 'low_stock' || status === 'out_of_stock';
      } else if (stockAlertFilter === 'out_only') {
        matchesStockAlert = status === 'out_of_stock';
      }

      return matchesSearch && matchesCategory && matchesLocation && matchesStockAlert;
    });
  }, [items, vehicles, searchTerm, categoryFilter, locationFilter, stockAlertFilter]);

  // Quick Restock handler
  const handleQuickRestock = (item: InventoryItem, amount: number = 10) => {
    onEditItem(item.id, { quantity: item.quantity + amount });
  };

  // Quick Restock ALL low stock items
  const handleRestockAllLow = () => {
    [...outOfStockItems, ...lowStockItems].forEach(item => {
      const target = (item.minStockLevel ?? 5) + 10;
      onEditItem(item.id, { quantity: target });
    });
  };

  return (
    <div className="space-y-6">
      {/* Read-Only Status Alert */}
      {userRole === 'viewer' && (
        <div className="bg-slate-100 border border-slate-200 text-slate-700 px-4 py-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-sm">
          <ShieldCheck className="w-5 h-5 text-slate-500 shrink-0" />
          <span>🔒 READ-ONLY AUDITOR MODE: You are signed in as a Viewer. Logistics manifests, cargo loads, and dispatch logs are locked from modifications.</span>
        </div>
      )}

      {/* SMART INVENTORY PROACTIVE ALERTS */}
      <SmartInventoryAlertsBar
        items={items}
        vehicles={vehicles}
        onTriggerReorderForSku={(sku) => {
          setSearchTerm(sku);
          setInventorySubTab('catalog');
          setShowSmartReorderModal(true);
        }}
        onFilterCatalogByTerm={(term) => {
          setSearchTerm(term);
          setInventorySubTab('catalog');
        }}
      />

      {/* INVENTORY SUB-SYSTEM NAVIGATION TABS */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setInventorySubTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              inventorySubTab === 'catalog'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" /> Master SKU Catalog & Heatmap
          </button>

          <button
            type="button"
            onClick={() => setInventorySubTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              inventorySubTab === 'analytics'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Inventory Cost Analytics
          </button>

          <button
            type="button"
            onClick={() => setInventorySubTab('forecast')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              inventorySubTab === 'forecast'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> AI Demand Forecasting
          </button>

          <button
            type="button"
            onClick={() => setInventorySubTab('movements')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              inventorySubTab === 'movements'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" /> Audit Trail Log
          </button>

          <button
            type="button"
            onClick={() => setInventorySubTab('density')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              inventorySubTab === 'density'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" /> Storage Density Map
          </button>

          <button
            type="button"
            onClick={() => setInventorySubTab('import')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              inventorySubTab === 'import'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" /> Bulk CSV Import
          </button>
        </div>

        {/* PRINT PDF AUDIT MANIFEST BUTTON */}
        <button
          type="button"
          onClick={() => setShowPdfModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-indigo-50 text-slate-800 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0"
        >
          <Printer className="w-4 h-4 text-indigo-600" /> Print PDF Report
        </button>
      </div>

      {/* VIEW 1: COST ANALYTICS */}
      {inventorySubTab === 'analytics' && (
        <InventoryCostAnalyticsView
          items={items}
          allCategories={allCategories}
        />
      )}

      {/* VIEW 1: FORECASTING */}
      {inventorySubTab === 'forecast' && (
        <InventoryForecastingView
          items={items}
          allCategories={allCategories}
          onTriggerReorderForSku={(sku) => {
            setSearchTerm(sku);
            setInventorySubTab('catalog');
            setShowSmartReorderModal(true);
          }}
        />
      )}

      {/* VIEW 2: MOVEMENT AUDIT HISTORY */}
      {inventorySubTab === 'movements' && (
        <InventoryMovementHistoryView
          movements={movements}
          items={items}
          userRole={userRole}
          onRecordMovement={handleRecordMovement}
          onEditItemQuantity={(itemId, qty) => onEditItem(itemId, { quantity: qty })}
        />
      )}

      {/* VIEW 3: STORAGE DENSITY MAP */}
      {inventorySubTab === 'density' && (
        <InventoryDensityMapView
          items={items}
          vehicles={vehicles}
        />
      )}

      {/* VIEW 4: BULK CSV IMPORT */}
      {inventorySubTab === 'import' && (
        <InventoryBulkImportView
          existingItems={items}
          userRole={userRole}
          onBulkImportItems={handleBulkImportItems}
        />
      )}

      {/* VIEW 5: MASTER CATALOG & HEATMAP */}
      {inventorySubTab === 'catalog' && (
        <>
      {/* 1. TOP STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total SKUs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-indigo-200 transition">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total SKUs Tracked</p>
            <h3 className="text-2xl font-bold text-slate-800">{items.length}</h3>
            <span className="text-[10px] text-slate-400 font-medium">{allCategories.length} Active Categories</span>
          </div>
        </div>

        {/* Card 2: On-Road Cargo */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-emerald-200 transition">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">On-Road Cargo Weight</p>
            <h3 className="text-2xl font-bold text-slate-800">
              {items
                .filter(i => i.assignedVehicleId)
                .reduce((sum, i) => sum + (i.quantity * i.unitWeight), 0)
                .toLocaleString()}{' '}
              kg
            </h3>
            <span className="text-[10px] text-emerald-600 font-bold">Loaded on active fleet</span>
          </div>
        </div>

        {/* Card 3: Warehouse Cargo */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-blue-200 transition">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Depot Storage Weight</p>
            <h3 className="text-2xl font-bold text-slate-800">
              {items
                .filter(i => !i.assignedVehicleId)
                .reduce((sum, i) => sum + (i.quantity * i.unitWeight), 0)
                .toLocaleString()}{' '}
              kg
            </h3>
            <span className="text-[10px] text-blue-600 font-bold">In HQ & regional hubs</span>
          </div>
        </div>

        {/* Card 4: Stock Alerts KPI & Smart Reorder Trigger */}
        <button
          type="button"
          onClick={() => {
            if (stockAlertFilter === 'low_only') {
              setStockAlertFilter('all');
            } else {
              setStockAlertFilter('low_only');
            }
          }}
          className={`p-4 rounded-2xl border transition flex items-center gap-4 text-left cursor-pointer ${
            stockAlertFilter !== 'all'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20 shadow-md'
              : totalStockAlerts > 0
                ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
                : 'bg-white border-slate-100 shadow-sm hover:border-slate-200'
          }`}
        >
          <div className={`p-3 rounded-xl relative ${totalStockAlerts > 0 ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
            <Bell className="w-6 h-6" />
            {totalStockAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center">
                {totalStockAlerts}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-slate-700">Stock Alerts</p>
              {stockAlertFilter !== 'all' && (
                <span className="text-[9px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-extrabold uppercase">Active</span>
              )}
            </div>
            <h3 className={`text-2xl font-bold ${totalStockAlerts > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
              {totalStockAlerts} <span className="text-xs font-normal text-slate-500">SKUs</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              {outOfStockItems.length > 0 ? `${outOfStockItems.length} Out of Stock` : 'Click to toggle alert filter'}
            </p>
          </div>
        </button>
      </div>

      {/* 2. INVENTORY STATUS HEATMAP & SMART STOCK REORDER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  Inventory Stock Heatmap & AI Smart Reorder
                </h3>
                <span className="bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Real-Time Density
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Monitor storage density heat across depots and fleet vehicles. Auto-calculate reorder lead times and generate purchase orders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Heatmap Section Toggle */}
            <button
              type="button"
              id="btn-toggle-heatmap-view"
              onClick={() => setShowHeatmapSection(!showHeatmapSection)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Grid3X3 className="w-4 h-4 text-emerald-400" />
              <span>{showHeatmapSection ? 'Hide Heatmap' : 'Show Heatmap'}</span>
            </button>

            {/* Smart Reorder Trigger Button */}
            <button
              type="button"
              id="btn-open-smart-reorder-main"
              onClick={openSmartReorderModal}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition transform active:scale-98 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Smart Reorder Assistant</span>
              {totalStockAlerts > 0 && (
                <span className="bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold">
                  {totalStockAlerts} Needed
                </span>
              )}
            </button>
          </div>
        </div>

        {/* HEATMAP CONTAINER */}
        {showHeatmapSection && (
          <div className="mt-4 pt-1 space-y-4">
            {/* Heatmap Control Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 w-fit">
                <button
                  type="button"
                  id="btn-heatmap-mode-matrix"
                  onClick={() => setHeatmapType('matrix')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    heatmapType === 'matrix' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Grid3X3 className="w-3.5 h-3.5" /> Location x Category Matrix
                </button>
                <button
                  type="button"
                  id="btn-heatmap-mode-tiles"
                  onClick={() => setHeatmapType('sku_tiles')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    heatmapType === 'sku_tiles' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> SKU Fill Density Tiles
                </button>
              </div>

              {/* Heatmap Legend */}
              <div className="flex items-center gap-3 text-[11px] text-slate-300 font-medium">
                <span className="text-slate-400 font-bold">Heat Legend:</span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-emerald-500/80 border border-emerald-400 inline-block" /> Healthy
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-amber-500/80 border border-amber-400 inline-block" /> Low Stock
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-rose-500/80 border border-rose-400 inline-block" /> Out of Stock
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700 inline-block" /> Empty
                </span>
              </div>
            </div>

            {/* HEATMAP TYPE 1: LOCATION x CATEGORY MATRIX */}
            {heatmapType === 'matrix' && (
              <div className="overflow-x-auto bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="p-2.5 font-bold text-slate-300 min-w-[180px]">Location Hub</th>
                      {allCategories.map(cat => (
                        <th key={cat} className="p-2.5 font-bold text-slate-300 text-center min-w-[120px]">
                          {cat}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {heatmapMatrix.map(({ hub, categories }) => (
                      <tr key={hub.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-2.5 font-bold text-white flex items-center gap-2">
                          {hub.type === 'warehouse' ? (
                            <Package className="w-4 h-4 text-blue-400 shrink-0" />
                          ) : (
                            <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          <span className="truncate">{hub.name}</span>
                        </td>

                        {categories.map((cell) => {
                          const isHealthy = cell.heatStatus === 'healthy';
                          const isLow = cell.heatStatus === 'low';
                          const isOut = cell.heatStatus === 'out';

                          return (
                            <td key={cell.category} className="p-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setCategoryFilter(cell.category);
                                  setLocationFilter(hub.type === 'warehouse' ? 'Warehouses' : hub.id);
                                }}
                                title={`Click to filter table for ${cell.category} at ${hub.name}`}
                                className={`w-full p-2.5 rounded-xl border transition-all flex flex-col items-center justify-center cursor-pointer group relative ${
                                  isOut
                                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-200 hover:bg-rose-500/30 hover:scale-102'
                                    : isLow
                                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 hover:bg-amber-500/30 hover:scale-102'
                                      : isHealthy
                                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 hover:scale-102'
                                        : 'bg-slate-900/60 border-slate-800 text-slate-600 hover:bg-slate-800/60'
                                }`}
                              >
                                {cell.skuCount > 0 ? (
                                  <>
                                    <div className="flex items-center gap-1 font-mono font-extrabold text-xs">
                                      {cell.totalQty} <span className="text-[9px] font-sans opacity-75">units</span>
                                    </div>
                                    <span className="text-[9px] font-medium opacity-80 mt-0.5">
                                      {cell.skuCount} SKU{cell.skuCount > 1 ? 's' : ''} ({cell.totalWeight}kg)
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[10px] font-mono text-slate-600 font-bold">—</span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* HEATMAP TYPE 2: SKU FILL DENSITY TILES */}
            {heatmapType === 'sku_tiles' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                {items.map((item) => {
                  const status = getStockStatus(item);
                  const minLevel = item.minStockLevel ?? 5;
                  const fillRatio = Math.min(100, Math.round((item.quantity / Math.max(minLevel * 2, 1)) * 100));

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSearchTerm(item.sku)}
                      className={`p-3 rounded-2xl border text-left transition transform hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between h-28 relative overflow-hidden ${
                        status === 'out_of_stock'
                          ? 'bg-rose-950/60 border-rose-500/60 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                          : status === 'low_stock'
                            ? 'bg-amber-950/60 border-amber-500/60 text-amber-100'
                            : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500/50'
                      }`}
                    >
                      {/* Fill ratio indicator bar at bottom */}
                      <div
                        className={`absolute bottom-0 left-0 h-1 transition-all ${
                          status === 'out_of_stock' ? 'bg-rose-500' : status === 'low_stock' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${fillRatio}%` }}
                      />

                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-mono text-[10px] font-bold text-slate-400 uppercase truncate">{item.sku}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                            status === 'out_of_stock' ? 'bg-rose-500/30 text-rose-300' : status === 'low_stock' ? 'bg-amber-500/30 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {status === 'out_of_stock' ? 'EMPTY' : status === 'low_stock' ? 'LOW' : 'OK'}
                          </span>
                        </div>
                        <p className="font-bold text-xs text-white truncate mt-1">{item.name}</p>
                      </div>

                      <div className="flex items-end justify-between mt-2 pt-1 border-t border-slate-800/80 text-[10px]">
                        <div>
                          <span className="text-slate-400 block text-[9px]">Stock:</span>
                          <span className="font-mono font-bold text-white text-xs">{item.quantity}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block text-[9px]">Min:</span>
                          <span className="font-mono font-bold text-slate-300">{minLevel}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. INVENTORY STATUS & CATEGORY WEIGHT CHARTS DASHBOARD */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <PieChartIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                Inventory Analytics & Stock Health Breakdown
              </h3>
              <p className="text-[11px] text-slate-500">
                Visual status distribution, stock health ratio, and weight breakdown across cargo categories.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCharts(!showCharts)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition cursor-pointer border border-slate-200"
          >
            {showCharts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showCharts ? 'Collapse Charts' : 'Expand Analytics'}
          </button>
        </div>

        {showCharts && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
            {/* Donut Chart: Stock Health Status Distribution */}
            <div className="lg:col-span-5 bg-slate-50/70 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <PieChartIcon className="w-4 h-4 text-emerald-600" /> Stock Health Status
                </span>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {items.length > 0 ? Math.round((normalStockItems.length / items.length) * 100) : 0}% Healthy
                </span>
              </div>

              <div className="h-52 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {stockPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }}
                      formatter={(val: any, name: any) => [`${val} SKUs`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text in Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-extrabold text-slate-800">{items.length}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total SKUs</span>
                </div>
              </div>

              {/* Interactive Legend Badges */}
              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[10px]">
                <button
                  onClick={() => setStockAlertFilter('all')}
                  className={`p-2 rounded-lg text-center transition cursor-pointer border ${
                    stockAlertFilter === 'all' ? 'bg-white border-slate-300 shadow-2xs' : 'hover:bg-slate-100 border-transparent'
                  }`}
                >
                  <span className="block font-bold text-emerald-600">{normalStockItems.length}</span>
                  <span className="text-slate-500 font-medium">Healthy</span>
                </button>
                <button
                  onClick={() => setStockAlertFilter('low_only')}
                  className={`p-2 rounded-lg text-center transition cursor-pointer border ${
                    stockAlertFilter === 'low_only' ? 'bg-amber-100 border-amber-300 shadow-2xs' : 'hover:bg-amber-50 border-transparent'
                  }`}
                >
                  <span className="block font-bold text-amber-600">{lowStockItems.length}</span>
                  <span className="text-slate-500 font-medium">Low Stock</span>
                </button>
                <button
                  onClick={() => setStockAlertFilter('out_only')}
                  className={`p-2 rounded-lg text-center transition cursor-pointer border ${
                    stockAlertFilter === 'out_only' ? 'bg-rose-100 border-rose-300 shadow-2xs' : 'hover:bg-rose-50 border-transparent'
                  }`}
                >
                  <span className="block font-bold text-rose-600">{outOfStockItems.length}</span>
                  <span className="text-slate-500 font-medium">Out of Stock</span>
                </button>
              </div>
            </div>

            {/* Bar Chart: Cargo Weight by Category */}
            <div className="lg:col-span-7 bg-slate-50/70 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-blue-600" /> Category Cargo Weight Breakdown (kg)
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Warehouse Storage vs. Loaded Fleet
                </span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryWeightData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit="kg" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }}
                      formatter={(val: any) => [`${val} kg`]}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }} />
                    <Bar dataKey="Warehouse" name="Depot Storage" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="OnFleet" name="Loaded on Fleet" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. LOW STOCK WARNING BANNER */}
      {totalStockAlerts > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl h-fit shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-xs text-amber-900 uppercase tracking-wide">Automated Stock Alert Notice</h4>
                {outOfStockItems.length > 0 && (
                  <span className="bg-rose-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    CRITICAL: {outOfStockItems.length} OUT OF STOCK
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {totalStockAlerts} inventory SKUs have reached or fallen below minimum reorder thresholds. Restock immediately to prevent fleet dispatch delays.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              id="btn-open-smart-reorder-banner"
              onClick={openSmartReorderModal}
              className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> Launch Smart Reorder
            </button>

            {userRole !== 'viewer' && (
              <button
                type="button"
                id="btn-restock-all-low"
                onClick={handleRestockAllLow}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Quick Restock All (+10)
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. OPERATIONAL BAR & CATEGORY / ITEM CREATION & QR SCANNER TOGGLE */}
      <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-3">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg h-fit">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-blue-900">Seamless Fleet Payload Integration</h4>
            <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
              When items are assigned to trucks, their weights automatically adjust vehicle load dynamics. Custom categories and minimum reorder points ensure real-time supply chain transparency.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* QR Scanner Trigger Button */}
          <button
            type="button"
            id="btn-open-qr-scanner-main"
            onClick={() => {
              setScannedResult(null);
              setShowQrScanner(true);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer shadow-sm select-none"
          >
            <QrCode className="w-4 h-4" />
            <span>QR / Barcode Scanner</span>
          </button>

          {/* Category Management Button */}
          <button
            type="button"
            id="btn-manage-categories-toggle"
            onClick={() => setShowAddCategoryModal(true)}
            className="flex items-center gap-1.5 bg-white border border-blue-200 text-blue-800 hover:bg-blue-100/60 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
          >
            <Tag className="w-3.5 h-3.5 text-blue-600" /> + Add Category
          </button>

          {/* Add Item Toggle */}
          {userRole !== 'viewer' ? (
            <button
              id="btn-add-item-toggle"
              onClick={() => { resetForm(); setShowAddForm(!showAddForm); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Log Cargo SKU
            </button>
          ) : (
            <button
              id="btn-add-item-toggle-disabled"
              disabled
              className="flex items-center gap-2 bg-slate-200 text-slate-400 px-4 py-2 rounded-xl text-xs font-bold cursor-not-allowed"
              title="Read-only access"
            >
              🔒 Actions Locked
            </button>
          )}
        </div>
      </div>

      {/* 6. ADD / EDIT INVENTORY ITEM FORM */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md space-y-4 animate-fade-in">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              {editingItemId ? '✏️ Edit Inventory Record' : '📦 Log New Cargo SKU'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">Item Name *</label>
              <input
                id="form-item-name"
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Spare Aircraft Tire"
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">SKU / Code *</label>
              <input
                id="form-item-sku"
                type="text"
                required
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                placeholder="e.g. SPAR-TIRE-02"
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono uppercase"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-slate-600">Category</label>
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(true)}
                  className="text-[10px] text-blue-600 hover:underline font-bold"
                >
                  + New Category
                </button>
              </div>
              <select
                id="form-item-category"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              >
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">Current Quantity</label>
              <input
                id="form-item-qty"
                type="number"
                min="0"
                required
                value={formQuantity}
                onChange={(e) => setFormQuantity(Number(e.target.value))}
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-bold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">Min Stock Alert Threshold ⚠️</label>
              <input
                id="form-item-min-stock"
                type="number"
                min="1"
                required
                value={formMinStockLevel}
                onChange={(e) => setFormMinStockLevel(Number(e.target.value))}
                placeholder="Alert when quantity <= threshold"
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/30 font-bold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">Unit Weight (kg)</label>
              <input
                id="form-item-weight"
                type="number"
                step="0.01"
                min="0"
                required
                value={formUnitWeight}
                onChange={(e) => setFormUnitWeight(Number(e.target.value))}
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">Load Location Assignment</label>
              <select
                id="form-item-assign"
                value={formVehicleId}
                onChange={(e) => setFormVehicleId(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Keep in Warehouse (Unassigned)</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>Load onto: {v.name} ({v.licensePlate})</option>
                ))}
              </select>
            </div>

            {!formVehicleId && (
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="font-semibold text-slate-600">Warehouse Site Location</label>
                <input
                  id="form-item-warehouse"
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Tangerang HQ Depot"
                  className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 text-xs pt-2">
            <button
              id="form-btn-cancel"
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="form-btn-save"
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition cursor-pointer shadow-sm"
            >
              {editingItemId ? 'Apply Changes' : 'Log Entry'}
            </button>
          </div>
        </form>
      )}

      {/* 7. SMART STOCK REORDER ASSISTANT MODAL */}
      {showSmartReorderModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4" id="modal-smart-reorder">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 text-slate-800">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-emerald-500 text-slate-950 rounded-2xl shadow-md">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    AI Smart Stock Reorder Engine
                  </h3>
                  <p className="text-xs text-slate-300">
                    Automated lead time calculation, safety stock optimization, and instant purchase order draft.
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-close-smart-reorder"
                onClick={() => setShowSmartReorderModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Smart Parameters Control Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs shrink-0">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Supplier Delivery Lead Time:
                </label>
                <select
                  id="select-reorder-lead-time"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                  className="p-2 border border-slate-300 rounded-xl bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value={3}>3 Days (Express Dispatch)</option>
                  <option value={5}>5 Days (Standard Logistics)</option>
                  <option value={7}>7 Days (Regional Sea Transport)</option>
                  <option value={14}>14 Days (International Freight)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-amber-600" /> Demand Velocity Model:
                </label>
                <select
                  id="select-reorder-burn-rate"
                  value={burnRateLevel}
                  onChange={(e) => setBurnRateLevel(e.target.value as any)}
                  className="p-2 border border-slate-300 rounded-xl bg-white font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="normal">Normal Consumption Rate (1.0x)</option>
                  <option value="high">High Cargo Demand Surge (1.8x)</option>
                  <option value="peak">Peak Season Freight Rush (3.0x)</option>
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  id="btn-select-all-reorder-candidates"
                  onClick={() => {
                    if (selectedReorderIds.length === reorderCandidates.length) {
                      setSelectedReorderIds([]);
                    } else {
                      setSelectedReorderIds(reorderCandidates.map(r => r.item.id));
                    }
                  }}
                  className="p-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition cursor-pointer text-center"
                >
                  {selectedReorderIds.length === reorderCandidates.length ? 'Deselect All SKUs' : `Select All Candidate SKUs (${reorderCandidates.length})`}
                </button>
              </div>
            </div>

            {/* Smart Candidates Table */}
            <div className="overflow-y-auto flex-1 p-4">
              {reorderCandidates.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <PackageCheck className="w-12 h-12 text-emerald-500 mx-auto stroke-1" />
                  <h4 className="font-extrabold text-slate-800 text-base">All Stock Levels Are Healthy!</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    No items currently fall below their reorder points under the selected {leadTimeDays}-day lead time model.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="p-3 w-10 text-center">Include</th>
                      <th className="p-3">SKU / Item Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-center">Current / Min</th>
                      <th className="p-3 text-center">Est. Stockout</th>
                      <th className="p-3 text-center w-32">Reorder Quantity</th>
                      <th className="p-3 text-right">Est. Cost ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {reorderCandidates.map((row) => {
                      const isSelected = selectedReorderIds.includes(row.item.id);

                      return (
                        <tr
                          key={row.item.id}
                          className={`transition ${isSelected ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50 opacity-60'}`}
                        >
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedReorderIds(prev => prev.filter(id => id !== row.item.id));
                                } else {
                                  setSelectedReorderIds(prev => [...prev, row.item.id]);
                                }
                              }}
                              className="text-slate-700 hover:text-amber-600 transition cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-amber-600 fill-amber-100" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-300" />
                              )}
                            </button>
                          </td>

                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-900">{row.item.name}</span>
                              <span className="font-mono text-[10px] text-slate-400 font-bold">{row.item.sku}</span>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {row.item.category}
                            </span>
                          </td>

                          <td className="p-3 text-center">
                            <div className="font-mono font-bold">
                              <span className={row.isCritical ? 'text-rose-600 text-sm' : row.isLow ? 'text-amber-600' : 'text-slate-800'}>
                                {row.item.quantity}
                              </span>
                              <span className="text-slate-400 text-[10px]"> / {row.minLevel}</span>
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            {row.daysUntilStockout === 0 ? (
                              <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] font-extrabold uppercase animate-pulse">
                                Out Now
                              </span>
                            ) : (
                              <span className={`font-extrabold text-[11px] ${row.daysUntilStockout <= 3 ? 'text-amber-600' : 'text-slate-600'}`}>
                                ~{row.daysUntilStockout} Days
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={row.effectiveOrderQty}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value));
                                setCustomOrderQtys(prev => ({ ...prev, [row.item.id]: val }));
                              }}
                              className="w-20 p-1.5 text-center font-mono font-extrabold border border-amber-300 rounded-lg bg-amber-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </td>

                          <td className="p-3 text-right font-mono font-extrabold text-slate-900">
                            ${row.estimatedLineCost.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Summary Footer */}
            <div className="p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 border-t border-slate-800">
              <div className="flex items-center gap-6 text-xs font-bold">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Selected SKUs</span>
                  <span className="text-emerald-400 text-base font-extrabold">{selectedReorderCandidateRows.length} Items</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Total Units</span>
                  <span className="text-amber-400 text-base font-extrabold">{totalReorderUnits} Units</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Est. Order Value</span>
                  <span className="text-white text-base font-extrabold">${totalReorderCost.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-generate-po-draft"
                  onClick={handleOpenPoDraft}
                  disabled={selectedReorderCandidateRows.length === 0}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4 text-blue-400" /> Draft Purchase Order
                </button>

                {userRole !== 'viewer' && (
                  <button
                    type="button"
                    id="btn-execute-smart-reorder"
                    onClick={handleExecuteSmartReorder}
                    disabled={selectedReorderCandidateRows.length === 0}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    <PackageCheck className="w-4 h-4" /> Execute Stock Replenishment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. FORMAL PURCHASE ORDER (PO) PRINTABLE DRAFT MODAL */}
      {showPoExportDraft && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4" id="modal-po-export">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-6 border border-slate-200 text-slate-800 overflow-y-auto max-h-[90vh]">
            {/* Header / Brand */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-900 text-white rounded-xl">
                    <Package className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="font-extrabold text-lg text-slate-900">FLEET LOGISTICS DEPOT</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">Automated Purchase Order Requisition Document</p>
              </div>

              <div className="text-right">
                <span className="font-mono font-extrabold text-blue-700 text-sm block">{poReferenceCode}</span>
                <span className="text-[10px] text-slate-400 font-bold block">DATE: {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* PO Line Items */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Requested Line Items</h4>
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">SKU / Code</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {selectedReorderCandidateRows.map((r) => (
                    <tr key={r.item.id}>
                      <td className="p-2.5 font-mono font-bold text-slate-800">{r.item.sku}</td>
                      <td className="p-2.5">{r.item.name}</td>
                      <td className="p-2.5 text-center font-bold font-mono text-amber-700">{r.effectiveOrderQty}</td>
                      <td className="p-2.5 text-right font-mono">${r.estimatedUnitPrice}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">${r.estimatedLineCost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Calculation Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs font-bold">
              <div>
                <span className="text-slate-500 block text-[10px]">REQUISITION TOTAL WEIGHT:</span>
                <span className="text-slate-800 text-sm font-mono">{totalReorderWeight.toLocaleString()} kg</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">GRAND ESTIMATED TOTAL:</span>
                <span className="text-emerald-700 text-lg font-mono font-extrabold">${totalReorderCost.toLocaleString()}</span>
              </div>
            </div>

            {/* Signatures & Footer Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-[10px] text-slate-400">
                Authorized Signature: <span className="underline font-bold text-slate-600">Logistics Manager</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print PO
                </button>
                <button
                  type="button"
                  onClick={() => setShowPoExportDraft(false)}
                  className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. QR / BARCODE SCANNER MODAL */}
      {showQrScanner && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4" id="modal-qr-scanner">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col relative">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Scan className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Logistics QR / Barcode Scanner</h3>
                  <p className="text-[10px] text-slate-400">Scan cargo labels, SKU tags or barcode sheets</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-toggle-scanner-sound"
                  onClick={() => setScannerSound(!scannerSound)}
                  className={`p-2 rounded-xl border transition cursor-pointer ${
                    scannerSound ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                  title={scannerSound ? 'Audio beep enabled' : 'Mute beep'}
                >
                  {scannerSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  id="btn-toggle-flashlight"
                  onClick={() => setFlashlightOn(!flashlightOn)}
                  className={`p-2 rounded-xl border transition cursor-pointer ${
                    flashlightOn ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                  title="Toggle Flashlight / Laser Light"
                >
                  {flashlightOn ? <Zap className="w-4 h-4 fill-amber-400" /> : <ZapOff className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  id="btn-close-qr-scanner"
                  onClick={() => setShowQrScanner(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scanner Viewfinder Stage */}
            <div className="relative bg-slate-950 p-6 flex flex-col items-center justify-center min-h-[260px] overflow-hidden">
              {/* Background camera beam grid */}
              <div className={`absolute inset-0 opacity-15 pointer-events-none ${flashlightOn ? 'bg-amber-400/10' : ''}`}
                style={{
                  backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)',
                  backgroundSize: '16px 16px'
                }}
              />

              {/* Viewfinder Target Frame */}
              <div className={`relative w-64 h-48 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center ${
                flashlightOn ? 'border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.3)]' : 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
              }`}>
                {/* Corner reticles */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />

                {/* Animated Laser Scanning Line */}
                <motion.div
                  animate={{ y: [-80, 80, -80] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] absolute z-10"
                />

                {/* Target icon */}
                <QrCode className="w-16 h-16 text-emerald-400/40 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-emerald-400/70 mt-2 uppercase tracking-widest">
                  {isScanning ? 'Decoding Barcode...' : 'Align Barcode / QR Tag'}
                </span>
              </div>

              {/* Quick Scan Preset Buttons */}
              <div className="mt-4 flex items-center justify-center gap-1.5 flex-wrap z-10">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Instant Presets:</span>
                {items.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleScanCode(item.sku)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-slate-700 hover:border-emerald-500/50 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer"
                  >
                    Scan {item.sku}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Code Input Bar */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleScanCode(manualScanCode);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Scan className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-manual-barcode"
                    type="text"
                    value={manualScanCode}
                    onChange={(e) => setManualScanCode(e.target.value)}
                    placeholder="Enter manual SKU code (e.g. SPAR-TIRE-02)..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualScanCode.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
                >
                  Scan Code
                </button>
              </form>

              {/* SCANNED RESULT CARD DISPLAY */}
              <AnimatePresence>
                {scannedResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2.5 text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono block">SCANNED AT {scannedResult.timestamp}</span>
                          <span className="font-mono font-extrabold text-emerald-400 text-sm">{scannedResult.code}</span>
                        </div>
                      </div>

                      {scannedResult.item ? (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-[10px] font-bold uppercase">
                          Match Found
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-md text-[10px] font-bold uppercase">
                          No SKU Match
                        </span>
                      )}
                    </div>

                    {scannedResult.item ? (
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white text-sm">{scannedResult.item.name}</span>
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-semibold">
                            {scannedResult.item.category}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Stock Quantity:</span>
                            <span className="font-bold font-mono text-emerald-400">{scannedResult.item.quantity} units</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Location:</span>
                            <span className="font-bold truncate block">{scannedResult.item.location}</span>
                          </div>
                        </div>

                        {/* Action buttons on scan result */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm(scannedResult.item!.sku);
                              setShowQrScanner(false);
                            }}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] transition text-center cursor-pointer"
                          >
                            🔍 Filter in Table
                          </button>

                          {userRole !== 'viewer' && (
                            <button
                              type="button"
                              onClick={() => {
                                handleQuickRestock(scannedResult.item!, 10);
                                handleScanCode(scannedResult.code);
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold rounded-lg text-[11px] transition cursor-pointer"
                            >
                              +10 Restock
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-400 text-center space-y-2">
                        <p className="text-[11px]">No existing inventory SKU matches code "{scannedResult.code}".</p>
                        {userRole !== 'viewer' && (
                          <button
                            type="button"
                            onClick={() => {
                              resetForm();
                              setFormSku(scannedResult.code);
                              setShowAddForm(true);
                              setShowQrScanner(false);
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition inline-block cursor-pointer"
                          >
                            + Register New SKU Record
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* 10. ADD CUSTOM CATEGORY MODAL */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="modal-add-category">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-100 relative text-slate-800 animate-scale-up">
            <div className="flex gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl h-fit shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Add Inventory Category</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Create a custom classification tag to organize SKUs and cargo items.</p>
              </div>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Category Name *</label>
                <input
                  id="input-new-category-name"
                  type="text"
                  required
                  placeholder="e.g. Aviation Hydraulics, Perishables"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition cursor-pointer"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. INVENTORY RECORD LIST & SEARCH & FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Search & Filter Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition ${searchTerm ? 'text-indigo-600 animate-pulse' : 'text-slate-400'}`} />
            <input
              id="search-inventory"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter inventory by name, category, SKU, or location..."
              className={`w-full pl-9 pr-24 py-2.5 text-xs border rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all duration-300 bg-white shadow-2xs ${
                searchTerm
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                  : 'border-slate-200 focus:ring-2 focus:ring-blue-500'
              }`}
            />
            {searchTerm && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-fade-in">
                  {filteredItems.length} match{filteredItems.length !== 1 ? 'es' : ''}
                </span>
                <button
                  type="button"
                  id="btn-clear-inventory-search"
                  onClick={() => setSearchTerm('')}
                  className="text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-100 cursor-pointer"
                  title="Clear search filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Category Dropdown Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-500 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-600">Category:</span>
            </div>
            <select
              id="filter-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-700"
            >
              <option value="All">All Categories ({allCategories.length})</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Location & Stock Alert Status Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <select
              id="filter-location"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-700 w-full"
            >
              <option value="All">All Locations & Statuses</option>
              <option value="Warehouses">Only Warehouses (Unloaded)</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>Loaded: {v.licensePlate}</option>
              ))}
            </select>

            <select
              id="filter-stock-alert"
              value={stockAlertFilter}
              onChange={(e) => setStockAlertFilter(e.target.value as any)}
              className="text-xs border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/50 font-bold text-slate-800"
            >
              <option value="all">All Stock Statuses</option>
              <option value="low_only">⚠️ Low / Out of Stock</option>
              <option value="out_only">🚨 Out of Stock Only</option>
            </select>
          </div>
        </div>

        {/* ACTIVE FILTERS INDICATOR BAR */}
        {(searchTerm || categoryFilter !== 'All' || locationFilter !== 'All' || stockAlertFilter !== 'all') && (
          <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100/80 flex items-center justify-between text-xs text-blue-900 font-medium">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[11px] text-blue-700">Active Filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  Query: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="text-blue-500 hover:text-blue-800">×</button>
                </span>
              )}
              {categoryFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  Category: {categoryFilter}
                  <button onClick={() => setCategoryFilter('All')} className="text-blue-500 hover:text-blue-800">×</button>
                </span>
              )}
              {locationFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  Location: {locationFilter === 'Warehouses' ? 'Warehouses' : vehicles.find(v => v.id === locationFilter)?.licensePlate || locationFilter}
                  <button onClick={() => setLocationFilter('All')} className="text-blue-500 hover:text-blue-800">×</button>
                </span>
              )}
              {stockAlertFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-900 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  Alerts: {stockAlertFilter === 'low_only' ? 'Low/Out of Stock' : 'Out of Stock'}
                  <button onClick={() => setStockAlertFilter('all')} className="text-amber-700 hover:text-amber-900">×</button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-slate-600">
                Showing {filteredItems.length} of {items.length} items
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('All');
                  setLocationFilter('All');
                  setStockAlertFilter('all');
                }}
                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline"
              >
                Reset All
              </button>
            </div>
          </div>
        )}

        {/* Data Table with Animated Search Results */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-4">SKU / Item Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Qty & Alert Threshold</th>
                <th className="p-4">Total Weight</th>
                <th className="p-4">Status / Location</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              <AnimatePresence mode="popLayout">
                {filteredItems.length === 0 ? (
                  <motion.tr
                    key="empty-state"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="w-8 h-8 text-slate-300 stroke-1" />
                        <p className="font-semibold text-slate-600 text-sm">No cargo entries found matching current query.</p>
                        <p className="text-[11px] text-slate-400">Try adjusting your category, location filter, or search query.</p>
                        {(searchTerm || categoryFilter !== 'All' || locationFilter !== 'All' || stockAlertFilter !== 'all') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm('');
                              setCategoryFilter('All');
                              setLocationFilter('All');
                              setStockAlertFilter('all');
                            }}
                            className="mt-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Clear All Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  filteredItems.map((item) => {
                    const totalWeight = item.quantity * item.unitWeight;
                    const isLoaded = !!item.assignedVehicleId;
                    const loadedVehicle = vehicles.find((v) => v.id === item.assignedVehicleId);
                    const stockStatus = getStockStatus(item);
                    const minThreshold = item.minStockLevel ?? 5;

                    return (
                      <motion.tr
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className={`transition ${
                          stockStatus === 'out_of_stock'
                            ? 'bg-rose-50/40 hover:bg-rose-50/70'
                            : stockStatus === 'low_stock'
                              ? 'bg-amber-50/30 hover:bg-amber-50/60'
                              : 'hover:bg-slate-50/60'
                        }`}
                      >
                        {/* SKU / Name */}
                        <td className="p-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              {item.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 font-bold">{item.sku}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            item.category === 'Hazmat' 
                              ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' 
                              : item.category === 'Electronics' 
                                ? 'bg-purple-50 text-purple-600 border-purple-100' 
                                : item.category === 'Spare Parts' 
                                  ? 'bg-amber-50 text-amber-600 border-amber-100'
                                  : item.category === 'Tools'
                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {item.category}
                          </span>
                        </td>

                        {/* Quantity & Stock Alert Badge */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-sm font-extrabold ${
                              stockStatus === 'out_of_stock'
                                ? 'text-rose-600'
                                : stockStatus === 'low_stock'
                                  ? 'text-amber-600'
                                  : 'text-slate-900'
                            }`}>
                              {item.quantity}
                            </span>

                            {/* Alert Badge */}
                            {stockStatus === 'out_of_stock' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[10px] font-extrabold uppercase animate-pulse">
                                <AlertCircle className="w-3 h-3 shrink-0" /> Out of Stock
                              </span>
                            ) : stockStatus === 'low_stock' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[10px] font-extrabold uppercase">
                                <AlertTriangle className="w-3 h-3 shrink-0" /> Low Stock (Min: {minThreshold})
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">
                                (Min: {minThreshold})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Weight */}
                        <td className="p-4 font-mono font-bold text-slate-800">
                          {totalWeight.toLocaleString()} kg
                          <span className="text-[10px] text-slate-400 block font-normal">({item.unitWeight} kg ea)</span>
                        </td>

                        {/* Status / Location */}
                        <td className="p-4">
                          {isLoaded && loadedVehicle ? (
                            <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-xl w-fit">
                              <Truck className="w-3.5 h-3.5" />
                              <span className="font-bold text-[10px] uppercase truncate max-w-[150px]">
                                ON: {loadedVehicle.licensePlate}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2 py-1 rounded-xl w-fit">
                              <Package className="w-3.5 h-3.5" />
                              <span className="font-semibold text-[10px] uppercase truncate max-w-[150px]">
                                {item.location}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          {userRole !== 'viewer' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Restock button for low stock */}
                              {(stockStatus === 'low_stock' || stockStatus === 'out_of_stock') && (
                                <button
                                  type="button"
                                  id={`btn-restock-${item.id}`}
                                  onClick={() => handleQuickRestock(item, 10)}
                                  className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-extrabold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer"
                                  title="Add +10 stock units"
                                >
                                  <PlusCircle className="w-3 h-3" /> Restock +10
                                </button>
                              )}

                              {/* Transfer Quick action */}
                              <select
                                id={`select-transfer-${item.id}`}
                                value={item.assignedVehicleId || ''}
                                onChange={(e) => onAssignItemToVehicle(item.id, e.target.value || undefined)}
                                className="text-[10px] border border-slate-200 rounded-lg p-1 bg-white hover:bg-slate-50 text-slate-600 font-bold focus:outline-none"
                                title="Quick Load/Unload"
                              >
                                <option value="">Warehouse</option>
                                {vehicles.map((v) => (
                                  <option key={v.id} value={v.id}>🚚 {v.licensePlate}</option>
                                ))}
                              </select>

                              {/* Edit button */}
                              <button
                                id={`btn-edit-item-${item.id}`}
                                onClick={() => startEdit(item)}
                                className="p-1.5 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg transition cursor-pointer"
                                title="Edit SKU Details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete button */}
                              <button
                                id={`btn-delete-item-${item.id}`}
                                onClick={() => onDeleteItem(item.id)}
                                className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                title="Remove SKU Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold flex items-center justify-end gap-1 select-none">
                              🔒 Locked
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* PDF REPORT EXPORT MODAL */}
      {showPdfModal && (
        <InventoryPdfModal
          items={items}
          movements={movements}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
}
