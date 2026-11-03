import React from 'react';
import { SimulationParams, SimulationStage } from '../types/simulation';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Tv, 
  BarChart3, 
  Wrench,
  Footprints,
  Volume2
} from 'lucide-react';

interface ControlBarProps {
  inputMessage: string;
  setInputMessage: (msg: string) => void;
  onSend: () => void;
  onPlayAll: () => void;
  onPause: () => void;
  onReset: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleStepMode: () => void;
  status: 'idle' | 'playing' | 'paused' | 'completed';
  isStepMode: boolean;
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  onTogglePresentation: () => void;
  isPresentationMode: boolean;
  onOpenFft: () => void;
  onOpenHardware: () => void;
  errorMessage: string | null;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  inputMessage,
  setInputMessage,
  onSend,
  onPlayAll,
  onPause,
  onReset,
  onNext,
  onPrev,
  onToggleStepMode,
  status,
  isStepMode,
  params,
  setParams,
  onTogglePresentation,
  isPresentationMode,
  onOpenFft,
  onOpenHardware,
  errorMessage
}) => {
  const PRESET_MESSAGES = ['HELLO', 'SIGNAL', 'LIFI', 'OPTICAL', 'DATA'];

  return (
    <div className="w-full bg-slate-900/95 border-b border-slate-800 p-3 space-y-3 shadow-xl backdrop-blur-md">
      {/* Row 1: Message Input, Presets & Primary Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Input group */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <label htmlFor="input-message" className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider shrink-0">
            Message:
          </label>
          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <input
              id="input-message"
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value.toUpperCase())}
              placeholder="e.g. HELLO"
              maxLength={30}
              className="w-full px-3 py-1.5 bg-slate-950 text-cyan-300 font-mono text-sm rounded-lg border border-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 uppercase tracking-widest placeholder:text-slate-600 shadow-inner"
            />
          </div>

          {/* Quick presets */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono">
            <span className="text-slate-500 mr-1">Presets:</span>
            {PRESET_MESSAGES.map((msg) => (
              <button
                key={msg}
                onClick={() => setInputMessage(msg)}
                className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-cyan-300 hover:bg-slate-750 transition cursor-pointer border border-slate-700/60"
              >
                {msg}
              </button>
            ))}
          </div>

          <button
            id="btn-send"
            onClick={onSend}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono font-bold text-xs rounded-lg shadow-md shadow-cyan-500/20 transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>SEND</span>
          </button>
        </div>

        {/* Primary Simulation Controls */}
        <div className="flex items-center flex-wrap gap-1.5">
          {status === 'playing' ? (
            <button
              id="btn-pause"
              onClick={onPause}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>PAUSE</span>
            </button>
          ) : (
            <button
              id="btn-play-all"
              onClick={onPlayAll}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold rounded-lg shadow-md shadow-emerald-500/20 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{status === 'paused' ? 'RESUME' : 'PLAY ALL'}</span>
            </button>
          )}

          <button
            id="btn-step-mode"
            onClick={onToggleStepMode}
            className={`flex items-center gap-1 px-2.5 py-1.5 font-mono text-xs rounded-lg border transition cursor-pointer ${
              isStepMode
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">STEP BY STEP</span>
            <span className="sm:hidden">STEP</span>
          </button>

          <button
            id="btn-prev"
            onClick={onPrev}
            className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg transition cursor-pointer"
            title="Previous Step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            id="btn-next"
            onClick={onNext}
            className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg transition cursor-pointer"
            title="Next Step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            id="btn-reset"
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-600/40 font-mono text-xs rounded-lg transition cursor-pointer"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>

          {/* Special Presentation & Tool Toggles */}
          <div className="h-5 w-[1px] bg-slate-700 mx-1 hidden md:block" />

          <button
            id="btn-presentation-mode"
            onClick={onTogglePresentation}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-bold rounded-lg border transition cursor-pointer ${
              isPresentationMode
                ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/30'
                : 'bg-slate-800 text-purple-300 border-purple-900/60 hover:bg-slate-750'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PRESENTATION MODE</span>
            <span className="sm:hidden">PRESENT</span>
          </button>
        </div>
      </div>

      {/* Validation / Error Banner if any */}
      {errorMessage && (
        <div className="p-2 bg-rose-950/70 border border-rose-600/60 rounded-lg text-rose-300 text-xs font-mono flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Row 2: Physical & Signal Processing Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-xs font-mono text-slate-300">
        {/* Transmission Speed */}
        <div className="flex flex-col gap-1 p-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Transmission Speed</span>
            <span className="text-cyan-400 font-bold">{params.speed.toFixed(1)}x</span>
          </div>
          <input
            id="slider-speed"
            type="range"
            min="0.2"
            max="3.0"
            step="0.1"
            value={params.speed}
            onChange={(e) => setParams(p => ({ ...p, speed: parseFloat(e.target.value) }))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Noise Level */}
        <div className="flex flex-col gap-1 p-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">AWGN Noise Level</span>
            <span className="text-amber-400 font-bold">{(params.noiseLevel * 100).toFixed(0)}%</span>
          </div>
          <input
            id="slider-noise"
            type="range"
            min="0.0"
            max="0.8"
            step="0.05"
            value={params.noiseLevel}
            onChange={(e) => setParams(p => ({ ...p, noiseLevel: parseFloat(e.target.value) }))}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Optical Distance */}
        <div className="flex flex-col gap-1 p-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Optical Distance (1/d²)</span>
            <span className="text-emerald-400 font-bold">{params.distance.toFixed(1)}m</span>
          </div>
          <input
            id="slider-distance"
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={params.distance}
            onChange={(e) => setParams(p => ({ ...p, distance: parseFloat(e.target.value) }))}
            className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Decision Threshold */}
        <div className="flex flex-col gap-1 p-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Decision Threshold V_th</span>
            <span className="text-purple-400 font-bold">{params.threshold.toFixed(2)}</span>
          </div>
          <input
            id="slider-threshold"
            type="range"
            min="0.1"
            max="0.9"
            step="0.05"
            value={params.threshold}
            onChange={(e) => setParams(p => ({ ...p, threshold: parseFloat(e.target.value) }))}
            className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
