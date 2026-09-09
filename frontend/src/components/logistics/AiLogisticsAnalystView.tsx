import { useState } from 'react';
import {
  Brain, Sparkles, MessageSquare, Send, Lightbulb, TrendingUp,
  AlertTriangle, ShieldCheck, ArrowRight, Zap, RefreshCw, BarChart2,
  CheckCircle2, Compass, Truck
} from 'lucide-react';
import { Vehicle, DriverPerformance } from '../../types';

interface AiLogisticsAnalystProps {
  vehicles: Vehicle[];
  drivers: DriverPerformance[];
}

interface AnalysisInsight {
  title: string;
  category: 'efficiency' | 'risk' | 'cost' | 'carbon';
  impactScore: number; // 0-100
  summary: string;
  recommendations: string[];
  projectedSavings: string;
}

const PRESET_QUERIES = [
  'Analyze freight bottleneck risk along Highway E6 corridor',
  'Recommend EV vs Diesel fleet allocation for regional deliveries',
  'Optimize cold-chain reefer temperature compliance & fuel burn',
  'Predict Q3 peak season driver fatigue & vehicle maintenance demand',
];

const INITIAL_INSIGHTS: AnalysisInsight[] = [
  {
    title: 'Highway E6 Klang Valley Congestion Mitigation Strategy',
    category: 'efficiency',
    impactScore: 92,
    summary: 'Telematics data shows a 34-minute average delay per heavy hauler between 07:30 - 09:30 AM due to port gate bottlenecks.',
    recommendations: [
      'Shift 40% of non-perishable freight dispatches to off-peak night window (22:00 - 04:00)',
      'Utilize South Klang Bypass (E28) detour for vehicles with gross weight > 12 tonnes',
      'Pre-clear customs documentation via AI Digital Freight Manifest to reduce gate idle time by 18 mins'
    ],
    projectedSavings: '$14,200 / month in idle fuel & driver overtime',
  },
  {
    title: 'Short-Haul Fleet Electrification Opportunity',
    category: 'carbon',
    impactScore: 88,
    summary: '12 diesel urban vans exhibit daily routes under 140 km with frequent stop-and-go patterns optimal for zero-emission EV conversion.',
    recommendations: [
      'Transition 5 urban vans to 80 kWh EV platforms during H2 maintenance cycle',
      'Install 120 kW DC fast chargers at Shah Alam distribution hub',
      'Utilize regenerative braking telematics scoring to extend battery range by 14%'
    ],
    projectedSavings: '38.4 Tonnes CO2 / year & $22,800 fuel cost reduction',
  },
];

export default function AiLogisticsAnalystView({ vehicles, drivers }: AiLogisticsAnalystProps) {
  const [query, setQuery] = useState('');
  const [insights, setInsights] = useState<AnalysisInsight[]>(INITIAL_INSIGHTS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRunAnalysis = (userQuery: string) => {
    if (!userQuery.trim()) return;
    setIsAnalyzing(true);
    setQuery(userQuery);

    setTimeout(() => {
      const newInsight: AnalysisInsight = {
        title: `AI Analysis: "${userQuery}"`,
        category: userQuery.toLowerCase().includes('cost') || userQuery.toLowerCase().includes('saving') ? 'cost' : 'efficiency',
        impactScore: Math.floor(Math.random() * 15) + 85,
        summary: `Cross-analyzed live telemetry from ${vehicles.length} active fleet units and ${drivers.length} driver behavior profiles. Identified key operational levers to streamline delivery throughput.`,
        recommendations: [
          'Rebalance cargo axle load weights before departure to prevent brake pads overheating',
          'Deploy automated voice dispatch alerts for real-time congestion rerouting',
          'Schedule preventative maintenance for high-mileage units showing elevated vibration frequency'
        ],
        projectedSavings: '$8,500 / month estimated operational savings',
      };

      setInsights([newInsight, ...insights]);
      setIsAnalyzing(false);
      setQuery('');
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 text-white p-6 rounded-3xl border border-indigo-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-400/30">
            <Brain className="w-6 h-6 animate-pulse text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">AI Autonomous Logistics Analyst</h3>
              <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-400/40 uppercase tracking-wider">
                Generative Telematics Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Continuously audits corridor delays, fleet fuel burn, driver safety risk factors, and supply chain cost drivers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
          <Truck className="w-5 h-5 text-indigo-400" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Audited Assets</span>
            <span className="font-mono text-xs font-black text-white">{vehicles.length} Vehicles • {drivers.length} Drivers</span>
          </div>
        </div>
      </div>

      {/* Query Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="relative flex items-center">
          <MessageSquare className="w-5 h-5 text-indigo-600 absolute left-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunAnalysis(query)}
            placeholder="Ask AI Analyst e.g. 'How can we reduce fuel burn on Klang regional routes by 10%?'..."
            className="w-full pl-12 pr-32 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
          />
          <button
            type="button"
            disabled={isAnalyzing || !query.trim()}
            onClick={() => handleRunAnalysis(query)}
            className="absolute right-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {/* Query Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Suggested Queries:
          </span>
          {PRESET_QUERIES.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleRunAnalysis(q)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-[10px] font-semibold transition border border-slate-200 cursor-pointer"
            >
              "{q}"
            </button>
          ))}
        </div>
      </div>

      {/* Strategic Insights Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-600" /> Strategic Logistics Recommendations ({insights.length})
          </h4>
          <span className="text-xs text-slate-500 font-medium">Ranked by Impact Score</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {insights.map((item, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 hover:border-indigo-300 transition">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    item.category === 'efficiency' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                    item.category === 'carbon' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {item.category}
                  </span>
                  <h5 className="font-extrabold text-sm text-slate-900">{item.title}</h5>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">AI Impact Score</span>
                    <span className="font-mono font-black text-indigo-600 text-xs">{item.impactScore} / 100</span>
                  </div>
                  <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${item.impactScore}%` }} />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {item.summary}
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Actionable Optimization Steps:</span>
                <ul className="space-y-1.5">
                  {item.recommendations.map((rec, rIdx) => (
                    <li key={rIdx} className="text-xs text-slate-800 flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200/60">
                  💰 Projected Value: {item.projectedSavings}
                </span>

                <button
                  type="button"
                  onClick={() => alert(`Applying automated rule: ${item.title}`)}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5"
                >
                  Deploy AI Rule <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
