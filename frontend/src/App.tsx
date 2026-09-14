import { useState, useEffect, useRef } from 'react';
import {
  Vehicle, GPSDevice, Geofence, GeofenceAlert, FleetAlert,
  MaintenanceLog, DriverPerformance, InventoryItem,
  LocationHistoryPoint, MapSettings, AppUser, UserRole, CustomRoute, Feedback, FeedbackStatus,
  ChangelogEntry, ChangelogBumpType
} from './types';
import { api } from './api';
import { supabase } from './supabaseClient';
import LoginScreen from './LoginScreen';
import MapView from './components/MapView';
import FleetDashboard from './components/FleetDashboard';
import InventorySystem from './components/InventorySystem';
import DriverPerformanceView from './components/DriverPerformanceView';
import DeviceManagement from './components/DeviceManagement';
import VehicleManagement from './components/VehicleManagement';
import UserRoleManagement from './components/UserRoleManagement';
import FeedbackModal from './components/FeedbackModal';
import FeedbackView from './components/FeedbackView';
import WhatsNewView from './components/WhatsNewView';
import LanguageToggle from './components/LanguageToggle';
import { useLanguage } from './i18n';
import QuickAssetLocateBar from './components/common/QuickAssetLocateBar';
import VehicleTelemetryHistoryView from './components/telemetry/VehicleTelemetryHistoryView';
import PredictiveArrivalEstimatorView from './components/analytics/PredictiveArrivalEstimatorView';
import GeofenceEfficiencyAlertView from './components/geofence/GeofenceEfficiencyAlertView';

import type { Session } from '@supabase/supabase-js';
import {
  Map, LayoutDashboard, Boxes, Users, Cpu, Truck,
  Plus, AlertOctagon, Info, Layers, Smartphone, Navigation, Fingerprint,
  Volume2, VolumeX, Activity, Clock, ShieldAlert, LogOut, MessageSquare, Sparkles
} from 'lucide-react';

export const ROLE_MODULES: Record<UserRole, string[]> = {
  admin: ['map', 'dashboard', 'telemetry', 'eta', 'efficiency', 'inventory', 'drivers', 'vehicles', 'devices', 'users', 'feedback', 'whatsnew'],
  manager: ['map', 'dashboard', 'telemetry', 'eta', 'efficiency', 'inventory', 'drivers', 'vehicles', 'whatsnew'],
  viewer: ['map', 'dashboard', 'telemetry', 'eta', 'drivers', 'whatsnew'],
};

