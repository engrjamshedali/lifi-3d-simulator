/**
 * Digital Signal Processing & Signals and Systems Mathematical Utilities
 * for Li-Fi Transmission Simulation
 */

import { AsciiCharData, DiscreteSample, SignalSample, SimulationParams, StageInfo } from '../types/simulation';

/**
 * Converts a text string into detailed ASCII character data
 */
export function textToAsciiData(text: string): AsciiCharData[] {
  const result: AsciiCharData[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const ascii = char.charCodeAt(0);
    // Pad to 8-bit binary representation
    const binary = ascii.toString(2).padStart(8, '0');
    result.push({ char, ascii, binary });
  }
  return result;
}

/**
 * Extracts a continuous bit array from ASCII data
 */
export function asciiDataToBinaryStream(asciiData: AsciiCharData[]): number[] {
  const stream: number[] = [];
  for (const item of asciiData) {
    for (let b = 0; b < item.binary.length; b++) {
      stream.push(parseInt(item.binary[b], 10));
    }
  }
  return stream;
}

/**
 * Generates Gaussian random variable via Box-Muller transform
 */
export function gaussianRandom(mean = 0, stdev = 1): number {
  const u1 = Math.max(1e-10, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdev + mean;
}

/**
 * Computes full signal simulation pipeline:
 * 1. Transmitted digital signal x(t)
 * 2. Optical channel attenuation & AWGN noise y(t) = A*x(t) + n(t)
 * 3. Moving-average low-pass filtering y_filt(t)
 * 4. Discrete-time sampling x[n]
 * 5. Decision thresholding & bit recovery
 * 6. Decoded message & BER
 */
export function processLifiPipeline(
  binaryStream: number[],
  params: SimulationParams
): {
  signalWaveform: SignalSample[];
  discreteSamples: DiscreteSample[];
  decodedBits: number[];
  errorIndices: number[];
  errorCount: number;
  ber: number;
  decodedMessage: string;
  decodedChars: { char: string; ascii: number; binary: string; isMatch: boolean }[];
} {
  const totalBits = binaryStream.length;
  if (totalBits === 0) {
    return {
      signalWaveform: [],
      discreteSamples: [],
      decodedBits: [],
      errorIndices: [],
      errorCount: 0,
      ber: 0,
      decodedMessage: '',
      decodedChars: []
    };
  }

  // 16 continuous time points per bit period for smooth waveform rendering
  const pointsPerBit = 16;
  const totalPoints = totalBits * pointsPerBit;
  const signalWaveform: SignalSample[] = new Array(totalPoints);

  // Optical path loss: Intensity drops with distance (free-space optical link)
  // Distance range 0.5m to 3.0m
  const opticalAttenuation = 1.0 / (1.0 + 0.35 * Math.pow(params.distance - 0.5, 1.8));

  // Noise standard deviation proportional to noise slider
  const noiseSigma = params.noiseLevel * 0.45;

  // Step 1 & 2: Generate x(t) and y(t)
  for (let bitIdx = 0; bitIdx < totalBits; bitIdx++) {
    const bitVal = binaryStream[bitIdx];
    const prevBitVal = bitIdx > 0 ? binaryStream[bitIdx - 1] : 0;

    for (let p = 0; p < pointsPerBit; p++) {
      const idx = bitIdx * pointsPerBit + p;
      const tNorm = p / pointsPerBit;

      // Realistic pulse shaping: finite rise/fall time of optical LED driver (RC time constant)
      let shapedTx: number;
      if (bitVal === 1) {
        if (prevBitVal === 0) {
          // Exponential rise: 1 - e^(-t / tau)
          shapedTx = 1.0 - Math.exp(-tNorm * 7);
        } else {
          shapedTx = 1.0;
        }
      } else {
        if (prevBitVal === 1) {
          // Exponential fall: e^(-t / tau)
          shapedTx = Math.exp(-tNorm * 7);
        } else {
          shapedTx = 0.0;
        }
      }

      // Optical channel reception: Attenuation + AWGN noise
      // Add slight photodiode DC dark current / ambient illumination offset (0.05)
      const noise = gaussianRandom(0, noiseSigma);
      const rxValue = Math.max(-0.2, shapedTx * opticalAttenuation + noise);

      signalWaveform[idx] = {
        t: idx / pointsPerBit,
        bitIndex: bitIdx,
        txValue: shapedTx,
        rxValue,
        filtValue: rxValue // will be updated in filter pass
      };
    }
  }

  // Step 3: Low-pass filtering (Discrete convolution with moving-average kernel)
  // Kernel size depends on filterWindow
  const halfWindow = Math.floor(params.filterWindow / 2);
  for (let i = 0; i < totalPoints; i++) {
    let sum = 0;
    let count = 0;
    for (let w = -halfWindow; w <= halfWindow; w++) {
      const k = i + w;
      if (k >= 0 && k < totalPoints) {
        sum += signalWaveform[k].rxValue;
        count++;
      }
    }
    signalWaveform[i].filtValue = count > 0 ? sum / count : signalWaveform[i].rxValue;
  }

  // Step 4: Discrete Sampling x[n] and Threshold Detection
  // We sample near the optimal center of each bit period (eye opening)
  const decodedBits: number[] = [];
  const discreteSamples: DiscreteSample[] = [];
  const errorIndices: number[] = [];

  // Effective decision threshold adjusted for channel attenuation
  const effectiveThreshold = params.threshold * opticalAttenuation;

  for (let bitIdx = 0; bitIdx < totalBits; bitIdx++) {
    // Center point in this bit's time window (e.g. index 8 of 16)
    const centerPoint = Math.floor(pointsPerBit / 2);
    const sampleIdx = bitIdx * pointsPerBit + centerPoint;
    const sampleVal = signalWaveform[sampleIdx].filtValue;

    // Decision rule: y > Threshold => 1, else 0
    const decisionBit = sampleVal >= effectiveThreshold ? 1 : 0;
    const isCorrect = decisionBit === binaryStream[bitIdx];

    decodedBits.push(decisionBit);
    if (!isCorrect) {
      errorIndices.push(bitIdx);
    }

    discreteSamples.push({
      index: bitIdx,
      time: signalWaveform[sampleIdx].t,
      bitIndex: bitIdx,
      rawSample: sampleVal,
      decisionBit,
      isCorrect
    });
  }

  // Step 5: Bit Error Rate (BER)
  const errorCount = errorIndices.length;
  const ber = totalBits > 0 ? errorCount / totalBits : 0;

  // Step 6: Binary to ASCII Decoding
  const decodedChars: { char: string; ascii: number; binary: string; isMatch: boolean }[] = [];
  let decodedMessage = '';

  const numChars = Math.floor(decodedBits.length / 8);
  for (let c = 0; c < numChars; c++) {
    const bitSlice = decodedBits.slice(c * 8, (c + 1) * 8);
    const binStr = bitSlice.join('');
    const asciiVal = parseInt(binStr, 2);
    // Printable ASCII or fallback
    const char = (asciiVal >= 32 && asciiVal <= 126) ? String.fromCharCode(asciiVal) : '';
    
    // Check if entire 8-bit character matched
    const originalSlice = binaryStream.slice(c * 8, (c + 1) * 8).join('');
    const isMatch = binStr === originalSlice;

    decodedChars.push({
      char,
      ascii: asciiVal,
      binary: binStr,
      isMatch
    });
    decodedMessage += char;
  }

  return {
    signalWaveform,
    discreteSamples,
    decodedBits,
    errorIndices,
    errorCount,
    ber,
    decodedMessage,
    decodedChars
  };
}

/**
 * Fast Fourier Transform (Cooley-Tukey algorithm for Radix-2)
 * Computes frequency spectrum magnitude |X[k]|
 */
export function computeFFT(signal: number[]): { frequencies: number[]; magnitudes: number[] } {
  // Pad to next power of 2
  let n = 1;
  while (n < signal.length && n < 512) {
    n *= 2;
  }
  // Cap at 256 or 512 for responsive interactive plotting
  const N = Math.min(256, n);

  const real = new Float64Array(N);
  const imag = new Float64Array(N);

  for (let i = 0; i < N; i++) {
    real[i] = i < signal.length ? signal[i] : 0;
    // Apply Hanning window to reduce spectral leakage
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    real[i] *= window;
  }

  // Bit reversal permutation
  let j = 0;
  for (let i = 0; i < N - 1; i++) {
    if (i < j) {
      const tempR = real[i];
      real[i] = real[j];
      real[j] = tempR;
      const tempI = imag[i];
      imag[i] = imag[j];
      imag[j] = tempI;
    }
    let k = N / 2;
    while (k <= j) {
      j -= k;
      k /= 2;
    }
    j += k;
  }

  // Butterfly computations
  for (let len = 2; len <= N; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < N; i += len) {
      let wR = 1;
      let wI = 0;
      for (let k = 0; k < half; k++) {
        const uR = real[i + k];
        const uI = imag[i + k];
        const vR = real[i + k + half] * wR - imag[i + k + half] * wI;
        const vI = real[i + k + half] * wI + imag[i + k + half] * wR;

        real[i + k] = uR + vR;
        imag[i + k] = uI + vI;
        real[i + k + half] = uR - vR;
        imag[i + k + half] = uI - vI;

        const nextWR = wR * wStepR - wI * wStepI;
        const nextWI = wR * wStepI + wI * wStepR;
        wR = nextWR;
        wI = nextWI;
      }
    }
  }

  // Compute normalized magnitude spectrum up to Nyquist limit (N/2)
  const numBins = Math.floor(N / 2);
  const frequencies: number[] = [];
  const magnitudes: number[] = [];

  let maxMag = 1e-6;
  for (let i = 0; i < numBins; i++) {
    const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / (N / 2);
    magnitudes.push(mag);
    frequencies.push(i);
    if (mag > maxMag) maxMag = mag;
  }

  // Normalize to [0, 1]
  const normalizedMags = magnitudes.map(m => m / maxMag);

  return { frequencies, magnitudes: normalizedMags };
}

