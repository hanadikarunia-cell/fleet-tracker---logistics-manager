import { useState, useMemo } from 'react';
import { DriverPerformance, Vehicle } from '../../types';
import {
  Award, Trophy, Star, ShieldCheck, Flame, Zap, Sparkles,
  TrendingUp, Compass, HeartHandshake, CheckCircle2, Crown, Medal,
  Gift, ShoppingBag, Coins, Fuel, Plane, Coffee, Check, X
} from 'lucide-react';

interface DriverLeaderboardViewProps {
  drivers: DriverPerformance[];
  vehicles: Vehicle[];
}

interface RankedDriver extends DriverPerformance {
  rank: number;
  vehicleName: string;
  badges: string[];
  ecoPoints: number;
  monthlyBonusUsd: number;
  zeroViolationStreakDays: number;
}

interface RewardItem {
  id: string;
  title: string;
  category: 'fuel' | 'travel' | 'cash' | 'perks' | 'gear';
  pointsCost: number;
  valueDescription: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  stockRemaining: number;
}

const REWARD_STORE_ITEMS: RewardItem[] = [
  {
    id: 'rew_fuel_50',
    title: '$50 Fuel Gift Card',
    category: 'fuel',
    pointsCost: 1200,
    valueDescription: 'Redeemable at Petronas, Shell, or Caltex stations nationwide.',
    icon: Fuel,
    iconBg: 'bg-amber-100 border-amber-200',
    iconColor: 'text-amber-700',
    stockRemaining: 18,
  },
  {
    id: 'rew_travel_voucher',
    title: 'Rp 1,500,000 Travel Voucher',
    category: 'travel',
    pointsCost: 2800,
    valueDescription: 'Valid for domestic & ASEAN regional flights.',
    icon: Plane,
    iconBg: 'bg-rose-100 border-rose-200',
    iconColor: 'text-rose-700',
    stockRemaining: 7,
  },
  {
    id: 'rew_cash_bonus_200',
    title: '$200 Payroll Safety Bonus',
    category: 'cash',
    pointsCost: 3500,
    valueDescription: 'Direct deposit into driver payroll statement next pay cycle.',
    icon: Coins,
    iconBg: 'bg-emerald-100 border-emerald-200',
    iconColor: 'text-emerald-700',
    stockRemaining: 25,
  },
  {
    id: 'rew_starbucks_pass',
    title: 'Weekly Coffee & Meal Pass',
    category: 'perks',
    pointsCost: 650,
    valueDescription: 'Complimentary premium espresso & hot meal combo vouchers.',
    icon: Coffee,
    iconBg: 'bg-teal-100 border-teal-200',
    iconColor: 'text-teal-700',
    stockRemaining: 40,
  },
  {
    id: 'rew_seat_cushion',
    title: 'Ergonomic Memory Foam Lumbar Support',
    category: 'gear',
    pointsCost: 1600,
    valueDescription: 'Heavy-duty long-haul commercial truck seat ergonomic cushion.',
    icon: ShoppingBag,
    iconBg: 'bg-indigo-100 border-indigo-200',
    iconColor: 'text-indigo-700',
    stockRemaining: 12,
  },
];

