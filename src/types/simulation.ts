/**
 * Simulation Types for 3D Li-Fi Data Transmission Simulator
 * Signals & Systems Laboratory Presentation
 */

export type SimulationStage = 
  | 1  // Typing Message
  | 2  // ASCII Conversion
  | 3  // ASCII to Binary
  | 4  // Digital Signal Generation
  | 5  // Arduino TX
  | 6  // LED Blinking
  | 7  // Optical Li-Fi Channel
  | 8  // Photodiode Receiver
  | 9  // Received Signal (Noisy)
  | 10 // Filtering
  | 11 // Sampling
  | 12 // Threshold Detection
  | 13 // Bit Recovery & Comparison
  | 14 // BER Calculation
  | 15 // Binary to ASCII
  | 16 // Final Message & Report;

export interface AsciiCharData {
  char: string;
  ascii: number;
  binary: string; // 8-bit binary e.g. "01001000"
}

export interface SignalSample {
  t: number;      // time in ms or normalized
  bitIndex: number;
  txValue: number;    // 0 or 1
  rxValue: number;    // with noise and attenuation
  filtValue: number;  // filtered value
}

export interface DiscreteSample {
  index: number;
  time: number;
  bitIndex: number;
  rawSample: number;
  decisionBit: number;
  isCorrect: boolean;
}

export interface SimulationState {
  message: string;
  asciiChars: AsciiCharData[];
  binaryStream: number[]; // e.g. [0, 1, 0, 0, ...]
  totalBits: number;
  
  // Real-time animation state
  currentBitIndex: number; // 0 to totalBits - 1
  currentBitValue: number; // 0 or 1
  bitProgress: number;     // 0.0 to 1.0 within the current bit period
  
  // Waveforms
  signalWaveform: SignalSample[];
  discreteSamples: DiscreteSample[];
  
  // Receiver recovery
  decodedBits: number[];
  decodedChars: { char: string; ascii: number; binary: string; isMatch: boolean }[];
  decodedMessage: string;
  
  // Analytics
  errorIndices: number[];
  errorCount: number;
  ber: number; // 0.0 to 1.0
  
  // Stage tracking
  currentStage: SimulationStage;
  status: 'idle' | 'playing' | 'paused' | 'completed';
}

export interface SimulationParams {
  speed: number;        // Multiplier e.g. 0.5x, 1x, 2x
  noiseLevel: number;   // 0.0 to 0.8 (0% to 80%)
  samplingRate: number; // 1 to 4 samples per bit
  distance: number;     // 0.5m to 3.0m (optical path loss)
  threshold: number;    // 0.1 to 0.9 (default 0.5)
  filterWindow: number; // Moving average window size e.g. 3, 5, 7
}

export interface StageInfo {
  stage: SimulationStage;
  title: string;
  shortTitle: string;
  subtitle: string;
  conceptTitle: string;
  conceptFormula?: string;
  conceptExplanation: string;
  focusTarget: 'overview' | 'txLaptop' | 'arduinoTx' | 'led' | 'channel' | 'photodiode' | 'arduinoRx' | 'rxLaptop' | 'waveforms';
}