/**
 * Rich Signals & Systems Educational Explanations for each of the 16 stages
 */
export const STAGE_DEFINITIONS: Record<number, StageInfo> = {
  1: {
    stage: 1,
    title: 'Typing Message',
    shortTitle: 'Message',
    subtitle: 'Information Source Generation',
    conceptTitle: 'Information & Message Space',
    conceptFormula: 'm \\in \\mathcal{M} = \\{A, B, \\dots, Z\\}^L',
    conceptExplanation: 'In communication systems, information begins as an abstract source message m. To transmit text across a physical medium (copper, RF, or optical), the discrete alphanumeric symbols must first be encoded into standardized numerical values.',
    focusTarget: 'txLaptop'
  },
  2: {
    stage: 2,
    title: 'ASCII Character Encoding',
    shortTitle: 'ASCII',
    subtitle: 'Symbol Mapping to Decimal Values',
    conceptTitle: 'Source Quantization & Character Encoding',
    conceptFormula: 'c_i \\to a_i \\in [0, 255] \\subset \\mathbb{Z}^+',
    conceptExplanation: 'American Standard Code for Information Interchange (ASCII) maps each alphanumeric character into a unique 7-bit or 8-bit integer. For example, \'H\' is 72, \'E\' is 69. This transforms semantic language into structured integers.',
    focusTarget: 'txLaptop'
  },
  3: {
    stage: 3,
    title: 'ASCII to 8-Bit Binary Conversion',
    shortTitle: 'Binary',
    subtitle: 'Decimal Integer to Base-2 Bitstream',
    conceptTitle: 'Binary Digital Representation',
    conceptFormula: 'a_i = \\sum_{k=0}^{7} b_{i,k} \\cdot 2^{7-k}, \\quad b_{i,k} \\in \\{0, 1\\}',
    conceptExplanation: 'Microcontrollers operate on binary states (logic 0 and logic 1). Each ASCII integer is expanded into an 8-bit byte, yielding a serialization vector of bits ready for sequential transmission over time.',
    focusTarget: 'txLaptop'
  },
  4: {
    stage: 4,
    title: 'Digital Signal Generation x(t)',
    shortTitle: 'Signal x(t)',
    subtitle: 'Unipolar Non-Return-to-Zero (NRZ) Modulation',
    conceptTitle: 'Pulse Amplitude Modulation (PAM / NRZ)',
    conceptFormula: 'x(t) = \\sum_{k=-\\infty}^{\\infty} b_k \\cdot p(t - k T_b)',
    conceptExplanation: 'Bits are mapped to a physical continuous-time voltage waveform x(t) using Unipolar NRZ line coding: logic 1 maps to +5V (HIGH) and logic 0 maps to 0V (LOW). The rectangular pulse p(t) has duration equal to the bit interval Tb.',
    focusTarget: 'waveforms'
  },
  5: {
    stage: 5,
    title: 'Arduino Transmitter Processing',
    shortTitle: 'Arduino TX',
    subtitle: 'Serial UART Transmission & Driver Logic',
    conceptTitle: 'Digital-to-Physical Driver Interface',
    conceptFormula: 'V_{out}(t) = V_{CC} \\cdot \\mathbb{I}_{\\{bit = 1\\}}',
    conceptExplanation: 'The simulated Arduino ATmega328P reads the serial bitstream and toggles a digital output pin at a fixed baud rate. The on-board TX activity LED blinks with each state transition.',
    focusTarget: 'arduinoTx'
  },
  6: {
    stage: 6,
    title: 'LED Physical Light Modulation',
    shortTitle: 'LED Blinking',
    subtitle: 'Intensity Modulation / Direct Detection (IM/DD)',
    conceptTitle: 'Optical Intensity Modulation',
    conceptFormula: 'P_{opt}(t) = \\eta_{ext} \\cdot \\frac{V_{in}(t) - V_f}{R_{lim}}',
    conceptExplanation: 'Li-Fi utilizes visible light communications (VLC). The LED optical output power is proportional to the forward drive current. When bit = 1, forward current flows and photons are emitted at ~470nm (visible light); when bit = 0, the LED turns off.',
    focusTarget: 'led'
  },
  7: {
    stage: 7,
    title: 'Optical Li-Fi Channel Propagation',
    shortTitle: 'Optical Path',
    subtitle: 'Free-Space Line-of-Sight (LOS) Transmission',
    conceptTitle: 'Free-Space Optical Channel Model',
    conceptFormula: 'h_{opt}(t) = \\frac{(m+1) A_{det}}{2\\pi d^2} \\cos^m(\\phi) T(\\psi) g(\\psi) \\cos(\\psi) \\cdot \\delta(t - d/c)',
    conceptExplanation: 'The emitted light pulses propagate through the atmospheric optical channel as electromagnetic wave packets at the speed of light. Signal power attenuates inversely with distance squared (1/d²), and interacts with ambient daylight/noise.',
    focusTarget: 'channel'
  },
  8: {
    stage: 8,
    title: 'Photodiode Optical Receiver',
    shortTitle: 'Photodiode RX',
    subtitle: 'Direct Optical-to-Electrical Photocurrent Conversion',
    conceptTitle: 'Photocurrent Generation & Transimpedance',
    conceptFormula: 'I_{photo}(t) = \\mathcal{R} \\cdot P_{opt,rx}(t), \\quad V_{rx}(t) = R_f \\cdot I_{photo}(t)',
    conceptExplanation: 'The silicon PIN photodiode absorbs incident photons, creating electron-hole pairs across the p-n junction. The resulting photocurrent is converted to a proportional voltage via a transimpedance amplifier (TIA).',
    focusTarget: 'photodiode'
  },
  9: {
    stage: 9,
    title: 'Received Noisy Waveform y(t)',
    shortTitle: 'Noisy y(t)',
    subtitle: 'Additive White Gaussian Noise (AWGN) Degradation',
    conceptTitle: 'AWGN Channel Formulation',
    conceptFormula: 'y(t) = \\alpha \\cdot x(t) + n(t), \\quad n(t) \\sim \\mathcal{N}(0, \\sigma_n^2)',
    conceptExplanation: 'Real optical links suffer from background ambient light (sunlight, fluorescent bulbs) and thermal electronics noise. The received signal y(t) is degraded by additive noise n(t) and channel attenuation alpha.',
    focusTarget: 'waveforms'
  },
  10: {
    stage: 10,
    title: 'Low-Pass Signal Filtering',
    shortTitle: 'Filtering',
    subtitle: 'Noise Suppression via Discrete Convolution',
    conceptTitle: 'LTI System & Frequency Selective Filtering',
    conceptFormula: 'y_{filt}(t) = y(t) * h(t) = \\int_{-\\infty}^{\\infty} y(\\tau) h(t - \\tau) d\\tau',
    conceptExplanation: 'To recover the signal from noise, the receiver applies a low-pass filter h(t). High-frequency noise fluctuations are smoothed out while preserving the baseband digital pulse energy, increasing the Signal-to-Noise Ratio (SNR).',
    focusTarget: 'waveforms'
  },
  11: {
    stage: 11,
    title: 'Continuous-to-Discrete Sampling',
    shortTitle: 'Sampling',
    subtitle: 'Periodic Evaluation at Optimal Decision Instants',
    conceptTitle: 'Nyquist-Shannon Sampling Theorem',
    conceptFormula: 'x[n] = y_{filt}(n \\cdot T_s), \\quad f_s = \\frac{1}{T_s} \\ge 2 f_{max}',
    conceptExplanation: 'The receiver analog-to-digital converter (ADC) samples the filtered continuous-time signal at discrete intervals Ts. Optimal sampling occurs at the center of each bit period where the eye pattern is maximally open.',
    focusTarget: 'waveforms'
  },
  12: {
    stage: 12,
    title: 'Decision Threshold Detection',
    shortTitle: 'Threshold',
    subtitle: 'Maximum A Posteriori (MAP) Slicing',
    conceptTitle: 'Optimal Binary Hypothesis Testing',
    conceptFormula: '\\hat{b}[n] = \\begin{cases} 1, & \\text{if } x[n] \\ge V_{th} \\\\ 0, & \\text{if } x[n] < V_{th} \\end{cases}',
    conceptExplanation: 'A decision comparator (slicer) evaluates each sample against a predefined voltage threshold Vth. If the sample exceeds the threshold, the receiver decides bit = 1; otherwise, it decides bit = 0.',
    focusTarget: 'waveforms'
  },
  13: {
    stage: 13,
    title: 'Bit Recovery & Comparison',
    shortTitle: 'Bit Recovery',
    subtitle: 'Bit-by-Bit Transmitted vs Received Validation',
    conceptTitle: 'Error Vector & Decision Accuracy',
    conceptFormula: 'e[k] = b_{tx}[k] \\oplus b_{rx}[k]',
    conceptExplanation: 'The recovered bit stream is aligned and compared against the original transmitted bits. An error occurred if noise caused a LOW sample to exceed the threshold or a HIGH sample to drop below it.',
    focusTarget: 'rxLaptop'
  },
  14: {
    stage: 14,
    title: 'Bit Error Rate (BER) Calculation',
    shortTitle: 'BER Analysis',
    subtitle: 'Statistical Metric of Channel Performance',
    conceptTitle: 'Bit Error Probability & Q-Function',
    conceptFormula: '\\text{BER} = \\frac{N_{errors}}{N_{total}} \\approx Q\\left(\\frac{\\sqrt{\\text{SNR}}}{2}\\right)',
    conceptExplanation: 'Bit Error Rate (BER) measures transmission fidelity. In digital communications, acceptable raw optical BER is typically below 10^-3 to 10^-6 before Forward Error Correction (FEC) is applied.',
    focusTarget: 'rxLaptop'
  },
  15: {
    stage: 15,
    title: 'Binary to ASCII Character Reconstruction',
    shortTitle: 'Decode ASCII',
    subtitle: '8-Bit Byte to Character Mapping',
    conceptTitle: 'Demodulation & Channel Decoding',
    conceptFormula: 'A_{dec} = \\sum_{k=0}^{7} \\hat{b}_k \\cdot 2^{7-k} \\implies \\text{char}',
    conceptExplanation: 'The recovered binary stream is grouped into 8-bit bytes. Each byte is converted back into its decimal ASCII equivalent and translated into its alphanumeric glyph.',
    focusTarget: 'rxLaptop'
  },
  16: {
    stage: 16,
    title: 'Final Reconstructed Message',
    shortTitle: 'Final Message',
    subtitle: 'End-to-End Li-Fi Communication Complete',
    conceptTitle: 'Complete Communication System Fidelity',
    conceptFormula: '\\text{Fidelity} = 100\\% \\cdot (1 - \\text{BER})',
    conceptExplanation: 'The final decoded text is rendered on the receiver workstation. If SNR was adequate, the message matches the original transmission with 0% error, successfully demonstrating full wireless optical communication.',
    focusTarget: 'rxLaptop'
  }
};
