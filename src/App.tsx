import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SimulationStage, 
  SimulationState, 
  SimulationParams 
} from './types/simulation';
import { 
  textToAsciiData, 
  asciiDataToBinaryStream, 
  processLifiPipeline, 
  STAGE_DEFINITIONS 
} from './utils/dsp';
import { ThreeLabScene } from './components/ThreeLabScene';
import { WaveformCanvas } from './components/WaveformCanvas';
import { StepProgressBar } from './components/StepProgressBar';
import { SignalsSystemsPanel } from './components/SignalsSystemsPanel';
import { AsciiBinaryCards } from './components/AsciiBinaryCards';
import { ControlBar } from './components/ControlBar';
import { FftModal } from './components/FftModal';
import { HardwareModal } from './components/HardwareModal';
import { PresentationOverlay } from './components/PresentationOverlay';
import { Radio, Lightbulb, Activity, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

export default function App() {
  const [inputMessage, setInputMessage] = useState<string>('HELLO');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStepMode, setIsStepMode] = useState<boolean>(false);
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [isFftOpen, setIsFftOpen] = useState<boolean>(false);
  const [isHardwareOpen, setIsHardwareOpen] = useState<boolean>(false);
  const [waveformView, setWaveformView] = useState<'stacked' | 'tx' | 'rx' | 'filter' | 'sample'>('stacked');

  // Simulation Parameters
  const [params, setParams] = useState<SimulationParams>({
    speed: 1.0,
    noiseLevel: 0.15,
    samplingRate: 1,
    distance: 1.2,
    threshold: 0.5,
    filterWindow: 5
  });

  // Central Single Authoritative Simulation State
  const [state, setState] = useState<SimulationState>(() => {
    const ascii = textToAsciiData('HELLO');
    const binary = asciiDataToBinaryStream(ascii);
    const pipeline = processLifiPipeline(binary, {
      speed: 1.0,
      noiseLevel: 0.15,
      samplingRate: 1,
      distance: 1.2,
      threshold: 0.5,
      filterWindow: 5
    });

    return {
      message: 'HELLO',
      asciiChars: ascii,
      binaryStream: binary,
      totalBits: binary.length,
      currentBitIndex: 0,
      currentBitValue: binary[0] || 0,
      bitProgress: 0,
      signalWaveform: pipeline.signalWaveform,
      discreteSamples: pipeline.discreteSamples,
      decodedBits: pipeline.decodedBits,
      decodedChars: pipeline.decodedChars,
      decodedMessage: pipeline.decodedMessage,
      errorIndices: pipeline.errorIndices,
      errorCount: pipeline.errorCount,
      ber: pipeline.ber,
      currentStage: 1,
      status: 'idle'
    };
  });

  // Keep ref to latest state for requestAnimationFrame loop
  const stateRef = useRef(state);
  stateRef.current = state;
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // Recompute signal pipeline when noise / distance / threshold changes
  useEffect(() => {
    setState(prev => {
      if (prev.binaryStream.length === 0) return prev;
      const pipeline = processLifiPipeline(prev.binaryStream, params);
      return {
        ...prev,
        signalWaveform: pipeline.signalWaveform,
        discreteSamples: pipeline.discreteSamples,
        decodedBits: pipeline.decodedBits,
        decodedChars: pipeline.decodedChars,
        decodedMessage: pipeline.decodedMessage,
        errorIndices: pipeline.errorIndices,
        errorCount: pipeline.errorCount,
        ber: pipeline.ber
      };
    });
  }, [params.noiseLevel, params.distance, params.threshold, params.filterWindow]);

  // Handle Send / Initialize Message
  const handleSend = useCallback((targetText?: string) => {
    const text = (targetText ?? inputMessage).trim().toUpperCase();
    if (!text || text.length === 0) {
      setErrorMessage('Please enter a message first.');
      return;
    }
    if (text.length > 30) {
      setErrorMessage('Please use a message shorter than 30 characters for the classroom simulation.');
      return;
    }

    setErrorMessage(null);
    const ascii = textToAsciiData(text);
    const binary = asciiDataToBinaryStream(ascii);
    const pipeline = processLifiPipeline(binary, paramsRef.current);

    setState({
      message: text,
      asciiChars: ascii,
      binaryStream: binary,
      totalBits: binary.length,
      currentBitIndex: 0,
      currentBitValue: binary[0] || 0,
      bitProgress: 0,
      signalWaveform: pipeline.signalWaveform,
      discreteSamples: pipeline.discreteSamples,
      decodedBits: pipeline.decodedBits,
      decodedChars: pipeline.decodedChars,
      decodedMessage: pipeline.decodedMessage,
      errorIndices: pipeline.errorIndices,
      errorCount: pipeline.errorCount,
      ber: pipeline.ber,
      currentStage: 1,
      status: 'idle'
    });
  }, [inputMessage]);

  // Play All Transmission
  const handlePlayAll = useCallback(() => {
    if (state.totalBits === 0) {
      handleSend();
    }
    setIsStepMode(false);
    setState(prev => ({
      ...prev,
      status: 'playing',
      currentStage: prev.status === 'completed' ? 1 : prev.currentStage
    }));
  }, [state.totalBits, handleSend]);

  // Pause
  const handlePause = useCallback(() => {
    setState(prev => ({ ...prev, status: 'paused' }));
  }, []);

  // Reset
  const handleReset = useCallback(() => {
    setErrorMessage(null);
    const defaultAscii = textToAsciiData('HELLO');
    const defaultBinary = asciiDataToBinaryStream(defaultAscii);
    const pipeline = processLifiPipeline(defaultBinary, paramsRef.current);

    setInputMessage('HELLO');
    setIsStepMode(false);
    setState({
      message: 'HELLO',
      asciiChars: defaultAscii,
      binaryStream: defaultBinary,
      totalBits: defaultBinary.length,
      currentBitIndex: 0,
      currentBitValue: defaultBinary[0] || 0,
      bitProgress: 0,
      signalWaveform: pipeline.signalWaveform,
      discreteSamples: pipeline.discreteSamples,
      decodedBits: pipeline.decodedBits,
      decodedChars: pipeline.decodedChars,
      decodedMessage: pipeline.decodedMessage,
      errorIndices: pipeline.errorIndices,
      errorCount: pipeline.errorCount,
      ber: pipeline.ber,
      currentStage: 1,
      status: 'idle'
    });
  }, []);

  // Step Mode Navigation
  const handleNextStep = useCallback(() => {
    setState(prev => {
      const nextStage = Math.min(16, (prev.currentStage + 1)) as SimulationStage;
      // Also advance bit index proportional to stage
      const bitProgressRatio = (nextStage - 1) / 15;
      const nextBitIdx = Math.min(prev.totalBits - 1, Math.floor(bitProgressRatio * prev.totalBits));
      return {
        ...prev,
        currentStage: nextStage,
        currentBitIndex: nextBitIdx,
        currentBitValue: prev.binaryStream[nextBitIdx] || 0,
        status: nextStage === 16 ? 'completed' : 'paused'
      };
    });
  }, []);

  const handlePrevStep = useCallback(() => {
    setState(prev => {
      const prevStage = Math.max(1, (prev.currentStage - 1)) as SimulationStage;
      const bitProgressRatio = (prevStage - 1) / 15;
      const prevBitIdx = Math.min(prev.totalBits - 1, Math.floor(bitProgressRatio * prev.totalBits));
      return {
        ...prev,
        currentStage: prevStage,
        currentBitIndex: prevBitIdx,
        currentBitValue: prev.binaryStream[prevBitIdx] || 0,
        status: 'paused'
      };
    });
  }, []);

  // Direct Jump to a specific stage
  const handleSelectStage = useCallback((stage: SimulationStage) => {
    setState(prev => {
      const ratio = (stage - 1) / 15;
      const bitIdx = Math.min(prev.totalBits - 1, Math.floor(ratio * prev.totalBits));
      return {
        ...prev,
        currentStage: stage,
        currentBitIndex: bitIdx,
        currentBitValue: prev.binaryStream[bitIdx] || 0,
        status: stage === 16 ? 'completed' : 'paused'
      };
    });
  }, []);

  // Main synchronized animation ticker
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const deltaMs = now - lastTime;
      lastTime = now;

      const curr = stateRef.current;
      const curParams = paramsRef.current;

      if (curr.status === 'playing' && curr.totalBits > 0) {
        // Base bit period = 450ms / speed factor
        const bitDurationMs = 450 / Math.max(0.2, curParams.speed);
        const progressIncrement = deltaMs / bitDurationMs;
        let newProgress = curr.bitProgress + progressIncrement;

        if (newProgress >= 1.0) {
          // Advance to next bit
          const nextBitIndex = curr.currentBitIndex + 1;

          if (nextBitIndex >= curr.totalBits) {
            // Completed transmission! Advance to final stage
            setState(prev => ({
              ...prev,
              currentBitIndex: prev.totalBits - 1,
              currentBitValue: prev.binaryStream[prev.totalBits - 1] || 0,
              bitProgress: 1.0,
              currentStage: 16,
              status: 'completed'
            }));
          } else {
            // Calculate dynamic stage progression matching the physical process
            // Stages 1-3 happen early, 4-12 during transmission, 13-16 at finish
            const progressRatio = nextBitIndex / curr.totalBits;
            let targetStage: SimulationStage = 6; // LED Blinking default during transmission

            if (progressRatio < 0.08) targetStage = 1;
            else if (progressRatio < 0.16) targetStage = 2;
            else if (progressRatio < 0.24) targetStage = 3;
            else if (progressRatio < 0.32) targetStage = 4;
            else if (progressRatio < 0.40) targetStage = 5;
            else if (progressRatio < 0.50) targetStage = 6;
            else if (progressRatio < 0.60) targetStage = 7;
            else if (progressRatio < 0.70) targetStage = 8;
            else if (progressRatio < 0.78) targetStage = 9;
            else if (progressRatio < 0.86) targetStage = 10;
            else if (progressRatio < 0.94) targetStage = 11;
            else targetStage = 12;

            setState(prev => ({
              ...prev,
              currentBitIndex: nextBitIndex,
              currentBitValue: prev.binaryStream[nextBitIndex] || 0,
              bitProgress: newProgress - 1.0,
              currentStage: targetStage
            }));
          }
        } else {
          // Just update sub-bit progress for smooth scanline
          setState(prev => ({
            ...prev,
            bitProgress: newProgress
          }));
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Keyboard shortcut listener for presentation convenience
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in the input box
      if (e.target instanceof HTMLInputElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (stateRef.current.status === 'playing') handlePause();
        else handlePlayAll();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNextStep();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrevStep();
      } else if (e.code === 'Escape') {
        setIsPresentationMode(false);
        setIsFftOpen(false);
        setIsHardwareOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayAll, handlePause, handleNextStep, handlePrevStep]);

  const currentStageInfo = STAGE_DEFINITIONS[state.currentStage];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Banner & Title Bar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl shadow-md shadow-cyan-500/20">
            <Radio className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold font-mono tracking-tight text-white">
                3D Li-Fi Data Transmission Simulator
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-cyan-950 text-cyan-400 rounded-full border border-cyan-800/80">
                Signals & Systems Lab
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              End-to-End Optical Communication & Signal Processing Simulation // IEEE 802.15.7 VLC
            </p>
          </div>
        </div>

        {/* Quick status badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${
              state.status === 'playing' ? 'bg-cyan-400 animate-pulse' :
              state.status === 'completed' ? 'bg-emerald-400' : 'bg-slate-500'
            }`} />
            <span className="uppercase text-slate-300 font-semibold">{state.status}</span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400">Step {state.currentStage}/16</span>
          </div>

          <button
            onClick={() => setIsHardwareOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hardware BOM</span>
          </button>
        </div>
      </header>

      {/* 16-Stage Step Progress Bar */}
      <StepProgressBar
        currentStage={state.currentStage}
        onSelectStage={handleSelectStage}
        status={state.status}
      />

      {/* Control Bar: Message input, Presets, Send, Play, Sliders */}
      <ControlBar
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        onSend={() => handleSend()}
        onPlayAll={handlePlayAll}
        onPause={handlePause}
        onReset={handleReset}
        onNext={handleNextStep}
        onPrev={handlePrevStep}
        onToggleStepMode={() => setIsStepMode(!isStepMode)}
        status={state.status}
        isStepMode={isStepMode}
        params={params}
        setParams={setParams}
        onTogglePresentation={() => setIsPresentationMode(true)}
        isPresentationMode={isPresentationMode}
        onOpenFft={() => setIsFftOpen(true)}
        onOpenHardware={() => setIsHardwareOpen(true)}
        errorMessage={errorMessage}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 p-3 sm:p-4 grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-0">
        {/* Left Area: 3D Scene + Waveform Oscilloscope (8 cols on XL) */}
        <div className="xl:col-span-8 flex flex-col gap-4 min-h-0">
          {/* 3D Lab Simulation Viewport */}
          <div className="h-[380px] sm:h-[420px] w-full">
            <ThreeLabScene
              simulationState={state}
              opticalDistance={params.distance}
              activeTarget={currentStageInfo.focusTarget}
            />
          </div>

          {/* Oscilloscope Waveforms Card */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-slate-300 uppercase">OSCILLOSCOPE WAVEFORM MONITOR</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {[
                  { id: 'stacked', label: 'Stacked (All)' },
                  { id: 'tx', label: 'x(t) TX' },
                  { id: 'rx', label: 'y(t) RX' },
                  { id: 'filter', label: 'Filter' },
                  { id: 'sample', label: 'Samples x[n]' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setWaveformView(tab.id as any)}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                      waveformView === tab.id
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[280px] sm:h-[320px] w-full">
              <WaveformCanvas
                simulationState={state}
                simulationParams={params}
                viewMode={waveformView}
              />
            </div>
          </div>

          {/* ASCII & Binary Serialization Cards */}
          <AsciiBinaryCards simulationState={state} />
        </div>

        {/* Right Area: Signals & Systems Educational Panel + Transmission Status (4 cols on XL) */}
        <div className="xl:col-span-4 flex flex-col gap-4 min-h-0">
          {/* S&S Concepts Panel */}
          <div className="flex-1 min-h-[460px]">
            <SignalsSystemsPanel
              currentStage={state.currentStage}
              simulationState={state}
              simulationParams={params}
              onOpenFft={() => setIsFftOpen(true)}
              onOpenHardware={() => setIsHardwareOpen(true)}
            />
          </div>

          {/* Final Receiver Decoded Message Card */}
          <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-cyan-400" />
                Li-Fi RECEIVER TERMINAL OUTPUT
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                state.ber === 0 && state.decodedMessage.length > 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                state.errorCount > 0 ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-slate-800 text-slate-400'
              }`}>
                {state.ber === 0 && state.decodedMessage.length > 0 ? 'SUCCESS' :
                 state.errorCount > 0 ? 'ERRORS DETECTED' : 'AWAITING RECEPTION'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800/90 text-center space-y-1">
              <span className="text-[11px] text-slate-500 block uppercase">RECONSTRUCTED MESSAGE</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-widest text-cyan-300">
                "{state.decodedMessage || '...'}"
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-950/70 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">ORIGINAL:</span>
                <span className="text-slate-200 font-bold">{state.message}</span>
              </div>
              <div className="p-2 bg-slate-950/70 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">RECOVERED:</span>
                <span className={`font-bold ${state.ber === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {state.decodedMessage || '...'}
                </span>
              </div>
              <div className="p-2 bg-slate-950/70 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">TOTAL BITS:</span>
                <span className="text-slate-200 font-bold">{state.totalBits}</span>
              </div>
              <div className="p-2 bg-slate-950/70 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">BIT ERROR RATE (BER):</span>
                <span className={`font-bold ${state.ber === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {(state.ber * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {state.status === 'completed' && (
              <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/50 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Transmission Complete ✓ Data recovered successfully across optical channel!</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Classroom Presentation Mode Fullscreen Overlay */}
      <PresentationOverlay
        isOpen={isPresentationMode}
        onClose={() => setIsPresentationMode(false)}
        simulationState={state}
        simulationParams={params}
        onPlayAll={handlePlayAll}
        onPause={handlePause}
        onNext={handleNextStep}
        onPrev={handlePrevStep}
        onReset={handleReset}
      />

      {/* FFT Modal */}
      <FftModal
        isOpen={isFftOpen}
        onClose={() => setIsFftOpen(false)}
        simulationState={state}
      />

      {/* Physical Hardware Extension Modal */}
      <HardwareModal
        isOpen={isHardwareOpen}
        onClose={() => setIsHardwareOpen(false)}
      />

      {/* Footer with Author Attribution */}
      <footer className="px-4 py-2.5 bg-slate-900/95 border-t border-slate-800 text-xs font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span>3D Li-Fi Data Transmission Simulator // Signals &amp; Systems Laboratory</span>
        <span>
          Author:{' '}
          <a
            href="https://jamshedali.me"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 font-bold underline decoration-cyan-500/50 hover:decoration-cyan-300 transition"
          >
            Jamshed Ali
          </a>
        </span>
      </footer>
    </div>
  );
}