export default function App() {
  const { t } = useLanguage();

  // --- 1. LIVE STATE, LOADED FROM THE BACKEND API (see the effect below) ---
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [devices, setDevices] = useState<GPSDevice[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [driverPerformance, setDriverPerformance] = useState<DriverPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mapSettings, setMapSettings] = useState<MapSettings>(() => {
    const saved = localStorage.getItem('fleet_map_settings');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      isOfflineMode: parsed.isOfflineMode ?? false,
      batteryOptimization: parsed.batteryOptimization ?? 'balanced',
      updateInterval: parsed.updateInterval ?? 10,
      showGeofences: parsed.showGeofences ?? true,
      showWeather: parsed.showWeather ?? true,
      autoPositionUpdates: parsed.autoPositionUpdates ?? true,
    };
  });

  const [users, setUsers] = useState<AppUser[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [lastSeenVersion, setLastSeenVersion] = useState<string | null>(() => localStorage.getItem('fleet_last_seen_version'));

  // --- AUTH: real Supabase login, not a demo persona switcher ---
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = not checked yet
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) setCurrentUser(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Once logged in, resolve the session into our app profile (id/name/role).
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    api.auth
      .me()
      .then((profile) => {
        if (!cancelled) setCurrentUser(profile);
      })
      .catch((err) => {
        if (!cancelled) setAuthError(err instanceof Error ? err.message : 'Failed to load your profile');
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleSignOut = () => {
    supabase?.auth.signOut();
  };

  const [customRoutes, setCustomRoutes] = useState<CustomRoute[]>(() => {
    const saved = localStorage.getItem('fleet_custom_routes');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'R-01', title: 'TNG Depot ➡️ CGK Airport', from: 'Tangerang HQ Depot', to: 'Soekarno-Hatta Airport Cargo Terminal', desc: 'Trunk Route via Sedyatmo Toll Road', code: 'CGK-TNG-EXP', waypoints: [{ ptNode: 'Tangerang Depot', code: 'TNG' }, { ptNode: 'Sedyatmo Tollgate', code: 'STG' }, { ptNode: 'CGK Cargo Hub', code: 'CGK' }] },
      { id: 'R-02', title: 'TNG Depot ➡️ BSD Hub', from: 'Tangerang HQ Depot', to: 'BSD City Logistics Hub', desc: 'Metropolitan Bypass via Serpong Toll Road', code: 'TNG-BSD-METRO', waypoints: [{ ptNode: 'Tangerang Depot', code: 'TNG' }, { ptNode: 'Serpong Tollgate', code: 'SPG' }, { ptNode: 'BSD Hub', code: 'BSD' }] },
      { id: 'R-03', title: 'CGK Airport ➡️ Priok Port', from: 'Soekarno-Hatta Airport Cargo Terminal', to: 'Tanjung Priok Port Depot', desc: 'Intercity Shuttle via Jakarta Outer Ring Road', code: 'CGK-PRIOK-SHUTTLE', waypoints: [{ ptNode: 'CGK Cargo Hub', code: 'CGK' }, { ptNode: 'JORR Interchange', code: 'JOR' }, { ptNode: 'Tanjung Priok Port', code: 'PRK' }] }
    ];
  });

  useEffect(() => {
    localStorage.setItem('fleet_custom_routes', JSON.stringify(customRoutes));
  }, [customRoutes]);

  // --- 2. INTERACTIVE UI STATES ---
  const [activeTab, setActiveTab] = useState<'map' | 'dashboard' | 'telemetry' | 'eta' | 'efficiency' | 'inventory' | 'drivers' | 'devices' | 'vehicles' | 'users' | 'feedback' | 'whatsnew'>('map');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [historyPoints, setHistoryPoints] = useState<LocationHistoryPoint[] | null>(null);
  const [isPlayingHistory, setIsPlayingHistory] = useState(false);
  const [isDrawingGeofence, setIsDrawingGeofence] = useState(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [pendingGeofenceCoords, setPendingGeofenceCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [newFenceName, setNewFenceName] = useState('');
  const [newFenceRadius, setNewFenceRadius] = useState(1000);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevAlertsLengthRef = useRef(alerts.length);

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.15); // C6
      
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } catch (err) {
      console.error('Audio failed to play:', err);
    }
  };

  useEffect(() => {
    if (alerts.length > prevAlertsLengthRef.current) {
      if (soundEnabled) {
        playNotificationSound();
      }
    }
    prevAlertsLengthRef.current = alerts.length;
  }, [alerts, soundEnabled]);

  // --- 3. LOAD LIVE DATA FROM THE BACKEND, THEN STAY IN SYNC VIA SUPABASE REALTIME ---
  useEffect(() => {
    localStorage.setItem('fleet_map_settings', JSON.stringify(mapSettings));
  }, [mapSettings]);

  // Fires once we have a resolved profile (i.e. a valid session + role) so every request
  // carries the auth token and we know which endpoints this account is even allowed to call.
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      try {
        const [v, d, g, a, m, inv, dp] = await Promise.all([
          api.vehicles.list(),
          api.devices.list(),
          api.geofences.list(),
          api.alerts.list(),
          api.maintenance.list(),
          api.inventory.list(),
          api.driverPerformance.list(),
        ]);
        if (cancelled) return;
        setVehicles(v);
        setDevices(d);
        setGeofences(g);
        setAlerts(a);
        setMaintenance(m);
        setInventory(inv);
        setDriverPerformance(dp);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load fleet data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  // The account roster and feedback inbox are admin-only (both on the backend and in the UI)
  // — only fetch them for admins, and only once we know that's who's logged in.
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    api.users.list().then(setUsers).catch((err) => console.error('Failed to load users:', err));
  }, [currentUser?.role]);

  const loadFeedback = () => {
    if (currentUser?.role !== 'admin') return;
    api.feedback.list().then(setFeedback).catch((err) => console.error('Failed to load feedback:', err));
  };

  // Fetch on login (for the sidebar badge), refetch whenever the tab is opened (in case new
  // feedback came in since), and poll while logged in so the badge count stays reasonably
  // fresh without needing a Realtime channel over a table that's intentionally not public.
  useEffect(() => {
    loadFeedback();
    if (currentUser?.role !== 'admin') return;
    const interval = setInterval(loadFeedback, 60000);
    return () => clearInterval(interval);
  }, [currentUser?.role]);

  useEffect(() => {
    if (activeTab === 'feedback') loadFeedback();
  }, [activeTab]);

  // The changelog is visible to every role — fetch once a profile is resolved.
  useEffect(() => {
    if (!currentUser) return;
    api.changelog.list().then(setChangelog).catch((err) => console.error('Failed to load changelog:', err));
  }, [currentUser?.id]);

  // Mark the latest version as "seen" (clears the sidebar's new-update dot) once the user
  // actually opens the What's New tab.
  useEffect(() => {
    if (activeTab !== 'whatsnew' || changelog.length === 0) return;
    const latest = changelog[0].version;
    localStorage.setItem('fleet_last_seen_version', latest);
    setLastSeenVersion(latest);
  }, [activeTab, changelog]);

  // Live pushes: vehicle positions and new alerts stream in via Supabase Realtime
  // instead of polling. Writes still go through the backend API.
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('fleet-tracker-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setVehicles((prev) => prev.filter((v) => v.id !== (payload.old as any).id));
          return;
        }
        const row = payload.new as any;
        const updated: Vehicle = { ...row, location: { lat: row.lat, lng: row.lng } };
        setVehicles((prev) => {
          const exists = prev.some((v) => v.id === updated.id);
          return exists ? prev.map((v) => (v.id === updated.id ? updated : v)) : [...prev, updated];
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fleet_alerts' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setAlerts((prev) => prev.filter((a) => a.id !== (payload.old as any).id));
          return;
        }
        const row = payload.new as any;
        const updated: GeofenceAlert = {
          id: row.id,
          vehicleId: row.vehicle_id,
          vehicleName: row.vehicle_name,
          geofenceName: row.geofence_name,
          type: row.type,
          timestamp: row.timestamp,
          resolved: row.resolved,
          severity: row.severity,
          details: row.details,
          initialFuel: row.initial_fuel,
          finalFuel: row.final_fuel,
        };
        setAlerts((prev) => {
          const exists = prev.some((a) => a.id === updated.id);
          return exists ? prev.map((a) => (a.id === updated.id ? updated : a)) : [updated, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Redirect to permitted tab if current active tab is unauthorized for active role
  useEffect(() => {
    if (!currentUser) return;
    const allowed = ROLE_MODULES[currentUser.role] || [];
    if (!allowed.includes(activeTab)) {
      setActiveTab(allowed[0] as any);
    }
  }, [currentUser, activeTab]);

  // Persists a derived alert to the backend (deduping against currently-known alerts first),
  // then folds the server-assigned row into local state. The realtime subscription above
  // will also deliver it — that handler dedupes by id, so this is safe either way.
  const alertsRef = useRef<GeofenceAlert[]>(alerts);
  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  const raiseAlertIfNew = (dedupeKey: (a: GeofenceAlert) => boolean, draft: Omit<FleetAlert, 'id'>) => {
    if (alertsRef.current.some(dedupeKey)) return;
    api.alerts
      .create(draft)
      .then((created) => {
        setAlerts((prev) => (prev.some((a) => a.id === created.id) ? prev : [created, ...prev]));
      })
      .catch((err) => console.error('Failed to raise alert:', err));
  };

  // AUTOMATED FUEL THEFT ANOMALY DETECTION ENGINE
  const prevVehiclesRef = useRef<Vehicle[]>([]);
  useEffect(() => {
    const prevVehicles = prevVehiclesRef.current;
    if (prevVehicles && prevVehicles.length > 0) {
      vehicles.forEach((vehicle) => {
        const prev = prevVehicles.find((v) => v.id === vehicle.id);
        if (prev) {
          // Check if engine is 'stopped' and fuel dropped significantly (>= 5.0%)
          const isStopped = vehicle.status === 'stopped';
          const fuelDrop = prev.fuelLevel - vehicle.fuelLevel;
          if (isStopped && fuelDrop >= 4.9) {
            raiseAlertIfNew(
              (a) => a.vehicleId === vehicle.id && a.type === 'fuel_theft' && !a.resolved,
              {
                vehicleId: vehicle.id,
                vehicleName: vehicle.name,
                type: 'fuel_theft',
                timestamp: new Date().toISOString(),
                resolved: false,
                severity: 'critical',
                details: `Sudden fuel drop detected! Fuel level plummeted from ${prev.fuelLevel}% to ${vehicle.fuelLevel}% (-${fuelDrop.toFixed(1)}%) while the vehicle ignition status was STOPPED.`,
                initialFuel: prev.fuelLevel,
                finalFuel: vehicle.fuelLevel,
              }
            );
          }
        }
      });
    }
    prevVehiclesRef.current = vehicles;
  }, [vehicles]);

  // DYNAMIC SENSOR & MAINTENANCE ALARMS GENERATOR
  useEffect(() => {
    // 1. Check for overdue maintenance tasks
    maintenance.forEach((log) => {
      if (log.status === 'overdue') {
        const correspondingVehicle = vehicles.find((v) => v.id === log.vehicleId);
        raiseAlertIfNew(
          (a) => a.vehicleId === log.vehicleId && a.type === 'maintenance_due' && !a.resolved,
          {
            vehicleId: log.vehicleId,
            vehicleName: correspondingVehicle?.name || 'Unknown Vehicle',
            type: 'maintenance_due',
            timestamp: new Date().toISOString(),
            resolved: false,
            severity: 'warning',
            details: `Scheduled service is OVERDUE: "${log.serviceType}". Target date was ${log.dueDate}. Fleet operation is at risk!`,
          }
        );
      }
    });

    // 2. Check for tire pressures
    vehicles.forEach((v) => {
      if (v.tirePressures && (v.tirePressures.status === 'warning' || v.tirePressures.status === 'critical')) {
        const severity = v.tirePressures?.status === 'critical' ? 'critical' : 'warning';
        const { fl, fr, rl, rr } = v.tirePressures!;
        raiseAlertIfNew(
          (a) => a.vehicleId === v.id && a.type === 'low_pressure' && !a.resolved,
          {
            vehicleId: v.id,
            vehicleName: v.name,
            type: 'low_pressure',
            timestamp: new Date().toISOString(),
            resolved: false,
            severity,
            details: `Tire Pressure Monitoring System (TPMS) anomaly! Sensor readings: FL: ${fl} PSI | FR: ${fr} PSI | RL: ${rl} PSI | RR: ${rr} PSI. Status is ${v.tirePressures?.status.toUpperCase()}!`,
          }
        );
      }
    });

    // 3. Check for excessive idle time
    vehicles.forEach((v) => {
      if (v.status === 'idle') {
        const dp = driverPerformance.find((d) => d.vehicleId === v.id);
        const idleTime = dp ? dp.idleTimeMin : 35; // Default threshold when no driver score exists yet
        if (idleTime > 30) {
          raiseAlertIfNew(
            (a) => a.vehicleId === v.id && a.type === 'idle_time' && !a.resolved,
            {
              vehicleId: v.id,
              vehicleName: v.name,
              type: 'idle_time',
              timestamp: new Date().toISOString(),
              resolved: false,
              severity: 'warning',
              details: `Excessive Engine Idling! Vehicle is parked but engine is running for ${idleTime} minutes. High fuel waste and carbon footprint risk.`,
            }
          );
        }
      }
    });

    // 4. Check for low GPS battery level
    vehicles.forEach((v) => {
      if (v.batteryPercent <= 20) {
        const severity = v.batteryPercent <= 10 ? 'critical' : 'warning';
        raiseAlertIfNew(
          (a) => a.vehicleId === v.id && a.type === 'battery_low' && !a.resolved,
          {
            vehicleId: v.id,
            vehicleName: v.name,
            type: 'battery_low',
            timestamp: new Date().toISOString(),
            resolved: false,
            severity,
            details: `GPS Tracker Low Battery! Battery level is currently at ${v.batteryPercent}%. Real-time hardware tracking is at risk of going offline.`,
          }
        );
      }
    });
  }, [vehicles, maintenance, driverPerformance]);

  // --- 4. LOGISTICS INTEGRATION: RECALCULATE CARGO WEIGHTS ---
  // When inventory changes, recompute each affected vehicle's loaded cargo weight and
  // persist it (only vehicles whose total actually changed get a PUT).
  const recalculateVehicleWeights = async (currentInventory: InventoryItem[]) => {
    const affectedVehicleIds = new Set(
      currentInventory.map((item) => item.assignedVehicleId).filter((id): id is string => !!id)
    );
    for (const vehicleId of affectedVehicleIds) {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      if (!vehicle) continue;
      const totalWeight = currentInventory
        .filter((item) => item.assignedVehicleId === vehicleId)
        .reduce((sum, item) => sum + item.quantity * item.unitWeight, 0);
      if (totalWeight === vehicle.cargoWeight) continue;
      try {
        const updated = await api.vehicles.update(vehicleId, { cargoWeight: totalWeight });
        setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? updated : v)));
      } catch (err) {
        console.error('Failed to update cargo weight:', err);
      }
    }
  };

  // --- 5. CORE ACTION HANDLERS ---

  // INVENTORY OPERATIONS
  const handleAddInventoryItem = async (newItemPayload: Omit<InventoryItem, 'id'>) => {
    const newItem = await api.inventory.create(newItemPayload);
    const nextInventory = [...inventory, newItem];
    setInventory(nextInventory);
    recalculateVehicleWeights(nextInventory);
  };

  const handleEditInventoryItem = async (id: string, updatedPayload: Partial<InventoryItem>) => {
    const updated = await api.inventory.update(id, updatedPayload);
    const nextInventory = inventory.map((item) => (item.id === id ? updated : item));
    setInventory(nextInventory);
    recalculateVehicleWeights(nextInventory);
  };

  const handleDeleteInventoryItem = async (id: string) => {
    await api.inventory.remove(id);
    const nextInventory = inventory.filter((item) => item.id !== id);
    setInventory(nextInventory);
    recalculateVehicleWeights(nextInventory);
  };

  const handleAssignItemToVehicle = async (itemId: string, vehicleId: string | undefined) => {
    const pairedVeh = vehicles.find((v) => v.id === vehicleId);
    const location = pairedVeh ? pairedVeh.name : 'Tangerang HQ Depot';
    const updated = await api.inventory.update(itemId, { assignedVehicleId: vehicleId ?? null, location });
    const nextInventory = inventory.map((item) => (item.id === itemId ? updated : item));
    setInventory(nextInventory);
    recalculateVehicleWeights(nextInventory);
  };

  // CUSTOM ROUTES LIBRARY OPERATIONS
  const handleAddCustomRoute = (newRoute: CustomRoute) => {
    setCustomRoutes((prev) => [...prev, newRoute]);
  };

  // GEOFENCE OPERATIONS
  const triggerAddGeofenceMode = () => {
    setIsDrawingGeofence(true);
    setActiveTab('map');
  };

  const handleMapClickForGeofence = (lat: number, lng: number) => {
    setPendingGeofenceCoords({ lat, lng });
    setNewFenceName(`Geofence Sector #${geofences.length + 1}`);
    setShowGeofenceModal(true);
  };

  const saveCreatedGeofence = async () => {
    if (!pendingGeofenceCoords) return;

    const newFence: Geofence = {
      id: 'GEO-' + String(geofences.length + 1).padStart(2, '0'),
      name: newFenceName || `Geofence Sector #${geofences.length + 1}`,
      lat: pendingGeofenceCoords.lat,
      lng: pendingGeofenceCoords.lng,
      radius: newFenceRadius,
      type: 'circle',
      active: true,
    };

    const created = await api.geofences.create(newFence);
    setGeofences((prev) => [...prev, created]);
    setShowGeofenceModal(false);
    setPendingGeofenceCoords(null);
    setIsDrawingGeofence(false);
  };

  // VEHICLE OPERATIONS
  const handleAddDriverPerformance = async (
    newDriver: DriverPerformance,
    driverPhone?: string,
    avatarUrl?: string,
    driverEmail?: string,
    driverAddress?: string
  ) => {
    const existing = driverPerformance.find((d) => d.vehicleId === newDriver.vehicleId);
    const payload = {
      ...newDriver,
      driverPhone: driverPhone ?? existing?.driverPhone,
      avatar: avatarUrl ?? existing?.avatar,
      driverEmail: driverEmail ?? existing?.driverEmail,
      driverAddress: driverAddress ?? existing?.driverAddress,
    };

    if (existing?.id) {
      const updated = await api.driverPerformance.update(existing.id, payload);
      setDriverPerformance((prev) => prev.map((d) => (d.id === existing.id ? updated : d)));
    } else {
      const created = await api.driverPerformance.create(payload);
      setDriverPerformance((prev) => [...prev, created]);
    }

    const vehiclePatch: Partial<Vehicle> = {
      driverName: newDriver.driverName,
      ...(driverPhone ? { driverPhone } : {}),
      ...(avatarUrl ? { avatar: avatarUrl } : {}),
      ...(driverEmail ? { driverEmail } : {}),
      ...(driverAddress ? { driverAddress } : {}),
    };
    const updatedVehicle = await api.vehicles.update(newDriver.vehicleId, vehiclePatch);
    setVehicles((prev) => prev.map((v) => (v.id === newDriver.vehicleId ? updatedVehicle : v)));
  };

  const handleAddVehicle = async (newVeh: Vehicle) => {
    const created = await api.vehicles.create(newVeh);
    setVehicles((prev) => [...prev, created]);

    // Auto-update GPS device mapping
    if (created.deviceId) {
      const updatedDevice = await api.devices.update(created.deviceId, { assignedVehicleId: created.id });
      setDevices((prev) => prev.map((d) => (d.id === updatedDevice.id ? updatedDevice : d)));
    }

    // Auto-create initial driver score
    const newScore = await api.driverPerformance.create({
      vehicleId: created.id,
      driverName: created.driverName,
      safetyScore: 100, // Starts fresh!
      maxSpeed: 0,
      harshBrakingCount: 0,
      harshAccelerationCount: 0,
      idleTimeMin: 0,
      totalDistanceKm: 0,
    });
    setDriverPerformance((prev) => [...prev, newScore]);
  };

  const handleEditVehicle = async (id: string, updatedFields: Partial<Vehicle>) => {
    const updated = await api.vehicles.update(id, updatedFields);
    setVehicles((prev) => prev.map((v) => (v.id === id ? updated : v)));

    // Sync driver name score
    if (updatedFields.driverName) {
      const driverEntry = driverPerformance.find((d) => d.vehicleId === id);
      if (driverEntry?.id) {
        const updatedDriver = await api.driverPerformance.update(driverEntry.id, { driverName: updatedFields.driverName });
        setDriverPerformance((prev) => prev.map((d) => (d.id === updatedDriver.id ? updatedDriver : d)));
      }
    }

    // Sync GPS tracker assignments
    if (updatedFields.deviceId !== undefined) {
      const previouslyLinked = devices.find((d) => d.assignedVehicleId === id);
      const nextDevices = [...devices];
      if (previouslyLinked && previouslyLinked.id !== updatedFields.deviceId) {
        const cleared = await api.devices.update(previouslyLinked.id, { assignedVehicleId: null as any });
        const idx = nextDevices.findIndex((d) => d.id === cleared.id);
        if (idx >= 0) nextDevices[idx] = cleared;
      }
      if (updatedFields.deviceId) {
        const linked = await api.devices.update(updatedFields.deviceId, { assignedVehicleId: id });
        const idx = nextDevices.findIndex((d) => d.id === linked.id);
        if (idx >= 0) nextDevices[idx] = linked;
      }
      setDevices(nextDevices);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    await api.vehicles.remove(id);
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    // Clear device assignment
    const linkedDevice = devices.find((d) => d.assignedVehicleId === id);
    if (linkedDevice) {
      const cleared = await api.devices.update(linkedDevice.id, { assignedVehicleId: null as any });
      setDevices((prev) => prev.map((d) => (d.id === cleared.id ? cleared : d)));
    }
    // Clear driver scores
    const driverEntry = driverPerformance.find((d) => d.vehicleId === id);
    if (driverEntry?.id) await api.driverPerformance.remove(driverEntry.id);
    setDriverPerformance((prev) => prev.filter((d) => d.vehicleId !== id));
  };

  // DEVICE OPERATIONS
  const handleAddDevice = async (newDev: GPSDevice) => {
    const created = await api.devices.create(newDev);
    setDevices((prev) => [...prev, created]);
    if (created.assignedVehicleId) {
      const updatedVehicle = await api.vehicles.update(created.assignedVehicleId, { deviceId: created.id });
      setVehicles((prev) => prev.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v)));
    }
  };

  const handleEditDevice = async (id: string, updatedFields: Partial<GPSDevice>) => {
    const updated = await api.devices.update(id, updatedFields);
    setDevices((prev) => prev.map((d) => (d.id === id ? updated : d)));

    if (updatedFields.assignedVehicleId !== undefined) {
      const previouslyLinked = vehicles.find((v) => v.deviceId === id);
      const nextVehicles = [...vehicles];
      if (previouslyLinked && previouslyLinked.id !== updatedFields.assignedVehicleId) {
        const cleared = await api.vehicles.update(previouslyLinked.id, { deviceId: '' });
        const idx = nextVehicles.findIndex((v) => v.id === cleared.id);
        if (idx >= 0) nextVehicles[idx] = cleared;
      }
      if (updatedFields.assignedVehicleId) {
        const linked = await api.vehicles.update(updatedFields.assignedVehicleId, { deviceId: id });
        const idx = nextVehicles.findIndex((v) => v.id === linked.id);
        if (idx >= 0) nextVehicles[idx] = linked;
      }
      setVehicles(nextVehicles);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    await api.devices.remove(id);
    setDevices((prev) => prev.filter((d) => d.id !== id));
    const linkedVehicle = vehicles.find((v) => v.deviceId === id);
    if (linkedVehicle) {
      const updated = await api.vehicles.update(linkedVehicle.id, { deviceId: '' });
      setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    }
  };

  // RESOLVE GEOFENCE ALERT
  const handleResolveAlert = async (id: string) => {
    const updated = await api.alerts.update(id, { resolved: true });
    setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const handleAddAlert = async (newAlert: GeofenceAlert) => {
    const { id, ...draft } = newAlert;
    const created = await api.alerts.create(draft);
    setAlerts((prev) => [created, ...prev]);
  };

  // COMPLETE MAINTENANCE SCHEDULE
  const handleCompleteMaintenance = async (id: string) => {
    const updated = await api.maintenance.update(id, { status: 'completed' });
    setMaintenance((prev) => prev.map((m) => (m.id === id ? updated : m)));
  };

  // CALIBRATE TPMS SYSTEM (INFLATE TIRES)
  const handleCalibrateTPMS = async (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;
    const standardPsi = vehicle.type === 'Motorcycle' ? 30 : vehicle.id === 'V-103' ? 105 : 34;
    const updated = await api.vehicles.update(vehicleId, {
      tirePressures: { fl: standardPsi, fr: standardPsi, rl: standardPsi, rr: standardPsi, status: 'normal' },
    });
    setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? updated : v)));

    // Auto-resolve any unresolved TPMS alerts for this vehicle
    const toResolve = alerts.filter((a) => a.vehicleId === vehicleId && a.type === 'low_pressure' && !a.resolved);
    for (const a of toResolve) {
      const updatedAlert = await api.alerts.update(a.id, { resolved: true });
      setAlerts((prev) => prev.map((al) => (al.id === updatedAlert.id ? updatedAlert : al)));
    }
  };

  // LOCATION PLAYBACK HISTORIES
  const handleToggleHistoryPlayback = async () => {
    if (isPlayingHistory) {
      setHistoryPoints(null);
      setIsPlayingHistory(false);
    } else if (selectedVehicle) {
      const hist = await api.vehicles.history(selectedVehicle.id);
      setHistoryPoints(hist.length ? hist : null);
      setIsPlayingHistory(true);
    }
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    // If history points were loaded for a previous vehicle, clear it on new selection
    setHistoryPoints(null);
    setIsPlayingHistory(false);
    setActiveTab('map');
  };

  // --- ACCOUNT MANAGEMENT (admin-only, backend-enforced) ---
  const handleAddUser = async (newUserPayload: { name: string; email: string; role: UserRole; department?: string; password: string }) => {
    const created = await api.users.create(newUserPayload);
    setUsers((prev) => [...prev, created]);
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    const updated = await api.users.update(userId, { role: newRole });
    setUsers((prev) => prev.map((user) => (user.id === userId ? updated : user)));
  };

  const handleDeleteUser = async (userId: string) => {
    await api.users.remove(userId);
    setUsers((prev) => prev.filter((user) => user.id !== userId));
  };

  // --- FEEDBACK (admin-only review) ---
  const handleUpdateFeedbackStatus = async (id: string, status: FeedbackStatus) => {
    const updated = await api.feedback.updateStatus(id, status);
    setFeedback((prev) => prev.map((f) => (f.id === id ? updated : f)));
  };

  const handleDeleteFeedback = async (id: string) => {
    await api.feedback.remove(id);
    setFeedback((prev) => prev.filter((f) => f.id !== id));
  };

  // --- WHAT'S NEW (app version + changelog, admin-authored, everyone can read) ---
  const handlePublishChangelog = async (bumpType: ChangelogBumpType, title: string, changes: string[]) => {
    const created = await api.changelog.create({ bumpType, title, changes });
    setChangelog((prev) => [created, ...prev]);
  };

  const handleUpdateChangelogEntry = async (id: string, updated: { title: string; changes: string[] }) => {
    const saved = await api.changelog.update(id, updated);
    setChangelog((prev) => prev.map((c) => (c.id === id ? saved : c)));
  };

  const handleDeleteChangelogEntry = async (id: string) => {
    await api.changelog.remove(id);
    setChangelog((prev) => prev.filter((c) => c.id !== id));
  };

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-400 text-sm font-semibold gap-2">
        <Navigation className="w-5 h-5 animate-pulse text-blue-500" /> Loading...
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (authError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-rose-600 text-sm font-semibold p-6 text-center">
        Failed to load your account profile: {authError}. If you were just added, make sure an
        admin created your account through the User & Role Center.
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500 text-sm font-semibold gap-2">
        <Navigation className="w-5 h-5 animate-pulse text-blue-600" /> Loading your profile...
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500 text-sm font-semibold gap-2">
        <Navigation className="w-5 h-5 animate-pulse text-blue-600" /> Loading live fleet data...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-rose-600 text-sm font-semibold p-6 text-center">
        Failed to reach the Fleet Tracker API: {loadError}. Is the backend running and VITE_API_URL set correctly?
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      
      {/* 1. LEFT SIDE NAVIGATION & CONTROL BOARD */}
      <aside className="w-full lg:w-80 bg-[#0F172A] text-white flex flex-col justify-between shrink-0 border-r border-slate-800">
        <div className="flex flex-col">
          {/* Brand Heading */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-wider">{t('brand.name')}</h1>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('brand.subtitle')}</p>
                  {changelog[0]?.version && (
                    <button
                      id="btn-version-tag"
                      onClick={() => setActiveTab('whatsnew')}
                      title={t('nav.whatsnew')}
                      className="text-[9px] font-mono font-bold text-slate-500 hover:text-blue-400 transition"
                    >
                      v{changelog[0].version}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <LanguageToggle dark />
          </div>

          {/* Signed-in Account Widget */}
          <div className="mx-4 mt-2 mb-4 p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center gap-2">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-slate-600 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-blue-600 border border-slate-600 shrink-0 flex items-center justify-center text-[10px] font-black text-white">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-100 truncate leading-tight">{currentUser.name}</p>
              <p className="text-[8px] text-blue-400 font-extrabold uppercase tracking-widest mt-0.5">
                🛡️ {currentUser.role}
              </p>
            </div>
            <button
              id="btn-sign-out"
              onClick={handleSignOut}
              title={t('sidebar.signOut')}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Tabs Menu */}
          <nav className="p-4 space-y-1">
            {ROLE_MODULES[currentUser.role].includes('map') && (
              <button
                id="tab-map"
                onClick={() => setActiveTab('map')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'map' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Map className="w-4 h-4" /> {t('nav.map')}
              </button>
            )}

            {ROLE_MODULES[currentUser.role].includes('dashboard') && (
              <button
                id="tab-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'dashboard' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" /> {t('nav.dashboard')}
              </button>
            )}

            {ROLE_MODULES[currentUser.role].includes('telemetry') && (
              <button
                id="tab-telemetry"
                onClick={() => setActiveTab('telemetry')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'telemetry' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Activity className="w-4 h-4 text-indigo-400" /> {t('nav.telemetry')}
              </button>
            )}

            {ROLE_MODULES[currentUser.role].includes('eta') && (
              <button
                id="tab-eta"
                onClick={() => setActiveTab('eta')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'eta' 
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/10' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Clock className="w-4 h-4 text-teal-400" /> {t('nav.eta')}
              </button>
            )}

            {ROLE_MODULES[currentUser.role].includes('efficiency') && (
              <button
                id="tab-efficiency"
                onClick={() => setActiveTab('efficiency')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'efficiency' 
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/10' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" /> {t('nav.efficiency')}
              </button>
            )}

            {ROLE_MODULES[currentUser.role].includes('inventory') && (
              <button
                id="tab-inventory"
                onClick={() => setActiveTab('inventory')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'inventory' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Boxes className="w-4 h-4" /> {t('nav.inventory')}
              </button>
            )}

            {ROLE_MODULES[currentUser.role].includes('drivers') && (
              <button
                id="tab-drivers"
                onClick={() => setActiveTab('drivers')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'drivers' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" /> {t('nav.drivers')}
              </button>
            )}

            {ROLE_MODULES[currentUser.role].includes('vehicles') && (
              <button
                id="tab-vehicles"
                onClick={() => setActiveTab('vehicles')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'vehicles' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Truck className="w-4 h-4" /> {t('nav.vehicles')}
              </button>
            )}

            {ROLE_MODULES[currentUser.role].includes('devices') && (
              <button
                id="tab-devices"
                onClick={() => setActiveTab('devices')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'devices' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Cpu className="w-4 h-4" /> {t('nav.devices')}
              </button>
            )}

            {ROLE_MODULES[currentUser.role].includes('users') && (
              <button
                id="tab-users"
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'users' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Fingerprint className="w-4 h-4" /> {t('nav.users')}
              </button>
            )}

            {ROLE_MODULES[currentUser.role].includes('feedback') && (
              <button
                id="tab-feedback"
                onClick={() => setActiveTab('feedback')}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'feedback'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4" /> {t('nav.feedback')}
                </span>
                {feedback.filter((f) => f.status === 'new').length > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                    {feedback.filter((f) => f.status === 'new').length}
                  </span>
                )}
              </button>
            )}

            {ROLE_MODULES[currentUser.role].includes('whatsnew') && (
              <button
                id="tab-whatsnew"
                onClick={() => setActiveTab('whatsnew')}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'whatsnew'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4" /> {t('nav.whatsnew')}
                </span>
                {changelog.length > 0 && changelog[0].version !== lastSeenVersion && (
                  <span className="bg-rose-500 w-2 h-2 rounded-full shrink-0" />
                )}
              </button>
            )}

          </nav>
        </div>

        {/* Bottom Utility controls */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <FeedbackModal />
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700/50 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-400 font-semibold text-[10px] uppercase">
              <span>{t('sidebar.pingRate')}</span>
              <span className="text-emerald-400 font-bold">{mapSettings.updateInterval}s</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>{t('sidebar.geofencesGuard')}</span>
              <span className="font-bold text-white">{t('sidebar.active')} ({geofences.filter(g => g.active).length})</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-300 border-t border-slate-700/50 pt-2 mt-2">
              <span className="flex items-center gap-1">{t('sidebar.alertAudio')}</span>
              <button
                id="btn-toggle-sound"
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  if (!soundEnabled) {
                    setTimeout(playNotificationSound, 50);
                  }
                }}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase transition cursor-pointer select-none ${
                  soundEnabled 
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5" /> {t('sidebar.on')}
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5" /> {t('sidebar.off')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN APPLICATION CONTENT PORTAL */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Row */}
        <header className="bg-white border-b border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 z-20 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
              {activeTab === 'map' && t('header.map.title')}
              {activeTab === 'dashboard' && t('header.dashboard.title')}
              {activeTab === 'telemetry' && t('header.telemetry.title')}
              {activeTab === 'eta' && t('header.eta.title')}
              {activeTab === 'efficiency' && t('header.efficiency.title')}
              {activeTab === 'inventory' && t('header.inventory.title')}
              {activeTab === 'drivers' && t('header.drivers.title')}
              {activeTab === 'vehicles' && t('header.vehicles.title')}
              {activeTab === 'devices' && t('header.devices.title')}
              {activeTab === 'users' && t('header.users.title')}
              {activeTab === 'feedback' && t('header.feedback.title')}
              {activeTab === 'whatsnew' && t('header.whatsnew.title')}
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              {activeTab === 'map' && t('header.map.subtitle')}
              {activeTab === 'dashboard' && t('header.dashboard.subtitle')}
              {activeTab === 'telemetry' && t('header.telemetry.subtitle')}
              {activeTab === 'eta' && t('header.eta.subtitle')}
              {activeTab === 'efficiency' && t('header.efficiency.subtitle')}
              {activeTab === 'inventory' && t('header.inventory.subtitle')}
              {activeTab === 'drivers' && t('header.drivers.subtitle')}
              {activeTab === 'vehicles' && t('header.vehicles.subtitle')}
              {activeTab === 'devices' && t('header.devices.subtitle')}
              {activeTab === 'users' && t('header.users.subtitle')}
              {activeTab === 'feedback' && t('header.feedback.subtitle')}
              {activeTab === 'whatsnew' && t('header.whatsnew.subtitle')}
            </p>
          </div>

          {/* Quick Asset Locate Bar Search Input */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <QuickAssetLocateBar
              vehicles={vehicles}
              geofences={geofences}
              inventory={inventory}
              onSelectVehicle={(v) => handleSelectVehicle(v)}
              onSelectGeofence={(g) => {
                setActiveTab('map');
              }}
            />

            {/* Quick Stats or drawing action triggers */}
            {activeTab === 'map' && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn-draw-geofence"
                  onClick={triggerAddGeofenceMode}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    isDrawingGeofence 
                      ? 'bg-blue-600 text-white shadow-lg animate-pulse' 
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                >
                  <Plus className="w-4 h-4" /> {isDrawingGeofence ? 'Click Map...' : 'Draw Geofence zone'}
                </button>

                {selectedVehicle && (
                  <button
                    id="btn-toggle-history"
                    onClick={handleToggleHistoryPlayback}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                      isPlayingHistory 
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' 
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    <Navigation className="w-4 h-4" /> 
                    {isPlayingHistory ? 'Clear Route Trail' : 'Plot History Trail'}
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Portal Views Container */}
        <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
          
          {/* TAB 1: INTERACTIVE GPS MAP (SPLIT SIDEBAR VIEW) */}
          {activeTab === 'map' && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-[calc(100vh-140px)] min-h-[550px]">
              
              {/* Map Canvas (Left 3 cols) */}
              <div className="xl:col-span-3 h-full rounded-2xl overflow-hidden shadow-sm border border-slate-100 relative">
                <MapView
                  vehicles={vehicles}
                  geofences={geofences}
                  selectedVehicle={selectedVehicle}
                  historyPoints={historyPoints}
                  settings={mapSettings}
                  onVehicleClick={handleSelectVehicle}
                  onAddGeofenceClick={handleMapClickForGeofence}
                  isDrawingGeofence={isDrawingGeofence}
                  onDrawGeofenceComplete={() => setIsDrawingGeofence(false)}
                  onUpdateSettings={(updated) => setMapSettings(prev => ({ ...prev, ...updated }))}
                />
              </div>

              {/* Sidebar Vehicle Feed (Right 1 col) */}
              <div className="xl:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-full overflow-hidden">
                <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-3">Live Fleet Track</h3>
                
                {/* Active Vehicles List Scroll */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {vehicles.map((v) => {
                    const isSelected = selectedVehicle?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        id={`btn-select-sidebar-${v.id}`}
                        onClick={() => handleSelectVehicle(v)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-200 shadow-sm text-blue-950' 
                            : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                           <span className="text-xl shrink-0">
                             {v.type === 'Truck' ? '🚚' : v.type === 'Van' ? '🚐' : v.type === 'Sedan' ? '🚗' : v.type === 'SUV' ? '🚘' : '🏍️'}
                           </span>
                           <div className="min-w-0">
                             <h4 className="font-bold text-xs truncate">{v.name}</h4>
                             <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{v.licensePlate}</p>
                           </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-bold text-[10px] uppercase tracking-wide ${
                            v.status === 'active' ? 'text-emerald-600' : 'text-slate-400'
                          }`}>{v.status}</p>
                          <p className="font-mono text-xs font-extrabold text-slate-800">{v.speed} <span className="text-[9px] font-bold text-slate-400">km/h</span></p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Selected Vehicle Details Card */}
                {selectedVehicle && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={selectedVehicle.avatar} 
                        alt={selectedVehicle.driverName} 
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 text-xs">
                        <p className="font-bold text-slate-800">{selectedVehicle.driverName}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{selectedVehicle.driverPhone}</p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] grid grid-cols-2 gap-2 text-slate-600 font-medium">
                      <div>
                        <span className="text-slate-400 font-semibold text-[9px] block">FUEL LEVEL</span>
                        <span className="font-bold text-slate-800">{selectedVehicle.fuelLevel}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold text-[9px] block">CARGO PAYLOAD</span>
                        <span className="font-bold text-slate-800">{selectedVehicle.cargoWeight} kg</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold text-[9px] block">HARDWARE PING</span>
                        <span className="font-bold text-blue-600 font-mono text-[10px]">{selectedVehicle.deviceId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold text-[9px] block">COORDINATE</span>
                        <span className="font-bold text-slate-800 font-mono text-[9px]">
                          {selectedVehicle.location.lat.toFixed(4)}, {selectedVehicle.location.lng.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: OPERATIONAL MANAGEMENT DASHBOARD */}
          {activeTab === 'dashboard' && (
            <FleetDashboard
              vehicles={vehicles}
              devices={devices}
              alerts={alerts}
              maintenance={maintenance}
              settings={mapSettings}
              customRoutes={customRoutes}
              onAddCustomRoute={handleAddCustomRoute}
              onUpdateSettings={(updated) => setMapSettings(prev => ({ ...prev, ...updated }))}
              onResolveAlert={handleResolveAlert}
              onCompleteMaintenance={handleCompleteMaintenance}
              onSelectVehicle={handleSelectVehicle}
              onCalibrateTPMS={handleCalibrateTPMS}
              onAddAlert={handleAddAlert}
            />
          )}

          {/* TAB 3: VEHICLE TELEMETRY HISTORY VIEW */}
          {activeTab === 'telemetry' && (
            <VehicleTelemetryHistoryView
              vehicles={vehicles}
              selectedVehicleId={selectedVehicle?.id}
            />
          )}

          {/* TAB 4: PREDICTIVE ARRIVAL ESTIMATION (ETA ENGINE) */}
          {activeTab === 'eta' && (
            <PredictiveArrivalEstimatorView
              vehicles={vehicles}
              geofences={geofences}
            />
          )}

          {/* TAB 5: GEOFENCE DWELL TIME & ROUTE EFFICIENCY ALERTS */}
          {activeTab === 'efficiency' && (
            <GeofenceEfficiencyAlertView
              vehicles={vehicles}
              geofences={geofences}
              onAddAlert={handleAddAlert}
            />
          )}

          {/* TAB 3: INTEGRATED LOGISTICS INVENTORY SYSTEM */}
          {activeTab === 'inventory' && (
            <InventorySystem
              items={inventory}
              vehicles={vehicles}
              userRole={currentUser.role}
              onAddItem={handleAddInventoryItem}
              onEditItem={handleEditInventoryItem}
              onDeleteItem={handleDeleteInventoryItem}
              onAssignItemToVehicle={handleAssignItemToVehicle}
            />
          )}

          {/* TAB 4: DRIVER PERFORMANCE SCORECARD */}
          {activeTab === 'drivers' && (
            <DriverPerformanceView
              drivers={driverPerformance}
              vehicles={vehicles}
              onAddDriver={handleAddDriverPerformance}
            />
          )}

          {/* TAB 5: FLEET directory (ADD/EDIT VEHICLE) */}
          {activeTab === 'vehicles' && (
            <VehicleManagement
              vehicles={vehicles}
              devices={devices}
              userRole={currentUser.role}
              customRoutes={customRoutes}
              onAddCustomRoute={handleAddCustomRoute}
              onAddVehicle={handleAddVehicle}
              onEditVehicle={handleEditVehicle}
              onDeleteVehicle={handleDeleteVehicle}
            />
          )}

          {/* TAB 6: GPS TRACKER DIRECTORY (ADD/EDIT DEVICES) */}
          {activeTab === 'devices' && (
            <DeviceManagement
              devices={devices}
              vehicles={vehicles}
              userRole={currentUser.role}
              onAddDevice={handleAddDevice}
              onEditDevice={handleEditDevice}
              onDeleteDevice={handleDeleteDevice}
            />
          )}

          {/* TAB 7: USER PROFILE & ACCESS PRIVILEGE MATRIX */}
          {activeTab === 'users' && (
            <UserRoleManagement
              currentUser={currentUser}
              usersList={users}
              onAddUser={handleAddUser}
              onUpdateUserRole={handleUpdateUserRole}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {/* TAB 8: USER FEEDBACK INBOX */}
          {activeTab === 'feedback' && (
            <FeedbackView
              feedback={feedback}
              onUpdateStatus={handleUpdateFeedbackStatus}
              onDelete={handleDeleteFeedback}
            />
          )}

          {/* TAB 9: WHAT'S NEW (APP VERSION + CHANGELOG) */}
          {activeTab === 'whatsnew' && (
            <WhatsNewView
              entries={changelog}
              isAdmin={currentUser.role === 'admin'}
              onPublish={handlePublishChangelog}
              onUpdate={handleUpdateChangelogEntry}
              onDelete={handleDeleteChangelogEntry}
            />
          )}

        </div>
      </main>

      {/* --- GEOFENCE CREATION CONFIRMATION MODAL --- */}
      {showGeofenceModal && pendingGeofenceCoords && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scale-up border border-slate-100">
            <div className="flex gap-3 text-slate-800">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl h-fit">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Configure Geofence Zone</h3>
                <p className="text-xs text-slate-500 mt-0.5">Define custom radial triggers for active GPS track boundaries.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Geofence Label / Name</label>
                <input
                  id="modal-fence-name"
                  type="text"
                  required
                  value={newFenceName}
                  onChange={(e) => setNewFenceName(e.target.value)}
                  placeholder="e.g. BSD Logistics Hub"
                  className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Trigger Radius: {newFenceRadius} meters</label>
                <input
                  id="modal-fence-radius"
                  type="range"
                  min="300"
                  max="5000"
                  step="100"
                  value={newFenceRadius}
                  onChange={(e) => setNewFenceRadius(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                  <span>300m</span>
                  <span>2.5km</span>
                  <span>5km</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500 font-medium">
                <p>Coordinates:</p>
                <p className="font-mono text-slate-700 font-bold mt-0.5">
                  Lat: {pendingGeofenceCoords.lat.toFixed(5)} / Lng: {pendingGeofenceCoords.lng.toFixed(5)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2">
              <button
                id="modal-btn-cancel"
                onClick={() => { setShowGeofenceModal(false); setPendingGeofenceCoords(null); setIsDrawingGeofence(false); }}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition"
              >
                Discard
              </button>
              <button
                id="modal-btn-save"
                onClick={saveCreatedGeofence}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
              >
                Establish Zone
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
