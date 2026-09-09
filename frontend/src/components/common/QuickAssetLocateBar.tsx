import { useState, useRef, useEffect } from 'react';
import { Search, Truck, ShieldAlert, Smartphone, Boxes, User, MapPin, Navigation, ArrowRight, X } from 'lucide-react';
import { Vehicle, Geofence, GPSDevice, InventoryItem } from '../../types';

interface QuickAssetLocateBarProps {
  vehicles: Vehicle[];
  geofences: Geofence[];
  devices?: GPSDevice[];
  inventory?: InventoryItem[];
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onSelectGeofence?: (geofence: Geofence) => void;
  onFocusCoordinates?: (lat: number, lng: number, zoom?: number, name?: string) => void;
}

export default function QuickAssetLocateBar({
  vehicles,
  geofences,
  devices = [],
  inventory = [],
  onSelectVehicle,
  onSelectGeofence,
  onFocusCoordinates,
}: QuickAssetLocateBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const query = searchTerm.trim().toLowerCase();

  const matchingVehicles = query
    ? vehicles.filter(v =>
        v.name.toLowerCase().includes(query) ||
        v.licensePlate.toLowerCase().includes(query) ||
        v.driverName.toLowerCase().includes(query) ||
        v.id.toLowerCase().includes(query)
      ).slice(0, 4)
    : [];

  const matchingGeofences = query
    ? geofences.filter(g =>
        g.name.toLowerCase().includes(query) ||
        g.type.toLowerCase().includes(query) ||
        g.id.toLowerCase().includes(query)
      ).slice(0, 3)
    : [];

  const matchingInventory = query
    ? inventory.filter(i =>
        i.name.toLowerCase().includes(query) ||
        i.sku.toLowerCase().includes(query) ||
        i.location.toLowerCase().includes(query)
      ).slice(0, 3)
    : [];

  const hasResults = matchingVehicles.length > 0 || matchingGeofences.length > 0 || matchingInventory.length > 0;

  const handleSelectVehicle = (v: Vehicle) => {
    if (onFocusCoordinates) {
      onFocusCoordinates(v.location.lat, v.location.lng, 15, v.name);
    }
    if (onSelectVehicle) {
      onSelectVehicle(v);
    }
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleSelectGeofence = (g: Geofence) => {
    if (onFocusCoordinates) {
      onFocusCoordinates(g.lat, g.lng, 14, g.name);
    }
    if (onSelectGeofence) {
      onSelectGeofence(g);
    }
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Quick Locate: Search vehicle plate, driver, geofence, or SKU..."
          className="w-full pl-10 pr-9 py-2 bg-slate-800/90 hover:bg-slate-800 focus:bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-xs font-medium text-slate-100 placeholder-slate-400 outline-none transition shadow-inner"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setIsOpen(false);
            }}
            className="absolute right-3 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 text-xs animate-scale-up">
          {!hasResults && (
            <div className="p-4 text-center text-slate-400 font-medium">
              No matching assets or geofences found for "{searchTerm}"
            </div>
          )}

          {matchingVehicles.length > 0 && (
            <div className="p-2 border-b border-slate-800">
              <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider px-2 py-1 block flex items-center gap-1">
                <Truck className="w-3 h-3" /> Fleet Vehicles ({matchingVehicles.length})
              </span>
              {matchingVehicles.map(v => (
                <button
                  key={v.id}
                  onClick={() => handleSelectVehicle(v)}
                  className="w-full p-2 text-left hover:bg-slate-800 rounded-xl transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: v.iconColor || '#3B82F6' }}
                    />
                    <div>
                      <div className="font-extrabold text-slate-100 flex items-center gap-2">
                        <span>{v.name}</span>
                        <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">
                          {v.licensePlate}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Driver: {v.driverName} • Speed: {v.speed} km/h • Fuel: {v.fuelLevel}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold group-hover:translate-x-1 transition-transform">
                    <span>Locate</span> <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {matchingGeofences.length > 0 && (
            <div className="p-2 border-b border-slate-800">
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider px-2 py-1 block flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Geofence Zones ({matchingGeofences.length})
              </span>
              {matchingGeofences.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleSelectGeofence(g)}
                  className="w-full p-2 text-left hover:bg-slate-800 rounded-xl transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-extrabold text-slate-100 block">{g.name}</span>
                      <span className="text-[10px] text-slate-400 block">
                        Type: {g.type} • Radius: {(g.radius / 1000).toFixed(1)} km
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold group-hover:translate-x-1 transition-transform">
                    <span>Jump Zone</span> <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {matchingInventory.length > 0 && (
            <div className="p-2">
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider px-2 py-1 block flex items-center gap-1">
                <Boxes className="w-3 h-3" /> Inventory & Cargo ({matchingInventory.length})
              </span>
              {matchingInventory.map(item => (
                <div
                  key={item.id}
                  className="p-2 text-left hover:bg-slate-800/80 rounded-xl transition flex items-center justify-between"
                >
                  <div>
                    <span className="font-extrabold text-slate-100 block">{item.name}</span>
                    <span className="text-[10px] text-slate-400 block">
                      SKU: {item.sku} • Location: {item.location} • Qty: {item.quantity}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    {item.location}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
