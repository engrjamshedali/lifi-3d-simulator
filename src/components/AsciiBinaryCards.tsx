import React from 'react';
import { SimulationState } from '../types/simulation';
import { Check, X, ArrowRight, Binary, FileText } from 'lucide-react';

interface AsciiBinaryCardsProps {
  simulationState: SimulationState;
}

export const AsciiBinaryCards: React.FC<AsciiBinaryCardsProps> = ({ simulationState }) => {
  const {
    asciiChars,
    binaryStream,
    currentBitIndex,
    currentBitValue,
    decodedBits,
    decodedChars,
    errorIndices,
    totalBits,
    ber,
    errorCount,
    message,
    decodedMessage,
    currentStage
  } = simulationState;

  if (asciiChars.length === 0) {
    return (
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-center font-mono text-xs text-slate-400">
        Enter a message and click SEND to view ASCII & Binary serialization.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 bg-slate-950/90 rounded-xl border border-slate-800 p-3.5 shadow-xl">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Binary className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider">
            CHARACTER ENCODING & BITSTREAM SERIALIZATION
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-slate-400">Total: {message.length} Bytes ({totalBits} Bits)</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400">Active Bit: #{currentBitIndex + 1} ({currentBitValue})</span>
        </div>
      </div>

      {/* Character to ASCII to Binary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {asciiChars.map((item, charIdx) => {
          const charStartBit = charIdx * 8;
          const charEndBit = charStartBit + 8;
          const isCharActive = currentBitIndex >= charStartBit && currentBitIndex < charEndBit;

          return (
            <div
              key={charIdx}
              className={`p-2.5 rounded-lg border transition-all ${
                isCharActive
                  ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                  : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Char & ASCII Header */}
              <div className="flex items-center justify-between mb-1.5 font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Char:</span>
                  <span className="text-sm font-bold text-cyan-300 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700">
                    '{item.char}'
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-400">ASCII:</span>
                  <span className="font-bold text-amber-300">{item.ascii}</span>
                </div>
              </div>

              {/* 8-bit binary representation */}
              <div className="text-[11px] font-mono text-slate-400 mb-1 flex items-center justify-between">
                <span>8-Bit Byte:</span>
                <span className="text-[10px] text-slate-400">MSB → LSB</span>
              </div>

              <div className="grid grid-cols-8 gap-0.5 bg-slate-950 p-1 rounded border border-slate-800/80">
                {item.binary.split('').map((bit, bitOffset) => {
                  const globalBitIdx = charStartBit + bitOffset;
                  const isCurrentBit = globalBitIdx === currentBitIndex;
                  const isPassed = globalBitIdx < currentBitIndex;
                  const hasError = errorIndices.includes(globalBitIdx);

                  let bgClass = 'bg-slate-900 text-slate-400';
                  if (isCurrentBit) {
                    bgClass = 'bg-cyan-500 text-slate-950 font-bold animate-pulse';
                  } else if (hasError && isPassed) {
                    bgClass = 'bg-rose-950/80 text-rose-300 border border-rose-600/80';
                  } else if (isPassed) {
                    bgClass = bit === '1' ? 'bg-cyan-950 text-cyan-300' : 'bg-slate-900 text-slate-400';
                  }

                  return (
                    <div
                      key={bitOffset}
                      className={`text-center py-1 text-[11px] font-mono rounded transition-colors ${bgClass}`}
                      title={`Bit #${globalBitIdx + 1}: ${bit}`}
                    >
                      {bit}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bit Recovery & BER Comparator (Visible during later stages or always for live feedback) */}
      {(currentStage >= 12 || decodedBits.length > 0) && (
        <div className="mt-2 pt-2.5 border-t border-slate-800 space-y-2 font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              BIT-BY-BIT RECOVERY COMPARISON:
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span>Total: <strong className="text-slate-200">{totalBits}</strong></span>
              <span>Correct: <strong className="text-emerald-400">{totalBits - errorCount}</strong></span>
              <span>Errors: <strong className={errorCount > 0 ? 'text-rose-400' : 'text-slate-400'}>{errorCount}</strong></span>
              <span>BER: <strong className={ber === 0 ? 'text-emerald-400' : 'text-rose-400'}>{(ber * 100).toFixed(1)}%</strong></span>
            </div>
          </div>

          {/* Transmitted vs Received bit strips */}
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/90 text-xs overflow-x-auto">
            <div className="flex items-center gap-1 text-[11px] mb-1">
              <span className="w-16 text-slate-400 text-right shrink-0">TX Bit:</span>
              <div className="flex gap-1">
                {binaryStream.map((b, i) => (
                  <span
                    key={i}
                    className={`w-4 text-center ${i === currentBitIndex ? 'text-cyan-300 font-bold bg-slate-800 rounded' : 'text-slate-400'}`}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] mb-1">
              <span className="w-16 text-slate-400 text-right shrink-0">RX Bit:</span>
              <div className="flex gap-1">
                {decodedBits.map((b, i) => {
                  const isMatch = b === binaryStream[i];
                  return (
                    <span
                      key={i}
                      className={`w-4 text-center font-bold ${
                        isMatch ? 'text-emerald-400' : 'text-rose-400 bg-rose-950/60 rounded'
                      }`}
                    >
                      {b}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-1 text-[10px]">
              <span className="w-16 text-slate-400 text-right shrink-0">Match:</span>
              <div className="flex gap-1">
                {decodedBits.map((b, i) => {
                  const isMatch = b === binaryStream[i];
                  return (
                    <span
                      key={i}
                      className={`w-4 text-center font-bold ${isMatch ? 'text-emerald-500' : 'text-rose-500'}`}
                    >
                      {isMatch ? '✓' : '✗'}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
