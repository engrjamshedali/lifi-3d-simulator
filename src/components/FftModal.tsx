import React, { useEffect, useRef } from 'react';
import { SimulationState } from '../types/simulation';
import { computeFFT } from '../utils/dsp';
import { X, BarChart3, Info } from 'lucide-react';

interface FftModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulationState: SimulationState;
}

export const FftModal: React.FC<FftModalProps> = ({ isOpen, onClose, simulationState }) => {
  const timeCanvasRef = useRef<HTMLCanvasElement>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Time domain waveform
    const timeCanvas = timeCanvasRef.current;
    if (timeCanvas) {
      const ctx = timeCanvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        const rect = timeCanvas.getBoundingClientRect();
        timeCanvas.width = rect.width * dpr;
        timeCanvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const w = rect.width;
        const h = rect.height;
        ctx.fillStyle = '#050b14';
        ctx.fillRect(0, 0, w, h);

        const data = simulationState.signalWaveform;
        if (data.length > 0) {
          ctx.strokeStyle = '#00f2fe';
          ctx.lineWidth = 2;
          ctx.beginPath();
          data.forEach((pt, i) => {
            const x = (i / data.length) * (w - 40) + 30;
            const y = h - 20 - pt.txValue * (h - 40);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();

          // Axes
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(30, 10);
          ctx.lineTo(30, h - 20);
          ctx.lineTo(w - 10, h - 20);
          ctx.stroke();

          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px monospace';
          ctx.fillText('1.0', 5, 20);
          ctx.fillText('0.0', 5, h - 20);
          ctx.fillText('Time t →', w - 50, h - 6);
        }
      }
    }

    // 2. Frequency domain FFT
    const freqCanvas = freqCanvasRef.current;
    if (freqCanvas) {
      const ctx = freqCanvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        const rect = freqCanvas.getBoundingClientRect();
        freqCanvas.width = rect.width * dpr;
        freqCanvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const w = rect.width;
        const h = rect.height;
        ctx.fillStyle = '#050b14';
        ctx.fillRect(0, 0, w, h);

        // Extract TX signal values for FFT
        const rawSignal = simulationState.signalWaveform.map(s => s.txValue);
        const { frequencies, magnitudes } = computeFFT(rawSignal);

        const marginLeft = 40;
        const marginBottom = 25;
        const plotW = w - marginLeft - 20;
        const plotH = h - marginBottom - 20;

        // Grid & axes
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(marginLeft, 10);
        ctx.lineTo(marginLeft, h - marginBottom);
        ctx.lineTo(w - 10, h - marginBottom);
        ctx.stroke();

        // Spectrum bars & envelope
        if (magnitudes.length > 0) {
          const barWidth = Math.max(2, (plotW / magnitudes.length) - 2);

          // Draw bars
          magnitudes.forEach((mag, idx) => {
            const x = marginLeft + (idx / magnitudes.length) * plotW;
            const barH = mag * plotH;
            const y = h - marginBottom - barH;

            // Gradient bar
            const grad = ctx.createLinearGradient(0, y, 0, h - marginBottom);
            grad.addColorStop(0, '#38bdf8');
            grad.addColorStop(1, '#0284c7');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barWidth, barH);
          });

          // Continuous envelope line
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          magnitudes.forEach((mag, idx) => {
            const x = marginLeft + (idx / magnitudes.length) * plotW + barWidth / 2;
            const y = h - marginBottom - mag * plotH;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();

          // Labels
          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px monospace';
          ctx.fillText('|X(f)|', 5, 20);
          ctx.fillText('0', 15, h - marginBottom);
          ctx.fillText('DC (0 Hz)', marginLeft, h - 8);
          ctx.fillText('f_0', marginLeft + plotW * 0.25, h - 8);
          ctx.fillText('Harmonics →', marginLeft + plotW * 0.7, h - 8);
        }
      }
    }
  }, [isOpen, simulationState]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950/60 text-cyan-400 rounded-lg border border-cyan-800/60">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono">
                FOURIER ANALYSIS // FFT SPECTRUM VISUALIZER
              </h2>
              <p className="text-xs text-slate-400">
                Continuous-Time Waveform vs Discrete-Time Discrete Fourier Transform (DFT / FFT)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
          {/* S&S Explanation Callout */}
          <div className="flex items-start gap-3 p-3.5 bg-cyan-950/30 rounded-xl border border-cyan-800/50 text-xs text-slate-300">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-cyan-300">Signals & Systems Insight: Fourier Decomposition</span>
              <p>
                Every time-domain digital signal <code>x(t)</code> composed of square pulses contains infinite frequency harmonics. 
                The Fourier Transform <code>X(f) = ∫ x(t) e^&#123;-j 2π f t&#125; dt</code> maps the temporal pulse train into 
                spectral lobes governed by the sinc function <code>sinc(f·T_b)</code>. The fundamental frequency <code>f_0 = 1 / T_b</code> defines the minimum transmission bandwidth required in the optical channel.
              </p>
            </div>
          </div>

          {/* Time Domain Canvas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-cyan-300">1. Time Domain: Digital Waveform x(t)</span>
              <span className="text-slate-400">T_b = Bit Duration</span>
            </div>
            <div className="h-40 w-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <canvas ref={timeCanvasRef} className="w-full h-full block" />
            </div>
          </div>

          {/* Frequency Domain Canvas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-amber-300">2. Frequency Domain: Magnitude Spectrum |X(f)| (FFT)</span>
              <span className="text-slate-400">Normalized Amplitude vs Frequency Bins</span>
            </div>
            <div className="h-48 w-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <canvas ref={freqCanvasRef} className="w-full h-full block" />
            </div>
          </div>

          {/* Spectral Characteristics Table */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px]">DC COMPONENT (0 Hz)</span>
              <span className="text-slate-200 font-bold">Average Bit Energy</span>
              <p className="text-[11px] text-slate-400 mt-1">Unipolar NRZ has strong non-zero DC bias from optical intensity.</p>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px]">NULL BANDWIDTH</span>
              <span className="text-cyan-400 font-bold">B_null = 1 / T_b</span>
              <p className="text-[11px] text-slate-400 mt-1">First spectral null corresponds directly to bit rate.</p>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px]">OPTICAL CHANNEL FILTER</span>
              <span className="text-emerald-400 font-bold">Photodiode Cutoff</span>
              <p className="text-[11px] text-slate-400 mt-1">RC junction capacitance acts as low-pass filter limiting bandwidth.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono font-medium transition cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
