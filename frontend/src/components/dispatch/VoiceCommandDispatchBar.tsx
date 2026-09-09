import { useState, useEffect } from 'react';
import {
  Mic, MicOff, Volume2, Sparkles, CheckCircle2,
  AlertTriangle, Radio, Terminal, Play, X, RefreshCcw
} from 'lucide-react';

interface VoiceCommandDispatchBarProps {
  onExecuteCommand?: (cmdText: string) => void;
}

const PRESET_VOICE_COMMANDS = [
  'Dispatch Hauler Heavy #204 to Port Klang Container Terminal',
  'Check Fleet Battery Health and SOC Status',
  'Show Critical Maintenance Alerts and OBD Diagnostic Codes',
  'Assign Cargo Load 402 to Rapid Express Van #102',
  'Calculate Net-Zero Carbon Offset Liability',
];

export default function VoiceCommandDispatchBar({ onExecuteCommand }: VoiceCommandDispatchBarProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastExecutedCommand, setLastExecutedCommand] = useState<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [speechSupported, setSpeechSupported] = useState(true);

  useEffect(() => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      setSpeechSupported(false);
    }
  }, []);

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const executeVoiceCommand = (cmdText: string) => {
    setLastExecutedCommand(cmdText);
    setCommandHistory((prev) => [cmdText, ...prev.slice(0, 4)]);
    setIsListening(false);

    let feedbackMessage = `Command received and dispatched: ${cmdText}`;
    if (cmdText.toLowerCase().includes('battery')) {
      feedbackMessage = 'Checking fleet state of health. Fleet battery SOC average is 88%.';
    } else if (cmdText.toLowerCase().includes('maintenance')) {
      feedbackMessage = 'Opening critical maintenance view. 2 vehicle service work orders pending.';
    } else if (cmdText.toLowerCase().includes('dispatch')) {
      feedbackMessage = 'Dispatch order transmitted to vehicle telematics CAN-Bus terminal.';
    }

    speakResponse(feedbackMessage);

    if (onExecuteCommand) {
      onExecuteCommand(cmdText);
    }
  };

  const handleMicToggle = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setTranscript('Listening for dispatch instructions...');

    // Simulate listening duration then pick a command or recognize
    setTimeout(() => {
      const sample = PRESET_VOICE_COMMANDS[Math.floor(Math.random() * PRESET_VOICE_COMMANDS.length)];
      setTranscript(sample);
      executeVoiceCommand(sample);
    }, 2500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl shadow-lg space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleMicToggle}
            className={`p-3 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${
              isListening
                ? 'bg-rose-600 text-white shadow-lg animate-pulse ring-4 ring-rose-500/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
            }`}
            title="Toggle Voice Dispatch Assistant"
          >
            {isListening ? <Mic className="w-5 h-5 animate-bounce" /> : <Mic className="w-5 h-5" />}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-400" /> AI Voice Command Dispatch Center
              </h4>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[9px] font-black rounded-full border border-indigo-400/30 uppercase">
                {isListening ? 'Listening...' : 'Voice AI Standby'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isListening
                ? transcript
                : lastExecutedCommand
                  ? `Last Executed: "${lastExecutedCommand}"`
                  : 'Tap microphone or select sample voice command to dispatch routes & query telemetry.'}
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] text-slate-400 font-mono">Speech Feedback Active</span>
        </div>
      </div>

      {/* Preset Command Quick-Pills */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase">Quick Voice Commands:</span>
        {PRESET_VOICE_COMMANDS.map((cmd, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => executeVoiceCommand(cmd)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-900/60 hover:text-indigo-200 text-slate-300 rounded-lg text-[10px] font-semibold transition border border-slate-700/80 cursor-pointer"
          >
            "{cmd}"
          </button>
        ))}
      </div>
    </div>
  );
}
