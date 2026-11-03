import React from 'react';
import { SimulationState, SimulationParams } from '../types/simulation';
import { STAGE_DEFINITIONS } from '../utils/dsp';
import { WaveformCanvas } from './WaveformCanvas';
import { ThreeLabScene } from './ThreeLabScene';
import { 
  X, 
  Play, 
  Pause, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  Tv, 
  Radio, 
  Activity, 
  Sun, 
  Cpu 
} from 'lucide-react';

interface PresentationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  simulationState: SimulationState;
  simulationParams: SimulationParams;
  onPlayAll: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
}

export const PresentationOverlay: React.FC<PresentationOverlayProps> = ({
  isOpen,
  onClose,
  simulationState,
  simulationParams,
  onPlayAll,
  onPause,
  onNext,
  onPrev,
  onReset
}) => {
  if (!isOpen) return null;

  const stageInfo = STAGE_DEFINITIONS[simulationState.currentStage];
  const isLedOn = simulationState.currentBitValue === 1 && (simulationState.status === 'playing' || simulationState.status === 'paused');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 overflow-hidden">
      {/* Top Presentation Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-950/80 border border-purple-500/60 rounded-xl text-purple-300 font-mono text-sm font-bold shadow-lg shadow-purple-500/20">
            <Tv className="w-4 h-4 text-purple-400" />
            <span>CLASSROOM PRESENTATION MODE</span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            STEP {simulationState.currentStage} / 16: <span className="text-white">{stageInfo.title.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick controls */}
          {simulationState.status === 'playing' ? (
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-950 font-mono font-bold text-sm rounded-xl cursor-pointer shadow-lg"
            >
              <Pause className="w-4 h-4" />
              <span>PAUSE</span>
            </button>
          ) : (
            <button
              onClick={onPlayAll}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-sm rounded-xl cursor-pointer shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>PLAY ALL</span>
            </button>
          )}

          <button
            onClick={onPrev}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 cursor-pointer"
            title="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={onNext}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 cursor-pointer"
            title="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={onReset}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700 cursor-pointer"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600/90 hover:bg-rose-500 text-white font-mono text-sm font-bold rounded-xl cursor-pointer shadow-lg"
          >
            <X className="w-4 h-4" />
            <span>EXIT (ESC)</span>
          </button>
        </div>
      </div>

      {/* Main Presentation Stage Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 min-h-0">
        {/* Left Column: 3D Scene + Real-time Telemetry (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4 min-h-0">
          <div className="flex-1 min-h-[300px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            <ThreeLabScene
              simulationState={simulationState}
              opticalDistance={simulationParams.distance}
              activeTarget={stageInfo.focusTarget}
            />
          </div>

          {/* Huge Activity Status Board */}
          <div className="grid grid-cols-4 gap-3 font-mono">
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block">TRANSMITTED MESSAGE</span>
              <span className="text-xl font-bold text-cyan-400">"{simulationState.message}"</span>
            </div>

            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block">CURRENT BIT</span>
              <span className="text-2xl font-black text-cyan-300">
                #{simulationState.currentBitIndex + 1}: {simulationState.currentBitValue}
              </span>
            </div>

            <div className={`p-3 rounded-xl border text-center transition-all ${
              isLedOn ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/20' : 'bg-slate-900/90 border-slate-800 text-slate-400'
            }`}>
              <span className="text-xs block flex items-center justify-center gap-1">
                <Sun className="w-3.5 h-3.5" /> LED STATE
              </span>
              <span className="text-2xl font-black">
                {isLedOn ? 'HIGH (1)' : 'LOW (0)'}
              </span>
            </div>

            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block">RECOVERED MESSAGE</span>
              <span className={`text-xl font-bold ${
                simulationState.ber === 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                "{simulationState.decodedMessage || '...'}"
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Giant Waveforms & S&S Concept (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 min-h-0">
          {/* Prominent Signals & Systems Educational Box */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-cyan-800/60 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold">
              <span>Signals & Systems Principle</span>
              <span className="text-slate-400">{stageInfo.subtitle}</span>
            </div>
            <div className="text-lg font-bold text-white">
              {stageInfo.conceptTitle}
            </div>
            {stageInfo.conceptFormula && (
              <div className="p-3 bg-slate-950 rounded-xl border border-cyan-900/50 font-mono text-center text-base text-cyan-300 shadow-inner">
                <code>{stageInfo.conceptFormula}</code>
              </div>
            )}
            <p className="text-sm text-slate-300 leading-relaxed">
              {stageInfo.conceptExplanation}
            </p>
          </div>

          {/* Stacked Large Waveforms */}
          <div className="flex-1 min-h-[260px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
            <WaveformCanvas
              simulationState={simulationState}
              simulationParams={simulationParams}
              viewMode="stacked"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