export default function DriverLeaderboardView({
  drivers,
  vehicles,
}: DriverLeaderboardViewProps) {
  const [sortCriteria, setSortCriteria] = useState<'safety' | 'distance' | 'ecoPoints'>('safety');
  const [activeTab, setActiveTab] = useState<'rankings' | 'rewards_store'>('rankings');
  const [selectedDriverForReward, setSelectedDriverForReward] = useState<string>('');
  const [claimingReward, setClaimingReward] = useState<RewardItem | null>(null);
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);

  // Compute Gamified Leaderboard Metrics
  const leaderboardData: RankedDriver[] = useMemo(() => {
    const computed = drivers.map((d, index) => {
      const correspondingVeh = vehicles.find(v => v.id === d.vehicleId);
      const vehicleName = correspondingVeh ? correspondingVeh.name : d.vehicleName || `Vehicle ${d.vehicleId}`;
      const badges: string[] = [];

      if (d.safetyScore >= 95) badges.push('🛡️ Safety Champion');
      if (d.harshBrakingCount <= 1) badges.push('🛑 Smooth Operator');
      if (d.maxSpeed <= 90) badges.push('⚡ Speed Guard');
      if (d.totalDistanceKm > 2000) badges.push('🛣️ Long Haul Master');
      if (d.idleTimeMin < 20) badges.push('🌱 Eco King');

      const ecoPoints = Math.round((d.safetyScore * 10) + (d.totalDistanceKm / 10) - (d.harshBrakingCount * 20));
      const monthlyBonusUsd = Math.max(50, Math.round(ecoPoints * 0.35));
      const zeroViolationStreakDays = Math.max(3, Math.min(60, Math.round(d.safetyScore / 2)));

      return {
        ...d,
        rank: index + 1,
        vehicleName,
        badges,
        ecoPoints,
        monthlyBonusUsd,
        zeroViolationStreakDays,
      };
    });

    // Sort based on selected criteria
    return computed.sort((a, b) => {
      if (sortCriteria === 'safety') return b.safetyScore - a.safetyScore;
      if (sortCriteria === 'distance') return b.totalDistanceKm - a.totalDistanceKm;
      return b.ecoPoints - a.ecoPoints;
    }).map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [drivers, vehicles, sortCriteria]);

  const topDriver = leaderboardData[0];

  const currentDriver = useMemo(() => {
    if (!selectedDriverForReward && leaderboardData.length > 0) {
      return leaderboardData[0];
    }
    return leaderboardData.find(d => (d.id || d.driverName) === selectedDriverForReward) || leaderboardData[0];
  }, [leaderboardData, selectedDriverForReward]);

  const handleConfirmRedeem = () => {
    if (!claimingReward || !currentDriver) return;
    const voucherCode = `ECO-${claimingReward.category.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    setRedeemedCode(voucherCode);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border border-amber-800/60 text-white p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">Gamified Driver Safety & Eco Leaderboard</h3>
              <span className="bg-amber-500/30 text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-400/40 uppercase tracking-wider">
                July 2026 Season
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Performance rankings based on smooth braking, fuel conservation, speed compliance, and streak badges.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('rankings')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition cursor-pointer ${
              activeTab === 'rankings' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" /> Season Standings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rewards_store')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition cursor-pointer ${
              activeTab === 'rewards_store' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gift className="w-4 h-4" /> Rewards Catalog & Store
          </button>
        </div>
      </div>

      {activeTab === 'rewards_store' ? (
        <div className="space-y-6">
          {/* Driver Selector Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-600" /> Driver Eco Points Redemption Store
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Drivers exchange accumulated safe driving Eco Points for real-world rewards and perks.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600">Select Driver:</span>
              <select
                value={currentDriver ? (currentDriver.id || currentDriver.driverName) : ''}
                onChange={(e) => setSelectedDriverForReward(e.target.value)}
                className="p-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 text-slate-900 outline-none"
              >
                {leaderboardData.map(d => (
                  <option key={d.id || d.driverName} value={d.id || d.driverName}>
                    {d.driverName} ({d.ecoPoints} Eco Points)
                  </option>
                ))}
              </select>

              {currentDriver && (
                <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-[10px] text-emerald-600 font-bold block leading-none">Available Balance</span>
                    <span className="font-extrabold text-sm">{currentDriver.ecoPoints.toLocaleString()} Pts</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reward Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {REWARD_STORE_ITEMS.map((item) => {
              const IconComp = item.icon;
              const canAfford = currentDriver ? currentDriver.ecoPoints >= item.pointsCost : false;

              return (
                <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-2xl border ${item.iconBg} ${item.iconColor}`}>
                        <IconComp className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-extrabold rounded-full border border-slate-200">
                        {item.stockRemaining} in stock
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.valueDescription}</p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <Coins className="w-4 h-4" />
                      <span className="font-mono font-extrabold text-sm">{item.pointsCost.toLocaleString()} Pts</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setClaimingReward(item);
                        setRedeemedCode(null);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                        canAfford
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {canAfford ? 'Redeem Perk' : 'Need More Pts'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Claim Modal Overlay */}
          {claimingReward && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-150">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                      <Gift className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">Claim Reward Voucher</h3>
                      <p className="text-xs text-slate-500">Confirm Eco Points redemption for {currentDriver?.driverName}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setClaimingReward(null);
                      setRedeemedCode(null);
                    }}
                    className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {!redeemedCode ? (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Selected Perk:</span>
                        <span className="font-bold text-slate-900">{claimingReward.title}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Points Cost:</span>
                        <span className="font-mono font-bold text-emerald-700">-{claimingReward.pointsCost} Pts</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Remaining Balance:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {((currentDriver?.ecoPoints || 0) - claimingReward.pointsCost).toLocaleString()} Pts
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setClaimingReward(null)}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmRedeem}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm"
                      >
                        Confirm Redemption
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-center">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                      <h4 className="font-extrabold text-sm text-emerald-900">Perk Claimed Successfully!</h4>
                      <p className="text-xs text-emerald-700">Present this claim voucher code at redemption:</p>
                      <div className="p-3 bg-white rounded-xl border border-emerald-300 font-mono font-extrabold text-base tracking-widest text-emerald-900 select-all">
                        {redeemedCode}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setClaimingReward(null);
                        setRedeemedCode(null);
                      }}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                    >
                      Done & Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Sort Controls */}
          <div className="flex justify-end items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-bold text-slate-500 mr-2">Rank By:</span>
            <button
              type="button"
              onClick={() => setSortCriteria('safety')}
              className={`px-3 py-1 text-xs font-extrabold rounded-xl transition cursor-pointer ${
                sortCriteria === 'safety' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Safety Score
            </button>
            <button
              type="button"
              onClick={() => setSortCriteria('ecoPoints')}
              className={`px-3 py-1 text-xs font-extrabold rounded-xl transition cursor-pointer ${
                sortCriteria === 'ecoPoints' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Eco Points
            </button>
            <button
              type="button"
              onClick={() => setSortCriteria('distance')}
              className={`px-3 py-1 text-xs font-extrabold rounded-xl transition cursor-pointer ${
                sortCriteria === 'distance' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Distance
            </button>
          </div>

          {/* Top 3 Podium Cards */}
          {topDriver && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Rank 2 */}
              {leaderboardData[1] && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between order-2 md:order-1">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-extrabold text-sm">
                        2
                      </span>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{leaderboardData[1].driverName}</h4>
                        <p className="text-[10px] text-slate-500 font-semibold">{leaderboardData[1].vehicleName}</p>
                      </div>
                    </div>
                    <Medal className="w-6 h-6 text-slate-400" />
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Safety Score</span>
                      <span className="font-extrabold text-slate-900">{leaderboardData[1].safetyScore}/100</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Eco Points</span>
                      <span className="font-mono font-bold text-indigo-600">{leaderboardData[1].ecoPoints} pts</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Bonus</span>
                      <span className="font-mono font-bold text-emerald-600">+${leaderboardData[1].monthlyBonusUsd}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rank 1 (Gold Champion) */}
              <div className="bg-gradient-to-b from-amber-50 via-white to-amber-50/30 p-5 rounded-2xl border-2 border-amber-400 shadow-md flex flex-col justify-between order-1 md:order-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 font-black text-[9px] px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                  Season Leader
                </div>

                <div className="flex justify-between items-start mt-2">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-base shadow-sm">
                      1
                    </span>
                    <div>
                      <h4 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                        {topDriver.driverName} <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
                      </h4>
                      <p className="text-xs text-amber-800 font-bold">{topDriver.vehicleName}</p>
                    </div>
                  </div>
                  <Trophy className="w-8 h-8 text-amber-500" />
                </div>

                <div className="mt-4 pt-3 border-t border-amber-200/60 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-amber-800 block font-bold">Safety Score</span>
                    <span className="font-black text-slate-900 text-sm">{topDriver.safetyScore}/100</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-800 block font-bold">Eco Points</span>
                    <span className="font-mono font-black text-indigo-700 text-sm">{topDriver.ecoPoints} pts</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-800 block font-bold">Bonus</span>
                    <span className="font-mono font-black text-emerald-700 text-sm">+${topDriver.monthlyBonusUsd}</span>
                  </div>
                </div>
              </div>

              {/* Rank 3 */}
              {leaderboardData[2] && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between order-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-amber-700/20 text-amber-900 flex items-center justify-center font-extrabold text-sm">
                        3
                      </span>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{leaderboardData[2].driverName}</h4>
                        <p className="text-[10px] text-slate-500 font-semibold">{leaderboardData[2].vehicleName}</p>
                      </div>
                    </div>
                    <Medal className="w-6 h-6 text-amber-700" />
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Safety Score</span>
                      <span className="font-extrabold text-slate-900">{leaderboardData[2].safetyScore}/100</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Eco Points</span>
                      <span className="font-mono font-bold text-indigo-600">{leaderboardData[2].ecoPoints} pts</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Bonus</span>
                      <span className="font-mono font-bold text-emerald-600">+${leaderboardData[2].monthlyBonusUsd}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" /> Complete Roster Standings
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">Updated every 15 minutes via Telematics CAN-Bus</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase font-extrabold text-[10px]">
                    <th className="p-3 text-center w-12">Rank</th>
                    <th className="p-3">Driver & Vehicle</th>
                    <th className="p-3 text-center">Safety Rating</th>
                    <th className="p-3 text-center">Eco Points</th>
                    <th className="p-3 text-center">Total Distance</th>
                    <th className="p-3 text-center">Zero-Violation Streak</th>
                    <th className="p-3">Earned Badges</th>
                    <th className="p-3 text-right">Est. Monthly Bonus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {leaderboardData.map((d) => (
                    <tr key={d.driverName || d.vehicleId} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-center">
                        <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-extrabold text-xs ${
                          d.rank === 1
                            ? 'bg-amber-400 text-slate-950 shadow-xs'
                            : d.rank === 2
                              ? 'bg-slate-200 text-slate-800'
                              : d.rank === 3
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-100 text-slate-600'
                        }`}>
                          #{d.rank}
                        </span>
                      </td>

                      <td className="p-3">
                        <p className="font-bold text-slate-900 text-xs">{d.driverName}</p>
                        <span className="text-[10px] text-slate-500">{d.vehicleName}</span>
                      </td>

                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          d.safetyScore >= 90
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.safetyScore >= 80
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                        }`}>
                          {d.safetyScore} / 100
                        </span>
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-indigo-700">
                        {d.ecoPoints.toLocaleString()} pts
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-slate-800">
                        {d.totalDistanceKm.toLocaleString()} km
                      </td>

                      <td className="p-3 text-center font-mono text-emerald-700 font-bold">
                        🔥 {d.zeroViolationStreakDays} days
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {d.badges.map(badge => (
                            <span key={badge} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700">
                              {badge}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-emerald-600">
                        +${d.monthlyBonusUsd}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
