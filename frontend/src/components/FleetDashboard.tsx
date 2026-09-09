import { useState, FormEvent } from 'react';
import { Vehicle, GeofenceAlert, MaintenanceLog, GPSDevice, MapSettings, CustomRoute } from '../types';
import CarbonReportView from './analytics/CarbonReportView';
import SmartMaintenanceAlertsView from './maintenance/SmartMaintenanceAlertsView';
import LiveAnimatedAlertsBar from './common/LiveAnimatedAlertsBar';
import VoiceCommandDispatchBar from './dispatch/VoiceCommandDispatchBar';
import VoiceDispatchControlRoom from './dispatch/VoiceDispatchControlRoom';
import RouteEfficiencyMapView from './routes/RouteEfficiencyMapView';
import SmartRouteSimulator from './routes/SmartRouteSimulator';
import CargoLoadingOptimizerView from './logistics/CargoLoadingOptimizerView';
import AiLogisticsAnalystView from './logistics/AiLogisticsAnalystView';
import { 
  Truck, AlertTriangle, Battery, BatteryCharging, ShieldAlert, CheckCircle, 
  Settings, Zap, Shield, HelpCircle, Activity, Gauge, RefreshCw, Smartphone,
  Download, Wrench, Clock, Sliders, Sparkles, TrendingUp,
  Brain, Navigation, Milestone, Timer, Flame, ShieldCheck,
  CloudLightning, CloudRain, Sun, Wind, Thermometer, FileSpreadsheet, Eye, ClipboardList,
  Coins, DollarSign, Award, Plus, Leaf, Cpu, Boxes, RadioTower, Compass
} from 'lucide-react';

// Illustrative 6-month cost/downtime trend for the maintenance summary chart below.
// Not backed by a real table (workshop downtime hours aren't tracked yet) — replace
// once historical maintenance cost/downtime logging exists.
const historicalMaintenanceTrend = [
  { month: 'Feb', cost: 1850, downtimeHours: 42 },
  { month: 'Mar', cost: 2400, downtimeHours: 58 },
  { month: 'Apr', cost: 1550, downtimeHours: 35 },
  { month: 'May', cost: 3200, downtimeHours: 72 },
  { month: 'Jun', cost: 2100, downtimeHours: 48 },
  { month: 'Jul', cost: 2950, downtimeHours: 64 },
];
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';

interface FleetDashboardProps {
  vehicles: Vehicle[];
  devices: GPSDevice[];
  alerts: GeofenceAlert[];
  maintenance: MaintenanceLog[];
  settings: MapSettings;
  customRoutes?: CustomRoute[];
  onAddCustomRoute?: (route: CustomRoute) => void;
  onUpdateSettings: (settings: Partial<MapSettings>) => void;
  onResolveAlert: (id: string) => void;
  onCompleteMaintenance: (id: string) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onCalibrateTPMS: (vehicleId: string) => void;
  onAddAlert?: (newAlert: GeofenceAlert) => void;
}

