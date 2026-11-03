import React, { useEffect, useRef } from 'react';
import { SimulationState, SimulationParams } from '../types/simulation';

interface WaveformCanvasProps {
  simulationState: SimulationState;
  simulationParams: SimulationParams;
  viewMode?: 'stacked' | 'tx' | 'rx' | 'filter' | 'sample';
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  simulationState,
  simulationParams,
  viewMode = 'stacked'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const { signalWaveform, discreteSamples, currentBitIndex, bitProgress, totalBits, binaryStream } = simulationState;

    // Background
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, width, height);

    // If no waveform generated yet
    if (signalWaveform.length === 0 || totalBits === 0) {
      ctx.fillStyle = '#475569';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NO SIGNAL DETECTED — ENTER MESSAGE & PRESS SEND', width / 2, height / 2);
      return;
    }

    // Grid settings
    const marginLeft = 60;
    const marginRight = 25;
    const plotWidth = width - marginLeft - marginRight;
    const pointsPerBit = 16;
    const totalPoints = signalWaveform.length;

    // Determine sub-plots based on viewMode
    interface SubPlotConfig {
      id: string;
      title: string;
      unit: string;
      color: string;
      yMin: number;
      yMax: number;
      type: 'tx' | 'rx' | 'filt' | 'sample';
    }

    let plots: SubPlotConfig[] = [];
    if (viewMode === 'stacked') {
      plots = [
        { id: 'tx', title: 'Transmitted Signal x(t) [Unipolar NRZ]', unit: '5V', color: '#00f2fe', yMin: -0.2, yMax: 1.3, type: 'tx' },
        { id: 'rx', title: 'Received Optical Signal y(t) = α·x(t) + n(t)', unit: 'V_rx', color: '#f59e0b', yMin: -0.4, yMax: 1.4, type: 'rx' },
        { id: 'filt', title: 'Filtered Signal y_filt(t) [Low-Pass FIR]', unit: 'V_filt', color: '#10b981', yMin: -0.3, yMax: 1.3, type: 'filt' },
        { id: 'sample', title: 'Sampled Points x[n] & Decision Threshold', unit: 'Logic', color: '#a855f7', yMin: -0.2, yMax: 1.3, type: 'sample' }
      ];
    } else if (viewMode === 'tx') {
      plots = [{ id: 'tx', title: 'Transmitted Digital Signal x(t)', unit: '5V', color: '#00f2fe', yMin: -0.2, yMax: 1.3, type: 'tx' }];
    } else if (viewMode === 'rx') {
      plots = [{ id: 'rx', title: 'Received Photodiode Signal y(t) with AWGN Noise', unit: 'V_rx', color: '#f59e0b', yMin: -0.4, yMax: 1.4, type: 'rx' }];
    } else if (viewMode === 'filter') {
      plots = [{ id: 'filt', title: 'Filtered Waveform y_filt(t) [Moving Average]', unit: 'V_filt', color: '#10b981', yMin: -0.3, yMax: 1.3, type: 'filt' }];
    } else {
      plots = [{ id: 'sample', title: 'Discrete Sampling x[n] & Threshold Comparator', unit: 'Decision', color: '#a855f7', yMin: -0.2, yMax: 1.3, type: 'sample' }];
    }

    const plotHeight = (height - 35 - plots.length * 15) / plots.length;

    // Draw each subplot
    plots.forEach((p, pIdx) => {
      const plotTop = 25 + pIdx * (plotHeight + 15);
      const plotBottom = plotTop + plotHeight;
      const plotMid = plotTop + plotHeight * 0.5;

      // Plot card background
      ctx.fillStyle = '#081120';
      ctx.fillRect(marginLeft, plotTop, plotWidth, plotHeight);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(marginLeft, plotTop, plotWidth, plotHeight);

      // Subplot Title & Labels
      ctx.fillStyle = p.color;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(p.title, marginLeft + 8, plotTop - 3);

      // Y-axis ticks & values
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('1.0', marginLeft - 8, plotTop + plotHeight * 0.15);
      ctx.fillText('0.5', marginLeft - 8, plotMid);
      ctx.fillText('0.0', marginLeft - 8, plotTop + plotHeight * 0.85);

      // Horizontal dashed guide lines
      ctx.strokeStyle = '#172554';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(marginLeft, plotTop + plotHeight * 0.15);
      ctx.lineTo(marginLeft + plotWidth, plotTop + plotHeight * 0.15);
      ctx.moveTo(marginLeft, plotTop + plotHeight * 0.85);
      ctx.lineTo(marginLeft + plotWidth, plotTop + plotHeight * 0.85);
      ctx.stroke();
      ctx.setLineDash([]);

      // Map value to Y coordinate in plot
      const valToY = (val: number) => {
        const norm = (val - p.yMin) / (p.yMax - p.yMin);
        return plotBottom - norm * plotHeight;
      };

      // Draw bit boundary vertical lines
      for (let b = 0; b <= totalBits; b++) {
        const x = marginLeft + (b / totalBits) * plotWidth;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, plotTop);
        ctx.lineTo(x, plotBottom);
        ctx.stroke();
      }

      // Highlight active bit region
      if (currentBitIndex >= 0 && currentBitIndex < totalBits) {
        const xStart = marginLeft + (currentBitIndex / totalBits) * plotWidth;
        const xEnd = marginLeft + ((currentBitIndex + 1) / totalBits) * plotWidth;
        ctx.fillStyle = 'rgba(14, 165, 233, 0.12)';
        ctx.fillRect(xStart, plotTop, xEnd - xStart, plotHeight);

        // Highlight border
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(xStart, plotTop, xEnd - xStart, plotHeight);
      }

      // Threshold line for sample or filter plot
      if (p.type === 'sample' || p.type === 'filt') {
        const effectiveThresh = simulationParams.threshold / (1.0 + 0.35 * Math.pow(simulationParams.distance - 0.5, 1.8));
        const threshY = valToY(effectiveThresh);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(marginLeft, threshY);
        ctx.lineTo(marginLeft + plotWidth, threshY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = '#ef4444';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`V_th = ${effectiveThresh.toFixed(2)}`, marginLeft + plotWidth - 6, threshY - 4);
      }

      // Draw the actual signal trace
      ctx.lineWidth = 2;
      ctx.strokeStyle = p.color;
      ctx.beginPath();

      if (p.type === 'sample') {
        // Sample stems & dots
        discreteSamples.forEach((s) => {
          const sampleX = marginLeft + ((s.bitIndex + 0.5) / totalBits) * plotWidth;
          const sampleY = valToY(s.rawSample);
          const zeroY = valToY(0);

          // Stem
          ctx.strokeStyle = s.isCorrect ? '#a855f7' : '#f43f5e';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sampleX, zeroY);
          ctx.lineTo(sampleX, sampleY);
          ctx.stroke();

          // Dot
          ctx.fillStyle = s.isCorrect ? (s.decisionBit === 1 ? '#22d3ee' : '#94a3b8') : '#f43f5e';
          ctx.beginPath();
          ctx.arc(sampleX, sampleY, 4, 0, Math.PI * 2);
          ctx.fill();

          // Bit text above dot
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${s.decisionBit}`, sampleX, sampleY - 7);
        });
      } else {
        // Continuous waveform path
        for (let i = 0; i < totalPoints; i++) {
          const sample = signalWaveform[i];
          const x = marginLeft + (i / totalPoints) * plotWidth;
          let val = 0;
          if (p.type === 'tx') val = sample.txValue;
          else if (p.type === 'rx') val = sample.rxValue;
          else if (p.type === 'filt') val = sample.filtValue;

          const y = valToY(val);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Playback scan line (time head)
      if (currentBitIndex >= 0) {
        const headX = marginLeft + ((currentBitIndex + bitProgress) / totalBits) * plotWidth;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(headX, plotTop);
        ctx.lineTo(headX, plotBottom);
        ctx.stroke();
      }
    });

    // Time Axis at Bottom
    const axisY = height - 12;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('0 Tb', marginLeft, axisY);

    for (let b = 1; b <= totalBits; b++) {
      const x = marginLeft + (b / totalBits) * plotWidth;
      ctx.textAlign = 'center';
      if (totalBits <= 24 || b % 4 === 0) {
        ctx.fillText(`${b}Tb`, x, axisY);
      }
    }
    ctx.textAlign = 'right';
    ctx.fillText('Time t →', marginLeft + plotWidth, axisY);

    // Bit labels row above the bottom axis or along top
    for (let b = 0; b < totalBits; b++) {
      const bitCenter = marginLeft + ((b + 0.5) / totalBits) * plotWidth;
      const bitVal = binaryStream[b];
      const isCurrent = b === currentBitIndex;
      ctx.fillStyle = isCurrent ? '#38bdf8' : (bitVal === 1 ? '#00f2fe' : '#475569');
      ctx.font = isCurrent ? 'bold 12px monospace' : '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${bitVal}`, bitCenter, 14);
    }
  }, [simulationState, simulationParams, viewMode]);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-semibold text-slate-200">REAL-TIME TIME-DOMAIN WAVEFORMS</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-400">Tb = Bit Interval</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 bg-cyan-400" /> x(t) TX
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 bg-amber-400" /> y(t) RX
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 bg-emerald-400" /> y_filt(t)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 bg-purple-400" /> x[n] Sampled
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 w-full min-h-[220px]">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
