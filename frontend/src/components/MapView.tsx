import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Vehicle, Geofence, LocationHistoryPoint, MapSettings } from '../types';
import {
  Globe, ShieldAlert, Layers, Navigation, ZoomIn, ZoomOut, Info, Eye, EyeOff,
  Wifi, WifiOff, RefreshCw, Grid, Gauge, Download, FileText, Maximize2,
  Share2, Check, Copy, MapPin, X, FileSpreadsheet, Code, ShieldCheck, Compass, Sparkles,
  CloudRain, CloudLightning, Wind, Play, Pause, AlertTriangle, Radio, Zap,
  Ruler, RotateCcw, Trash2, Plus, Minus, Crosshair
} from 'lucide-react';

export interface RainCell {
  id: string;
  name: string;
  locationName: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  precipitationMmHour: number; // e.g. 42.5 mm/h
  dbzReflectivity: number; // e.g. 48 dBZ
  severity: 'light' | 'moderate' | 'heavy' | 'torrential';
  hazardType: string;
  recommendedSpeedKmh: number;
}

export const LIVE_RAIN_CELLS: RainCell[] = [
  {
    id: 'cell-01',
    name: 'Port Klang Heavy Monsoon Front',
    locationName: 'Westport & Northport Cargo Corridor',
    lat: 2.9900,
    lng: 101.3500,
    radiusMeters: 14000,
    precipitationMmHour: 42.5,
    dbzReflectivity: 48,
    severity: 'heavy',
    hazardType: 'Severe Standing Water & Aquaplaning Risk',
    recommendedSpeedKmh: 45,
  },
  {
    id: 'cell-02',
    name: 'Sepang KLIA Downpour Cell',
    locationName: 'E6 ELITE Highway & Sepang Airport Expressway',
    lat: 2.7600,
    lng: 101.7100,
    radiusMeters: 18000,
    precipitationMmHour: 55.0,
    dbzReflectivity: 53,
    severity: 'torrential',
    hazardType: 'Torrential Rain, Flash Flood & Reduced Visibility (<150m)',
    recommendedSpeedKmh: 40,
  },
  {
    id: 'cell-03',
    name: 'Shah Alam & Subang Moderate Rain Band',
    locationName: 'Federal Highway & Subang Airport Road',
    lat: 3.0800,
    lng: 101.5400,
    radiusMeters: 12000,
    precipitationMmHour: 18.2,
    dbzReflectivity: 35,
    severity: 'moderate',
    hazardType: 'Wet Asphalt & Brake Distance Increase (+35%)',
    recommendedSpeedKmh: 65,
  },
  {
    id: 'cell-04',
    name: 'Slim River Squall Corridor',
    locationName: 'E1 North-South Expressway (KM 380 - 410)',
    lat: 3.8200,
    lng: 101.4200,
    radiusMeters: 22000,
    precipitationMmHour: 32.0,
    dbzReflectivity: 44,
    severity: 'heavy',
    hazardType: 'Crosswind Gusts & Low Visibility Squall',
    recommendedSpeedKmh: 55,
  },
];

function computeDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface MapViewProps {
  vehicles: Vehicle[];
  geofences: Geofence[];
  selectedVehicle: Vehicle | null;
  historyPoints: LocationHistoryPoint[] | null;
  settings: MapSettings;
  onVehicleClick: (vehicle: Vehicle) => void;
  onAddGeofenceClick: (lat: number, lng: number) => void;
  isDrawingGeofence: boolean;
  onDrawGeofenceComplete: () => void;
  onUpdateSettings?: (updated: Partial<MapSettings>) => void;
}

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function MapView({
  vehicles,
  geofences,
  selectedVehicle,
  historyPoints,
  settings,
  onVehicleClick,
  onAddGeofenceClick,
  isDrawingGeofence,
  onDrawGeofenceComplete,
  onUpdateSettings,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  // Keep track of layers to dynamically update them
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const geofencesGroupRef = useRef<L.LayerGroup | null>(null);
  const historyGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const trafficLayerRef = useRef<L.TileLayer | null>(null);
  const weatherLayerRef = useRef<L.TileLayer | null>(null);
  const weatherCellsGroupRef = useRef<L.LayerGroup | null>(null);
  const measureGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapType, setMapType] = useState<'google_road' | 'google_satellite' | 'google_hybrid' | 'osm'>('google_road');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [showExportStateModal, setShowExportStateModal] = useState(false);
  const [showGeofenceExportModal, setShowGeofenceExportModal] = useState(false);
  const [copiedState, setCopiedState] = useState(false);
  const [copiedGeofence, setCopiedGeofence] = useState(false);
  const [offlineSimulate, setOfflineSimulate] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);
  const [enableClustering, setEnableClustering] = useState(true);

  // Measure Distance Tool States
  const [isMeasuringDistance, setIsMeasuringDistance] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{ lat: number; lng: number }[]>([]);
  const isMeasuringDistanceRef = useRef(isMeasuringDistance);
  isMeasuringDistanceRef.current = isMeasuringDistance;

  // Real-Time Weather Radar & Traffic States
  const [showWeatherRadar, setShowWeatherRadar] = useState(settings.showWeather ?? true);
  const [radarFrameIndex, setRadarFrameIndex] = useState(3); // 3 = LIVE NOW
  const [isPlayingRadar, setIsPlayingRadar] = useState(false);
  const [selectedRainCell, setSelectedRainCell] = useState<RainCell | null>(null);
  const [showWeatherHud, setShowWeatherHud] = useState(true);
  const [showTrafficLegend, setShowTrafficLegend] = useState(true);

  // Sync state with settings prop
  useEffect(() => {
    if (settings.showWeather !== undefined) {
      setShowWeatherRadar(settings.showWeather);
    }
  }, [settings.showWeather]);

  // Map sources dictionary
  const mapTileUrls = {
    google_road: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    google_satellite: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    google_hybrid: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Use default coords: Kuala Lumpur
    const centerLat = selectedVehicle ? selectedVehicle.location.lat : 3.0000;
    const centerLng = selectedVehicle ? selectedVehicle.location.lng : 101.6500;
    const initialZoom = selectedVehicle ? 14 : 11;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([centerLat, centerLng], initialZoom);

    mapRef.current = map;

    // Create layer groups
    markersGroupRef.current = L.layerGroup().addTo(map);
    geofencesGroupRef.current = L.layerGroup().addTo(map);
    historyGroupRef.current = L.layerGroup().addTo(map);
    measureGroupRef.current = L.layerGroup().addTo(map);

    // Add scale control
    L.control.scale({ position: 'bottomright' }).addTo(map);

    // Map click handler for measuring distance or drawing Geofence
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isMeasuringDistanceRef.current) {
        setMeasurePoints((prev) => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
        return;
      }
      if (isDrawingGeofence) {
        onAddGeofenceClick(e.latlng.lat, e.latlng.lng);
        onDrawGeofenceComplete();
      }
    });

    const handleMapMovement = () => {
      setMapVersion(v => v + 1);
    };
    map.on('zoomend', handleMapMovement);
    map.on('moveend', handleMapMovement);

    return () => {
      if (mapRef.current) {
        map.off('zoomend', handleMapMovement);
        map.off('moveend', handleMapMovement);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isDrawingGeofence, onAddGeofenceClick, onDrawGeofenceComplete]);

  // 2. Handle map tile and offline mode updates
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing tile layer if any
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const currentMode = (settings.isOfflineMode || offlineSimulate) ? 'osm' : mapType;
    const url = mapTileUrls[currentMode];

    const tileLayer = L.tileLayer(url, {
      maxZoom: 20,
      subdomains: ['a', 'b', 'c'],
    });

    tileLayer.addTo(mapRef.current);
    tileLayerRef.current = tileLayer;

    // If offline, apply filter to container (Grayscale simulation for offline caching)
    if (settings.isOfflineMode || offlineSimulate) {
      mapContainerRef.current?.classList.add('map-offline-grayscale');
    } else {
      mapContainerRef.current?.classList.remove('map-offline-grayscale');
    }
  }, [mapType, settings.isOfflineMode, offlineSimulate]);

  // Handle live traffic overlay updates
  useEffect(() => {
    if (!mapRef.current) return;

    if (trafficLayerRef.current) {
      trafficLayerRef.current.remove();
      trafficLayerRef.current = null;
    }

    if (settings.showTraffic && !settings.isOfflineMode && !offlineSimulate) {
      // Overlay the live traffic layer using Google Traffic layer format
      const trafficUrl = 'https://mt1.google.com/vt?lyrs=h@159000000,traffic|y&x={x}&y={y}&z={z}';
      const trafficLayer = L.tileLayer(trafficUrl, {
        maxZoom: 20,
        opacity: 0.8,
      });
      trafficLayer.addTo(mapRef.current);
      trafficLayerRef.current = trafficLayer;
    }
  }, [settings.showTraffic, settings.isOfflineMode, offlineSimulate, mapType, mapVersion]);

  // Handle Real-Time Weather Precipitation Radar Overlay & Rain Cell Markers
  useEffect(() => {
    if (!mapRef.current) return;

    if (weatherLayerRef.current) {
      weatherLayerRef.current.remove();
      weatherLayerRef.current = null;
    }

    if (weatherCellsGroupRef.current) {
      weatherCellsGroupRef.current.clearLayers();
    } else {
      weatherCellsGroupRef.current = L.layerGroup().addTo(mapRef.current);
    }

    if (showWeatherRadar && !settings.isOfflineMode && !offlineSimulate) {
      // 1. Add RainViewer Real-time Radar Tile Overlay for Peninsular Malaysia
      const rainRadarUrl = 'https://tilecache.rainviewer.com/v2/radar/nowcast/{z}/{x}/{y}/2/1_1.png';
      const weatherTile = L.tileLayer(rainRadarUrl, {
        maxZoom: 18,
        opacity: 0.62,
        zIndex: 10,
      });
      weatherTile.addTo(mapRef.current);
      weatherLayerRef.current = weatherTile;

      // 2. Render Precipitation Density Hazard Cells on map
      LIVE_RAIN_CELLS.forEach((cell) => {
        let color = '#22c55e'; // light
        let fillColor = '#16a34a';
        let fillOpacity = 0.22;

        if (cell.severity === 'torrential') {
          color = '#ef4444';
          fillColor = '#dc2626';
          fillOpacity = 0.38;
        } else if (cell.severity === 'heavy') {
          color = '#f97316';
          fillColor = '#ea580c';
          fillOpacity = 0.32;
        } else if (cell.severity === 'moderate') {
          color = '#eab308';
          fillColor = '#ca8a04';
          fillOpacity = 0.26;
        }

        // Draw animated rain circle on map
        const circle = L.circle([cell.lat, cell.lng], {
          radius: cell.radiusMeters,
          color,
          weight: 2,
          fillColor,
          fillOpacity,
          dashArray: '6, 6',
        });

        // Center pulse marker showing precipitation mm/h
        const rainHtml = `
          <div class="relative flex items-center justify-center pointer-events-auto cursor-pointer">
            <div class="w-9 h-9 rounded-full flex flex-col items-center justify-center shadow-2xl text-white font-extrabold border-2 border-white animate-pulse" style="background-color: ${color}">
              <span class="text-[10px] leading-none">${cell.precipitationMmHour.toFixed(0)}</span>
              <span class="text-[7px] font-mono leading-none opacity-90">mm/h</span>
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: rainHtml,
          className: 'rain-cell-marker-icon',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([cell.lat, cell.lng], { icon: customIcon });

        const popupContent = `
          <div class="p-2 space-y-1 text-slate-800">
            <div class="flex items-center gap-1.5 font-extrabold text-xs">
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${color}"></span>
              ${cell.name}
            </div>
            <p class="text-[11px] font-semibold text-slate-600">${cell.locationName}</p>
            <div class="grid grid-cols-2 gap-1 text-[10px] font-mono bg-slate-100 p-1.5 rounded">
              <div>Precipitation: <b>${cell.precipitationMmHour} mm/h</b></div>
              <div>Reflectivity: <b>${cell.dbzReflectivity} dBZ</b></div>
            </div>
            <p class="text-[10px] font-bold text-rose-600 mt-1">⚠️ Hazard: ${cell.hazardType}</p>
            <p class="text-[10px] text-slate-500">Max Safe Speed: <b>${cell.recommendedSpeedKmh} km/h</b></p>
          </div>
        `;

        marker.bindPopup(popupContent);
        circle.bindPopup(popupContent);

        marker.on('click', () => setSelectedRainCell(cell));

        if (weatherCellsGroupRef.current) {
          weatherCellsGroupRef.current.addLayer(circle);
          weatherCellsGroupRef.current.addLayer(marker);
        }
      });
    }
  }, [showWeatherRadar, settings.isOfflineMode, offlineSimulate, mapType, mapVersion]);

  // Radar Animation playback frame effect
  useEffect(() => {
    let interval: any = null;
    if (isPlayingRadar && showWeatherRadar) {
      interval = setInterval(() => {
        setRadarFrameIndex((prev) => (prev + 1) % 5);
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingRadar, showWeatherRadar]);

  // Cursor crosshair when measuring distance
  useEffect(() => {
    if (!mapRef.current) return;
    const container = mapRef.current.getContainer();
    if (isMeasuringDistance) {
      container.style.cursor = 'crosshair';
    } else {
      container.style.cursor = '';
    }
  }, [isMeasuringDistance]);

  // Render Measure Distance layer on map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!measureGroupRef.current) {
      measureGroupRef.current = L.layerGroup().addTo(mapRef.current);
    } else {
      measureGroupRef.current.clearLayers();
    }

    if (measurePoints.length === 0) return;

    const latLngs = measurePoints.map(p => L.latLng(p.lat, p.lng));

    // Draw dashed polyline
    if (latLngs.length > 1) {
      const line = L.polyline(latLngs, {
        color: '#8b5cf6', // Violet 500
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.95,
      });
      line.addTo(measureGroupRef.current);
    }

    // Render waypoint markers and distance tooltips
    let cumulativeMeters = 0;
    measurePoints.forEach((pt, index) => {
      let segmentMeters = 0;
      if (index > 0) {
        const prev = measurePoints[index - 1];
        segmentMeters = computeDistanceMeters(prev.lat, prev.lng, pt.lat, pt.lng);
        cumulativeMeters += segmentMeters;
      }

      const isStart = index === 0;
      const isEnd = index === measurePoints.length - 1;

      const markerHtml = `
        <div class="relative flex flex-col items-center cursor-pointer">
          <div class="w-7 h-7 rounded-full ${
            isStart ? 'bg-emerald-600' : isEnd ? 'bg-violet-600' : 'bg-slate-900'
          } text-white font-extrabold text-[11px] flex items-center justify-center border-2 border-white shadow-xl">
            ${index + 1}
          </div>
          <div class="mt-1 bg-slate-900/95 text-white font-mono text-[9px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap border border-slate-700">
            ${
              isStart
                ? '📍 Start Point'
                : `+${(segmentMeters / 1000).toFixed(2)} km (${(cumulativeMeters / 1000).toFixed(2)} km total)`
            }
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: markerHtml,
        className: 'measure-point-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([pt.lat, pt.lng], { icon });
      measureGroupRef.current?.addLayer(marker);
    });
  }, [measurePoints]);

  const getMeasureTotals = () => {
    let totalMeters = 0;
    for (let i = 1; i < measurePoints.length; i++) {
      totalMeters += computeDistanceMeters(
        measurePoints[i - 1].lat,
        measurePoints[i - 1].lng,
        measurePoints[i].lat,
        measurePoints[i].lng
      );
    }
    const km = totalMeters / 1000;
    const miles = km * 0.621371;
    const nauticalMiles = km * 0.539957;
    return { meters: totalMeters, km, miles, nauticalMiles };
  };

  // 3. Handle FlyTo Selected Vehicle
  useEffect(() => {
    if (!mapRef.current || !selectedVehicle) return;
    mapRef.current.flyTo(
      [selectedVehicle.location.lat, selectedVehicle.location.lng],
      15,
      { animate: true, duration: 1.5 }
    );
  }, [selectedVehicle]);

  // 4. Render Vehicles and Markers (with Clustering)
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    // Clear previous markers
    markersGroupRef.current.clearLayers();

    const zoom = mapRef.current.getZoom();
    const shouldCluster = enableClustering && zoom < 15;

    let displayClusters: {
      id: string;
      isCluster: boolean;
      vehicles: Vehicle[];
      center: { lat: number; lng: number };
    }[] = [];

    if (shouldCluster) {
      const assigned = new Set<string>();
      const radius = 65; // pixels for cluster detection

      // Separate the selected vehicle if any, to guarantee it remains individual
      const clusterableVehicles = selectedVehicle 
        ? vehicles.filter(v => v.id !== selectedVehicle.id) 
        : vehicles;

      clusterableVehicles.forEach((v) => {
        if (assigned.has(v.id)) return;

        let vPoint: L.Point;
        try {
          vPoint = mapRef.current!.latLngToLayerPoint([v.location.lat, v.location.lng]);
        } catch (e) {
          vPoint = L.point(0, 0);
        }

        const clusterVehicles = [v];
        assigned.add(v.id);

        clusterableVehicles.forEach((other) => {
          if (assigned.has(other.id)) return;
          
          let otherPoint: L.Point;
          try {
            otherPoint = mapRef.current!.latLngToLayerPoint([other.location.lat, other.location.lng]);
          } catch (e) {
            otherPoint = L.point(0, 0);
          }

          const distance = vPoint.distanceTo(otherPoint);
          if (distance < radius) {
            clusterVehicles.push(other);
            assigned.add(other.id);
          }
        });

        const sumLat = clusterVehicles.reduce((sum, item) => sum + item.location.lat, 0);
        const sumLng = clusterVehicles.reduce((sum, item) => sum + item.location.lng, 0);
        const center = {
          lat: sumLat / clusterVehicles.length,
          lng: sumLng / clusterVehicles.length,
        };

        displayClusters.push({
          id: clusterVehicles.length === 1 ? clusterVehicles[0].id : `cluster-${v.id}`,
          isCluster: clusterVehicles.length > 1,
          vehicles: clusterVehicles,
          center,
        });
      });

      // Always render selected vehicle individually
      if (selectedVehicle) {
        displayClusters.push({
          id: selectedVehicle.id,
          isCluster: false,
          vehicles: [selectedVehicle],
          center: { lat: selectedVehicle.location.lat, lng: selectedVehicle.location.lng },
        });
      }
    } else {
      // No clustering
      displayClusters = vehicles.map((v) => ({
        id: v.id,
        isCluster: false,
        vehicles: [v],
        center: { lat: v.location.lat, lng: v.location.lng },
      }));
    }

    displayClusters.forEach((cluster) => {
      if (!cluster.isCluster) {
        const vehicle = cluster.vehicles[0];
        const isActive = vehicle.status === 'active';
        const isSelected = selectedVehicle?.id === vehicle.id;

        // Select icon type
        let typeLabel = '🚚';
        if (vehicle.type === 'Van') typeLabel = '🚐';
        else if (vehicle.type === 'Sedan') typeLabel = '🚗';
        else if (vehicle.type === 'SUV') typeLabel = '🚘';
        else if (vehicle.type === 'Motorcycle') typeLabel = '🏍️';

        const customDiv = L.divIcon({
          className: 'custom-vehicle-icon',
          html: `
            <div class="relative flex flex-col items-center">
              <!-- Ripple Pulse for Active Vehicles -->
              ${
                isActive
                  ? `<div class="absolute -top-1 w-10 h-10 bg-[${vehicle.iconColor}] opacity-30 rounded-full animate-ping"></div>`
                  : ''
              }
              
              <!-- Vehicle Pin -->
              <div class="w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                isSelected ? 'ring-4 ring-white border-2 border-slate-900 scale-125 z-50' : 'ring-2 ring-white'
              }" 
                style="background-color: ${vehicle.iconColor}; transform: rotate(${vehicle.bearing}deg);"
              >
                <!-- Inside of rotated icon: counter-rotate text so emoji is upright or rotate direct -->
                <span class="text-lg" style="transform: rotate(${-vehicle.bearing}deg); display: inline-block;">
                  ${typeLabel}
                </span>
              </div>

              <!-- Direction Indicator Arrow -->
              <div class="absolute -top-2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] transition-all duration-300"
                style="border-b-color: ${vehicle.iconColor};"
              ></div>

              <!-- Vehicle Label -->
              <div class="mt-1 bg-slate-900/90 text-white font-medium text-[10px] px-1.5 py-0.5 rounded shadow whitespace-nowrap z-40">
                ${vehicle.name.split(' ').slice(-1)[0]} <span class="font-bold text-rose-300">${vehicle.speed} km/h</span>
              </div>
            </div>
          `,
          iconSize: [40, 60],
          iconAnchor: [20, 30],
        });

        const marker = L.marker([vehicle.location.lat, vehicle.location.lng], {
          icon: customDiv,
        });

        // Bind simple popup
        marker.bindPopup(`
          <div class="p-1 font-sans">
            <h3 class="font-semibold text-sm text-slate-900 mb-1">${vehicle.name}</h3>
            <div class="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-slate-600">
              <span>License:</span> <span class="font-medium text-slate-800">${vehicle.licensePlate}</span>
              <span>Driver:</span> <span class="font-medium text-slate-800">${vehicle.driverName}</span>
              <span>Speed:</span> <span class="font-medium text-rose-600 font-bold">${vehicle.speed} km/h</span>
              <span>Fuel:</span> <span class="font-medium text-slate-800">${vehicle.fuelLevel}%</span>
              <span>Battery:</span> <span class="font-medium text-slate-800">${vehicle.batteryPercent}%</span>
              <span>Status:</span> <span class="uppercase font-semibold text-[10px] tracking-wide" style="color: ${vehicle.iconColor}">${vehicle.status}</span>
            </div>
          </div>
        `);

        marker.on('click', () => {
          onVehicleClick(vehicle);
        });

        markersGroupRef.current?.addLayer(marker);
      } else {
        const count = cluster.vehicles.length;
        const activeVehicles = cluster.vehicles.filter(v => v.status === 'active');
        const hasActive = activeVehicles.length > 0;

        const clusterDiv = L.divIcon({
          className: 'custom-cluster-icon',
          html: `
            <div class="relative flex flex-col items-center justify-center">
              ${
                hasActive 
                  ? `<div class="absolute w-12 h-12 bg-indigo-500/20 rounded-full animate-ping" style="animation-duration: 2.5s;"></div>` 
                  : ''
              }
              
              <div class="w-10 h-10 rounded-full bg-slate-900 border-2 border-indigo-400 flex flex-col items-center justify-center shadow-xl z-10 transition-all duration-300 hover:scale-115 cursor-pointer">
                <span class="text-xs font-black text-white leading-none">${count}</span>
                <span class="text-[7px] font-bold text-indigo-300 uppercase tracking-wider mt-0.5">Assets</span>
              </div>
              
              <div class="absolute -bottom-6 bg-slate-900/90 text-[8px] font-extrabold text-white px-1.5 py-0.5 rounded shadow whitespace-nowrap border border-slate-700 z-20 flex items-center gap-0.5">
                ${cluster.vehicles.slice(0, 3).map(v => v.type === 'Truck' ? '🚚' : v.type === 'Van' ? '🚐' : v.type === 'Sedan' ? '🚗' : v.type === 'SUV' ? '🚘' : '🏍️').join('')}
                ${count > 3 ? '<span class="text-indigo-300 font-black">+</span>' : ''}
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([cluster.center.lat, cluster.center.lng], {
          icon: clusterDiv,
        });

        const vehicleRowsHtml = cluster.vehicles.map(v => `
          <div class="flex items-center justify-between py-1 border-b border-slate-100 last:border-0 text-[11px]">
            <div class="flex items-center gap-1.5">
              <span>${v.type === 'Truck' ? '🚚' : v.type === 'Van' ? '🚐' : v.type === 'Sedan' ? '🚗' : v.type === 'SUV' ? '🚘' : '🏍️'}</span>
              <span class="font-bold text-slate-800">${v.name.split(' ').slice(-1)[0]}</span>
            </div>
            <div class="flex items-center gap-1.5 font-mono">
              <span class="text-[9px] font-medium text-slate-500">${v.speed} km/h</span>
              <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${v.iconColor};"></span>
            </div>
          </div>
        `).join('');

        marker.bindPopup(`
          <div class="p-1 font-sans w-52">
            <div class="border-b border-slate-100 pb-1.5 mb-1.5">
              <h4 class="font-extrabold text-xs text-indigo-700 uppercase tracking-tight flex items-center gap-1.5">
                <span>📍</span> Dense Cluster (${count} vehicles)
              </h4>
              <p class="text-[9px] text-slate-400 font-medium">Zooming in or clicking will spread the assets</p>
            </div>
            <div class="max-h-32 overflow-y-auto space-y-0.5 pr-1">
              ${vehicleRowsHtml}
            </div>
            <div class="mt-2.5 pt-1.5 border-t border-slate-100 flex justify-end">
              <span class="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Click Marker to Zoom Fit</span>
            </div>
          </div>
        `);

        marker.on('click', () => {
          if (!mapRef.current) return;
          const latLngs = cluster.vehicles.map(v => L.latLng(v.location.lat, v.location.lng));
          const bounds = L.latLngBounds(latLngs);
          
          if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
            mapRef.current.setView(cluster.center, mapRef.current.getZoom() + 2);
          } else {
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          }
        });

        markersGroupRef.current?.addLayer(marker);
      }
    });
  }, [vehicles, selectedVehicle, onVehicleClick, enableClustering, mapVersion]);

  // 5. Render Geofences
  useEffect(() => {
    if (!mapRef.current || !geofencesGroupRef.current) return;

    geofencesGroupRef.current.clearLayers();

    if (!settings.showGeofences) return;

    geofences.forEach((fence) => {
      if (!fence.active) return;

      const circle = L.circle([fence.lat, fence.lng], {
        radius: fence.radius,
        color: '#F43F5E', // Rose 500
        fillColor: '#FDA4AF', // Rose 300
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: '5, 5',
      });

      circle.bindPopup(`
        <div class="p-1 font-sans">
          <div class="flex items-center gap-1 text-rose-600 font-semibold text-sm mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Active Geofence Alert</span>
          </div>
          <p class="font-semibold text-xs text-slate-800">${fence.name}</p>
          <p class="text-[10px] text-slate-500">Radius: ${(fence.radius / 1000).toFixed(1)} km</p>
        </div>
      `);

      geofencesGroupRef.current?.addLayer(circle);
    });
  }, [geofences, settings.showGeofences]);

  // 6. Render Location History Polyline
  useEffect(() => {
    if (!mapRef.current || !historyGroupRef.current) return;

    historyGroupRef.current.clearLayers();

    if (!historyPoints || historyPoints.length < 2) return;

    const latLngs = historyPoints.map((pt) => [pt.lat, pt.lng] as L.LatLngTuple);

    // Draw route polyline
    const polyline = L.polyline(latLngs, {
      color: '#6366F1', // Indigo 500
      weight: 4,
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round',
    });

    polyline.addTo(historyGroupRef.current);

    // Start & End markers
    const startPoint = latLngs[0];
    const endPoint = latLngs[latLngs.length - 1];

    const startIcon = L.divIcon({
      className: 'history-start-marker',
      html: `<div class="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow flex items-center justify-center text-[8px] text-white font-bold">S</div>`,
      iconSize: [16, 16],
    });

    const endIcon = L.divIcon({
      className: 'history-end-marker',
      html: `<div class="w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow flex items-center justify-center text-[8px] text-white font-bold">E</div>`,
      iconSize: [16, 16],
    });

    L.marker(startPoint, { icon: startIcon }).addTo(historyGroupRef.current).bindPopup('History Path Start');
    L.marker(endPoint, { icon: endIcon }).addTo(historyGroupRef.current).bindPopup('History Path End');

    // Zoom path into bounds
    const bounds = L.latLngBounds(latLngs);
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  }, [historyPoints]);

  // --- HANDLER: ZOOM TO FIT BOUNDS & QUICK REGION PRESETS ---
  const handleZoomToFit = (target: 'all' | 'vehicles' | 'geofences' | 'history' | 'selected' = 'all') => {
    if (!mapRef.current) return;

    if (target === 'selected' && selectedVehicle) {
      mapRef.current.flyTo([selectedVehicle.location.lat, selectedVehicle.location.lng], 15, { animate: true, duration: 1.2 });
      setShowZoomMenu(false);
      return;
    }

    const points: L.LatLng[] = [];

    if (target === 'all' || target === 'vehicles') {
      vehicles.forEach(v => {
        if (v.location?.lat && v.location?.lng) {
          points.push(L.latLng(v.location.lat, v.location.lng));
        }
      });
    }

    if (target === 'all' || target === 'geofences') {
      geofences.forEach(g => {
        if (g.lat && g.lng) {
          points.push(L.latLng(g.lat, g.lng));
          // Estimate bounding box padding for geofence radius
          const radDeg = (g.radius || 1000) / 111000;
          points.push(L.latLng(g.lat + radDeg, g.lng + radDeg));
          points.push(L.latLng(g.lat - radDeg, g.lng - radDeg));
        }
      });
    }

    if ((target === 'all' || target === 'history') && historyPoints && historyPoints.length > 0) {
      historyPoints.forEach(hp => {
        points.push(L.latLng(hp.lat, hp.lng));
      });
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
    setShowZoomMenu(false);
  };

  const handleQuickZoomPreset = (region: 'kl' | 'north' | 'port_klang' | 'peninsular') => {
    if (!mapRef.current) return;
    if (region === 'kl') {
      mapRef.current.flyTo([3.1390, 101.6869], 12, { animate: true, duration: 1.2 });
    } else if (region === 'north') {
      mapRef.current.flyTo([4.5975, 101.0901], 10, { animate: true, duration: 1.2 });
    } else if (region === 'port_klang') {
      mapRef.current.flyTo([2.9900, 101.3500], 13, { animate: true, duration: 1.2 });
    } else if (region === 'peninsular') {
      mapRef.current.flyTo([4.2105, 101.9758], 7, { animate: true, duration: 1.2 });
    }
    setShowZoomMenu(false);
  };

  // --- HANDLER: EXPORT MAP STATE ---
  const getMapStateData = () => {
    const map = mapRef.current;
    const center = map ? map.getCenter() : { lat: 3.0, lng: 101.65 };
    const zoom = map ? map.getZoom() : 11;
    const bounds = map ? map.getBounds() : null;

    return {
      appName: 'Malaysia Fleet Digital Command Desk',
      exportedAt: new Date().toISOString(),
      mapViewport: {
        center: {
          lat: Number(center.lat.toFixed(6)),
          lng: Number(center.lng.toFixed(6)),
        },
        zoomLevel: zoom,
        bounds: bounds ? {
          northEast: { lat: Number(bounds.getNorthEast().lat.toFixed(6)), lng: Number(bounds.getNorthEast().lng.toFixed(6)) },
          southWest: { lat: Number(bounds.getSouthWest().lat.toFixed(6)), lng: Number(bounds.getSouthWest().lng.toFixed(6)) },
        } : null,
      },
      mapConfiguration: {
        activeTileLayer: mapType,
        showTraffic: settings.showTraffic,
        showGeofences: settings.showGeofences,
        isOfflineMode: settings.isOfflineMode || offlineSimulate,
        enableClustering,
        autoPositionUpdates: settings.autoPositionUpdates,
      },
      assetMetrics: {
        totalVehiclesCount: vehicles.length,
        activeVehiclesCount: vehicles.filter(v => v.status === 'active').length,
        totalGeofencesCount: geofences.length,
        activeGeofencesCount: geofences.filter(g => g.active).length,
      },
      vehicles: vehicles.map(v => ({
        id: v.id,
        name: v.name,
        type: v.type,
        licensePlate: v.licensePlate,
        status: v.status,
        speedKmh: v.speed,
        fuelPercent: v.fuelLevel,
        batteryPercent: v.batteryPercent,
        location: { lat: v.location.lat, lng: v.location.lng },
        driverName: v.driverName,
      })),
      geofences: geofences.map(g => ({
        id: g.id,
        name: g.name,
        type: g.type,
        active: g.active,
        lat: g.lat,
        lng: g.lng,
        radiusMeters: g.radius,
      })),
    };
  };

  const handleExportMapStateJson = () => {
    const data = getMapStateData();
    downloadFile(JSON.stringify(data, null, 2), `fleet_map_state_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  };

  const handleCopyMapStateJson = () => {
    const data = getMapStateData();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  // --- HANDLER: EXPORT GEOFENCES ---
  const handleExportGeofencesGeoJson = () => {
    const geoJson = {
      type: 'FeatureCollection',
      exportedAt: new Date().toISOString(),
      features: geofences.map(g => ({
        type: 'Feature',
        id: g.id,
        geometry: {
          type: 'Point',
          coordinates: [g.lng, g.lat],
        },
        properties: {
          id: g.id,
          name: g.name,
          radiusMeters: g.radius,
          radiusKm: Number((g.radius / 1000).toFixed(2)),
          type: g.type,
          active: g.active,
        },
      })),
    };
    downloadFile(JSON.stringify(geoJson, null, 2), `fleet_geofences_${new Date().toISOString().slice(0, 10)}.geojson`, 'application/geo+json');
  };

  const handleExportGeofencesCsv = () => {
    const headers = ['id', 'name', 'latitude', 'longitude', 'radius_meters', 'radius_km', 'type', 'active'];
    const rows = geofences.map(g => [
      `"${g.id}"`,
      `"${g.name.replace(/"/g, '""')}"`,
      g.lat,
      g.lng,
      g.radius,
      (g.radius / 1000).toFixed(2),
      `"${g.type}"`,
      g.active ? 'true' : 'false'
    ]);
    const csvStr = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvStr, `fleet_geofences_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  };

  const handleCopyGeofenceGeoJson = () => {
    const geoJson = {
      type: 'FeatureCollection',
      features: geofences.map(g => ({
        type: 'Feature',
        id: g.id,
        geometry: {
          type: 'Point',
          coordinates: [g.lng, g.lat],
        },
        properties: {
          id: g.id,
          name: g.name,
          radiusMeters: g.radius,
          type: g.type,
          active: g.active,
        },
      })),
    };
    navigator.clipboard.writeText(JSON.stringify(geoJson, null, 2));
    setCopiedGeofence(true);
    setTimeout(() => setCopiedGeofence(false), 2000);
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner bg-slate-100 flex flex-col">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full flex-1 z-10" id="live-fleet-map"></div>

      {/* Floating Header Banner */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 max-w-sm sm:max-w-md pointer-events-none">
        <div className="bg-slate-900/90 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 backdrop-blur pointer-events-auto">
          <div className="p-1.5 rounded-lg bg-rose-600 animate-pulse">
            <Navigation className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm tracking-wide">MALAYSIA LOGISTICS DESK</h2>
              <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
                <Wifi className="w-2.5 h-2.5" /> LIVE FEED
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Central Coord: {selectedVehicle ? `${selectedVehicle.location.lat.toFixed(4)}, ${selectedVehicle.location.lng.toFixed(4)}` : 'Kuala Lumpur'}
            </p>
          </div>
        </div>

        {/* Drawing Alert */}
        {isDrawingGeofence && (
          <div className="bg-rose-500 text-white px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold backdrop-blur pointer-events-auto border border-rose-400 animate-bounce">
            <ShieldAlert className="w-4 h-4" />
            <span>Click anywhere on the map to define geofence center</span>
          </div>
        )}

        {/* Offline cache status */}
        {(settings.isOfflineMode || offlineSimulate) && (
          <div className="bg-amber-600/90 text-white px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold backdrop-blur pointer-events-auto border border-amber-500">
            <WifiOff className="w-4 h-4" />
            <span>Offline Map Active (Simulated Caching - OSM Fallback)</span>
          </div>
        )}
      </div>

      {/* Traffic Overlay Legend (visible when Traffic is active) */}
      {settings.showTraffic && (
        <div className="absolute bottom-6 left-4 z-20 bg-slate-950/90 text-white p-3 rounded-2xl shadow-2xl border border-rose-500/30 backdrop-blur text-xs space-y-2 pointer-events-auto animate-fade-in">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span className="font-extrabold text-[10px] text-rose-300 uppercase tracking-wider flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-rose-400" /> Real-time Traffic Overlay
              </span>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings && onUpdateSettings({ showTraffic: false })}
              className="text-slate-400 hover:text-white text-[10px] font-bold cursor-pointer"
            >
              Turn Off
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Smooth (&gt;60 km/h)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Moderate (30-60)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Heavy (&lt;30 km/h)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-950 border border-rose-500"></span>
              <span>Port Gate Queue</span>
            </div>
          </div>
        </div>
      )}

      {/* Real-Time Weather Radar & Route Hazard HUD Panel */}
      {showWeatherRadar && (
        <div className="absolute bottom-6 left-4 z-20 max-w-sm sm:max-w-md w-full bg-slate-950/95 text-white p-4 rounded-3xl shadow-2xl border border-cyan-500/40 backdrop-blur-md space-y-3 pointer-events-auto animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
                <CloudRain className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-cyan-300 tracking-wide uppercase flex items-center gap-1.5">
                  Precipitation Radar & Hazard Layer
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">
                  Peninsular Malaysia Doppler Weather Radar
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowWeatherHud(!showWeatherHud)}
              className="text-slate-400 hover:text-white text-[10px] font-bold px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-800 transition cursor-pointer"
            >
              {showWeatherHud ? 'Collapse HUD' : 'Expand Radar'}
            </button>
          </div>

          {showWeatherHud && (
            <>
              {/* Precipitation Intensity Spectrum Legend */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-300">
                  <span>Precipitation Spectrum</span>
                  <span className="font-mono text-cyan-400">RainViewer Radar Cache</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[9px] font-bold text-center">
                  <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 py-1 rounded-lg">
                    🟢 Light (&lt;5mm/h)
                  </div>
                  <div className="bg-amber-500/20 text-amber-300 border border-amber-500/40 py-1 rounded-lg">
                    🟡 Moderate (5-25)
                  </div>
                  <div className="bg-orange-500/20 text-orange-300 border border-orange-500/40 py-1 rounded-lg">
                    🟠 Heavy (25-50)
                  </div>
                  <div className="bg-rose-500/20 text-rose-300 border border-rose-500/40 py-1 rounded-lg">
                    🔴 Torrential (&gt;50)
                  </div>
                </div>
              </div>

              {/* Time-Lapse Frame Controls */}
              <div className="bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlayingRadar(!isPlayingRadar)}
                  className={`p-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    isPlayingRadar ? 'bg-amber-500 text-white' : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                  }`}
                >
                  {isPlayingRadar ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span className="text-[10px]">{isPlayingRadar ? 'Pause Loop' : 'Play Loop'}</span>
                </button>

                <div className="flex items-center gap-1 overflow-x-auto">
                  {['-45m', '-30m', '-15m', 'LIVE NOW', '+15m FCST'].map((frame, idx) => (
                    <button
                      key={frame}
                      type="button"
                      onClick={() => setRadarFrameIndex(idx)}
                      className={`px-2 py-1 rounded-lg text-[9px] font-bold transition cursor-pointer shrink-0 ${
                        radarFrameIndex === idx
                          ? 'bg-cyan-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {frame}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fleet Hazard Cross-Analysis Assessment */}
              {(() => {
                const affectedVehicles = vehicles.map((v) => {
                  const cell = LIVE_RAIN_CELLS.find((c) => {
                    const dist = computeDistanceMeters(v.location.lat, v.location.lng, c.lat, c.lng);
                    return dist <= c.radiusMeters;
                  });
                  return { vehicle: v, cell };
                }).filter((item) => item.cell !== undefined);

                return (
                  <div className="space-y-1.5 pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Fleet Route Hazards ({affectedVehicles.length})
                      </span>
                      <span className="text-slate-400 font-mono">
                        {affectedVehicles.length > 0 ? `${affectedVehicles.length} Vehicles Under Rain` : 'All Routes Clear'}
                      </span>
                    </div>

                    {affectedVehicles.length === 0 ? (
                      <p className="text-[10px] text-emerald-400 font-medium bg-emerald-950/40 p-2 rounded-xl border border-emerald-900/50">
                        ✓ No active fleet assets detected inside heavy precipitation cells.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {affectedVehicles.map(({ vehicle, cell }) => {
                          const isSpeedingInRain = vehicle.speed > (cell?.recommendedSpeedKmh || 50);

                          return (
                            <div
                              key={vehicle.id}
                              className={`p-2 rounded-xl border text-[10px] flex items-center justify-between gap-2 transition ${
                                isSpeedingInRain
                                  ? 'bg-rose-950/60 border-rose-600/60 text-rose-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-200'
                              }`}
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-1.5 font-bold truncate">
                                  <span className="text-white font-black">{vehicle.name}</span>
                                  <span className="font-mono text-[9px] text-cyan-300">({vehicle.speed} km/h)</span>
                                </div>
                                <p className="text-[9px] text-slate-400 truncate">
                                  Zone: {cell?.name} ({cell?.precipitationMmHour} mm/h)
                                </p>
                                {isSpeedingInRain && (
                                  <span className="inline-block text-[8px] font-black text-rose-400 bg-rose-500/20 px-1.5 py-0.2 rounded border border-rose-500/40 uppercase">
                                    ⚠️ Aquaplaning Hazard: Exceeds {cell?.recommendedSpeedKmh} km/h limit
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => onVehicleClick(vehicle)}
                                className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-lg text-[9px] shrink-0 cursor-pointer shadow-sm"
                              >
                                Focus
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* FLOATING HUD OVERLAYS */}
      {/* 1. Measure Distance Tool HUD Panel */}
      {(isMeasuringDistance || measurePoints.length > 0) && (
        <div className="absolute top-4 left-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-3xl border border-slate-800 shadow-2xl max-w-sm w-full space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-violet-500/20 text-violet-400 rounded-xl border border-violet-500/30">
                <Ruler className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-violet-300 uppercase tracking-wider">
                  Measure Distance Tool
                </h4>
                <p className="text-[10px] text-slate-400">Click points on map to measure linear path length</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsMeasuringDistance(false);
                setMeasurePoints([]);
              }}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cumulative Totals Display */}
          {(() => {
            const totals = getMeasureTotals();
            return (
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Path Distance</div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-violet-400 font-mono">
                    {totals.km.toFixed(2)} <span className="text-xs font-bold text-slate-300">km</span>
                  </span>
                  <div className="text-right text-[10px] font-mono text-slate-400 space-x-2">
                    <span>{totals.miles.toFixed(2)} mi</span>
                    <span>•</span>
                    <span>{totals.nauticalMiles.toFixed(2)} NM</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Waypoints List */}
          {measurePoints.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Waypoints ({measurePoints.length})
              </div>
              {measurePoints.map((pt, idx) => {
                let seg = 0;
                if (idx > 0) {
                  seg = computeDistanceMeters(
                    measurePoints[idx - 1].lat,
                    measurePoints[idx - 1].lng,
                    pt.lat,
                    pt.lng
                  ) / 1000;
                }
                return (
                  <div key={idx} className="flex items-center justify-between text-[10px] bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800/60 font-mono">
                    <span className="text-slate-300 font-bold">Point {idx + 1}</span>
                    <span className="text-slate-400">
                      {idx === 0 ? 'Start' : `+${seg.toFixed(2)} km`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setMeasurePoints(prev => prev.slice(0, -1))}
              disabled={measurePoints.length === 0}
              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Undo
            </button>
            <button
              type="button"
              onClick={() => setMeasurePoints([])}
              disabled={measurePoints.length === 0}
              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Clear
            </button>
            <button
              type="button"
              onClick={() => setIsMeasuringDistance(!isMeasuringDistance)}
              className={`py-1.5 px-3 rounded-xl text-[11px] font-extrabold transition cursor-pointer ${
                isMeasuringDistance ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isMeasuringDistance ? 'Measuring Active' : 'Add Points'}
            </button>
          </div>
        </div>
      )}

      {/* 2. Live Traffic Overlay Legend HUD */}
      {settings.showTraffic && (
        <div className="absolute bottom-6 left-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-800 shadow-2xl max-w-xs w-full space-y-2 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-extrabold text-xs text-rose-300">
              <Gauge className="w-4 h-4 text-rose-400" />
              <span>Real-Time Traffic Flow Layer</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/80">
              ● Live Feed
            </span>
          </div>

          <p className="text-[10px] text-slate-400">Google Live Highway Congestion Speeds:</p>

          <div className="grid grid-cols-2 gap-1.5 text-[9px] font-bold">
            <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-800/60 p-1.5 rounded-xl text-emerald-200">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span>Smooth (&gt;80 km/h)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-950/60 border border-amber-800/60 p-1.5 rounded-xl text-amber-200">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <span>Moderate (40-80)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-800/60 p-1.5 rounded-xl text-rose-200">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
              <span>Heavy (15-40 km/h)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-rose-950/90 border border-rose-600/80 p-1.5 rounded-xl text-rose-100">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-900 shrink-0 border border-white"></span>
              <span>Standstill (&lt;15 km/h)</span>
            </div>
          </div>
        </div>
      )}

      {/* Map controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Quick Zoom In / Zoom Out Controls */}
        <div className="flex flex-col bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <button
            id="btn-quick-zoom-in"
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            className="p-2.5 hover:bg-slate-100 text-slate-800 transition cursor-pointer border-b border-slate-100 flex items-center justify-center"
            title="Zoom In"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            id="btn-quick-zoom-out"
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="p-2.5 hover:bg-slate-100 text-slate-800 transition cursor-pointer flex items-center justify-center"
            title="Zoom Out"
          >
            <Minus className="w-5 h-5" />
          </button>
        </div>

        {/* Measure Distance Tool Toggle Button */}
        <button
          id="btn-measure-distance"
          type="button"
          onClick={() => {
            setIsMeasuringDistance(!isMeasuringDistance);
          }}
          className={`p-2.5 rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center border cursor-pointer ${
            isMeasuringDistance
              ? 'bg-violet-600 text-white border-violet-700 shadow-md ring-2 ring-violet-300 animate-pulse'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-100'
          }`}
          title={isMeasuringDistance ? "Measuring Active - Click map to add points" : "Measure Distance Tool"}
        >
          <Ruler className="w-5 h-5" />
        </button>

        {/* Layer Selector */}
        <div className="relative">
          <button
            id="btn-map-layers"
            onClick={() => { setShowLayerMenu(!showLayerMenu); setShowZoomMenu(false); }}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center border border-slate-100 cursor-pointer"
            title="Map Layers"
          >
            <Layers className="w-5 h-5" />
          </button>
          
          {showLayerMenu && (
            <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-2xl p-2 border border-slate-100 w-44 flex flex-col gap-1 z-30">
              <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">Free Google Layers</p>
              <button
                id="layer-google-road"
                onClick={() => { setMapType('google_road'); setShowLayerMenu(false); }}
                className={`text-left px-3 py-1.5 text-xs rounded-lg transition-all font-medium cursor-pointer ${
                  mapType === 'google_road' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Google Road Map
              </button>
              <button
                id="layer-google-sat"
                onClick={() => { setMapType('google_satellite'); setShowLayerMenu(false); }}
                className={`text-left px-3 py-1.5 text-xs rounded-lg transition-all font-medium cursor-pointer ${
                  mapType === 'google_satellite' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Google Satellite
              </button>
              <button
                id="layer-google-hybrid"
                onClick={() => { setMapType('google_hybrid'); setShowLayerMenu(false); }}
                className={`text-left px-3 py-1.5 text-xs rounded-lg transition-all font-medium cursor-pointer ${
                  mapType === 'google_hybrid' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Google Hybrid
              </button>
              <p className="text-[10px] font-bold text-slate-400 px-2 py-1 mt-1 border-t border-slate-100 uppercase tracking-wider">Open Source Fallback</p>
              <button
                id="layer-osm"
                onClick={() => { setMapType('osm'); setShowLayerMenu(false); }}
                className={`text-left px-3 py-1.5 text-xs rounded-lg transition-all font-medium cursor-pointer ${
                  mapType === 'osm' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                OpenStreetMap
              </button>
            </div>
          )}
        </div>

        {/* Zoom Fit Bounds with Menu & Regional Presets */}
        <div className="relative">
          <button
            id="btn-zoom-fit"
            onClick={() => handleZoomToFit('all')}
            onContextMenu={(e) => { e.preventDefault(); setShowZoomMenu(!showZoomMenu); }}
            className="p-2.5 bg-white hover:bg-slate-50 text-indigo-700 rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center border border-slate-100 cursor-pointer"
            title="Zoom To Fit All Assets & Geofences (Right click or click for menu)"
          >
            <Maximize2 className="w-5 h-5" />
          </button>

          {showZoomMenu && (
            <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-2xl p-2 border border-slate-100 w-52 flex flex-col gap-1 z-30">
              <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">Zoom To Fit Options</p>
              <button
                onClick={() => handleZoomToFit('all')}
                className="text-left px-3 py-1.5 text-xs rounded-lg hover:bg-indigo-50 text-slate-800 font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600" /> Fit All Assets &amp; Geofences
              </button>
              <button
                onClick={() => handleZoomToFit('vehicles')}
                className="text-left px-3 py-1.5 text-xs rounded-lg hover:bg-indigo-50 text-slate-800 font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5 text-rose-500" /> Fit Fleet Vehicles Only
              </button>
              <button
                onClick={() => handleZoomToFit('geofences')}
                className="text-left px-3 py-1.5 text-xs rounded-lg hover:bg-indigo-50 text-slate-800 font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Fit Geofence Zones
              </button>
              {selectedVehicle && (
                <button
                  onClick={() => handleZoomToFit('selected')}
                  className="text-left px-3 py-1.5 text-xs rounded-lg hover:bg-indigo-50 text-slate-800 font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Focus Selected Vehicle
                </button>
              )}

              <p className="text-[10px] font-bold text-slate-400 px-2 py-1 mt-1 border-t border-slate-100 uppercase tracking-wider">Quick Region Presets</p>
              <button
                onClick={() => handleQuickZoomPreset('kl')}
                className="text-left px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 text-slate-700 font-medium transition cursor-pointer"
              >
                📍 Greater Klang Valley &amp; KL
              </button>
              <button
                onClick={() => handleQuickZoomPreset('port_klang')}
                className="text-left px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 text-slate-700 font-medium transition cursor-pointer"
              >
                🚢 Port Klang Cargo Gateway
              </button>
              <button
                onClick={() => handleQuickZoomPreset('north')}
                className="text-left px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 text-slate-700 font-medium transition cursor-pointer"
              >
                🛣️ Northern Highway Corridor
              </button>
              <button
                onClick={() => handleQuickZoomPreset('peninsular')}
                className="text-left px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 text-slate-700 font-medium transition cursor-pointer"
              >
                🇲🇾 Peninsular Malaysia Overview
              </button>
            </div>
          )}
        </div>

        {/* Toggle Live Traffic Overlay */}
        {onUpdateSettings && (
          <button
            id="btn-toggle-traffic"
            onClick={() => onUpdateSettings({ showTraffic: !settings.showTraffic })}
            className={`p-2.5 rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center border cursor-pointer ${
              settings.showTraffic 
                ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-300' 
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-100'
            }`}
            title={settings.showTraffic ? "Hide Real-Time Traffic Overlay" : "Show Real-Time Traffic Overlay"}
          >
            <Gauge className="w-5 h-5" />
          </button>
        )}

        {/* Toggle Real-Time Weather Radar & Precipitation Layer */}
        <button
          id="btn-toggle-weather"
          onClick={() => {
            const next = !showWeatherRadar;
            setShowWeatherRadar(next);
            if (onUpdateSettings) onUpdateSettings({ showWeather: next });
          }}
          className={`p-2.5 rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center border cursor-pointer ${
            showWeatherRadar 
              ? 'bg-cyan-600 text-white border-cyan-700 shadow-md ring-2 ring-cyan-300 animate-pulse' 
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-100'
          }`}
          title={showWeatherRadar ? "Hide Real-Time Weather Radar & Precipitation Density" : "Show Real-Time Weather Radar & Precipitation Density"}
        >
          <CloudRain className="w-5 h-5" />
        </button>

        {/* Export Map View State */}
        <button
          id="btn-export-map-state"
          onClick={() => setShowExportStateModal(true)}
          className="p-2.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center border border-slate-100 cursor-pointer"
          title="Export Map State Parameters"
        >
          <FileText className="w-5 h-5 text-indigo-600" />
        </button>

        {/* Export Geofences */}
        <button
          id="btn-export-geofences"
          onClick={() => setShowGeofenceExportModal(true)}
          className="p-2.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center border border-slate-100 cursor-pointer"
          title="Export Geofences (GeoJSON / CSV)"
        >
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
        </button>

        {/* Toggle Marker Clustering */}
        <button
          id="btn-toggle-clustering"
          onClick={() => setEnableClustering(!enableClustering)}
          className={`p-2.5 rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center border cursor-pointer ${
            enableClustering 
              ? 'bg-indigo-600 text-white border-indigo-700 font-bold' 
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-100'
          }`}
          title={enableClustering ? "Disable Marker Clustering" : "Enable Marker Clustering"}
        >
          <Grid className="w-5 h-5" />
        </button>

        {/* Toggle Simulated Offline */}
        <button
          id="btn-toggle-offline"
          onClick={() => setOfflineSimulate(!offlineSimulate)}
          className={`p-2.5 rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center border cursor-pointer ${
            offlineSimulate 
              ? 'bg-amber-500 text-white border-amber-600' 
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-100'
          }`}
          title={offlineSimulate ? "Simulate Online Map" : "Simulate Offline Map"}
        >
          {offlineSimulate ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
        </button>

        {/* Toggle Real-Time Position Updates */}
        {onUpdateSettings && (
          <button
            id="btn-map-toggle-auto-updates"
            onClick={() => onUpdateSettings({ autoPositionUpdates: !settings.autoPositionUpdates })}
            className={`p-2.5 rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center border cursor-pointer ${
              settings.autoPositionUpdates 
                ? 'bg-emerald-500 text-white border-emerald-600' 
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-100'
            }`}
            title={settings.autoPositionUpdates ? "Disable Automatic Position Updates" : "Enable Automatic Position Updates"}
          >
            <RefreshCw className={`w-5 h-5 ${settings.autoPositionUpdates ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          </button>
        )}
      </div>

      {/* --- MODAL 1: EXPORT MAP STATE --- */}
      {showExportStateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Map Viewport & System State Export</h3>
                  <p className="text-[11px] text-slate-500">Capture current zoom, bounds, layer config, and telemetry coordinates</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportStateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-[11px] max-h-64 overflow-y-auto space-y-1">
              <pre>{JSON.stringify(getMapStateData(), null, 2)}</pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleCopyMapStateJson}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedState ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiedState ? 'Copied to Clipboard!' : 'Copy JSON'}
              </button>

              <button
                type="button"
                onClick={handleExportMapStateJson}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" /> Download State JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: GEOFENCE EXPORT STUDIO --- */}
      {showGeofenceExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Geofence Data Export Studio</h3>
                  <p className="text-[11px] text-slate-500">Export active geofences in standard GeoJSON (GIS) or CSV spreadsheet formats</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGeofenceExportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">Configured Geofences ({geofences.length})</span>
              <div className="divide-y divide-slate-200/60 max-h-48 overflow-y-auto pr-1">
                {geofences.map(g => (
                  <div key={g.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{g.name}</span>
                      <span className="text-[10px] text-slate-500 block">
                        Lat: {g.lat.toFixed(4)}, Lng: {g.lng.toFixed(4)} • Radius: {(g.radius / 1000).toFixed(1)} km
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full ${g.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {g.active ? 'Active Zone' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyGeofenceGeoJson}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedGeofence ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiedGeofence ? 'Copied!' : 'Copy GeoJSON'}
              </button>

              <button
                type="button"
                onClick={handleExportGeofencesCsv}
                className="px-3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" /> Download CSV
              </button>

              <button
                type="button"
                onClick={handleExportGeofencesGeoJson}
                className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" /> Download GeoJSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map CSS Custom Style */}
      <style>{`
        .map-offline-grayscale {
          filter: grayscale(0.8) contrast(1.1) brightness(0.95);
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
          border: 1px solid #f1f5f9;
        }
        .leaflet-popup-tip {
          background: white;
        }
        .custom-vehicle-icon {
          transition: transform 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}
