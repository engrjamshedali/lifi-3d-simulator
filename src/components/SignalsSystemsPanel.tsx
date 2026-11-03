import React from 'react';
import { SimulationStage, SimulationState, SimulationParams } from '../types/simulation';
import { STAGE_DEFINITIONS } from '../utils/dsp';
import { BookOpen, Activity, Cpu, Radio, Zap, Sliders, BarChart3, HelpCircle } from 'lucide-react';

interface SignalsSystemsPanelProps {
  currentStage: SimulationStage;
  simulationState: SimulationState;
  simulationParams: SimulationParams;
  onOpenFft: () => void;
  onOpenHardware: () => void;
}

export const SignalsSystemsPanel: React.FC<SignalsSystemsPanelProps> = ({
  currentStage,
  simulationState,
  simulationParams,
  onOpenFft,
  onOpenHardware
}) => {
  const stageInfo = STAGE_DEFINITIONS[currentStage];

  return (
    <div className="flex flex-col h-full bg-slate-900/95 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold tracking-wider uppercase text-slate-200 font-mono">
            SIGNALS & SYSTEMS CONCEPT
          </h3>
        </div>
        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
          STEP {currentStage}/16
        </span>
      </div>

      {/* Content Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin text-slate-300 text-xs leading-relaxed">
        {/* Stage Title Card */}
        <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
          <div className="text-cyan-400 font-bold text-sm font-sans">{stageInfo.title}</div>
          <div className="text-slate-400 text-xs font-mono mt-0.5">{stageInfo.subtitle}</div>
        </div>

        {/* Theoretical Concept */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Theoretical Framework</span>
          </div>
          <div className="text-slate-200 font-semibold text-xs">
            {stageInfo.conceptTitle}
          </div>
          <p className="text-slate-300 leading-normal">
            {stageInfo.conceptExplanation}
          </p>
        </div>

        {/* Mathematical Formulation */}
        {stageInfo.conceptFormula && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Mathematical Model</span>
            </div>
            <div className="p-2.5 bg-slate-950/90 rounded-lg border border-cyan-900/40 text-center font-mono text-cyan-300 text-xs tracking-wide shadow-inner overflow-x-auto">
              <code>{stageInfo.conceptFormula}</code>
            </div>
          </div>
        )}

        {/* Live Stage Telemetry */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <div className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Parameters</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">CURRENT BIT:</span>
              <span className="text-cyan-300 font-bold text-sm">
                Bit #{simulationState.currentBitIndex + 1} = {simulationState.currentBitValue}
              </span>
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">LED EMITTER:</span>
              <span className={`font-bold text-sm ${simulationState.currentBitValue === 1 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {simulationState.currentBitValue === 1 ? 'ON (+5V)' : 'OFF (0V)'}
              </span>
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">OPTICAL DIST:</span>
              <span className="text-slate-200 font-bold">{simulationParams.distance.toFixed(1)} meters</span>
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">AWGN NOISE:</span>
              <span className="text-amber-300 font-bold">{(simulationParams.noiseLevel * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* System Block Diagram representation */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <div className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
            LTI System Pipeline
          </div>
          <div className="p-2 bg-slate-950/70 rounded border border-slate-800/90 text-[11px] font-mono text-slate-300 space-y-1">
            <div className="flex items-center justify-between">
              <span>Source:</span>
              <span className="text-cyan-400">"{simulationState.message}"</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Channel:</span>
              <span className="text-amber-400">y(t) = α·x(t) + n(t)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Recovered:</span>
              <span className={simulationState.ber === 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                "{simulationState.decodedMessage || '...'}"
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
              <span>BER Metric:</span>
              <span className={simulationState.ber === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {(simulationState.ber * 100).toFixed(1)}% ({simulationState.errorCount} errors)
              </span>
            </div>
          </div>
        </div>

        {/* Quick Tools */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            id="btn-show-fft"
            onClick={onOpenFft}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 rounded-lg text-xs font-mono font-medium transition cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Open Fourier (FFT) Spectrum</span>
          </button>
          <button
            id="btn-show-hardware"
            onClick={onOpenHardware}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700/80 rounded-lg text-xs font-mono font-medium transition cursor-pointer"
          >
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>Real Arduino Hardware Schematic</span>
          </button>
        </div>
      </div>
    </div>
  );
};
