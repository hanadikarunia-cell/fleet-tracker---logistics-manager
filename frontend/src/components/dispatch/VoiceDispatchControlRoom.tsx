import { useState, useEffect } from 'react';
import {
  Mic, MicOff, Volume2, Radio, Play, Pause, CheckCircle2,
  AlertTriangle, Sparkles, Send, RefreshCw, RadioTower, Users, Zap
} from 'lucide-react';
import { Vehicle } from '../../types';

interface DispatchTransmission {
  id: string;
  timestamp: string;
  channel: string;
  sender: string;
  message: string;
  status: 'Dispatched' | 'Acknowledged' | 'Pending';
  audioWave: number[];
}

const SAMPLE_TRANSMISSIONS: DispatchTransmission[] = [
  {
    id: 'tx_101',
    timestamp: '10:42 AM',
    channel: 'Channel 1 - Klang Corridor',
    sender: 'Dispatch AI Operator',
    message: 'Rerouting Hauler Heavy #204 around Federal Highway congestion via E6 Bypass.',
    status: 'Dispatched',
    audioWave: [12, 45, 80, 65, 30, 90, 40, 20],
  },
  {
    id: 'tx_102',
    timestamp: '10:38 AM',
    channel: 'Channel 2 - Northern Fleet',
    sender: 'Driver Ahmad Rizwan (V102)',
    message: 'Cargo load 402 secured at Shah Alam Hub. Proceeding to KLIA Cargo Terminal.',
    status: 'Acknowledged',
    audioWave: [25, 60, 40, 75, 85, 30, 10, 50],
  },
  {
    id: 'tx_103',
    timestamp: '10:15 AM',
    channel: 'Channel 3 - Cold Chain Ops',
    sender: 'Dispatch AI Operator',
    message: 'Reefer Van #305 set point verified at -18.5°C. Battery SOC 88%.',
    status: 'Acknowledged',
    audioWave: [10, 30, 50, 70, 90, 50, 20, 10],
  }
];

interface VoiceDispatchControlRoomProps {
  vehicles?: Vehicle[];
}

export default function VoiceDispatchControlRoom({ vehicles = [] }: VoiceDispatchControlRoomProps) {
  const [activeChannel, setActiveChannel] = useState('Channel 1 - Klang Corridor');
  const [transmissions, setTransmissions] = useState<DispatchTransmission[]>(SAMPLE_TRANSMISSIONS);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [playingTxId, setPlayingTxId] = useState<string | null>(null);

  const speakMessage = (text: string, txId?: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => txId && setPlayingTxId(txId);
      utterance.onend = () => setPlayingTxId(null);
      utterance.onerror = () => setPlayingTxId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleMicToggle = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setTranscript('Listening for live audio dispatch instructions...');

    setTimeout(() => {
      const recognized = `Dispatch urgent priority payload to vehicle ${vehicles[0]?.name || 'Hauler #204'} on ${activeChannel}`;
      setTranscript(recognized);
      setIsListening(false);

      const newTx: DispatchTransmission = {
        id: `tx_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        channel: activeChannel,
        sender: 'Voice Dispatch Operator',
        message: recognized,
        status: 'Dispatched',
        audioWave: [20, 50, 90, 70, 40, 80, 60, 30],
      };

      setTransmissions([newTx, ...transmissions]);
      speakMessage(`Voice dispatch command transmitted: ${recognized}`, newTx.id);
    }, 2200);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white p-6 rounded-3xl border border-indigo-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-400/30">
            <RadioTower className="w-6 h-6 animate-pulse text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">Voice Command Dispatch System & Radio Control Room</h3>
              <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-400/40 uppercase tracking-wider">
                Full-Duplex Speech AI
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Hands-free natural speech interface to dispatch orders, re-route trucks, and query driver telemetry.
            </p>
          </div>
        </div>

        {/* Channel Selector */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-900 p-2 rounded-2xl border border-slate-800">
          <Radio className="w-4 h-4 text-indigo-400" />
          <select
            value={activeChannel}
            onChange={(e) => setActiveChannel(e.target.value)}
            className="bg-transparent text-xs font-extrabold text-white outline-none cursor-pointer"
          >
            <option value="Channel 1 - Klang Corridor" className="bg-slate-900 text-white">Channel 1 - Klang Corridor</option>
            <option value="Channel 2 - Northern Fleet" className="bg-slate-900 text-white">Channel 2 - Northern Fleet</option>
            <option value="Channel 3 - Cold Chain Ops" className="bg-slate-900 text-white">Channel 3 - Cold Chain Ops</option>
          </select>
        </div>
      </div>

      {/* Voice Interaction Mic Station */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleMicToggle}
            className={`p-6 rounded-3xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xl ${
              isListening
                ? 'bg-rose-600 text-white ring-8 ring-rose-500/20 animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <Mic className="w-8 h-8" />
          </button>

          <div className="space-y-1">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600" /> Voice Dispatch Speech Terminal
            </span>
            <p className="text-sm font-bold text-slate-900">
              {isListening ? transcript : 'Tap mic to speak dispatch commands e.g. "Reroute Hauler #204 to Port Klang"'}
            </p>
            <p className="text-xs text-slate-400">Speech synthesis feedback is active for all drivers on {activeChannel}</p>
          </div>
        </div>

        {/* Live Audio Waveform Simulation */}
        <div className="flex items-center gap-1 bg-slate-900 p-4 rounded-2xl border border-slate-800 w-full md:w-auto justify-center">
          {[15, 30, 60, 85, 40, 95, 70, 30, 50, 80, 25, 65].map((h, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-300 ${isListening ? 'bg-indigo-400 animate-pulse' : 'bg-slate-700'}`}
              style={{ height: `${isListening ? Math.max(8, (h * Math.random()) + 10) : 16}px` }}
            />
          ))}
        </div>
      </div>

      {/* Dispatch Transmissions Stream Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-600" /> Live Voice Dispatch Log Stream
          </h4>
          <span className="text-xs text-slate-500 font-medium">{transmissions.length} Logged Transmissions</span>
        </div>

        <div className="divide-y divide-slate-100">
          {transmissions.map((tx) => (
            <div key={tx.id} className="p-4 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-400 font-bold">{tx.timestamp}</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                    {tx.channel}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">{tx.sender}</span>
                </div>
                <p className="text-xs text-slate-700 font-semibold">{tx.message}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full border border-emerald-200">
                  {tx.status}
                </span>

                <button
                  type="button"
                  onClick={() => speakMessage(tx.message, tx.id)}
                  className={`p-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    playingTxId === tx.id
                      ? 'bg-indigo-600 text-white animate-pulse'
                      : 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700'
                  }`}
                >
                  <Volume2 className="w-4 h-4" /> {playingTxId === tx.id ? 'Playing...' : 'Play Voice'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