export default function FleetDashboard({
  vehicles,
  devices,
  alerts,
  maintenance,
  settings,
  customRoutes = [],
  onAddCustomRoute,
  onUpdateSettings,
  onResolveAlert,
  onCompleteMaintenance,
  onSelectVehicle,
  onCalibrateTPMS,
  onAddAlert,
}: FleetDashboardProps) {
  // --- DASHBOARD SUB-SYSTEM NAVIGATION ---
  const [dashboardSubTab, setDashboardSubTab] = useState<'overview' | 'carbon' | 'smart_maintenance' | 'route_efficiency' | 'cargo_loading' | 'ai_analyst' | 'voice_dispatch' | 'route_simulator'>('overview');

  // --- PREDICTIVE MAINTENANCE CONFIG ---
  const [distanceThreshold, setDistanceThreshold] = useState<number>(500); // km remaining
  const [hoursThreshold, setHoursThreshold] = useState<number>(15); // hours remaining
  const [tpmsSelectedId, setTpmsSelectedId] = useState<string>(vehicles[0]?.id || '');
  const [selectedDriverId, setSelectedDriverId] = useState<string>(vehicles[0]?.id || '');
  
  const [predictiveVehicleId, setPredictiveVehicleId] = useState<string>(vehicles[0]?.id || 'TR-01');
  const [isSolvingRoute, setIsSolvingRoute] = useState<boolean>(false);
  const [optimizedRouteId, setOptimizedRouteId] = useState<string>('R-01');
  const [payloadMultiplier, setPayloadMultiplier] = useState<number>(1.0);

  // --- MANUAL ROUTE PLANNER STATE ---
  const [showAddRouteModal, setShowAddRouteModal] = useState<boolean>(false);
  const [newRouteTitle, setNewRouteTitle] = useState('');
  const [newRouteFrom, setNewRouteFrom] = useState('');
  const [newRouteTo, setNewRouteTo] = useState('');
  const [newRouteCode, setNewRouteCode] = useState('');
  const [newRouteDesc, setNewRouteDesc] = useState('');
  const [newRouteWaypoints, setNewRouteWaypoints] = useState('');

  // --- CLIMATE & METEOROLOGICAL STATE ---
  const [selectedClimateZone, setSelectedClimateZone] = useState<string>('Tangerang Depot Route');
  const [customClimateTemp, setCustomClimateTemp] = useState<number>(31);
  const [customClimateHumidity, setCustomClimateHumidity] = useState<number>(85);
  const [customClimatePrecip, setCustomClimatePrecip] = useState<string>('Heavy Monsoon Showers');
  const [customClimateWind, setCustomClimateWind] = useState<number>(34); // km/h

  // --- TRIP REPORT STATE ---
  const [selectedTripVehicleId, setSelectedTripVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [selectedTripIndex, setSelectedTripIndex] = useState<number>(0);

  // --- EXTENDED EXPORT LOG FEATURE HANDLERS ---
  const exportTelematicsToCSV = () => {
    const headers = ['Vehicle ID', 'Vehicle Name', 'Type', 'License Plate', 'Driver Name', 'Odometer (km)', 'Engine Hours', 'Fuel Level (%)', 'Cargo Weight (kg)', 'FL Tire PSI', 'FR Tire PSI', 'RL Tire PSI', 'RR Tire PSI', 'Status'];
    const rows = vehicles.map(v => [
      v.id,
      `"${v.name.replace(/"/g, '""')}"`,
      v.type,
      v.licensePlate,
      `"${v.driverName.replace(/"/g, '""')}"`,
      v.odometer ?? 0,
      v.engineHours ?? 0,
      v.fuelLevel,
      v.cargoWeight,
      v.tirePressures?.fl ?? 0,
      v.tirePressures?.fr ?? 0,
      v.tirePressures?.rl ?? 0,
      v.tirePressures?.rr ?? 0,
      v.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fleet_telematics_log_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const FUEL_PRICE_PER_LITER = 10000; // Rp per liter (Pertalite average)

  const fuelCostChartData = vehicles.map((v) => {
    const odo = v.odometer ?? 0;
    const capacity = v.fuelCapacity ?? 80;
    const currentLiters = (v.fuelLevel / 100) * capacity;
    const refuelLiters = Math.max(0, capacity - currentLiters);
    
    // Cost Calculations
    const currentValue = currentLiters * FUEL_PRICE_PER_LITER;
    const refuelCost = refuelLiters * FUEL_PRICE_PER_LITER;
    
    // Spent lifetime fuel calculations
    const avgCons = v.averageFuelConsumption ?? 12;
    const totalLitersSpent = (odo * avgCons) / 100;
    const lifetimeSpentCost = totalLitersSpent * FUEL_PRICE_PER_LITER;

    return {
      id: v.id,
      name: v.name,
      shortName: v.name.split(' ').slice(-1)[0],
      licensePlate: v.licensePlate,
      odometer: odo,
      capacity,
      currentLiters,
      refuelLiters,
      currentValue,
      refuelCost,
      lifetimeSpentCost,
      avgCons,
      fuelLevel: v.fuelLevel,
      efficiencyScore: v.fuelEfficiencyScore ?? 80
    };
  });

  const totalSpentCost = fuelCostChartData.reduce((sum, item) => sum + item.lifetimeSpentCost, 0);
  const totalCurrentValue = fuelCostChartData.reduce((sum, item) => sum + item.currentValue, 0);
  const totalRefuelCost = fuelCostChartData.reduce((sum, item) => sum + item.refuelCost, 0);
  const totalRefuelLiters = fuelCostChartData.reduce((sum, item) => sum + item.refuelLiters, 0);
  const totalFleetOdometer = fuelCostChartData.reduce((sum, item) => sum + item.odometer, 0);

  const exportFuelCostReport = () => {
    const headers = [
      'Vehicle ID',
      'Vehicle Name',
      'License Plate',
      'Odometer (km)',
      'Fuel Level (%)',
      'Fuel Capacity (L)',
      'Current Fuel (L)',
      'Refuel Needed (L)',
      'In Tank Value (RM)',
      'Cost to Refuel (RM)',
      'Average Consumption (L/100km)',
      'Est Lifetime Fuel Burned (L)',
      'Est Lifetime Fuel Spend (RM)',
      'Eco Efficiency Score'
    ];
    
    const rows = fuelCostChartData.map(item => [
      item.id,
      `"${item.name.replace(/"/g, '""')}"`,
      item.licensePlate,
      item.odometer,
      item.fuelLevel,
      item.capacity,
      item.currentLiters.toFixed(1),
      item.refuelLiters.toFixed(1),
      item.currentValue.toFixed(2),
      item.refuelCost.toFixed(2),
      item.avgCons,
      ((item.odometer * item.avgCons) / 100).toFixed(1),
      item.lifetimeSpentCost.toFixed(2),
      item.efficiencyScore
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fleet_fuel_cost_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTripsToCSV = () => {
    const headers = ['Trip ID', 'Vehicle ID', 'Driver Name', 'Origin', 'Destination', 'Distance (km)', 'Fuel Used (L)', 'Avg Speed (km/h)', 'Duration (mins)', 'Safety Score', 'Cargo Type', 'Transit Weather'];
    const rows = vehicles.flatMap((v) => {
      const trips = getSimulatedTripsForVehicle(v.id);
      return trips.map(t => [
        t.id,
        v.id,
        `"${v.driverName.replace(/"/g, '""')}"`,
        `"${t.origin.replace(/"/g, '""')}"`,
        `"${t.destination.replace(/"/g, '""')}"`,
        t.distanceKm,
        t.fuelConsumedL,
        t.avgSpeedKmh,
        t.durationMins,
        t.safetyScore,
        `"${t.cargoType.replace(/"/g, '""')}"`,
        `"${t.weather.replace(/"/g, '""')}"`
      ]);
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fleet_trip_log_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSystemActivityToJSON = () => {
    const activityLog = {
      exportTimestamp: new Date().toISOString(),
      fleetSummary: {
        totalVehicles,
        activeCount,
        idleCount,
        stoppedCount,
        activeAlarmsCount: activeAlerts.length,
        lowBatteryGpsCount: lowBatteryDevices.length
      },
      vehicles: vehicles.map(v => ({
        id: v.id,
        name: v.name,
        licensePlate: v.licensePlate,
        driver: v.driverName,
        fuel: v.fuelLevel,
        odometer: v.odometer,
        battery: v.batteryPercent,
        location: v.location,
        tireStatus: v.tirePressures?.status || 'normal'
      })),
      devices: devices.map(d => ({
        id: d.id,
        assignedVehicleId: d.assignedVehicleId,
        battery: d.batteryLevel,
        status: d.status
      })),
      activeAlertsLog: alerts.filter(a => !a.resolved),
      archivedAlertsLog: alerts.filter(a => a.resolved)
    };

    const blob = new Blob([JSON.stringify(activityLog, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fleet_system_activity_log_${new Date().toISOString().slice(0, 10)}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveRoute = (e: FormEvent) => {
    e.preventDefault();
    if (!newRouteTitle || !newRouteFrom || !newRouteTo) {
      alert('Route title, origin, and destination are required.');
      return;
    }

    const newId = `R-${Date.now().toString().slice(-4)}`;
    const parsedWaypoints = newRouteWaypoints ? newRouteWaypoints.split(',').map((item) => ({
      ptNode: item.trim(),
      code: item.trim().toUpperCase().slice(0, 3)
    })) : [
      { ptNode: newRouteFrom.split(' ')[0] || newRouteFrom, code: newRouteFrom.toUpperCase().slice(0, 3) },
      { ptNode: newRouteTo.split(' ')[0] || newRouteTo, code: newRouteTo.toUpperCase().slice(0, 3) }
    ];

    const newRoute: CustomRoute = {
      id: newId,
      title: newRouteTitle,
      from: newRouteFrom,
      to: newRouteTo,
      desc: newRouteDesc || 'Manually entered corridor route',
      code: newRouteCode || `MAN-${newId}`,
      waypoints: parsedWaypoints
    };

    if (onAddCustomRoute) {
      onAddCustomRoute(newRoute);
    }
    
    setOptimizedRouteId(newId);
    
    // reset form fields
    setNewRouteTitle('');
    setNewRouteFrom('');
    setNewRouteTo('');
    setNewRouteCode('');
    setNewRouteDesc('');
    setNewRouteWaypoints('');
    setShowAddRouteModal(false);
  };

  // --- TRIP REPORT DATA GENERATOR ---
  const getSimulatedTripsForVehicle = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId) || vehicles[0];
    if (!vehicle) return [];
    
    // Derived numeric offsets from ID to give varying realistic metrics
    const hash = vehicleId.charCodeAt(vehicleId.length - 1) || 100;
    
    return [
      {
        id: `TRIP-${vehicleId}-902`,
        date: '2026-07-19',
        origin: 'Tangerang HQ Depot',
        destination: 'CGK Airport Cargo Terminal',
        distanceKm: Math.round((50 + (hash % 20)) * 10) / 10,
        durationMins: 45 + (hash % 15),
        fuelConsumedL: Math.round((8 + (hash % 6)) * 10) / 10,
        avgSpeedKmh: 70 + (hash % 10),
        harshBrakes: hash % 2,
        harshAccels: hash % 3,
        idleMin: 3 + (hash % 5),
        safetyScore: Math.max(85, Math.min(100, 100 - (hash % 12))),
        cargoType: 'High-Priority Aircraft Avionics',
        weather: 'Thunderstorms & Heavy Rain'
      },
      {
        id: `TRIP-${vehicleId}-901`,
        date: '2026-07-18',
        origin: 'CGK Airport Cargo Terminal',
        destination: 'BSD Logistics Hub',
        distanceKm: Math.round((60 + (hash % 12)) * 10) / 10,
        durationMins: 55 + (hash % 10),
        fuelConsumedL: Math.round((10 + (hash % 4)) * 10) / 10,
        avgSpeedKmh: 65 + (hash % 8),
        harshBrakes: (hash % 3) === 0 ? 1 : 0,
        harshAccels: hash % 2,
        idleMin: 10 + (hash % 6),
        safetyScore: Math.max(80, Math.min(100, 95 - (hash % 8))),
        cargoType: 'Express Nusantara Courier Pallets',
        weather: 'Monsoon Wind Squalls'
      },
      {
        id: `TRIP-${vehicleId}-900`,
        date: '2026-07-15',
        origin: 'Bandung Airport Hub',
        destination: 'Tangerang HQ Depot',
        distanceKm: 348.0,
        durationMins: 240 + (hash % 30),
        fuelConsumedL: Math.round((55 + (hash % 10)) * 10) / 10,
        avgSpeedKmh: 78 + (hash % 5),
        harshBrakes: hash % 4,
        harshAccels: hash % 3,
        idleMin: 15 + (hash % 12),
        safetyScore: Math.max(75, Math.min(100, 98 - (hash % 15))),
        cargoType: 'Temperature-Sensitive Vaccine Cold-Chain',
        weather: 'Clear Ambient Skies'
      }
    ];
  };

  // --- TRIGGER CLIMATE ALERT HANDLER ---
  const handleTriggerClimateAlert = (type: 'monsoon' | 'thunderstorm' | 'flood' | 'extreme_heat') => {
    if (!onAddAlert) return;
    
    let alertDetails = '';
    let severity: 'critical' | 'warning' = 'warning';
    let zoneName = selectedClimateZone;
    let targetVehicle = vehicles.find(v => v.id === selectedTripVehicleId) || vehicles[0];
    if (!targetVehicle) return;
    
    if (type === 'flood') {
      alertDetails = `🚨 CLIMATE RISK RED ALERT: Extreme Flash Flooding detected along route sectors near ${zoneName}! Water level exceeds safety threshold. Instruct driver ${targetVehicle.driverName} to pause transport and seek immediate higher ground.`;
      severity = 'critical';
    } else if (type === 'monsoon') {
      alertDetails = `⛈️ CLIMATE RISK ORANGE ALERT: Southeast Monsoon Squall Warning! Gusts up to ${customClimateWind} km/h and intense downpours near ${zoneName}. Heavy vehicles (like ${targetVehicle.name}) must reduce speed or park until wind subsides.`;
      severity = 'critical';
    } else if (type === 'thunderstorm') {
      alertDetails = `⚡ CLIMATE ADVISORY: Severe lightning and heavy precipitation active around ${zoneName}. Potential telematics dropout risk. Maintain high defensive driving protocol.`;
      severity = 'warning';
    } else if (type === 'extreme_heat') {
      alertDetails = `🌡️ CLIMATE ADVISORY: Extreme ambient temperature spike detected around ${zoneName} (reaching ${customClimateTemp}°C, Relative Humidity: ${customClimateHumidity}%). Cabin cooling systems and cargo reefer cold-chain checks are required.`;
      severity = 'warning';
    }
    
    const newAlert: GeofenceAlert = {
      id: `climate-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      vehicleId: targetVehicle.id,
      vehicleName: targetVehicle.name,
      geofenceName: zoneName,
      type: 'climate_alert',
      timestamp: new Date().toISOString(),
      resolved: false,
      severity: severity,
      details: alertDetails
    };
    
    onAddAlert(newAlert);
  };
  
  // Calculate statistics
  const totalVehicles = vehicles.length;
  const activeCount = vehicles.filter((v) => v.status === 'active').length;
  const idleCount = vehicles.filter((v) => v.status === 'idle').length;
  const stoppedCount = vehicles.filter((v) => v.status === 'stopped').length;
  const maintenanceCount = vehicles.filter((v) => v.status === 'maintenance').length;

  const lowBatteryDevices = devices.filter((d) => d.batteryLevel <= 20);
  const overdueMaintenance = maintenance.filter((m) => m.status === 'overdue');
  const activeAlerts = alerts.filter((a) => !a.resolved);

  // Compute predictions for each vehicle
  const predictiveMaintenanceData = vehicles.map((v) => {
    const odo = v.odometer ?? 0;
    const hrs = v.engineHours ?? 0;

    // Find if there is a scheduled maintenance log for this vehicle
    const scheduledLog = maintenance.find((m) => m.vehicleId === v.id && m.status === 'scheduled');

    let mileageMilestone = 10000;
    let serviceName = "Scheduled Maintenance";

    if (scheduledLog) {
      mileageMilestone = scheduledLog.mileageInterval;
      serviceName = scheduledLog.serviceType;
    } else {
      // Determine default interval based on vehicle type
      const defaultInterval = v.type === 'Truck' ? 10000 
                            : v.type === 'Van' ? 8000 
                            : v.type === 'Sedan' ? 12000 
                            : v.type === 'SUV' ? 10000 
                            : 5000; // Motorcycle
      
      // Calculate next multiple
      const multiplier = Math.max(1, Math.ceil(odo / defaultInterval));
      mileageMilestone = multiplier * defaultInterval;
      serviceName = `${v.type} Service Milestone`;
    }

    // Equivalent hours milestone (based on 40 km/h average operational run)
    const hoursMilestone = Math.round((mileageMilestone / 40) * 10) / 10;

    const distanceRemaining = Math.max(0, mileageMilestone - odo);
    const hoursRemaining = Math.max(0, hoursMilestone - hrs);

    const distanceProgress = Math.min(100, (odo / mileageMilestone) * 100);
    const hoursProgress = Math.min(100, (hrs / hoursMilestone) * 100);

    // Risk classification
    let risk: 'critical' | 'moderate' | 'optimal' = 'optimal';
    if (distanceRemaining <= distanceThreshold || hoursRemaining <= hoursThreshold) {
      risk = 'critical';
    } else if (distanceRemaining <= distanceThreshold * 2 || hoursRemaining <= hoursThreshold * 2) {
      risk = 'moderate';
    }

    return {
      vehicle: v,
      serviceName,
      mileageMilestone,
      hoursMilestone,
      distanceRemaining,
      hoursRemaining,
      distanceProgress,
      hoursProgress,
      risk,
    };
  });

  const criticalPredictions = predictiveMaintenanceData.filter(p => p.risk === 'critical');
  const moderatePredictions = predictiveMaintenanceData.filter(p => p.risk === 'moderate');

  // Recharts Pie Chart Data
  const statusData = [
    { name: 'Active', value: activeCount, color: '#10B981' }, // Emerald
    { name: 'Idle', value: idleCount, color: '#3B82F6' }, // Blue
    { name: 'Stopped', value: stoppedCount, color: '#6B7280' }, // Slate Gray
    { name: 'In Service', value: maintenanceCount, color: '#F59E0B' }, // Amber
  ].filter(d => d.value > 0);

  // Fuel level metrics for bar chart
  const fuelData = vehicles.map((v) => ({
    name: v.name.split(' ').slice(-1)[0],
    fuel: v.fuelLevel,
    battery: v.batteryPercent,
  }));

  // --- FUEL ANALYTICS CALCULATIONS ---
  const fuelAnalyticsData = vehicles.map((v) => {
    const capacity = v.fuelCapacity ?? 80;
    const currentLiters = Math.round((v.fuelLevel / 100) * capacity * 10) / 10;
    const avgCons = v.averageFuelConsumption ?? 12;
    const estRange = avgCons > 0 ? Math.round((currentLiters / avgCons) * 100) : 0;
    const score = v.fuelEfficiencyScore ?? 80;

    return {
      id: v.id,
      name: v.name,
      shortName: v.name.split(' ').slice(-1)[0],
      licensePlate: v.licensePlate,
      fuelLevel: v.fuelLevel,
      capacity,
      currentLiters,
      avgCons,
      estRange,
      score,
      status: v.status,
    };
  });

  const totalFuelCapacity = fuelAnalyticsData.reduce((sum, f) => sum + f.capacity, 0);
  const totalFuelLiters = Math.round(fuelAnalyticsData.reduce((sum, f) => sum + f.currentLiters, 0) * 10) / 10;
  const avgFleetConsumption = Math.round((fuelAnalyticsData.reduce((sum, f) => sum + f.avgCons, 0) / fuelAnalyticsData.length) * 10) / 10;
  const avgEcoScore = Math.round(fuelAnalyticsData.reduce((sum, f) => sum + f.score, 0) / fuelAnalyticsData.length);

  const tpmsSelectedVehicle = vehicles.find((v) => v.id === tpmsSelectedId) || vehicles[0];

  // Battery Optimization config presets
  const applyBatteryPreset = (preset: 'saver' | 'balanced' | 'performance') => {
    let updateInterval = 30;
    if (preset === 'saver') updateInterval = 60;
    else if (preset === 'performance') updateInterval = 5;

    onUpdateSettings({
      batteryOptimization: preset,
      updateInterval,
    });
  };

  const exportAlertsToCSV = () => {
    const headers = ['Alert ID', 'Vehicle ID', 'Vehicle Name', 'Geofence Name', 'Event Type', 'Timestamp', 'Status'];
    const rows = alerts.map(alert => [
      alert.id,
      alert.vehicleId,
      `"${alert.vehicleName.replace(/"/g, '""')}"`,
      `"${alert.geofenceName.replace(/"/g, '""')}"`,
      alert.type.toUpperCase(),
      alert.timestamp,
      alert.resolved ? 'RESOLVED' : 'PENDING'
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fleet_geofence_alerts_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMaintenanceToCSV = () => {
    const headers = ['Log ID', 'Vehicle ID', 'Service Type', 'Description', 'Mileage Interval (km)', 'Status', 'Due Date', 'Cost (USD)'];
    const rows = maintenance.map(log => [
      log.id,
      log.vehicleId,
      `"${log.serviceType.replace(/"/g, '""')}"`,
      `"${log.description.replace(/"/g, '""')}"`,
      log.mileageInterval,
      log.status.toUpperCase(),
      log.dueDate,
      log.cost !== undefined ? log.cost : ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fleet_maintenance_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ANIMATED LIVE TELEMATICS STREAM ALERTS */}
      <LiveAnimatedAlertsBar />

      {/* VOICE COMMAND DISPATCH ASSISTANT */}
      <VoiceCommandDispatchBar />

      {/* DASHBOARD SYSTEM SUB-TAB NAVIGATION */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDashboardSubTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            dashboardSubTab === 'overview'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" /> Operational Fleet Scoreboard
        </button>

        <button
          type="button"
          onClick={() => setDashboardSubTab('ai_analyst')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            dashboardSubTab === 'ai_analyst'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Brain className="w-4 h-4 text-amber-400" /> AI Logistics Analyst
        </button>

        <button
          type="button"
          onClick={() => setDashboardSubTab('voice_dispatch')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            dashboardSubTab === 'voice_dispatch'
              ? 'bg-indigo-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <RadioTower className="w-4 h-4 text-emerald-400" /> Voice Dispatch Room
        </button>

        <button
          type="button"
          onClick={() => setDashboardSubTab('route_simulator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            dashboardSubTab === 'route_simulator'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Compass className="w-4 h-4 text-teal-300" /> Smart Route Simulator
        </button>

        <button
          type="button"
          onClick={() => setDashboardSubTab('route_efficiency')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            dashboardSubTab === 'route_efficiency'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Navigation className="w-4 h-4" /> Route Efficiency Map
        </button>

        <button
          type="button"
          onClick={() => setDashboardSubTab('cargo_loading')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            dashboardSubTab === 'cargo_loading'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-4 h-4" /> Cargo Load Optimizer
        </button>

        <button
          type="button"
          onClick={() => setDashboardSubTab('carbon')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            dashboardSubTab === 'carbon'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Leaf className="w-4 h-4" /> Carbon Report & Sustainability
        </button>

        <button
          type="button"
          onClick={() => setDashboardSubTab('smart_maintenance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            dashboardSubTab === 'smart_maintenance'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4" /> Smart Maintenance & OBD Diagnostics
        </button>
      </div>

      {dashboardSubTab === 'ai_analyst' && (
        <AiLogisticsAnalystView vehicles={vehicles} drivers={historicalMaintenanceTrend ? [] : []} />
      )}

      {dashboardSubTab === 'voice_dispatch' && (
        <VoiceDispatchControlRoom vehicles={vehicles} />
      )}

      {dashboardSubTab === 'route_simulator' && (
        <SmartRouteSimulator />
      )}

      {dashboardSubTab === 'route_efficiency' && (
        <RouteEfficiencyMapView />
      )}

      {dashboardSubTab === 'cargo_loading' && (
        <CargoLoadingOptimizerView vehicles={vehicles} />
      )}

      {dashboardSubTab === 'carbon' && (
        <CarbonReportView vehicles={vehicles} />
      )}

      {dashboardSubTab === 'smart_maintenance' && (
        <SmartMaintenanceAlertsView
          vehicles={vehicles}
          maintenanceLogs={maintenance}
          onCompleteMaintenance={onCompleteMaintenance}
        />
      )}

      {dashboardSubTab === 'overview' && (
        <>
      {/* 1. TOP METRICS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Vehicles</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalVehicles}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active En-Route</p>
            <h3 className="text-2xl font-bold text-slate-800">{activeCount}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Critical Alerts</p>
            <h3 className="text-2xl font-bold text-slate-800">{activeAlerts.length}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BatteryCharging className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Low Battery GPS</p>
            <h3 className="text-2xl font-bold text-slate-800">{lowBatteryDevices.length}</h3>
          </div>
        </div>
      </div>

      {/* AUDIT & COMPLIANCE EXPORT CENTER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
            <Download className="w-4 h-4 text-blue-600" /> Audit & Compliance Export Center
          </h4>
          <p className="text-[11px] text-slate-500">Download formatted telemetry lists, system states, and detailed alerts in standardized CSV and JSON formats for audit reporting.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            id="btn-export-alerts"
            onClick={exportAlertsToCSV}
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Alerts ({alerts.length})
          </button>
          <button
            id="btn-export-maintenance"
            onClick={exportMaintenanceToCSV}
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Maintenance ({maintenance.length})
          </button>
          <button
            id="btn-export-telematics"
            onClick={exportTelematicsToCSV}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Telematics ({vehicles.length})
          </button>
          <button
            id="btn-export-trips"
            onClick={exportTripsToCSV}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Milestone className="w-3.5 h-3.5" /> Trips Log
          </button>
          <button
            id="btn-export-fuel-costs"
            onClick={exportFuelCostReport}
            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-750 border border-amber-200 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5 text-amber-500" /> Fuel Costs Audit
          </button>
          <button
            id="btn-export-system-json"
            onClick={exportSystemActivityToJSON}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> System Activity (.JSON)
          </button>
        </div>
      </div>

      {/* 2. LIVE CRITICAL FLEET ALERTS & SENSOR ALARMS LIST (If any) */}
      {activeAlerts.length > 0 && (
        <div className="bg-red-50/70 border border-red-100 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-850 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-red-600 animate-bounce" />
              <span>CRITICAL FLEET SENSOR ALARMS</span>
            </div>
            <span className="bg-red-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
              {activeAlerts.length} PENDING
            </span>
          </div>

          <div className="grid gap-2 max-h-64 overflow-y-auto">
            {activeAlerts.map((alert) => {
              const isCritical = alert.severity === 'critical';
              let badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
              let titleText = '';
              let descText = alert.details || '';

              if (alert.type === 'fuel_theft') {
                badgeColor = 'bg-rose-100 text-rose-700 border-rose-200';
                titleText = 'FUEL ANOMALY';
              } else if (alert.type === 'maintenance_due') {
                badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
                titleText = 'MAINTENANCE ALERT';
              } else if (alert.type === 'low_pressure') {
                badgeColor = 'bg-orange-100 text-orange-700 border-orange-200';
                titleText = 'TPMS WARNING';
              } else if (alert.type === 'idle_time') {
                badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
                titleText = 'ENGINE IDLE ALERT';
              } else if (alert.type === 'battery_low') {
                badgeColor = 'bg-red-100 text-red-700 border-red-200';
                titleText = 'BATTERY LOW';
              } else if (alert.type === 'climate_alert') {
                badgeColor = 'bg-indigo-100 text-indigo-700 border-indigo-200';
                titleText = 'CLIMATE ALERT';
              } else {
                badgeColor = alert.type === 'exit' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200';
                titleText = alert.type === 'exit' ? 'GEOFENCE EXIT' : 'GEOFENCE ENTER';
                descText = `${alert.vehicleName} has ${alert.type === 'exit' ? 'EXITED' : 'ENTERED'} geofence zone: "${alert.geofenceName}"`;
              }

              return (
                <div 
                  key={alert.id} 
                  className={`p-3 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs bg-white ${
                    isCritical ? 'border-rose-200/80 bg-rose-50/10' : 'border-slate-150'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg shrink-0 mt-0.5">
                      {alert.type === 'fuel_theft' ? '⛽' : alert.type === 'maintenance_due' ? '🔧' : alert.type === 'low_pressure' ? '🛞' : alert.type === 'idle_time' ? '⏳' : alert.type === 'battery_low' ? '🔋' : alert.type === 'climate_alert' ? '⛈️' : '📍'}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-800">{alert.vehicleName}</span>
                        <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${badgeColor}`}>
                          {titleText}
                        </span>
                        {isCritical && (
                          <span className="bg-red-600 text-white font-mono text-[8px] font-extrabold px-1 py-0.2 rounded uppercase animate-pulse">
                            CRITICAL
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 mt-1 font-medium leading-relaxed">{descText}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100/50">
                    <span className="text-slate-400 font-mono text-[10px]">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    <button
                      id={`btn-resolve-alert-${alert.id}`}
                      onClick={() => onResolveAlert(alert.id)}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg font-bold transition text-[10px] cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI PREDICTIVE MAINTENANCE DIAGNOSTICS */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl text-white space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
                <Sparkles className="w-5 h-5 animate-pulse text-indigo-400" />
              </span>
              <h3 className="font-extrabold text-base tracking-tight text-white uppercase">AI Predictive Maintenance Diagnostics</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Analyzing real-time odometer readings and cumulative engine runtime metrics to predict vehicle service milestones before mechanical issues occur.
            </p>
          </div>

          {/* Interactive Threshold Tuner */}
          <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl text-xs space-y-3 min-w-[300px]">
            <div className="flex items-center gap-1.5 font-bold text-indigo-400">
              <Sliders className="w-4 h-4" />
              <span>Diagnostic Sensitivity Tuner</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400 font-semibold uppercase">Odometer Tolerance:</span>
                <span className="font-mono font-bold text-white bg-indigo-500/40 px-1.5 py-0.5 rounded">{distanceThreshold} km</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="2000" 
                step="50"
                value={distanceThreshold} 
                onChange={(e) => setDistanceThreshold(Number(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400 font-semibold uppercase">Engine Hour Tolerance:</span>
                <span className="font-mono font-bold text-white bg-indigo-500/40 px-1.5 py-0.5 rounded">{hoursThreshold} hrs</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="100" 
                step="5"
                value={hoursThreshold} 
                onChange={(e) => setHoursThreshold(Number(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Aggregated Predictive Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-xl flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Imminent Risk Assets</p>
              <h4 className="text-xl font-black text-rose-400 font-mono">{criticalPredictions.length}</h4>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-xl flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Moderate Risk Assets</p>
              <h4 className="text-xl font-black text-amber-400 font-mono">{moderatePredictions.length}</h4>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-xl flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Healthy Operations</p>
              <h4 className="text-xl font-black text-emerald-400 font-mono">
                {predictiveMaintenanceData.filter(p => p.risk === 'optimal').length}
              </h4>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Vehicle Predictive Diagnostic Feed */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {predictiveMaintenanceData.map((pred) => {
            const { vehicle, serviceName, mileageMilestone, hoursMilestone, distanceRemaining, hoursRemaining, distanceProgress, hoursProgress, risk } = pred;
            
            return (
              <div 
                key={vehicle.id}
                className={`p-4 rounded-xl border flex flex-col justify-between space-y-4 transition-all duration-300 ${
                  risk === 'critical'
                    ? 'bg-rose-950/20 border-rose-900/40 hover:bg-rose-950/30'
                    : risk === 'moderate'
                      ? 'bg-amber-950/10 border-amber-900/30 hover:bg-amber-950/20'
                      : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/40'
                }`}
              >
                {/* Vehicle header inside card */}
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {vehicle.type === 'Truck' ? '🚚' : vehicle.type === 'Van' ? '🚐' : vehicle.type === 'Sedan' ? '🚗' : vehicle.type === 'SUV' ? '🚘' : '🏍️'}
                      </span>
                      <h4 className="font-extrabold text-xs text-white truncate max-w-[140px]">{vehicle.name}</h4>
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono tracking-wider">{vehicle.licensePlate} • {vehicle.id}</p>
                  </div>

                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider ${
                    risk === 'critical'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : risk === 'moderate'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {risk === 'critical' ? 'Urgent Service' : risk === 'moderate' ? 'Incoming Service' : 'Nominal Health'}
                  </span>
                </div>

                {/* Service milestone prediction card context */}
                <div className="p-2.5 bg-black/30 rounded-lg border border-slate-850 space-y-1">
                  <span className="text-[8px] text-indigo-400 font-black uppercase block tracking-wider">PREDICTED SERVICE</span>
                  <p className="text-[11px] font-bold text-slate-100 truncate">{serviceName}</p>
                </div>

                {/* Progress stats for distance and hours */}
                <div className="space-y-3 text-[11px]">
                  {/* Distance (Odometer) progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="flex items-center gap-1 text-slate-400 font-semibold uppercase text-[9px]">
                        <Wrench className="w-3 h-3 text-indigo-400" />
                        <span>Odometer Interval</span>
                      </span>
                      <span className="font-mono font-bold text-slate-200">
                        {Math.round(vehicle.odometer ?? 0).toLocaleString()} / {mileageMilestone.toLocaleString()} km
                      </span>
                    </div>
                    
                    <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          risk === 'critical' ? 'bg-rose-500' : risk === 'moderate' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${distanceProgress}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[9px] font-mono mt-0.5">
                      <span className="text-slate-400">Reached: {distanceProgress.toFixed(0)}%</span>
                      <span className={`font-bold ${risk === 'critical' ? 'text-rose-400' : 'text-slate-300'}`}>
                        {distanceRemaining < 1 ? 'Due' : `${Math.round(distanceRemaining).toLocaleString()} km remaining`}
                      </span>
                    </div>
                  </div>

                  {/* Engine runtime hours progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="flex items-center gap-1 text-slate-400 font-semibold uppercase text-[9px]">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        <span>Engine Hours Interval</span>
                      </span>
                      <span className="font-mono font-bold text-slate-200">
                        {Math.round(vehicle.engineHours ?? 0).toLocaleString()} / {hoursMilestone.toLocaleString()} hrs
                      </span>
                    </div>
                    
                    <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          risk === 'critical' ? 'bg-rose-500' : risk === 'moderate' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${hoursProgress}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[9px] font-mono mt-0.5">
                      <span className="text-slate-400">Reached: {hoursProgress.toFixed(0)}%</span>
                      <span className={`font-bold ${risk === 'critical' ? 'text-rose-400' : 'text-slate-300'}`}>
                        {hoursRemaining < 0.1 ? 'Due' : `${hoursRemaining.toFixed(1)} hrs remaining`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions inside prediction card */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs">
                  <button 
                    onClick={() => onSelectVehicle(vehicle)}
                    className="text-[10px] text-slate-300 hover:text-white hover:underline transition font-bold"
                  >
                    Locate Vehicle
                  </button>

                  {risk !== 'optimal' && (
                    <button
                      onClick={() => {
                        alert(`Predictive Service Event Pre-emptively Scheduled for ${vehicle.name}. Necessary logistics spares have been auto-assigned!`);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition"
                    >
                      Pre-empt Service
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. CHARTS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution (Pie Chart) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-blue-500" /> Fleet Status Distribution
            </h4>
            <p className="text-[11px] text-slate-500 mb-4">Current state allocations of all managed logistics vehicles.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-around h-52">
            <div className="w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} vehicle(s)`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4 sm:mt-0">
              {statusData.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                  <span className="w-20 text-slate-600">{s.name}:</span>
                  <span className="text-slate-900 font-bold">{s.value}</span>
                  <span className="text-slate-400 font-normal">({Math.round((s.value / totalVehicles) * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle Consumables & Advanced Fuel Analytics */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-1.5">
                <Battery className="w-4 h-4 text-emerald-500" /> Fleet Fuel Analytics & Eco-Efficiency
              </h4>
              <span className="bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                Avg Eco Score: {avgEcoScore}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">Real-time fuel levels, average consumption (L/100km), and estimated range telemetry.</p>
          </div>

          {/* Quick Fleet Fuel Summary Stats */}
          <div className="grid grid-cols-3 gap-2.5 mb-4 text-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
            <div>
              <span className="text-[9px] text-slate-450 font-bold uppercase block tracking-wide">Fleet Fuel</span>
              <span className="text-xs font-bold text-slate-700">{totalFuelLiters}L <span className="text-[9px] font-normal text-slate-400">/ {totalFuelCapacity}L</span></span>
            </div>
            <div>
              <span className="text-[9px] text-slate-450 font-bold uppercase block tracking-wide">Avg Burn</span>
              <span className="text-xs font-bold text-slate-700">{avgFleetConsumption} <span className="text-[9px] font-normal text-slate-400">L/100km</span></span>
            </div>
            <div>
              <span className="text-[9px] text-slate-450 font-bold uppercase block tracking-wide">Status</span>
              <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wide">Nominal</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart */}
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fuelAnalyticsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="shortName" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={9} domain={[0, 100]} tickLine={false} />
                  <Tooltip formatter={(value, name) => [`${value}${name === 'Fuel Level' ? '%' : ' L/100km'}`, name]} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '9px', fontWeight: '500', marginTop: '5px' }} />
                  <Bar dataKey="fuelLevel" fill="#3B82F6" name="Fuel Level" radius={[3, 3, 0, 0]} barSize={10} />
                  <Bar dataKey="avgCons" fill="#EA580C" name="Consumption Rate" radius={[3, 3, 0, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {fuelAnalyticsData.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/30 text-[11px]">
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span className="text-slate-700 font-bold truncate max-w-[90px]">{f.shortName}</span>
                    <span className="text-[9px] font-mono text-slate-400">({f.fuelLevel}%)</span>
                  </div>
                  <div className="flex items-center gap-2.5 font-mono text-[10px]">
                    <div className="text-right">
                      <span className="text-slate-600 font-bold block">{f.currentLiters}L</span>
                      <span className="text-[9px] text-slate-400 block">{f.estRange} km range</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      f.score >= 85 ? 'bg-emerald-100 text-emerald-800' : f.score >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {f.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FUEL COST AUDIT & REFUEING PROJECTIONS DASHBOARD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Coins className="w-5 h-5 text-amber-500 shrink-0" /> Fuel Cost Audit & Refueling Projections
            </h4>
            <p className="text-[11px] text-slate-500">
              Analysis of lifetime spent fuel costs, current fuel asset value, and projected refueling top-up costs based on Rp 10,000 / Liter average price.
            </p>
          </div>
          <button
            id="btn-export-fuel-report-card"
            onClick={exportFuelCostReport}
            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" /> Export Fuel Cost Audit (CSV)
          </button>
        </div>

        {/* Aggregated Cost Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Fleet Lifetime Fuel Spent</span>
            <span className="block text-xl font-black text-slate-800 mt-1 font-mono">
              Rp {totalSpentCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="block text-[9px] text-slate-500 mt-0.5">Estimated on {totalFleetOdometer.toLocaleString()} km cumulative mileage</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Current Fuel Asset Value</span>
            <span className="block text-xl font-black text-emerald-600 mt-1 font-mono">
              Rp {totalCurrentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="block text-[9px] text-slate-500 mt-0.5">Value of {totalFuelLiters} Liters currently in fleet tanks</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Projected Cost to Fill (100%)</span>
            <span className="block text-xl font-black text-rose-600 mt-1 font-mono">
              Rp {totalRefuelCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="block text-[9px] text-slate-500 mt-0.5">Top-up required: {totalRefuelLiters.toFixed(1)} Liters across fleet</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Stacked Cost Bar Chart */}
          <div className="lg:col-span-6 space-y-2">
            <span className="block text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">Cost Breakdown: Value in Tank vs Cost to Fill</span>
            <div className="h-56 w-full border border-slate-100 rounded-xl p-2 bg-slate-50/20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fuelCostChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="shortName" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} tickFormatter={(v) => `RM ${v}`} />
                  <Tooltip formatter={(value, name) => [`RM ${Number(value).toFixed(2)}`, name]} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '9px', fontWeight: '500' }} />
                  <Bar dataKey="currentValue" fill="#10B981" name="Fuel Value in Tank" stackId="a" radius={[0, 0, 0, 0]} barSize={14} />
                  <Bar dataKey="refuelCost" fill="#EF4444" name="Cost to Top Up" stackId="a" radius={[3, 3, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vehicle Cost Breakdowns List */}
          <div className="lg:col-span-6 space-y-2">
            <span className="block text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">Asset-by-Asset Refueling Projections</span>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {fuelCostChartData.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/40 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <span>{item.name}</span>
                      <span className="text-[9px] font-mono text-slate-400 font-semibold">({item.licensePlate})</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-mono">
                      <span>Odo: {item.odometer.toLocaleString()} km</span>
                      <span>Cap: {item.capacity}L</span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px] shrink-0">
                    <div>
                      <span className="text-slate-400 font-medium">In Tank: </span>
                      <span className="text-emerald-600 font-bold">Rp {item.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="mt-0.5">
                      <span className="text-slate-400 font-medium">To Fill: </span>
                      <span className="text-rose-600 font-bold">Rp {item.refuelCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* NEW SECTION: MAINTENANCE TRENDS & VEHICLE DOWNTIME */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Maintenance Cost & Downtime 6-Month Trend
            </h4>
            <p className="text-[11px] text-slate-500">
              Co-relation of periodic maintenance spend (USD) against vehicle workshop downtime hours across the fleet.
            </p>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-650">
              <div className="w-3 h-0.5 bg-indigo-600"></div>
              <span>Maintenance Cost ($)</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-655">
              <div className="w-3 h-0.5 bg-rose-500"></div>
              <span>Downtime (Hours)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Summary insights panel */}
          <div className="lg:col-span-1 bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">6-Month Aggregates</span>
              <div className="mt-2 space-y-3">
                <div>
                  <span className="text-[11px] text-slate-500 block font-medium">Total Maintenance Spend</span>
                  <span className="text-xl font-extrabold text-indigo-600 font-sans">
                    ${historicalMaintenanceTrend.reduce((sum, item) => sum + item.cost, 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block font-medium">Total Workshop Downtime</span>
                  <span className="text-xl font-extrabold text-rose-500 font-sans">
                    {historicalMaintenanceTrend.reduce((sum, item) => sum + item.downtimeHours, 0)} hrs
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/60 text-[10px] text-slate-500 leading-relaxed space-y-1.5">
              <div className="flex items-center gap-1 text-emerald-600 font-bold">
                <Sparkles className="w-3.5 h-3.5" /> Fleet Health Index
              </div>
              <p>Downtime correlated directly with cost spikes in May due to heavy engine refurbishment on truck chassis.</p>
            </div>
          </div>

          {/* Chart area */}
          <div className="lg:col-span-3 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalMaintenanceTrend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} tickLine={false} />
                
                {/* Left Y-axis for Cost */}
                <YAxis 
                  yAxisId="left" 
                  stroke="#4F46E5" 
                  fontSize={10} 
                  tickLine={false} 
                  tickFormatter={(v) => `$${v}`}
                />
                
                {/* Right Y-axis for Downtime */}
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#E11D48" 
                  fontSize={10} 
                  tickLine={false} 
                  tickFormatter={(v) => `${v}h`}
                />
                
                <Tooltip 
                  contentStyle={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1E293B', fontSize: '11px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: '500' }}
                  formatter={(value, name) => {
                    if (name === 'Maintenance Cost') return [`$${value}`, name];
                    return [`${value} Hours`, name];
                  }}
                />
                
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="cost" 
                  name="Maintenance Cost" 
                  stroke="#4F46E5" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 1 }} 
                  activeDot={{ r: 6 }} 
                />
                
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="downtimeHours" 
                  name="Downtime" 
                  stroke="#E11D48" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 1 }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. PREDICTIVE MAINTENANCE TELEMATICS FORECASTS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* PREDICTIVE CORE ANALYTICS CARD */}
        <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-indigo-500" /> ML-Driven Predictive Wear Forecasts
              </h4>
              <p className="text-[11px] text-slate-500">
                AI diagnostics forecasting mechanical degradation from historical duty cycles and sensor telemetry.
              </p>
            </div>

            {/* Selector Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Asset:</span>
              <select
                value={predictiveVehicleId}
                onChange={(e) => setPredictiveVehicleId(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-700 outline-none"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.licensePlate})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Core Analytics Calculations */}
          {(() => {
            const v = vehicles.find((x) => x.id === predictiveVehicleId) || vehicles[0];
            if (!v) return null;
            
            // Heuristic wear formulas based on odometer
            const odoVal = v.odometer ?? 10000;
            const oilLife = Math.max(5, Math.round(100 - ((odoVal % 8000) / 80)));
            const brakePads = Math.max(1.5, Math.round((12.0 - ((odoVal % 6000) / 500)) * 10) / 10); // starting 12mm
            const coolantStability = Math.max(10, Math.round(98 - ((odoVal % 5000) / 120)));
            const transmissionIndex = Math.max(10, Math.round(100 - ((odoVal % 15000) / 300)));
            
            // Calculate failure risk score
            const rawRisk = (100 - oilLife * 0.3 - (brakePads / 12) * 40 - coolantStability * 0.15) * payloadMultiplier;
            const failureRisk = Math.min(99, Math.max(2, Math.round(rawRisk)));
            
            // Severity checks
            const isHighRisk = failureRisk >= 40;
            const isMedRisk = failureRisk >= 20 && failureRisk < 40;

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                
                {/* Left side: Failure Risk Gauge */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-between text-center space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Predictive Failure Risk</span>
                    <div className="relative w-28 h-28 flex items-center justify-center mt-3">
                      <div className="absolute inset-0 rounded-full border-8 border-slate-100"></div>
                      <div 
                        className="absolute inset-0 rounded-full border-8 border-transparent"
                        style={{
                          borderTopColor: isHighRisk ? '#EF4444' : isMedRisk ? '#F59E0B' : '#10B981',
                          transform: `rotate(${Math.min(180, failureRisk * 1.8)}deg)`
                        }}
                      ></div>
                      <div className="flex flex-col items-center">
                        <span className="text-3xl font-extrabold text-slate-800 font-sans">{failureRisk}%</span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Risk Factor</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${
                      isHighRisk 
                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                        : isMedRisk 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {isHighRisk ? '⚠️ CRITICAL DEGRADATION' : isMedRisk ? '⚡ MODERATE ATTENTION' : '✅ HEALTHY STATUS'}
                    </span>
                    <p className="text-[9px] text-slate-400 max-w-[150px] font-medium mx-auto font-sans leading-tight">
                      {isHighRisk 
                        ? 'Schedule urgent replacement of brake pads & top-up lubricants.' 
                        : isMedRisk 
                        ? 'Monitor closely. Recommend service within 1,200 km.' 
                        : 'Duty cycle is optimal. Keep tracking telemetry.'}
                    </p>
                  </div>
                </div>

                {/* Middle/Right sides: Sensor Health details */}
                <div className="md:col-span-2 space-y-3 flex flex-col justify-between">
                  
                  {/* Oil Life */}
                  <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-slate-400" /> Lubricant Engine Oil Life
                      </span>
                      <span className={`font-mono font-bold ${oilLife < 25 ? 'text-rose-600' : 'text-slate-700'}`}>{oilLife}% Remaining</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${oilLife < 25 ? 'bg-rose-500 animate-pulse' : 'bg-indigo-600'}`}
                        style={{ width: `${oilLife}%` }}
                      ></div>
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono">Forecast: Lubrication index is {oilLife > 25 ? 'nominal' : 'sub-optimal'}. Oil viscosity stable.</p>
                  </div>

                  {/* Brake Pads Wear */}
                  <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-slate-400" /> Brake Pad Material Thickness
                      </span>
                      <span className={`font-mono font-bold ${brakePads < 4.0 ? 'text-rose-600 font-black' : 'text-slate-700'}`}>{brakePads} mm / 12.0 mm</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${brakePads < 4.0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${(brakePads / 12) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono">
                      Forecast: Remaining service life is approximately <span className="font-bold text-slate-650">{Math.round(brakePads * 14)} days</span> ({Math.round(brakePads * 720)} km en-route).
                    </p>
                  </div>

                  {/* Quick toggle for load factor multiplier */}
                  <div className="flex items-center justify-between p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900">
                    <span className="font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Simulation Payload Weight Factor:
                    </span>
                    <div className="flex gap-1.5 font-mono">
                      <button
                        onClick={() => setPayloadMultiplier(1.0)}
                        className={`px-2 py-1 text-[10px] font-bold rounded uppercase transition ${
                          payloadMultiplier === 1.0 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
                        }`}
                      >
                        Standard Duty (1.0x)
                      </button>
                      <button
                        onClick={() => setPayloadMultiplier(1.35)}
                        className={`px-2 py-1 text-[10px] font-bold rounded uppercase transition ${
                          payloadMultiplier === 1.35 
                            ? 'bg-rose-600 text-white animate-pulse' 
                            : 'bg-rose-100 hover:bg-rose-200 text-rose-700'
                        }`}
                      >
                        Heavy Load (1.35x)
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}
        </div>

        {/* FLEET RISK LEADERBOARD LIST */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" /> Fleet-wide Predictive Hold-List
            </h4>
            <p className="text-[11px] text-slate-500 font-sans">
              Active transport logs queued for preventive workshop inspections based on simulated mechanical G-forces.
            </p>
          </div>

          <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
            {vehicles.map((v) => {
              const odo = v.odometer ?? 10000;
              const brakeThick = Math.max(1.5, Math.round((12.0 - ((odo % 6000) / 500)) * 10) / 10);
              const riskFactor = Math.min(99, Math.max(3, Math.round((100 - (odo % 8000) / 80) * payloadMultiplier)));
              const severity = riskFactor > 50 ? 'critical' : riskFactor > 25 ? 'warning' : 'healthy';

              return (
                <div 
                  key={v.id}
                  onClick={() => setPredictiveVehicleId(v.id)}
                  className={`p-2 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition hover:bg-slate-50 ${
                    predictiveVehicleId === v.id ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50/50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {v.type === 'Truck' ? '🚚' : v.type === 'Van' ? '🚐' : '🚗'}
                    </span>
                    <div>
                      <h5 className="font-bold text-slate-800 text-[11px]">{v.name}</h5>
                      <span className="text-[9px] font-mono font-bold text-slate-400 block">{v.licensePlate}</span>
                      <span className="text-[8px] text-indigo-500 font-extrabold block mt-0.5">
                        {v.routeFrom || 'Tangerang HQ'} ➡️ {v.routeTo || 'CGK Terminal'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-extrabold font-sans text-[11px] ${severity === 'critical' ? 'text-rose-500' : severity === 'warning' ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {riskFactor}% Failure Risk
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono">Brake: {brakeThick}mm</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-500 flex items-center gap-1.5 font-medium leading-relaxed font-sans">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Predicted risk shifts based on live telemetry odometer accumulation.</span>
          </div>
        </div>

      </div>

      {/* 5. AI-POWERED LOGISTICS ROUTE & FUEL PATH OPTIMIZER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-emerald-500" /> AI-Powered Logistics Route & Fuel Path Optimizer
            </h4>
            <p className="text-[11px] text-slate-500">
              Configuring multi-waypoint flight/depot schedules to bypass Indonesian toll grid traffic bottlenecks and reduce Jet-A1 proxy fuel.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-create-route-manual-dashboard"
              onClick={() => setShowAddRouteModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm select-none"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" /> Create Route Manually
            </button>

            <button
              id="btn-run-route-solver"
              onClick={() => {
                setIsSolvingRoute(true);
                setTimeout(() => {
                  setIsSolvingRoute(false);
                  alert('Heuristic solver complete! AI successfully mapped path optimizations across Greater Jakarta with 14.2% projected cargo fuel reduction!');
                }, 1500);
              }}
              disabled={isSolvingRoute}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm select-none"
            >
              {isSolvingRoute ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Solving Path...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-white animate-spin-reverse-slow" /> Run Path Solver Engine
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Route details list selector */}
          <div className="lg:col-span-1 space-y-2 flex flex-col max-h-[300px] overflow-y-auto pr-1">
            {customRoutes.map((route) => (
              <button
                key={route.id}
                id={`btn-select-route-${route.id}`}
                onClick={() => setOptimizedRouteId(route.id)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer select-none ${
                  optimizedRouteId === route.id 
                    ? 'bg-emerald-50/70 border-emerald-300 shadow-xs' 
                    : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 truncate pr-1">{route.title}</span>
                  <span className="text-[9px] font-mono font-bold text-emerald-600 uppercase tracking-widest shrink-0">{route.code}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium line-clamp-2">{route.desc}</p>
              </button>
            ))}
          </div>

          {/* Core Route Optimization Metrics (Left 3 cols inside layout) */}
          <div className="lg:col-span-3 bg-slate-50 p-5 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Visual Route Steps Tracker */}
            <div className="md:col-span-2 space-y-4">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Optimized Waypoint Sequence</span>
              
              {/* Waypoint visual track */}
              <div className="relative py-2 px-1">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-200 -translate-y-1/2"></div>
                <div className="flex justify-between relative z-10 gap-2">
                  {(customRoutes.find(r => r.id === optimizedRouteId)?.waypoints || [
                    { ptNode: 'CGK Cargo Hub', code: 'CGK' },
                    { ptNode: 'Serpong SkyLink', code: 'SPG' },
                    { ptNode: 'Bandung Hub', code: 'BDO' }
                  ]).map((pt, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-[10px] font-bold text-emerald-700 font-mono shadow-xs">
                        {idx + 1}
                      </div>
                      <span className="text-[10px] font-bold text-slate-800 mt-2 truncate max-w-[80px]">{pt.ptNode}</span>
                      <span className="text-[9px] font-mono font-bold text-slate-400">{pt.code}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Path Heuristic Detail text */}
              <div className="bg-white p-3 rounded-xl border border-slate-150 space-y-1">
                <span className="text-[9px] font-mono font-extrabold text-slate-400 block uppercase tracking-wider">Solving Algorithm Verdict</span>
                <p className="text-xs text-slate-700 font-semibold leading-relaxed font-sans">
                  {customRoutes.find(r => r.id === optimizedRouteId)?.desc || (
                    optimizedRouteId === 'R-01' 
                      ? 'AI routing selects North-South Highway bypass via alternative Trunk Route E6. Resolves congestion bottleneck near Seremban tollway grid.'
                      : optimizedRouteId === 'R-02'
                      ? 'Short transfer optimization bypasses JORR peak hours by re-routing through Jakarta-Merak Toll (Cikupa) corridor and BSD link.'
                      : 'Puncak Pass central bypass highway route selected. Bypasses narrow mountain curves to maintain speed stabilization and maximize fuel economy.'
                  )}
                </p>
              </div>
            </div>

            {/* Savings panel */}
            <div className="bg-white p-4 rounded-xl border border-slate-150 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Optimized Savings Matrix</span>
                <div className="mt-3 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-500 font-medium">Estimated Fuel Saved:</span>
                    <span className="text-xs font-mono font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {optimizedRouteId === 'R-01' ? '51.2L (-13.8%)' : optimizedRouteId === 'R-02' ? '9.4L (-11.5%)' : optimizedRouteId === 'R-03' ? '44.8L (-12.9%)' : '15.5L (-11.0%)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-500 font-medium">Latency Reduction:</span>
                    <span className="text-xs font-mono font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {optimizedRouteId === 'R-01' ? '-55 mins' : optimizedRouteId === 'R-02' ? '-14 mins' : optimizedRouteId === 'R-03' ? '-42 mins' : '-22 mins'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-500 font-medium">Carbon Avoided:</span>
                    <span className="text-xs font-mono font-extrabold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {optimizedRouteId === 'R-01' ? '135 kg CO2' : optimizedRouteId === 'R-02' ? '24.8 kg CO2' : optimizedRouteId === 'R-03' ? '118 kg CO2' : '41 kg CO2'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 leading-relaxed font-sans">
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500 animate-bounce" /> Route Dispatch Ready
                </span>
                <span>Optimized routing stabilizes engine temperature profiles, which reduces failure wear factors by up to 8.2%.</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* DASHBOARD MANUAL ROUTE CREATION MODAL */}
      {showAddRouteModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="modal-dashboard-add-route">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 relative text-slate-800">
            <div className="flex gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl h-fit shrink-0">
                <Milestone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Plan Custom Route Corridor</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Define a reusable logistics transport path and waypoint sequence manually.</p>
              </div>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Route Title / Label</label>
                <input
                  id="dash-modal-route-title"
                  type="text"
                  required
                  placeholder="e.g. TNG Depot ➡️ Bandung Hub"
                  value={newRouteTitle}
                  onChange={(e) => setNewRouteTitle(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">Route Origin (From)</label>
                  <input
                    id="dash-modal-route-from"
                    type="text"
                    required
                    placeholder="e.g. Tangerang HQ Depot"
                    value={newRouteFrom}
                    onChange={(e) => setNewRouteFrom(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">Route Destination (To)</label>
                  <input
                    id="dash-modal-route-to"
                    type="text"
                    required
                    placeholder="e.g. Bandung Cargo Hub"
                    value={newRouteTo}
                    onChange={(e) => setNewRouteTo(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">Route Code</label>
                  <input
                    id="dash-modal-route-code"
                    type="text"
                    placeholder="e.g. TNG-BDO-DIR"
                    value={newRouteCode}
                    onChange={(e) => setNewRouteCode(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono uppercase"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">Route Waypoints (Comma-separated)</label>
                  <input
                    id="dash-modal-route-waypoints"
                    type="text"
                    placeholder="e.g. Kajang, Seremban, Port Dickson"
                    value={newRouteWaypoints}
                    onChange={(e) => setNewRouteWaypoints(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Route Description / Solving Verdict</label>
                <textarea
                  id="dash-modal-route-desc"
                  placeholder="Describe congestion bypasses, highway selection details, or fuel path notes."
                  value={newRouteDesc}
                  onChange={(e) => setNewRouteDesc(e.target.value)}
                  rows={2}
                  className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  id="dash-modal-route-cancel"
                  onClick={() => setShowAddRouteModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="dash-modal-route-save"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow transition cursor-pointer select-none"
                >
                  Plan & Save Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. BATTERY OPTIMIZATION & TRANSMISSION CONTROL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-1 space-y-4">
          <div>
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500 animate-pulse" /> Battery & Transmission
            </h4>
            <p className="text-[11px] text-slate-500">Configure ping frequencies to save tracker battery life.</p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Active Profile:</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['saver', 'balanced', 'performance'] as const).map((prof) => (
                  <button
                    key={prof}
                    id={`btn-preset-${prof}`}
                    onClick={() => applyBatteryPreset(prof)}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition border ${
                      settings.batteryOptimization === prof
                        ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {prof === 'saver' ? 'Eco-Saver' : prof === 'balanced' ? 'Balanced' : 'Max Refresh'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Update Frequency:</span>
                <span className="font-bold text-slate-800">{settings.updateInterval} seconds</span>
              </div>
              <div className="flex justify-between">
                <span>GPS Sensitivity:</span>
                <span className="font-bold text-slate-800">
                  {settings.batteryOptimization === 'saver' ? 'Coarse (LBS/Cell)' : 'Fine (GLONASS/GNSS)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Battery Life:</span>
                <span className="font-bold text-emerald-600">
                  {settings.batteryOptimization === 'saver' ? 'Up to 14 Days' : settings.batteryOptimization === 'balanced' ? '8-10 Days' : '2-3 Days'}
                </span>
              </div>
            </div>

            {/* Offline maps caching simulation toggle */}
            <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-blue-800">Offline Cache</span>
                  <span className="text-[9px] text-blue-500">Enable static map pre-fetching</span>
                </div>
              </div>
              <button
                id="toggle-offline-mode"
                onClick={() => onUpdateSettings({ isOfflineMode: !settings.isOfflineMode })}
                className={`w-10 h-5 rounded-full transition-all relative outline-none flex items-center ${
                  settings.isOfflineMode ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow mx-0.5"></div>
              </button>
            </div>

            {/* Automatic Position Updates toggle */}
            <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 text-blue-600 ${settings.autoPositionUpdates ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-blue-800">Auto position updates</span>
                  <span className="text-[9px] text-blue-500">Real-time automatic fleet tracking</span>
                </div>
              </div>
              <button
                id="btn-toggle-auto-updates"
                onClick={() => onUpdateSettings({ autoPositionUpdates: !settings.autoPositionUpdates })}
                className={`w-10 h-5 rounded-full transition-all relative outline-none flex items-center ${
                  settings.autoPositionUpdates ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow mx-0.5"></div>
              </button>
            </div>
          </div>
        </div>

        {/* Upcoming Maintenance Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-500" /> Upcoming Maintenance
              </h4>
              <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                predictiveMaintenanceData.filter((p) => p.distanceRemaining <= 500).length > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {predictiveMaintenanceData.filter((p) => p.distanceRemaining <= 500).length} DUE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Proactive view of vehicles with service due under 500 km, sorted by remaining distance.
            </p>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {predictiveMaintenanceData.filter((p) => p.distanceRemaining <= 500).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 h-full">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
                <p className="text-xs font-bold text-slate-700">All Vehicles Safe</p>
                <p className="text-[10px] text-slate-400 max-w-[200px]">No vehicles within 500 km of their next mileage milestone service.</p>
              </div>
            ) : (
              predictiveMaintenanceData
                .filter((p) => p.distanceRemaining <= 500)
                .sort((a, b) => a.distanceRemaining - b.distanceRemaining)
                .map((p) => {
                  const { vehicle, serviceName, distanceRemaining, distanceProgress } = p;
                  
                  // Urgency level indicator
                  let urgencyLabel = 'Medium Urgency';
                  let urgencyColor = 'bg-amber-100 text-amber-700 border-amber-200';
                  let textRemainingColor = 'text-amber-600';
                  if (distanceRemaining <= 100) {
                    urgencyLabel = 'CRITICAL URGENCY';
                    urgencyColor = 'bg-rose-100 text-rose-700 border-rose-200';
                    textRemainingColor = 'text-rose-600';
                  } else if (distanceRemaining <= 300) {
                    urgencyLabel = 'HIGH URGENCY';
                    urgencyColor = 'bg-orange-100 text-orange-700 border-orange-200';
                    textRemainingColor = 'text-orange-600';
                  }

                  return (
                    <div
                      key={vehicle.id}
                      className="p-3 rounded-xl border border-slate-150 bg-slate-50/55 hover:bg-slate-50 hover:border-slate-300 transition flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs shrink-0">
                              {vehicle.type === 'Truck' ? '🚚' : vehicle.type === 'Van' ? '🚐' : vehicle.type === 'Sedan' ? '🚗' : vehicle.type === 'SUV' ? '🚘' : '🏍️'}
                            </span>
                            <span className="font-bold text-slate-800 text-xs truncate">{vehicle.name}</span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-mono tracking-wider mt-0.5">
                            {vehicle.licensePlate} • {vehicle.id}
                          </p>
                        </div>
                        <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${urgencyColor} shrink-0`}>
                          {urgencyLabel}
                        </span>
                      </div>

                      <div className="bg-white/85 p-1.5 rounded-lg border border-slate-100 text-[10px] leading-tight text-slate-600">
                        <span className="text-[8px] text-slate-450 font-bold uppercase block tracking-wide mb-0.5">Predicted Service</span>
                        <span className="font-semibold text-slate-700">{serviceName}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-400 font-semibold uppercase text-[8px]">Odo Reached: {distanceProgress.toFixed(0)}%</span>
                          <span className={`font-black ${textRemainingColor}`}>
                            {distanceRemaining < 1 ? 'Service Due!' : `${Math.round(distanceRemaining).toLocaleString()} km left`}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              distanceRemaining <= 100 ? 'bg-rose-500' : distanceRemaining <= 300 ? 'bg-orange-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${distanceProgress}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-0.5">
                        <button
                          onClick={() => onSelectVehicle(vehicle)}
                          className="text-[9px] font-black text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 transition cursor-pointer"
                        >
                          📍 Locate Asset
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Maintenance Log & Alarms */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-blue-500" /> Active Maintenance
              </h4>
              <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded-full">
                {overdueMaintenance.length} OVERDUE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">Logs and safety inspections required to keep vehicle airworthiness.</p>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {maintenance.map((log) => {
              const isOverdue = log.status === 'overdue';
              const isCompleted = log.status === 'completed';
              const correspondingVehicle = vehicles.find((v) => v.id === log.vehicleId);

              return (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border flex flex-col gap-2.5 text-xs transition ${
                    isOverdue 
                      ? 'bg-blue-50/50 border-blue-100 hover:bg-blue-50' 
                      : isCompleted 
                        ? 'bg-slate-50 border-slate-100 opacity-60' 
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800">{correspondingVehicle?.name || 'Unknown Vehicle'}</span>
                      <span className="text-[9px] text-slate-400">({correspondingVehicle?.licensePlate})</span>
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                        isOverdue 
                          ? 'bg-blue-100 text-blue-700' 
                          : isCompleted 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-700">{log.serviceType}</p>
                    <p className="text-[10px] text-slate-450 line-clamp-1">{log.description}</p>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100/60">
                    <div className="text-left">
                      <p className="text-[9px] text-slate-400 font-medium">Target Date</p>
                      <p className="font-bold text-slate-700 font-mono text-[10px]">{log.dueDate}</p>
                    </div>
                    {!isCompleted && (
                      <button
                        id={`btn-complete-maintenance-${log.id}`}
                        onClick={() => onCompleteMaintenance(log.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg font-bold transition text-[10px] flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Log Complete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. CLIMATE & METEOROLOGICAL ALERT CENTER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <CloudLightning className="w-5 h-5 text-indigo-500 shrink-0" /> Climate & Meteorological Alert Control Center
            </h4>
            <p className="text-[11px] text-slate-500">Monitor active tropical weather grids and dispatch climate warning triggers to specific transport assets.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 font-semibold">Target Region:</span>
            <select
              id="select-climate-region"
              value={selectedClimateZone}
              onChange={(e) => setSelectedClimateZone(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Tangerang Depot Route">Tangerang Depot Corridor</option>
              <option value="Cengkareng Cargo Center Highway">Cengkareng Toll Highway Route</option>
              <option value="BSD Airport Route">BSD Serpong Transit Corridor</option>
              <option value="Bandung Logistics Hub">Bandung Husein Sastranegara Transit</option>
              <option value="Bekasi East Corridor">Bekasi Cikarang Corridor</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Weather Station Panel */}
          <div className="lg:col-span-5 bg-slate-50/50 p-4 rounded-xl border border-slate-100/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-600 uppercase">Live Weather Radar</span>
              <span className="bg-indigo-50 text-indigo-700 text-[9px] font-extrabold px-2 py-0.5 rounded border border-indigo-100 uppercase animate-pulse">
                SYS ONLINE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-lg border border-slate-100 text-center shadow-xs">
                <span className="block text-[10px] font-medium text-slate-450 uppercase">Ambient Temp</span>
                <span className="block text-xl font-bold text-slate-850 mt-1 font-mono">{customClimateTemp}°C</span>
                <input
                  type="range"
                  min="22"
                  max="42"
                  value={customClimateTemp}
                  onChange={(e) => setCustomClimateTemp(Number(e.target.value))}
                  className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer mt-2 accent-indigo-500"
                />
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-100 text-center shadow-xs">
                <span className="block text-[10px] font-medium text-slate-450 uppercase">Relative RH</span>
                <span className="block text-xl font-bold text-slate-850 mt-1 font-mono">{customClimateHumidity}%</span>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={customClimateHumidity}
                  onChange={(e) => setCustomClimateHumidity(Number(e.target.value))}
                  className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer mt-2 accent-indigo-500"
                />
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-100 text-center shadow-xs">
                <span className="block text-[10px] font-medium text-slate-450 uppercase">Wind Velocity</span>
                <span className="block text-xl font-bold text-slate-850 mt-1 font-mono">{customClimateWind} km/h</span>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={customClimateWind}
                  onChange={(e) => setCustomClimateWind(Number(e.target.value))}
                  className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer mt-2 accent-indigo-500"
                />
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-100 text-center shadow-xs flex flex-col justify-between">
                <div>
                  <span className="block text-[10px] font-medium text-slate-450 uppercase">Precipitation</span>
                  <span className="block text-[11px] font-extrabold text-slate-700 mt-1.5 truncate">{customClimatePrecip}</span>
                </div>
                <select
                  value={customClimatePrecip}
                  onChange={(e) => setCustomClimatePrecip(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 text-[10px] font-bold p-1 rounded mt-2 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Dry / Clear Sky">☀️ Dry / Clear Sky</option>
                  <option value="Drizzle Mist">🌫️ Drizzle Mist</option>
                  <option value="Scattered Showers">🌦️ Scattered Showers</option>
                  <option value="Heavy Monsoon Showers">⛈️ Heavy Monsoon</option>
                  <option value="Flash Flood Risk">🚨 Flash Flood Risk</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/55 rounded-xl border border-indigo-100/60 text-[11px] leading-relaxed text-indigo-900">
              <span className="font-extrabold flex items-center gap-1 mb-0.5"><Sun className="w-3.5 h-3.5 animate-spin-slow" /> Transit Zone Advisory</span>
              Active monitoring of humidity & storms prevents heat exhaustion for freight handlers and safeguards cargo moisture profiles on long-haul routes.
            </div>
          </div>

          {/* Alert Dispatcher Simulator */}
          <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-100 space-y-4">
            <span className="block text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">Emergency Dispatch Protokol</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600 text-[10px]">Recipient Transport Asset</label>
                <select
                  id="select-alert-vehicle"
                  value={selectedTripVehicleId}
                  onChange={(e) => setSelectedTripVehicleId(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-xs"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.licensePlate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600 text-[10px]">Meteorological Zone Location</label>
                <input
                  type="text"
                  disabled
                  value={selectedClimateZone}
                  className="p-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 font-bold text-xs"
                />
              </div>
            </div>

            <div className="border-t border-slate-50 pt-3 space-y-2">
              <label className="block font-bold text-slate-700 text-xs">Choose Warning Event Template & Dispatch Immediately:</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  id="btn-trigger-monsoon"
                  onClick={() => handleTriggerClimateAlert('monsoon')}
                  className="p-3 border border-amber-250 bg-amber-50/30 hover:bg-amber-50 rounded-xl text-left transition flex gap-2.5 items-start group cursor-pointer"
                >
                  <Wind className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 group-hover:animate-bounce" />
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Monsoon Squall Protocol</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">Speed advisory limits of 40 km/h due to high crosswinds.</span>
                  </div>
                </button>

                <button
                  id="btn-trigger-flood"
                  onClick={() => handleTriggerClimateAlert('flood')}
                  className="p-3 border border-rose-250 bg-rose-50/30 hover:bg-rose-50 rounded-xl text-left transition flex gap-2.5 items-start group cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 group-hover:animate-bounce" />
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Flash Flood Warning</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">Critical water levels detected. Halt transit and pause.</span>
                  </div>
                </button>

                <button
                  id="btn-trigger-thunderstorm"
                  onClick={() => handleTriggerClimateAlert('thunderstorm')}
                  className="p-3 border border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50 rounded-xl text-left transition flex gap-2.5 items-start group cursor-pointer"
                >
                  <CloudLightning className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 group-hover:animate-bounce" />
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Thunderstorm Advisory</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">Heavy static downpours. Potential hardware drop warnings.</span>
                  </div>
                </button>

                <button
                  id="btn-trigger-extreme-heat"
                  onClick={() => handleTriggerClimateAlert('extreme_heat')}
                  className="p-3 border border-orange-250 bg-orange-50/20 hover:bg-orange-50 rounded-xl text-left transition flex gap-2.5 items-start group cursor-pointer"
                >
                  <Thermometer className="w-4 h-4 text-orange-600 shrink-0 mt-0.5 group-hover:animate-bounce" />
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Extreme Heatwave Alert</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">Temp reaches {customClimateTemp}°C. Reefer cold-chain checks.</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DRIVER PORTAL & TELEMATICS PROFILES */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Award className="w-5 h-5 text-indigo-500 shrink-0" /> Driver Profiles & Real-Time Performance Analytics
            </h4>
            <p className="text-[11px] text-slate-500">
              Active operational scorecard of fleet drivers, showing safety quotients, harsh deceleration events, and duty cycle tracking.
            </p>
          </div>
          <button
            id="btn-export-drivers-compliance"
            onClick={exportTelematicsToCSV}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" /> Export Fleet Telematics (CSV)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Drivers Selection List */}
          <div className="lg:col-span-5 space-y-2.5">
            <span className="block text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">Active Dispatch Roster ({vehicles.length})</span>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {vehicles.map((v) => {
                const trips = getSimulatedTripsForVehicle(v.id);
                const avgScore = trips.length > 0 
                  ? Math.round(trips.reduce((sum, t) => sum + t.safetyScore, 0) / trips.length)
                  : v.fuelEfficiencyScore ?? 85;

                const scoreStatus = avgScore >= 90 ? 'Outstanding' : avgScore >= 80 ? 'Approved' : 'Attention Required';
                const scoreColor = avgScore >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : avgScore >= 80 ? 'bg-amber-50 text-amber-700 border-amber-150' : 'bg-rose-50 text-rose-700 border-rose-150';

                return (
                  <button
                    key={v.id}
                    id={`btn-driver-select-${v.id}`}
                    onClick={() => setSelectedDriverId(v.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                      selectedDriverId === v.id 
                        ? 'bg-indigo-50/70 border-indigo-300 shadow-xs' 
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img 
                        src={v.avatar} 
                        alt={v.driverName} 
                        className="w-10 h-10 rounded-full object-cover border border-slate-200/80 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 text-xs truncate">{v.driverName}</span>
                          <span className="text-[9px] font-mono text-slate-400">({v.id})</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5 font-medium">
                          <span>{v.name}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-[9px]">{v.licensePlate}</span>
                        </div>
                        <div className="text-[9px] text-indigo-600 font-bold flex items-center gap-1 mt-0.5">
                          <span className="truncate max-w-[100px]">{v.routeFrom || 'Tangerang HQ'}</span>
                          <span className="text-slate-300 shrink-0">➡️</span>
                          <span className="truncate max-w-[100px]">{v.routeTo || 'CGK Terminal'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${scoreColor}`}>
                        {avgScore}% {scoreStatus}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Driver Detailed Analytics profile */}
          {(() => {
            const activeDriverVehicle = vehicles.find(v => v.id === selectedDriverId) || vehicles[0];
            if (!activeDriverVehicle) return null;

            const trips = getSimulatedTripsForVehicle(activeDriverVehicle.id);
            const score = trips.length > 0 
              ? Math.round(trips.reduce((sum, t) => sum + t.safetyScore, 0) / trips.length)
              : activeDriverVehicle.fuelEfficiencyScore ?? 85;

            const scoreColor = score >= 90 ? 'text-emerald-600 bg-emerald-50' : score >= 80 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';
            const progressColor = score >= 90 ? 'bg-emerald-500' : score >= 80 ? 'bg-amber-500' : 'bg-rose-500';

            const driverTotalDistance = trips.reduce((sum, t) => sum + t.distanceKm, 0);
            const driverTotalHarshBrakes = trips.reduce((sum, t) => sum + t.harshBrakes, 0);
            const driverTotalHarshAccels = trips.reduce((sum, t) => sum + t.harshAccels, 0);
            const driverTotalIdleMin = trips.reduce((sum, t) => sum + t.idleMin, 0);
            const driverMaxSpeed = Math.max(...trips.map(t => t.avgSpeedKmh * 1.35), 85);

            return (
              <div className="lg:col-span-7 bg-slate-50/40 border border-slate-100 rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100/80">
                  <div className="flex items-center gap-3">
                    <img 
                      src={activeDriverVehicle.avatar} 
                      alt={activeDriverVehicle.driverName} 
                      className="w-12 h-12 rounded-full object-cover border-2 border-indigo-100 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h5 className="font-bold text-sm text-slate-800">{activeDriverVehicle.driverName}</h5>
                      <p className="text-[11px] text-slate-500 font-medium font-mono">{activeDriverVehicle.driverPhone}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start sm:items-end font-mono">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Driver Safety index</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-sm font-black px-2 py-0.5 rounded-lg border ${scoreColor}`}>
                        {score} / 100
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance telemetry stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide">Total Distance</span>
                    <span className="block text-sm font-extrabold text-slate-800 mt-0.5 font-mono">
                      {driverTotalDistance.toFixed(1)} km
                    </span>
                    <span className="block text-[8px] text-slate-400 mt-0.5 font-semibold">30-day simulated</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide">Harsh Braking</span>
                    <span className={`block text-sm font-extrabold mt-0.5 font-mono ${driverTotalHarshBrakes > 0 ? 'text-amber-600 font-black' : 'text-slate-800 font-bold'}`}>
                      {driverTotalHarshBrakes} times
                    </span>
                    <span className="block text-[8px] text-slate-400 mt-0.5 font-semibold">Safety incidents</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide">Harsh Accel</span>
                    <span className={`block text-sm font-extrabold mt-0.5 font-mono ${driverTotalHarshAccels > 0 ? 'text-amber-600 font-black' : 'text-slate-800 font-bold'}`}>
                      {driverTotalHarshAccels} times
                    </span>
                    <span className="block text-[8px] text-slate-400 mt-0.5 font-semibold font-semibold">G-Force violations</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wide">Engine Idle</span>
                    <span className="block text-sm font-extrabold text-slate-800 mt-0.5 font-mono">
                      {driverTotalIdleMin} mins
                    </span>
                    <span className="block text-[8px] text-slate-400 mt-0.5 font-semibold">Excessive burning</span>
                  </div>
                </div>

                {/* Interactive bar / safety profile slider display */}
                <div className="space-y-3.5 bg-white p-3.5 rounded-xl border border-slate-100">
                  <span className="block text-[9px] font-bold text-slate-400 tracking-wider uppercase">Operational Compliance Scorecard</span>
                  
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-slate-500 font-bold uppercase">Average Trip Safety Quotient</span>
                        <span className="font-mono font-bold text-indigo-600">{score}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${progressColor}`}
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-slate-500 font-bold uppercase">Estimated Peak Velocity</span>
                        <span className="font-mono font-bold text-slate-700">{Math.round(driverMaxSpeed)} km/h</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-500"
                          style={{ width: `${Math.min(100, (driverMaxSpeed / 120) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom details links / Action trigger */}
                <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-slate-100/85">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${activeDriverVehicle.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Status: {activeDriverVehicle.status} • {activeDriverVehicle.speed} km/h
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`tel:${activeDriverVehicle.driverPhone}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-750 font-extrabold text-[10px] uppercase tracking-wide rounded-lg border border-slate-200 transition cursor-pointer"
                    >
                      📞 Call Operator
                    </a>
                    <button
                      onClick={() => onSelectVehicle(activeDriverVehicle)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wide rounded-lg transition shadow-sm cursor-pointer"
                    >
                      📍 Locate Asset
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 4. TRIP SUMMARY & AUDIT COMPLIANCE ENGINE */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <ClipboardList className="w-5 h-5 text-emerald-500 shrink-0" /> Trip Summary & Driver Compliance Engine
            </h4>
            <p className="text-[11px] text-slate-500">Analyze finished trips, review compliance metrics, speed violations, and download audit documents.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 font-semibold">Select Vehicle:</span>
            <select
              id="select-trip-vehicle"
              value={selectedTripVehicleId}
              onChange={(e) => {
                setSelectedTripVehicleId(e.target.value);
                setSelectedTripIndex(0);
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {(() => {
          const matchedVehicle = vehicles.find(v => v.id === selectedTripVehicleId) || vehicles[0];
          if (!matchedVehicle) return null;

          const recentTrips = getSimulatedTripsForVehicle(matchedVehicle.id);
          const activeTrip = recentTrips[selectedTripIndex];

          if (!activeTrip) {
            return (
              <div className="p-8 text-center text-slate-400 font-medium text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                ⚠️ No completed trips recorded on hardware tracker logs for this asset.
              </div>
            );
          }

          // Export trip auditor report
          const handleExportTripTxt = () => {
            const reportText = `========================================================================
             FLEET TELEMATICS & DRIVER SAFETY COMPLIANCE REPORT
========================================================================
REPORT GENERATED : ${new Date().toLocaleString()}
VEHICLE ID       : ${matchedVehicle.id}
VEHICLE NAME     : ${matchedVehicle.name}
LICENSE PLATE    : ${matchedVehicle.licensePlate}
DRIVER NAME      : ${matchedVehicle.driverName}
DRIVER PHONE     : ${matchedVehicle.driverPhone}

TRIP TELEMATICS HISTORY
------------------------------------------------------------------------
TRIP ID          : ${activeTrip.id}
TRIP DATE        : ${activeTrip.date}
ROUTE TRANSIT    : ${activeTrip.origin}  ===>  ${activeTrip.destination}
TOTAL DISTANCE   : ${activeTrip.distanceKm} km
TOTAL DURATION   : ${activeTrip.durationMins} minutes
AVERAGE SPEED    : ${activeTrip.avgSpeedKmh} km/h
FUEL BURNED      : ${activeTrip.fuelConsumedL} Liters
CARGO CATEGORY   : ${activeTrip.cargoType}
TRANSIT WEATHER  : ${activeTrip.weather}

SAFETY AUDIT & PERFORMANCE PROFILE
------------------------------------------------------------------------
HARSH BRAKING EVENTS     : ${activeTrip.harshBrakes}
HARSH ACCELERATION EVENTS : ${activeTrip.harshAccels}
EXCESSIVE IDLE TIME      : ${activeTrip.idleMin} minutes
DRIVING SAFETY SCORE     : ${activeTrip.safetyScore} / 100
COMPLIANCE VERDICT       : ${activeTrip.safetyScore >= 90 ? 'OUTSTANDING COMPLIANCE' : activeTrip.safetyScore >= 80 ? 'APPROVED WITH MINOR VIOLATIONS' : 'CRITICAL WARNING - SAFETY RETRAINING REQUIRED'}

------------------------------------------------------------------------
                        OFFICIAL SIGNATURE DOCK
   Prepared under digital seal of Tangerang Logistics Systems Fleet Operations.
========================================================================`;

            const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `trip_audit_report_${activeTrip.id}.txt`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          };

          const scoreColor = activeTrip.safetyScore >= 90 ? 'text-emerald-600 bg-emerald-50' : activeTrip.safetyScore >= 80 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';

          return (
            <div className="space-y-4">
              {/* Trip Selector Row */}
              <div className="flex flex-wrap gap-2">
                {recentTrips.map((trip, idx) => (
                  <button
                    key={trip.id}
                    onClick={() => setSelectedTripIndex(idx)}
                    className={`px-3 py-2 text-xs rounded-xl border font-bold transition flex items-center gap-2 cursor-pointer ${
                      selectedTripIndex === idx
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-150'
                    }`}
                  >
                    <span>{trip.date}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${selectedTripIndex === idx ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'}`}>
                      Score: {trip.safetyScore}
                    </span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                {/* Trip Route Details */}
                <div className="lg:col-span-8 bg-white p-4 rounded-xl border border-slate-100 space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="bg-slate-800 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                        {activeTrip.id}
                      </span>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 font-mono">Cargo: {activeTrip.cargoType}</p>
                    </div>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 border rounded-lg ${
                      activeTrip.safetyScore >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {activeTrip.safetyScore >= 90 ? 'Verified Compliant' : 'Safety Flagged'}
                    </span>
                  </div>

                  {/* Route Timeline Node Map */}
                  <div className="flex items-center gap-4 text-xs font-sans relative pl-3 py-1 bg-slate-50 rounded-lg p-2.5 border border-slate-100/50">
                    <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-slate-200"></div>
                    
                    <div className="space-y-4 w-full">
                      <div className="flex items-start gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shrink-0 mt-1 z-10"></div>
                        <div>
                          <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Origin Location</p>
                          <p className="font-bold text-slate-800 text-xs">{activeTrip.origin}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shrink-0 mt-1 z-10"></div>
                        <div>
                          <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Destination Hub</p>
                          <p className="font-bold text-slate-800 text-xs">{activeTrip.destination}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Telematics values */}
                  <div className="grid grid-cols-4 gap-2.5 text-center">
                    <div className="p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">Distance</span>
                      <span className="block text-sm font-black text-slate-800 mt-0.5 font-mono">{activeTrip.distanceKm} km</span>
                    </div>

                    <div className="p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">Duration</span>
                      <span className="block text-sm font-black text-slate-800 mt-0.5 font-mono">{activeTrip.durationMins} m</span>
                    </div>

                    <div className="p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">Avg Speed</span>
                      <span className="block text-sm font-black text-slate-800 mt-0.5 font-mono">{activeTrip.avgSpeedKmh} km/h</span>
                    </div>

                    <div className="p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">Fuel Burn</span>
                      <span className="block text-sm font-black text-slate-800 mt-0.5 font-mono">{activeTrip.fuelConsumedL} L</span>
                    </div>
                  </div>
                </div>

                {/* Driving Behavior Profile Card */}
                <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-slate-100 flex flex-col justify-between space-y-4">
                  <div className="space-y-3.5">
                    <span className="block text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">Driving Behavior Audit</span>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">Harsh Braking Events</span>
                        <span className={`font-mono font-bold text-xs ${activeTrip.harshBrakes > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {activeTrip.harshBrakes}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">Harsh Acceleration</span>
                        <span className={`font-mono font-bold text-xs ${activeTrip.harshAccels > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {activeTrip.harshAccels}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">Excessive Engine Idle</span>
                        <span className="font-mono font-bold text-slate-700 text-xs">
                          {activeTrip.idleMin} mins
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500 font-medium">Transit Weather</span>
                        <span className="font-bold text-slate-600 text-xs">
                          {activeTrip.weather}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-slate-50 pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wide">Safety Score Index</span>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-snug">
                          {activeTrip.safetyScore >= 90 ? 'Excellent Driver Rating' : 'Approved Minor Deviation'}
                        </p>
                      </div>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-mono font-black text-sm border shadow-xs shrink-0 ${scoreColor}`}>
                        {activeTrip.safetyScore}
                      </div>
                    </div>

                    <button
                      id="btn-export-trip-report"
                      onClick={handleExportTripTxt}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-2 px-3 rounded-lg shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Export Trip compliance Report (.TXT)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 4.5 TPMS (TIRE PRESSURE MONITORING SYSTEM) SENSOR TELEMETRY CENTER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-indigo-500" /> TPMS Telemetry Center (Tire Pressure Monitoring)
            </h4>
            <p className="text-[11px] text-slate-500">Real-time individual tire sensor status, alert indicators, and pressure calibrators.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400">Select Vehicle:</span>
            <select
              id="select-tpms-vehicle"
              value={tpmsSelectedId}
              onChange={(e) => setTpmsSelectedId(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 rounded-lg px-2 py-1.5 cursor-pointer outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.tirePressures?.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {tpmsSelectedVehicle && (() => {
          const tp = tpmsSelectedVehicle.tirePressures || { fl: 34, fr: 34, rl: 34, rr: 34, status: 'normal' };
          const standardValue = tpmsSelectedVehicle.type === 'Motorcycle' ? 30 : tpmsSelectedVehicle.id === 'V-103' ? 105 : 34;
          
          const getTireColor = (psi: number) => {
            if (tpmsSelectedVehicle.id === 'V-103') { // heavy duty vehicle standard 105 PSI
              if (psi < 90) return { bg: 'bg-rose-50 border-rose-250 text-rose-700', label: 'CRITICAL LOW' };
              if (psi < 100) return { bg: 'bg-amber-50 border-amber-250 text-amber-700', label: 'LOW PRESSURE' };
              return { bg: 'bg-emerald-50 border-emerald-250 text-emerald-700', label: 'OPTIMAL' };
            } else { // standard vehicles 34 PSI
              if (psi < 24) return { bg: 'bg-rose-50 border-rose-250 text-rose-700', label: 'CRITICAL LOW' };
              if (psi < 30) return { bg: 'bg-amber-50 border-amber-250 text-amber-700', label: 'LOW PRESSURE' };
              return { bg: 'bg-emerald-50 border-emerald-250 text-emerald-700', label: 'OPTIMAL' };
            }
          };

          const flStatus = getTireColor(tp.fl);
          const frStatus = getTireColor(tp.fr);
          const rlStatus = getTireColor(tp.rl);
          const rrStatus = getTireColor(tp.rr);

          const hasAlert = tp.status === 'warning' || tp.status === 'critical';

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/40 p-4 rounded-xl border border-slate-100">
              {/* Telemetry metadata */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl shrink-0">
                      {tpmsSelectedVehicle.type === 'Truck' ? '🚚' : tpmsSelectedVehicle.type === 'Van' ? '🚐' : tpmsSelectedVehicle.type === 'Sedan' ? '🚗' : tpmsSelectedVehicle.type === 'SUV' ? '🚘' : '🏍️'}
                    </span>
                    <div className="min-w-0">
                      <h5 className="text-xs font-extrabold text-slate-800 truncate">{tpmsSelectedVehicle.name}</h5>
                      <p className="text-[10px] font-mono font-bold text-slate-400">{tpmsSelectedVehicle.licensePlate} • {tpmsSelectedVehicle.type}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-50 pt-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">System Status</span>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${
                      tp.status === 'normal' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : tp.status === 'warning' 
                        ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' 
                        : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                    }`}>
                      {tp.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-bold uppercase">Target Pressure</span>
                    <span className="font-extrabold text-slate-700">{standardValue} PSI</span>
                  </div>
                </div>

                {hasAlert ? (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-800 space-y-2.5">
                    <p className="font-bold flex items-center gap-1.5 leading-snug">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      Tire Pressure Anomaly Detected!
                    </p>
                    <p className="text-[11px] leading-relaxed text-red-700">
                      On-board TPMS has flagged one or more low pressure tires. Overly soft tires lead to bad fuel burn, loss of cargo grip, and dangerous blowouts.
                    </p>
                    <button
                      id={`btn-tpms-calibrate-${tpmsSelectedVehicle.id}`}
                      onClick={() => onCalibrateTPMS(tpmsSelectedVehicle.id)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] py-2 px-3 rounded-lg shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      🛠️ Trigger Auto-Inflation & Recalibrate TPMS
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      Pressure Status Ideal
                    </p>
                    <p className="text-[10px] text-emerald-700 leading-relaxed">
                      All tire sensor readings are inside the safe operational standard envelope for this model chassis.
                    </p>
                    <button
                      onClick={() => onCalibrateTPMS(tpmsSelectedVehicle.id)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold text-[10px] py-1.5 px-3 rounded-lg border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      🔄 Re-check & Calibrate Telemetry
                    </button>
                  </div>
                )}
              </div>

              {/* Graphical Car schematic */}
              <div className="lg:col-span-8 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-100 p-4 relative min-h-[220px]">
                <div className="absolute top-2 left-2 text-[9px] font-bold text-slate-400 font-mono tracking-wider">
                  VISUAL TPMS GRID ANALYZER
                </div>

                <div className="flex flex-col items-center relative w-full max-w-[280px]">
                  {/* Central Chassis Graphic */}
                  <div className="w-16 h-36 bg-slate-100 rounded-2xl border border-slate-200 relative flex flex-col justify-between p-3 text-center text-slate-400 text-[10px] font-bold z-10 shadow-sm select-none">
                    <span className="block border-b border-slate-200 pb-1 text-[8px] uppercase">FRONT</span>
                    <span className="text-[9px] font-extrabold tracking-wider text-slate-500 font-mono truncate max-w-full">
                      {tpmsSelectedVehicle.name.split(' ').slice(-1)[0]}
                    </span>
                    <span className="block border-t border-slate-200 pt-1 text-[8px] uppercase">REAR</span>
                  </div>

                  {/* Tires */}
                  {/* Front Left */}
                  <div className="absolute -left-12 top-2 flex flex-row-reverse items-center gap-2">
                    <div className="w-8 h-10 bg-slate-800 rounded border border-slate-700 flex flex-col items-center justify-center text-[10px] text-white font-mono font-bold shadow-md relative group select-none">
                      <div className="w-full h-1 bg-slate-700 mb-1"></div>
                      <span>FL</span>
                      <div className="w-full h-1 bg-slate-700 mt-1"></div>
                    </div>
                    <div className={`p-2 rounded-lg border text-center min-w-[70px] shadow-sm ${flStatus.bg}`}>
                      <span className="text-[10px] font-extrabold block font-mono">{tp.fl} PSI</span>
                      <span className="text-[8px] font-bold block uppercase tracking-wider scale-90">{flStatus.label}</span>
                    </div>
                  </div>

                  {/* Front Right */}
                  <div className="absolute -right-12 top-2 flex items-center gap-2">
                    <div className="w-8 h-10 bg-slate-800 rounded border border-slate-700 flex flex-col items-center justify-center text-[10px] text-white font-mono font-bold shadow-md relative group select-none">
                      <div className="w-full h-1 bg-slate-700 mb-1"></div>
                      <span>FR</span>
                      <div className="w-full h-1 bg-slate-700 mt-1"></div>
                    </div>
                    <div className={`p-2 rounded-lg border text-center min-w-[70px] shadow-sm ${frStatus.bg}`}>
                      <span className="text-[10px] font-extrabold block font-mono">{tp.fr} PSI</span>
                      <span className="text-[8px] font-bold block uppercase tracking-wider scale-90">{frStatus.label}</span>
                    </div>
                  </div>

                  {/* Rear Left */}
                  <div className="absolute -left-12 bottom-2 flex flex-row-reverse items-center gap-2">
                    <div className="w-8 h-10 bg-slate-800 rounded border border-slate-700 flex flex-col items-center justify-center text-[10px] text-white font-mono font-bold shadow-md relative group select-none">
                      <div className="w-full h-1 bg-slate-700 mb-1"></div>
                      <span>RL</span>
                      <div className="w-full h-1 bg-slate-700 mt-1"></div>
                    </div>
                    <div className={`p-2 rounded-lg border text-center min-w-[70px] shadow-sm ${rlStatus.bg}`}>
                      <span className="text-[10px] font-extrabold block font-mono">{tp.rl} PSI</span>
                      <span className="text-[8px] font-bold block uppercase tracking-wider scale-90">{rlStatus.label}</span>
                    </div>
                  </div>

                  {/* Rear Right */}
                  <div className="absolute -right-12 bottom-2 flex items-center gap-2">
                    <div className="w-8 h-10 bg-slate-800 rounded border border-slate-700 flex flex-col items-center justify-center text-[10px] text-white font-mono font-bold shadow-md relative group select-none">
                      <div className="w-full h-1 bg-slate-700 mb-1"></div>
                      <span>RR</span>
                      <div className="w-full h-1 bg-slate-700 mt-1"></div>
                    </div>
                    <div className={`p-2 rounded-lg border text-center min-w-[70px] shadow-sm ${rrStatus.bg}`}>
                      <span className="text-[10px] font-extrabold block font-mono">{tp.rr} PSI</span>
                      <span className="text-[8px] font-bold block uppercase tracking-wider scale-90">{rrStatus.label}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 5. QUICK FLEET MONITORS (MAP SELECTION LIST) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <h4 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-emerald-500" /> Fleet Quick Select
        </h4>
        <p className="text-[11px] text-slate-500 mb-4">Click any fleet vehicle to center on the active tracking dashboard.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {vehicles.map((v) => {
            const correspondingDevice = devices.find((d) => d.id === v.deviceId);
            return (
              <button
                key={v.id}
                id={`btn-quick-select-${v.id}`}
                onClick={() => onSelectVehicle(v)}
                className="text-left p-3 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition shadow-sm space-y-2 group focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm" style={{ backgroundColor: v.iconColor + '20', color: v.iconColor }}>
                    {v.type === 'Truck' ? '🚚' : v.type === 'Van' ? '🚐' : v.type === 'Sedan' ? '🚗' : v.type === 'SUV' ? '🚘' : '🏍️'}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800 truncate max-w-[120px] group-hover:text-blue-600 transition">{v.name}</h5>
                    <p className="text-[9px] text-slate-400 font-mono font-bold uppercase">{v.licensePlate}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-100 pt-1.5">
                  <span className={`font-semibold capitalize ${
                    v.status === 'active' ? 'text-emerald-600' : 'text-slate-500'
                  }`}>{v.status}</span>
                  <span className="font-bold text-slate-800">{v.speed} km/h</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
