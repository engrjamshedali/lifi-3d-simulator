import React from 'react';
import { SimulationStage } from '../types/simulation';
import { STAGE_DEFINITIONS } from '../utils/dsp';
import { 
  Type, 
  Binary, 
  Cpu, 
  Sun, 
  Radio, 
  Disc, 
  Activity, 
  Filter, 
  Sliders, 
  CheckCircle2, 
  FileText,
  Zap,
  Layers,
  ArrowRight
} from 'lucide-react';

interface StepProgressBarProps {
  currentStage: SimulationStage;
  onSelectStage: (stage: SimulationStage) => void;
  status: 'idle' | 'playing' | 'paused' | 'completed';
}

const STAGE_ICONS: Record<number, React.ReactNode> = {
  1: <Type className="w-3.5 h-3.5" />,
  2: <FileText className="w-3.5 h-3.5" />,
  3: <Binary className="w-3.5 h-3.5" />,
  4: <Activity className="w-3.5 h-3.5" />,
  5: <Cpu className="w-3.5 h-3.5" />,
  6: <Sun className="w-3.5 h-3.5" />,
  7: <Radio className="w-3.5 h-3.5" />,
  8: <Disc className="w-3.5 h-3.5" />,
  9: <Activity className="w-3.5 h-3.5" />,
  10: <Filter className="w-3.5 h-3.5" />,
  11: <Sliders className="w-3.5 h-3.5" />,
  12: <Zap className="w-3.5 h-3.5" />,
  13: <Layers className="w-3.5 h-3.5" />,
  14: <Activity className="w-3.5 h-3.5" />,
  15: <Binary className="w-3.5 h-3.5" />,
  16: <CheckCircle2 className="w-3.5 h-3.5" />
};

export const StepProgressBar: React.FC<StepProgressBarProps> = ({
  currentStage,
  onSelectStage,
  status
}) => {
  const stages = Array.from({ length: 16 }, (_, i) => (i + 1) as SimulationStage);

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-2 py-2 overflow-x-auto select-none scrollbar-thin">
      <div className="flex items-center min-w-max gap-1 px-1">
        {stages.map((stg, index) => {
          const info = STAGE_DEFINITIONS[stg];
          const isActive = currentStage === stg;
          const isPassed = currentStage > stg || status === 'completed';

          return (
            <React.Fragment key={stg}>
              <button
                id={`step-badge-${stg}`}
                onClick={() => onSelectStage(stg)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-lg shadow-cyan-500/30 scale-105 ring-2 ring-cyan-300'
                    : isPassed
                    ? 'bg-slate-800/90 text-cyan-400 hover:bg-slate-700/80 border border-slate-700/60'
                    : 'bg-slate-950/70 text-slate-400 hover:bg-slate-800/60 border border-slate-800/80'
                }`}
                title={`${stg}. ${info.title}: ${info.subtitle}`}
              >
                <span className={`flex items-center justify-center ${isActive ? 'text-slate-950' : isPassed ? 'text-cyan-400' : 'text-slate-400'}`}>
                  {STAGE_ICONS[stg]}
                </span>
                <span className="font-semibold">{stg}</span>
                <span className="text-[11px] font-sans font-medium">{info.shortTitle}</span>
              </button>

              {index < stages.length - 1 && (
                <ArrowRight className={`w-3 h-3 shrink-0 ${isPassed ? 'text-cyan-500/70' : 'text-slate-700'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
