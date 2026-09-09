export type VehicleStatus = 'active' | 'idle' | 'stopped' | 'maintenance' | 'offline';
export type DeviceStatus = 'online' | 'offline' | 'low_battery';
export type GeofenceType = 'circle' | 'polygon';
export type MaintenanceStatus = 'scheduled' | 'overdue' | 'completed';
export type CategoryType = 'Electronics' | 'Spare Parts' | 'Cargo' | 'Tools' | 'Hazmat' | string;

export interface TirePressureSensor {
  fl: number; // Front Left PSI
  fr: number; // Front Right PSI
  rl: number; // Rear Left PSI
  rr: number; // Rear Right PSI
  status: 'normal' | 'warning' | 'critical';
}

export interface Vehicle {
  id: string;
  name: string;
  type: 'Truck' | 'Van' | 'Sedan' | 'SUV' | 'Motorcycle';
  licensePlate: string;
  deviceId: string; // Assigned GPS Device ID
  status: VehicleStatus;
  speed: number; // km/h
  lastUpdated: string;
  batteryPercent: number;
  fuelLevel: number; // percentage
  location: {
    lat: number;
    lng: number;
  };
  bearing: number; // angle for vehicle direction icon
  cargoWeight: number; // kg
  maxCargoWeight: number; // kg
  maxPayloadKg?: number; // kg payload capacity
  driverName: string;
  driverPhone: string;
  driverEmail?: string;
  driverAddress?: string;
  avatar: string;
  iconColor: string;
  odometer?: number; // cumulative distance in km
  engineHours?: number; // cumulative engine hours
  tirePressures?: TirePressureSensor; // TPMS sensor telemetry
  fuelCapacity?: number; // Fuel capacity in Liters
  averageFuelConsumption?: number; // Average fuel consumption in L/100km
  fuelEfficiencyScore?: number; // Performance index 0-100
  routeFrom?: string; // Route Origin
  routeTo?: string; // Route Destination
}

export interface GPSDevice {
  id: string;
  name: string;
  imei: string;
  status: DeviceStatus;
  batteryLevel: number;
  signalStrength: 'excellent' | 'good' | 'fair' | 'poor';
  assignedVehicleId?: string;
  lastPing: string;
}

export interface Geofence {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // in meters for circles
  type: GeofenceType;
  active: boolean;
  vertices?: Array<{ lat: number; lng: number }>;
}

export type AlertType = 'enter' | 'exit' | 'fuel_theft' | 'maintenance_due' | 'low_pressure' | 'idle_time' | 'battery_low' | 'climate_alert';

export interface FleetAlert {
  id: string;
  vehicleId: string;
  vehicleName: string;
  geofenceName?: string;
  type: AlertType;
  timestamp: string;
  resolved: boolean;
  severity: 'critical' | 'warning' | 'info';
  details?: string;
  initialFuel?: number;
  finalFuel?: number;
}

export type GeofenceAlert = FleetAlert;

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  serviceType: string;
  description: string;
  mileageInterval: number; // km
  status: MaintenanceStatus;
  dueDate: string;
  cost?: number;
}

export interface HistoricalMaintenanceTrend {
  month: string;
  cost: number;
  downtimeHours: number;
}

export interface DriverPerformance {
  id?: string;
  vehicleId: string;
  vehicleName?: string;
  driverName: string;
  safetyScore: number; // 0 - 100
  maxSpeed: number; // km/h
  harshBrakingCount: number;
  harshAccelerationCount: number;
  idleTimeMin: number;
  totalDistanceKm: number;
  driverPhone?: string;
  driverEmail?: string;
  driverAddress?: string;
  avatar?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: CategoryType;
  quantity: number;
  location: string; // 'Warehouse A', 'Vehicle: V-101', etc.
  assignedVehicleId?: string; // Optional links to vehicle
  unitWeight: number; // kg per unit
  minStockLevel?: number; // Minimum reorder threshold for stock alerts
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  type: 'restock' | 'transfer' | 'dispatch' | 'audit_adjustment' | 'bulk_import';
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  fromLocation: string;
  toLocation: string;
  performedBy: string;
  timestamp: string;
  notes?: string;
}

export interface LocationHistoryPoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
}

export interface MapSettings {
  isOfflineMode: boolean;
  batteryOptimization: 'saver' | 'balanced' | 'performance';
  updateInterval: number; // seconds
  showGeofences: boolean;
  showTraffic: boolean;
  showWeather?: boolean;
  autoPositionUpdates: boolean;
}

export type UserRole = 'administrator' | 'supervisor' | 'user' | 'viewer';

export interface CustomRoute {
  id: string;
  title: string;
  from: string;
  to: string;
  desc: string;
  code: string;
  waypoints?: { ptNode: string; code: string }[];
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  department: string;
}

