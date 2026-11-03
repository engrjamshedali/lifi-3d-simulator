import React, { useState } from 'react';
import { X, Cpu, Copy, Check, FileCode, Wrench, ArrowRight } from 'lucide-react';

interface HardwareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HardwareModal: React.FC<HardwareModalProps> = ({ isOpen, onClose }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const txArduinoCode = `// ==========================================
// ARDUINO Li-Fi TRANSMITTER (TX SKETCH)
// Hardware: Arduino Uno + 5mm White/Blue LED + 220Ω Resistor
// Connect: Pin 13 -> 220Ω -> LED Anode -> LED Cathode -> GND
// ==========================================

const int LED_PIN = 13;
const int BIT_PERIOD_MS = 20; // 50 Baud for reliable photodiode response

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Li-Fi Transmitter Ready. Enter text in Serial Monitor:");
}

void sendByte(char c) {
  // Transmit START bit (HIGH)
  digitalWrite(LED_PIN, HIGH);
  delay(BIT_PERIOD_MS);

  // Transmit 8 data bits (MSB first)
  for (int i = 7; i >= 0; i--) {
    int bitVal = (c >> i) & 0x01;
    digitalWrite(LED_PIN, bitVal ? HIGH : LOW);
    delay(BIT_PERIOD_MS);
  }

  // Transmit STOP bit (LOW)
  digitalWrite(LED_PIN, LOW);
  delay(BIT_PERIOD_MS * 2);
}

void loop() {
  if (Serial.available() > 0) {
    char c = Serial.read();
    sendByte(c);
  }
}`;

  const rxArduinoCode = `// ==========================================
// ARDUINO Li-Fi RECEIVER (RX SKETCH)
// Hardware: Arduino Uno + BPW34 Photodiode / Phototransistor + LM358 Op-Amp
// Connect: Op-Amp Output -> Analog Pin A0
// ==========================================

const int SENSOR_PIN = A0;
const int BIT_PERIOD_MS = 20;
int thresholdVoltage = 512; // Adjusted via calibration

void setup() {
  Serial.begin(9600);
  pinMode(SENSOR_PIN, INPUT);
  
  // Calibrate ambient daylight threshold
  long ambientSum = 0;
  for (int i = 0; i < 50; i++) {
    ambientSum += analogRead(SENSOR_PIN);
    delay(10);
  }
  thresholdVoltage = (ambientSum / 50) + 150; // Ambient + optical delta
  Serial.print("Calibrated Li-Fi Threshold: ");
  Serial.println(thresholdVoltage);
}

void loop() {
  int sensorVal = analogRead(SENSOR_PIN);

  // Detect START bit pulse
  if (sensorVal > thresholdVoltage) {
    delay(BIT_PERIOD_MS + (BIT_PERIOD_MS / 2)); // Sample at center of first bit

    byte receivedByte = 0;
    for (int i = 7; i >= 0; i--) {
      int bitReading = analogRead(SENSOR_PIN);
      int bitVal = (bitReading > thresholdVoltage) ? 1 : 0;
      receivedByte |= (bitVal << i);
      delay(BIT_PERIOD_MS);
    }

    // Print recovered ASCII character
    Serial.print((char)receivedByte);
  }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-950/60 text-emerald-400 rounded-lg border border-emerald-800/60">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono">
                PHYSICAL HARDWARE IMPLEMENTATION GUIDE
              </h2>
              <p className="text-xs text-slate-400">
                Bridging Browser Signals & Systems Simulation to Physical Lab Hardware
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin text-xs text-slate-300">
          {/* Hardware Flow Diagram */}
          <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 font-mono">
            <div className="text-cyan-400 font-bold mb-3 text-center text-sm">
              REAL HARDWARE DATA PATHWAY
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-slate-200">
              <span className="px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">Laptop / Computer</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              <span className="px-3 py-1.5 bg-blue-950 text-cyan-300 rounded-lg border border-blue-700">Arduino TX</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              <span className="px-3 py-1.5 bg-cyan-950 text-cyan-300 rounded-lg border border-cyan-600">5mm White LED</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
              <span className="px-3 py-1.5 bg-amber-950 text-amber-300 rounded-lg border border-amber-700">Free-Space Optical Beam</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
              <span className="px-3 py-1.5 bg-emerald-950 text-emerald-300 rounded-lg border border-emerald-700">Photodiode (BPW34)</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              <span className="px-3 py-1.5 bg-blue-950 text-cyan-300 rounded-lg border border-blue-700">Arduino RX</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              <span className="px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">Receiver Laptop</span>
            </div>
          </div>

          {/* Bill of Materials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <h3 className="font-bold text-cyan-300 mb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Transmitter Hardware BOM
              </h3>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                <li>1× Arduino Uno R3 (ATmega328P)</li>
                <li>1× High-Brightness 5mm LED (White / Blue, 20mA)</li>
                <li>1× 220Ω 1/4W Current-Limiting Resistor</li>
                <li>1× Solderless Breadboard & Jumper Wires</li>
                <li>1× USB A-to-B Cable to Host PC</li>
              </ul>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <h3 className="font-bold text-emerald-300 mb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Receiver Hardware BOM
              </h3>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                <li>1× Arduino Uno R3 (ADC pin A0)</li>
                <li>1× Silicon PIN Photodiode (e.g. BPW34 or TEMT6000)</li>
                <li>1× LM358 Dual Op-Amp (Transimpedance Amplifier)</li>
                <li>1× 100kΩ Feedback Resistor + 10pF Capacitor (LPF)</li>
                <li>1× Solderless Breadboard & Jumper Wires</li>
              </ul>
            </div>
          </div>

          {/* Code Tabs */}
          <div className="space-y-4">
            {/* TX Code */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 font-mono">
                <span className="text-cyan-400 font-bold flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  Arduino TX C++ Firmware (Transmitter)
                </span>
                <button
                  onClick={() => copyToClipboard(txArduinoCode, 'tx')}
                  className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition cursor-pointer"
                >
                  {copiedCode === 'tx' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode === 'tx' ? 'Copied' : 'Copy Code'}
                </button>
              </div>
              <pre className="p-4 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-56 scrollbar-thin">
                <code>{txArduinoCode}</code>
              </pre>
            </div>

            {/* RX Code */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 font-mono">
                <span className="text-emerald-400 font-bold flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  Arduino RX C++ Firmware (Receiver)
                </span>
                <button
                  onClick={() => copyToClipboard(rxArduinoCode, 'rx')}
                  className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition cursor-pointer"
                >
                  {copiedCode === 'rx' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode === 'rx' ? 'Copied' : 'Copy Code'}
                </button>
              </div>
              <pre className="p-4 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-56 scrollbar-thin">
                <code>{rxArduinoCode}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono font-medium transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
