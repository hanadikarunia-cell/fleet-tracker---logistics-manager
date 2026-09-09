import React, { useState } from 'react';
import { DriverPerformance, Vehicle } from '../types';
import DriverLeaderboardView from './drivers/DriverLeaderboardView';
import DriverFatigueLogView from './drivers/DriverFatigueLogView';
import SmartDriverTrainingView from './drivers/SmartDriverTrainingView';
import { 
  Award, ShieldCheck, AlertTriangle, AlertCircle, Clock, 
  MapPin, CheckCircle, TrendingUp, Compass, Star, Fuel, Info,
  Printer, Download, X, FileText, ShieldAlert, Sparkles, Mail, Phone, UploadCloud, Trophy, HeartPulse, Shield, Brain, GraduationCap
} from 'lucide-react';
import { 
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, 
  Tooltip, Cell, BarChart, Bar, ComposedChart, Line, Area, CartesianGrid, Legend 
} from 'recharts';

interface DriverPerformanceViewProps {
  drivers: DriverPerformance[];
  vehicles: Vehicle[];
  onAddDriver?: (
    newDriver: DriverPerformance,
    driverPhone?: string,
    avatarUrl?: string,
    driverEmail?: string,
    driverAddress?: string
  ) => void;
}

interface PerformanceEvent {
  id: string;
  driverName: string;
  type: 'harsh_braking' | 'overspeeding' | 'harsh_accel' | 'long_idle';
  location: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

export default function DriverPerformanceView({
  drivers,
  vehicles,
  onAddDriver,
}: DriverPerformanceViewProps) {
  const [driverSubTab, setDriverSubTab] = useState<'scorecard' | 'leaderboard' | 'fatigue' | 'training'>('scorecard');
  const [selectedDriver, setSelectedDriver] = useState<DriverPerformance | null>(drivers[0] || null);

  const correspondingVehicle = selectedDriver ? vehicles.find((v) => v.id === selectedDriver.vehicleId) : null;
  const driverPhone = selectedDriver?.driverPhone || correspondingVehicle?.driverPhone || 'N/A';
  const driverEmail = selectedDriver?.driverEmail || correspondingVehicle?.driverEmail || 'N/A';
  const driverAddress = selectedDriver?.driverAddress || correspondingVehicle?.driverAddress || 'N/A';
  const driverAvatar = selectedDriver?.avatar || correspondingVehicle?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150';
  const [showReportModal, setShowReportModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // States for adding additional driver
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverAddress, setNewDriverAddress] = useState('');
  const [newDriverVehicleId, setNewDriverVehicleId] = useState(vehicles[0]?.id || '');
  const [newDriverSafetyScore, setNewDriverSafetyScore] = useState(95);
  const [newDriverMaxSpeed, setNewDriverMaxSpeed] = useState(85);
  const [newDriverDistance, setNewDriverDistance] = useState(1500);
  const [newDriverHarshBraking, setNewDriverHarshBraking] = useState(1);
  const [newDriverHarshAccel, setNewDriverHarshAccel] = useState(2);
  const [newDriverIdleTime, setNewDriverIdleTime] = useState(20);
  const [newDriverAvatar, setNewDriverAvatar] = useState('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150');
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP)');
      return;
    }
    setUploadError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setNewDriverAvatar(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  const AVATAR_PRESETS = [
    { name: 'Ahmad', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
    { name: 'Sarah', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
    { name: 'Siti', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    { name: 'Suresh', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    { name: 'Chong Wei', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150' },
  ];

  const handleSubmitDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName || !newDriverVehicleId) return;

    const newDriver: DriverPerformance = {
      vehicleId: newDriverVehicleId,
      driverName: newDriverName,
      safetyScore: Number(newDriverSafetyScore),
      maxSpeed: Number(newDriverMaxSpeed),
      harshBrakingCount: Number(newDriverHarshBraking),
      harshAccelerationCount: Number(newDriverHarshAccel),
      idleTimeMin: Number(newDriverIdleTime),
      totalDistanceKm: Number(newDriverDistance),
      driverPhone: newDriverPhone,
      driverEmail: newDriverEmail,
      driverAddress: newDriverAddress,
      avatar: newDriverAvatar,
    };

    if (onAddDriver) {
      onAddDriver(newDriver, newDriverPhone, newDriverAvatar, newDriverEmail, newDriverAddress);
    }

    // Set as active selected driver
    setSelectedDriver(newDriver);

    // Reset fields
    setNewDriverName('');
    setNewDriverPhone('');
    setNewDriverEmail('');
    setNewDriverAddress('');
    setNewDriverVehicleId(vehicles[0]?.id || '');
    setNewDriverSafetyScore(95);
    setNewDriverMaxSpeed(85);
    setNewDriverDistance(1500);
    setNewDriverHarshBraking(1);
    setNewDriverHarshAccel(2);
    setNewDriverIdleTime(20);
    setNewDriverAvatar(AVATAR_PRESETS[0].url);

    setShowAddDriverModal(false);
  };

  // Generate 30-day realistic fuel efficiency and distance history for a driver
  const getFuelTrendData = (driver: DriverPerformance) => {
    const driverVehicle = vehicles.find((v) => v.id === driver.vehicleId);
    const vehicleType = driverVehicle?.type || 'Truck';
    
    // Base efficiency in L/100km (realistic per vehicle class)
    const baseRate = vehicleType === 'Truck' ? 28 
                   : vehicleType === 'Van' ? 12 
                   : vehicleType === 'SUV' ? 9.5 
                   : vehicleType === 'Sedan' ? 6.5 
                   : 3.5; // Motorcycle
    
    // Safety score penalty factor: lower safety score = higher fuel consumption
    const behaviorFactor = 1 + (100 - driver.safetyScore) * 0.003; 

    const data = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      // Deterministic noise based on driver's name & day offset to keep chart stable on state changes
      const seed = (driver.driverName.charCodeAt(0) + i) % 10;
      const noise = (seed - 5) * 0.025 + Math.sin(i * 0.7) * 0.05;
      
      const efficiency = Math.round(baseRate * behaviorFactor * (1 + noise) * 10) / 10;
      
      // Daily distance averaged over 30 days
      const baseDailyDist = driver.totalDistanceKm / 30;
      const distanceDeviation = (seed - 5) * 0.15;
      const distance = Math.round(Math.max(8, baseDailyDist * (1 + distanceDeviation + Math.sin(i * 0.4) * 0.25)) * 10) / 10;
      
      // Fuel consumed = distance * (efficiency / 100)
      const fuelConsumed = Math.round((distance * (efficiency / 100)) * 10) / 10;

      data.push({
        date: dateStr,
        efficiency,    // Liters per 100 km
        distance,      // driven km
        fuelConsumed,  // consumed liters
      });
    }
    return data;
  };

  // Simulated live event feed for drivers
  const safetyEvents: PerformanceEvent[] = [
    { id: 'E-01', driverName: 'Chong Wei', type: 'overspeeding', location: 'MEX Highway KM 14.5', severity: 'high', timestamp: '10 mins ago' },
    { id: 'E-02', driverName: 'Sarah Tan', type: 'harsh_accel', location: 'Jalan Bukit Bintang Intersection', severity: 'low', timestamp: '25 mins ago' },
    { id: 'E-03', driverName: 'Suresh Kumar', type: 'long_idle', location: 'Aviation Fuel Bay 3', severity: 'medium', timestamp: '1 hour ago' },
    { id: 'E-04', driverName: 'Chong Wei', type: 'harsh_braking', location: 'Lingkaran Syed Putra Offramp', severity: 'medium', timestamp: '2 hours ago' },
    { id: 'E-05', driverName: 'Ahmad Ridzuan', type: 'harsh_braking', location: 'Jalan Tun Razak, KL', severity: 'low', timestamp: '3 hours ago' },
  ];

  // Calculate fleet stats
  const averageSafetyScore = Math.round(
    drivers.reduce((sum, d) => sum + d.safetyScore, 0) / drivers.length
  );

  // Sort drivers by safety score descending (Ranking)
  const rankedDrivers = [...drivers].sort((a, b) => b.safetyScore - a.safetyScore);

  // Recharts scatter chart: Speed vs Safety Score
  const scatterData = drivers.map((d) => ({
    name: d.driverName,
    speed: d.maxSpeed,
    score: d.safetyScore,
    harshEvents: d.harshBrakingCount + d.harshAccelerationCount,
  }));

  // Highlight status based on score
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 80) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return '🥇 Fleet Leader';
    if (index === 1) return '🥈 Top Safe';
    if (index === 2) return '🥉 Satisfactory';
    return 'Standard Operator';
  };

  return (
    <div className="space-y-6">
      {/* DRIVER SUB-SYSTEM NAVIGATION TABS */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDriverSubTab('scorecard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            driverSubTab === 'scorecard'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" /> Telematics Scorecard
        </button>

        <button
          type="button"
          onClick={() => setDriverSubTab('leaderboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            driverSubTab === 'leaderboard'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Trophy className="w-4 h-4" /> Driver Gamified Leaderboard
        </button>

        <button
          type="button"
          onClick={() => setDriverSubTab('fatigue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            driverSubTab === 'fatigue'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <HeartPulse className="w-4 h-4" /> Driver Fatigue & HOS Duty Log
        </button>

        <button
          type="button"
          onClick={() => setDriverSubTab('training')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            driverSubTab === 'training'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" /> AI Smart Driver Training
        </button>
      </div>

      {driverSubTab === 'leaderboard' && (
        <DriverLeaderboardView drivers={drivers} vehicles={vehicles} />
      )}

      {driverSubTab === 'fatigue' && (
        <DriverFatigueLogView drivers={drivers} vehicles={vehicles} />
      )}

      {driverSubTab === 'training' && (
        <SmartDriverTrainingView drivers={drivers} vehicles={vehicles} />
      )}

      {driverSubTab === 'scorecard' && (
        <>
      {/* BRAND HEADER & ADD DRIVER ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-500 shrink-0" /> Driver Performance Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time safety scores, eco-driving metrics, and G-force triggers across the operator roster.
          </p>
        </div>
        <button
          id="btn-add-new-driver"
          onClick={() => setShowAddDriverModal(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer self-start sm:self-auto shadow-sm select-none animate-fade-in"
        >
          <Sparkles className="w-4 h-4 animate-pulse shrink-0" /> Add Additional Driver
        </button>
      </div>

      {/* 1. TOP METRICS & PODIUM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Average Health */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Fleet Safety Index
            </h4>
            <p className="text-[11px] text-slate-500">Consolidated score derived from harsh G-force triggers & telematics.</p>
          </div>
          
          <div className="flex items-center justify-center py-4">
            <div className="relative w-36 h-36 rounded-full border-[10px] border-slate-100 flex flex-col items-center justify-center">
              <div 
                className="absolute inset-0 rounded-full border-[10px] border-transparent"
                style={{
                  borderTopColor: '#10B981',
                  borderRightColor: '#10B981',
                  borderBottomColor: '#F59E0B',
                  transform: 'rotate(45deg)'
                }}
              ></div>
              <span className="text-4xl font-extrabold text-slate-800">{averageSafetyScore}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">Average Index</span>
            </div>
          </div>

          <div className="text-center text-xs text-slate-600 font-semibold bg-slate-50 py-2 rounded-xl border border-slate-100">
            {averageSafetyScore >= 85 ? '🟢 EXCELLENT SAFE STANDARDS' : '🟡 MONITOR HARSH INCIDENTS'}
          </div>
        </div>

        {/* Top Performer Podium */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 mb-1">
              <Award className="w-4 h-4 text-blue-500 animate-bounce" /> Driver Safe-Conduct Leaderboard
            </h4>
            <p className="text-[11px] text-slate-500">Live rankings of drivers with the fewest harsh maneuver events.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
            {rankedDrivers.slice(0, 3).map((driver, index) => {
              const correspondingVehicle = vehicles.find((v) => v.id === driver.vehicleId);
              return (
                <div 
                  key={driver.vehicleId} 
                  className={`p-4 rounded-2xl border flex flex-col items-center text-center space-y-2 cursor-pointer transition ${
                    index === 0 
                      ? 'bg-blue-50/50 border-blue-200 shadow-md ring-1 ring-blue-300' 
                      : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedDriver(driver)}
                >
                  <div className="relative">
                    <img 
                      src={correspondingVehicle?.avatar} 
                      alt={driver.driverName} 
                      className={`w-12 h-12 rounded-full border-2 object-cover ${
                        index === 0 ? 'border-blue-500' : 'border-slate-300'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-slate-950 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800 truncate max-w-[120px]">{driver.driverName}</h5>
                    <p className="text-[9px] text-slate-400 font-mono font-semibold uppercase">{correspondingVehicle?.licensePlate}</p>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-extrabold text-slate-900">{driver.safetyScore}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{getRankBadge(index).split(' ')[1] || 'Safe'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. PLOTS & EVENT LOGGER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scatter Plot: Max Speed vs Safety Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <h4 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-blue-500" /> Harsh Maneuver Correlations
          </h4>
          <p className="text-[11px] text-slate-500 mb-4">Correlation mapping: Driver Max Speed (X-Axis) vs Safety Score (Y-Axis). Larger circles mean more harsh braking/accel events.</p>
          
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: -10, left: -20 }}>
                <XAxis type="number" dataKey="speed" name="Max Speed" unit=" km/h" stroke="#94A3B8" fontSize={9} tickLine={false} />
                <YAxis type="number" dataKey="score" name="Safety Score" domain={[50, 100]} stroke="#94A3B8" fontSize={9} tickLine={false} />
                <ZAxis type="number" dataKey="harshEvents" range={[60, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Drivers" data={scatterData}>
                  {scatterData.map((entry, index) => {
                    const color = entry.score >= 90 ? '#10B981' : entry.score >= 80 ? '#F59E0B' : '#EF4444';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live G-Force / Harsh Triggers Logger */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" /> Live Telematics Triggers
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">Recent high G-force braking or velocity deviations.</p>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {safetyEvents.map((evt) => {
              const isHigh = evt.severity === 'high';
              const isMed = evt.severity === 'medium';
              return (
                <div 
                  key={evt.id} 
                  className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs transition hover:bg-slate-50 ${
                    isHigh ? 'bg-rose-50/50 border-rose-100' : isMed ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="mt-0.5">
                    {isHigh ? (
                      <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{evt.driverName}</span>
                      <span className="text-[9px] text-slate-400 font-mono font-bold">{evt.timestamp}</span>
                    </div>
                    <p className="font-semibold text-slate-700 capitalize">
                      {evt.type.replace('_', ' ')}
                    </p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {evt.location}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. DRILL-DOWN REPORT CARD */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/30">
          <h4 className="font-bold text-sm text-slate-800">Operational Log Card: {selectedDriver ? selectedDriver.driverName : 'Select driver to audit'}</h4>
          <p className="text-[11px] text-slate-500">Comprehensive overview of individual driver duty stats and harsh triggers.</p>
        </div>

        {selectedDriver ? (
          <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
            {/* Left side: Driver profile and big score */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3.5">
              <div className="flex items-center gap-3">
                <img 
                  src={driverAvatar} 
                  alt={selectedDriver.driverName} 
                  className="w-16 h-16 rounded-full object-cover border-4 border-slate-100 shadow-xs"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h5 className="font-extrabold text-slate-800 text-sm leading-tight">{selectedDriver.driverName}</h5>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">{vehicles.find(v => v.id === selectedDriver.vehicleId)?.licensePlate || 'No Assigned Asset'}</p>
                </div>
              </div>

              {/* Core Contact & Location Details */}
              <div className="w-full max-w-[200px] bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2 text-[10px] text-slate-600 font-medium self-center md:self-auto shadow-xs">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate" title={driverPhone}>{driverPhone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate" title={driverEmail}>{driverEmail}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 leading-tight" title={driverAddress}>{driverAddress}</span>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center w-full max-w-[200px] ${getScoreColor(selectedDriver.safetyScore)}`}>
                <span className="text-3xl font-extrabold">{selectedDriver.safetyScore}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider mt-1">Safety Quotient</span>
              </div>
              <button
                id="btn-generate-safety-report"
                onClick={() => setShowReportModal(true)}
                className="w-full max-w-[200px] py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-[10px] font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm select-none"
              >
                <FileText className="w-3.5 h-3.5" /> Generate Safety Audit
              </button>
            </div>

            {/* Right side: Numerical metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:col-span-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-semibold font-mono text-[9px] uppercase tracking-wider">Distance Driven</span>
                <p className="text-lg font-bold text-slate-800">{selectedDriver.totalDistanceKm.toLocaleString()} km</p>
                <p className="text-[10px] text-slate-500">Total flight/depot dispatch logs.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-semibold font-mono text-[9px] uppercase tracking-wider">Max Logged Velocity</span>
                <p className="text-lg font-bold text-rose-600">{selectedDriver.maxSpeed} km/h</p>
                <p className="text-[10px] text-slate-500">Peak GPS telemetry speed.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-semibold font-mono text-[9px] uppercase tracking-wider">Harsh Braking Maneuvers</span>
                <p className="text-lg font-bold text-slate-800">{selectedDriver.harshBrakingCount} triggers</p>
                <p className="text-[10px] text-slate-500">Triggered on G-Force sensor.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-semibold font-mono text-[9px] uppercase tracking-wider">Harsh Accelerations</span>
                <p className="text-lg font-bold text-slate-800">{selectedDriver.harshAccelerationCount} triggers</p>
                <p className="text-[10px] text-slate-500">Rapid velocity change delta.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-semibold font-mono text-[9px] uppercase tracking-wider">Idling Duration</span>
                <p className="text-lg font-bold text-slate-800">{selectedDriver.idleTimeMin} mins</p>
                <p className="text-[10px] text-slate-500">Fuel consuming stationery state.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center space-y-1">
                <span className="text-slate-400 font-semibold font-mono text-[9px] uppercase tracking-wider">Audit Recommendations</span>
                <div className="flex items-center gap-1.5 font-bold text-emerald-600 text-[10px]">
                  {selectedDriver.safetyScore >= 90 ? (
                    <>
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>Retain active duty, high merit</span>
                    </>
                  ) : selectedDriver.safetyScore >= 80 ? (
                    <>
                      <CheckCircle className="w-4 h-4 shrink-0 text-amber-500" />
                      <span className="text-amber-600">Minor G-Force awareness alert</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span className="text-rose-600">Enlist for defensive drive re-trial</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 30-Day Fuel Efficiency Trend Chart */}
            <div className="md:col-span-4 border-t border-slate-100 pt-6 mt-2 space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                      <Fuel className="w-4 h-4 text-amber-600 animate-pulse" />
                    </span>
                    <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                      30-Day Fuel Efficiency & Consumption Analysis
                    </h5>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Tracking real-time fuel efficiency (L/100km) relative to distance driven over the past 30 days. Higher safety score yields better fuel economy.
                  </p>
                </div>
                
                {/* Stats recap badges */}
                <div className="flex items-center gap-2 text-[10px] self-start sm:self-center font-mono">
                  <span className="bg-slate-50 border border-slate-150 px-2 py-1 rounded-lg text-slate-600 font-bold">
                    Vehicle Type: <span className="text-slate-800 font-extrabold">{vehicles.find(v => v.id === selectedDriver.vehicleId)?.type || 'Unknown'}</span>
                  </span>
                  <span className="bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg text-amber-700 font-bold">
                    Avg. Efficiency: <span className="text-amber-900 font-extrabold">
                      {(getFuelTrendData(selectedDriver).reduce((sum, d) => sum + d.efficiency, 0) / 30).toFixed(1)} L/100km
                    </span>
                  </span>
                </div>
              </div>

              {/* Chart container */}
              <div className="h-64 bg-slate-50/50 rounded-2xl border border-slate-100/80 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={getFuelTrendData(selectedDriver)}
                    margin={{ top: 15, right: -5, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94A3B8" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="#F59E0B" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false}
                      domain={['auto', 'auto']}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#3B82F6" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false}
                      domain={[0, 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: '#1E293B', 
                        border: 'none', 
                        borderRadius: '12px', 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        color: '#F8FAFC',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}
                      itemStyle={{ color: '#F8FAFC' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    />
                    {/* Fuel consumption rate (line/area) */}
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="efficiency" 
                      name="Fuel Consumption (L/100km)" 
                      fill="url(#fuelColor)" 
                      stroke="#F59E0B" 
                      strokeWidth={2} 
                    />
                    {/* Distance traveled (bars) */}
                    <Bar 
                      yAxisId="right"
                      dataKey="distance" 
                      name="Distance Driven (km)" 
                      fill="#3B82F6" 
                      radius={[4, 4, 0, 0]}
                      opacity={0.3} 
                      maxBarSize={16}
                    />
                    
                    {/* Definitions for gradient fills */}
                    <defs>
                      <linearGradient id="fuelColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Informative footer for insights */}
              <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100/50 p-3 rounded-xl text-[11px] text-indigo-800">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block mb-0.5">Eco-Driving & Fleet Intelligence Insights</span>
                  <span>
                    Fluctuations in daily fuel efficiency reflect high G-force events (such as harsh braking, sudden acceleration) and idling times. 
                    Maintaining a Safety Quotient above 90 minimizes fuel overconsumption by up to <span className="font-extrabold">12.5%</span>, reducing fleet carbon emissions and parts wear-and-tear.
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            💡 Select any driver from the safe-conduct leaderboard or click driver buttons to pull up their complete telemetry scorecard.
          </div>
        )}
      </div>

      {/* 4. DRIVER SAFETY AUDIT REPORT MODAL OVERLAY */}
      {showReportModal && selectedDriver && (() => {
        const correspondingVehicle = vehicles.find((v) => v.id === selectedDriver.vehicleId);
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                    Telematics Driver Safety Audit Report
                  </span>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer font-bold"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Printable Report Canvas */}
              <div className="p-8 space-y-6 flex-1 text-xs text-slate-700 font-sans leading-relaxed">
                {/* AirAsia Brand Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-wide">AIRASIA TRANSPORT LOGISTICS</h1>
                    <p className="text-[10px] text-slate-400 uppercase font-mono tracking-widest font-extrabold mt-0.5">Fleet Telematics & Compliance Division</p>
                    <p className="text-[10px] text-slate-400 font-medium">Jalan KLIA, Sepang, Selangor, Malaysia</p>
                  </div>
                  <div className="text-right font-mono text-[10px] space-y-0.5">
                    <p className="font-bold text-slate-800">AUDIT ID: <span className="font-extrabold text-indigo-600">KL-{selectedDriver.vehicleId}-{selectedDriver.safetyScore}</span></p>
                    <p className="text-slate-500">DATE: 2026-07-20</p>
                    <p className="text-slate-500">STATUS: OFFICIAL RECORD</p>
                  </div>
                </div>

                {/* Subject metadata */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">OPERATOR DETAILS</span>
                    <p className="font-bold text-sm text-slate-800 mt-1">{selectedDriver.driverName}</p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">{correspondingVehicle?.type} • ID: {selectedDriver.vehicleId}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{correspondingVehicle?.licensePlate}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">KPI PERFORMANCE METRICS</span>
                    <p className="font-bold text-sm text-slate-800 mt-1">Safety Index: <span className={`font-black ${selectedDriver.safetyScore >= 90 ? 'text-emerald-600' : selectedDriver.safetyScore >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>{selectedDriver.safetyScore}/100</span></p>
                    <p className="text-[10px] text-slate-500 font-semibold">Logged Distance: {selectedDriver.totalDistanceKm.toLocaleString()} km</p>
                    <p className="text-[10px] text-slate-400 font-medium">Average Idle: {selectedDriver.idleTimeMin} mins/shift</p>
                  </div>
                </div>

                {/* Violation matrix */}
                <div className="space-y-2">
                  <h3 className="font-extrabold text-[10px] uppercase tracking-wider text-slate-500 font-mono">Telemetry Violations Breakdown</h3>
                  <div className="border border-slate-150 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-150 text-[10px] font-bold uppercase">
                          <th className="p-2.5">Indicator</th>
                          <th className="p-2.5">Count</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Impact / Risk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        <tr>
                          <td className="p-2.5 font-bold text-slate-800">Harsh Braking Events</td>
                          <td className="p-2.5 font-mono font-bold">{selectedDriver.harshBrakingCount}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${selectedDriver.harshBrakingCount > 10 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                              {selectedDriver.harshBrakingCount > 10 ? 'ATTENTION' : 'NOMINAL'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500 font-medium">Wear on brake pads & tire compound</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-800">Harsh Accelerations</td>
                          <td className="p-2.5 font-mono font-bold">{selectedDriver.harshAccelerationCount}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${selectedDriver.harshAccelerationCount > 10 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                              {selectedDriver.harshAccelerationCount > 10 ? 'ATTENTION' : 'NOMINAL'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500 font-medium">Driveline strain, peak fuel waste</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-800">Peak Recorded Speed</td>
                          <td className="p-2.5 font-mono font-bold">{selectedDriver.maxSpeed} km/h</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${selectedDriver.maxSpeed > 100 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                              {selectedDriver.maxSpeed > 100 ? 'SPEEDING' : 'SAFE'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500 font-medium">Dangerous collision risks</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-800">Excess Idling Duration</td>
                          <td className="p-2.5 font-mono font-bold">{selectedDriver.idleTimeMin} min</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${selectedDriver.idleTimeMin > 30 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                              {selectedDriver.idleTimeMin > 30 ? 'HIGH IDLE' : 'OPTIMAL'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500 font-medium">Inefficient auxiliary fuel burn</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Audit Verdict */}
                <div className="space-y-2">
                  <h3 className="font-extrabold text-[10px] uppercase tracking-wider text-slate-500 font-mono">Formal Compliance Audit Verdict</h3>
                  <div className={`p-4 rounded-xl border ${
                    selectedDriver.safetyScore >= 90 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                      : selectedDriver.safetyScore >= 80 
                      ? 'bg-amber-50 border-amber-200 text-amber-950' 
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}>
                    <div className="flex items-center gap-2 mb-1.5 font-extrabold text-sm">
                      {selectedDriver.safetyScore >= 90 ? (
                        <>
                          <ShieldCheck className="w-5 h-5 text-emerald-600" />
                          <span>CLASS A: SUPERIOR ROAD COMPLIANCE</span>
                        </>
                      ) : selectedDriver.safetyScore >= 80 ? (
                        <>
                          <Clock className="w-5 h-5 text-amber-600" />
                          <span>CLASS B: PASS WITH MINOR G-FORCE OBSERVATIONS</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
                          <span>CLASS C: CONDUIT COMPROMISED - UNSATISFACTORY</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-700 font-medium">
                      {selectedDriver.safetyScore >= 90 
                        ? 'This driver demonstrates outstanding spatial awareness, smooth deceleration behavior, and optimal fuel discipline. No training required. Retain active status with maximum fuel savings bonus merit points.' 
                        : selectedDriver.safetyScore >= 80 
                        ? 'Minor harsh deceleration flags. Telematics indicates occasional sudden braking patterns on standard offramps. Keep on active flight dispatch routes but recommend a visual feedback safety brief within 14 business days.' 
                        : 'Unsatisfactory telematics. High occurrence of excessive braking and engine idling over threshold limits. Immediate routing to defensive drive training. Temporary hold placed on express flight/cargo dispatch priority cycles.'}
                    </p>
                  </div>
                </div>

                {/* Signoff */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-200/60 text-[10px] text-slate-400">
                  <div>
                    <p className="font-extrabold uppercase text-slate-600 tracking-wider font-mono">Signed: AirAsia Safety Comptroller</p>
                    <p className="italic font-serif text-[11px] text-slate-500 mt-1">Siti Aminah</p>
                  </div>
                  <div className="text-right text-[9px] font-mono font-bold uppercase">
                    <p>VERIFIED SECURE BY BLOCKCHAIN HASH</p>
                    <p className="text-indigo-600">8f2e91b...ac40fd7</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-5 border-t border-slate-150 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  onClick={() => {
                    setIsPrinting(true);
                    setTimeout(() => {
                      setIsPrinting(false);
                      alert(`Driver Safety Audit Report successfully exported to local system for ${selectedDriver.driverName}!`);
                    }, 1200);
                  }}
                  disabled={isPrinting}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
                >
                  {isPrinting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Exporting PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Export Report (PDF)
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsPrinting(true);
                    setTimeout(() => {
                      setIsPrinting(false);
                      window.print();
                    }, 1200);
                  }}
                  disabled={isPrinting}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 select-none"
                >
                  <Printer className="w-4 h-4" /> Print Audit
                </button>
              </div>
            </div>
          </div>
        );
      })()}
        </>
      )}

      {/* 5. ADD DRIVER MODAL OVERLAY */}
      {showAddDriverModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                    Register Fleet Driver Profile
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Enroll a new operator telemetry profile & assign them to a transport asset.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddDriverModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitDriver} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Driver Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">
                    Driver Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    placeholder="e.g. Captain Farhan"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-medium text-slate-800 bg-slate-50"
                  />
                </div>

                {/* Driver Phone */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={newDriverPhone}
                    onChange={(e) => setNewDriverPhone(e.target.value)}
                    placeholder="e.g. +60 11-1234 5678"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-medium text-slate-800 bg-slate-50"
                  />
                </div>

                {/* Driver Email */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">
                    Driver Email Address
                  </label>
                  <input
                    type="email"
                    value={newDriverEmail}
                    onChange={(e) => setNewDriverEmail(e.target.value)}
                    placeholder="e.g. farhan.driver@airasia.com"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-medium text-slate-800 bg-slate-50"
                  />
                </div>

                {/* Driver Physical Address */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">
                    Driver Home/Postal Address
                  </label>
                  <input
                    type="text"
                    value={newDriverAddress}
                    onChange={(e) => setNewDriverAddress(e.target.value)}
                    placeholder="e.g. Lot 12A, Lorong Sultan, Petaling Jaya, Selangor"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-medium text-slate-800 bg-slate-50"
                  />
                </div>

                {/* Vehicle Assignment */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">
                    Assign Transport Vehicle Asset *
                  </label>
                  <select
                    value={newDriverVehicleId}
                    onChange={(e) => setNewDriverVehicleId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-semibold text-slate-800 bg-slate-50"
                  >
                    {vehicles.map((v) => {
                      // Check if a driver is already associated with this vehicle in performance
                      const hasDriver = drivers.some((d) => d.vehicleId === v.id);
                      return (
                        <option key={v.id} value={v.id}>
                          [{v.id}] {v.name} ({v.licensePlate}) {hasDriver ? ' - [Reassigns Current]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Safety Score */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">
                    Initial Safety Score (50 - 100)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={newDriverSafetyScore}
                    onChange={(e) => setNewDriverSafetyScore(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono font-bold text-slate-800 bg-slate-50"
                  />
                </div>

                {/* Distance Traveled */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">
                    Distance Traveled (km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newDriverDistance}
                    onChange={(e) => setNewDriverDistance(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono font-bold text-slate-800 bg-slate-50"
                  />
                </div>

                {/* Peak speed */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">
                    Peak Speed Logged (km/h)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newDriverMaxSpeed}
                    onChange={(e) => setNewDriverMaxSpeed(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono font-bold text-slate-800 bg-slate-50"
                  />
                </div>

                {/* Idle time */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">
                    Excessive Engine Idle (mins)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newDriverIdleTime}
                    onChange={(e) => setNewDriverIdleTime(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono font-bold text-slate-800 bg-slate-50"
                  />
                </div>

                {/* Harsh braking triggers */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">
                    Harsh Braking G-Force Violations
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newDriverHarshBraking}
                    onChange={(e) => setNewDriverHarshBraking(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono font-bold text-slate-800 bg-slate-50"
                  />
                </div>

                {/* Harsh acceleration triggers */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">
                    Harsh Accel G-Force Violations
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newDriverHarshAccel}
                    onChange={(e) => setNewDriverHarshAccel(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono font-bold text-slate-800 bg-slate-50"
                  />
                </div>
              </div>

              {/* Profile Picture Configurer */}
              <div className="space-y-4 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">
                    Driver Profile Picture *
                  </label>
                  <span className="text-[9px] text-indigo-500 font-extrabold uppercase font-sans">Upload, URL, or Preset</span>
                </div>
                
                <div className="space-y-3">
                  {/* Drag and Drop Zone / File Picker */}
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('avatar-file-input')?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                      dragActive 
                        ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99] shadow-inner' 
                        : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="file"
                      id="avatar-file-input"
                      accept="image/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <UploadCloud className={`w-8 h-8 ${dragActive ? 'text-indigo-600 animate-bounce' : 'text-slate-400'}`} />
                    <div className="text-center">
                      <p className="font-bold text-[11px] text-slate-700">
                        {dragActive ? 'Drop your image here!' : 'Click to browse or Drag & Drop image'}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Supports PNG, JPG, JPEG, WebP up to 5MB</p>
                    </div>
                  </div>

                  {uploadError && (
                    <p className="text-[10px] text-red-500 font-bold bg-red-50 p-2 rounded-lg border border-red-100 animate-pulse">
                      {uploadError}
                    </p>
                  )}

                  {/* Preview & Image URL fallback */}
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="relative shrink-0">
                      <img
                        src={newDriverAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
                        alt="Avatar Preview"
                        className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
                        onError={(e) => {
                          // Fallback if URL is broken
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
                        }}
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-[8px] font-bold">
                        PV
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                        Or paste direct image URL link:
                      </span>
                      <input
                        type="url"
                        value={newDriverAvatar.startsWith('data:') ? '' : newDriverAvatar}
                        onChange={(e) => {
                          if (e.target.value) {
                            setNewDriverAvatar(e.target.value);
                            setUploadError('');
                          }
                        }}
                        placeholder="https://example.com/driver-photo.jpg"
                        className="w-full p-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-medium text-[11px] text-slate-800 bg-white"
                      />
                    </div>
                  </div>

                  {/* Preset Selector */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                      Or quick-select default preset:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {AVATAR_PRESETS.map((preset) => {
                        const isSelected = newDriverAvatar === preset.url;
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              setNewDriverAvatar(preset.url);
                              setUploadError('');
                            }}
                            className={`relative rounded-full transition-all focus:outline-none ${
                              isSelected ? 'ring-2 ring-offset-1 ring-indigo-500 scale-105' : 'hover:scale-105 opacity-70 hover:opacity-100'
                            }`}
                            title={preset.name}
                          >
                            <img
                              src={preset.url}
                              alt={preset.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDriverModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition cursor-pointer select-none"
                >
                  Register Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
