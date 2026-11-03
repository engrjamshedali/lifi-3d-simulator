import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SimulationState } from '../types/simulation';

interface ThreeLabSceneProps {
  simulationState: SimulationState;
  opticalDistance: number; // in meters (0.5 to 3.0)
  activeTarget: 'overview' | 'txLaptop' | 'arduinoTx' | 'led' | 'channel' | 'photodiode' | 'arduinoRx' | 'rxLaptop' | 'waveforms';
  onSelectTarget?: (target: any) => void;
}

export const ThreeLabScene: React.FC<ThreeLabSceneProps> = ({
  simulationState,
  opticalDistance,
  activeTarget,
  onSelectTarget
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    ledMesh: THREE.Mesh;
    ledGlow: THREE.Mesh;
    ledPointLight: THREE.PointLight;
    beamMesh: THREE.Mesh;
    photodiodeMesh: THREE.Mesh;
    photodiodeIndicator: THREE.Mesh;
    arduinoTxLed: THREE.Mesh;
    arduinoRxLed: THREE.Mesh;
    rxGroup: THREE.Group;
    photonParticles: THREE.Points;
    photonPositions: Float32Array;
    photonAlphas: Float32Array;
    ambientParticles: THREE.Points;
    txScreenCanvas: HTMLCanvasElement;
    txScreenTexture: THREE.CanvasTexture;
    rxScreenCanvas: HTMLCanvasElement;
    rxScreenTexture: THREE.CanvasTexture;
    cameraTargetPos: THREE.Vector3;
    cameraLookTarget: THREE.Vector3;
    isUserInteracting: boolean;
    mousePos: { x: number; y: number };
    orbitAngle: { theta: number; phi: number; radius: number };
  } | null>(null);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913); // Deep cyber lab dark slate
    scene.fog = new THREE.FogExp2(0x060913, 0.035);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 5.5, 9.5);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0x222c44, 1.4);
    scene.add(ambientLight);

    const labKeyLight = new THREE.DirectionalLight(0xa5c4f5, 1.8);
    labKeyLight.position.set(5, 10, 6);
    labKeyLight.castShadow = true;
    labKeyLight.shadow.mapSize.width = 1024;
    labKeyLight.shadow.mapSize.height = 1024;
    labKeyLight.shadow.bias = -0.001;
    scene.add(labKeyLight);

    const rimLight = new THREE.DirectionalLight(0x00f2fe, 0.6);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    // 4. Lab Workbench (Table & ESD Mat)
    const tableGeo = new THREE.BoxGeometry(18, 0.4, 7);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      roughness: 0.6,
      metalness: 0.2
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.2;
    table.receiveShadow = true;
    scene.add(table);

    // ESD Lab Mat with grid
    const esdGeo = new THREE.PlaneGeometry(16, 5.5);
    const esdCanvas = document.createElement('canvas');
    esdCanvas.width = 512;
    esdCanvas.height = 256;
    const esdCtx = esdCanvas.getContext('2d')!;
    esdCtx.fillStyle = '#0a1120';
    esdCtx.fillRect(0, 0, 512, 256);
    esdCtx.strokeStyle = '#162238';
    esdCtx.lineWidth = 1;
    for (let x = 0; x <= 512; x += 32) {
      esdCtx.beginPath();
      esdCtx.moveTo(x, 0);
      esdCtx.lineTo(x, 256);
      esdCtx.stroke();
    }
    for (let y = 0; y <= 256; y += 32) {
      esdCtx.beginPath();
      esdCtx.moveTo(0, y);
      esdCtx.lineTo(512, y);
      esdCtx.stroke();
    }
    // Lab bench markings
    esdCtx.font = '14px monospace';
    esdCtx.fillStyle = '#22d3ee';
    esdCtx.fillText('SIGNALS & SYSTEMS VLC/Li-Fi TESTBENCH // IEEE 802.15.7', 24, 30);
    esdCtx.fillStyle = '#475569';
    esdCtx.fillText('OPTICAL AXIS -> -> ->', 200, 132);

    const esdTexture = new THREE.CanvasTexture(esdCanvas);
    const esdMat = new THREE.MeshStandardMaterial({
      map: esdTexture,
      roughness: 0.8,
      metalness: 0.1
    });
    const esdMatMesh = new THREE.Mesh(esdGeo, esdMat);
    esdMatMesh.rotation.x = -Math.PI / 2;
    esdMatMesh.position.set(0, 0.005, 0);
    esdMatMesh.receiveShadow = true;
    scene.add(esdMatMesh);

    // Optical Rail Ruler along the center
    const railGeo = new THREE.BoxGeometry(10, 0.04, 0.3);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(0, 0.02, 0);
    scene.add(rail);

    // ==========================================
    // 5. HELPER TO BUILD ARDUINO UNO BOARD
    // ==========================================
    function createArduino(isTx: boolean): { group: THREE.Group; txLed: THREE.Mesh; rxLed: THREE.Mesh } {
      const group = new THREE.Group();

      // Blue PCB
      const pcbGeo = new THREE.BoxGeometry(1.6, 0.05, 2.2);
      const pcbMat = new THREE.MeshStandardMaterial({
        color: 0x006699, // Arduino cyan-blue
        roughness: 0.4,
        metalness: 0.2
      });
      const pcb = new THREE.Mesh(pcbGeo, pcbMat);
      pcb.position.y = 0.025;
      pcb.castShadow = true;
      group.add(pcb);

      // ATmega328P DIP chip
      const chipGeo = new THREE.BoxGeometry(0.5, 0.08, 1.2);
      const chipMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
      const chip = new THREE.Mesh(chipGeo, chipMat);
      chip.position.set(0.1, 0.08, 0.2);
      group.add(chip);

      // USB Port (silver metallic box)
      const usbGeo = new THREE.BoxGeometry(0.45, 0.3, 0.5);
      const usbMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
      const usb = new THREE.Mesh(usbGeo, usbMat);
      usb.position.set(-0.55, 0.18, -0.9);
      group.add(usb);

      // DC Barrel Jack (black plastic cylinder)
      const jackGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16);
      const jackMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
      const jack = new THREE.Mesh(jackGeo, jackMat);
      jack.rotation.x = Math.PI / 2;
      jack.position.set(0.5, 0.18, -0.9);
      group.add(jack);

      // Female header strips
      const headerGeo = new THREE.BoxGeometry(0.12, 0.2, 1.8);
      const headerMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
      const headerL = new THREE.Mesh(headerGeo, headerMat);
      headerL.position.set(-0.7, 0.14, 0.05);
      const headerR = new THREE.Mesh(headerGeo, headerMat);
      headerR.position.set(0.7, 0.14, 0.05);
      group.add(headerL);
      group.add(headerR);

      // Power LED (always lit green)
      const pwrLedGeo = new THREE.BoxGeometry(0.04, 0.03, 0.04);
      const pwrLedMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      const pwrLed = new THREE.Mesh(pwrLedGeo, pwrLedMat);
      pwrLed.position.set(-0.2, 0.07, -0.3);
      group.add(pwrLed);

      // TX & RX Activity LEDs
      const actLedGeo = new THREE.BoxGeometry(0.05, 0.03, 0.05);
      const txLedMat = new THREE.MeshBasicMaterial({ color: 0x332200 }); // unlit amber
      const rxLedMat = new THREE.MeshBasicMaterial({ color: 0x332200 });
      const txLed = new THREE.Mesh(actLedGeo, txLedMat);
      txLed.position.set(-0.2, 0.07, -0.15);
      const rxLed = new THREE.Mesh(actLedGeo, rxLedMat);
      rxLed.position.set(-0.2, 0.07, -0.05);
      group.add(txLed);
      group.add(rxLed);

      return { group, txLed, rxLed };
    }

    // ==========================================
    // 6. HELPER TO BUILD BREADBOARD
    // ==========================================
    function createBreadboard(): THREE.Group {
      const group = new THREE.Group();
      // White plastic body
      const bbGeo = new THREE.BoxGeometry(1.8, 0.18, 2.8);
      const bbMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
      const bb = new THREE.Mesh(bbGeo, bbMat);
      bb.position.y = 0.09;
      bb.castShadow = true;
      group.add(bb);

      // Rails colored lines
      const railL = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.01, 2.6),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      railL.position.set(-0.8, 0.185, 0);
      const railR = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.01, 2.6),
        new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
      );
      railR.position.set(0.8, 0.185, 0);
      group.add(railL);
      group.add(railR);

      return group;
    }

    // ==========================================
    // 7. HELPER TO BUILD LAPTOP / WORKSTATION
    // ==========================================
    function createLaptop(title: string): { group: THREE.Group; canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
      const group = new THREE.Group();

      // Base
      const baseGeo = new THREE.BoxGeometry(2.4, 0.08, 1.8);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.04;
      base.castShadow = true;
      group.add(base);

      // Keyboard plate
      const kbGeo = new THREE.BoxGeometry(2.1, 0.02, 1.1);
      const kbMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
      const kb = new THREE.Mesh(kbGeo, kbMat);
      kb.position.set(0, 0.09, 0.2);
      group.add(kb);

      // Trackpad
      const tpGeo = new THREE.BoxGeometry(0.7, 0.01, 0.45);
      const tpMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
      const tp = new THREE.Mesh(tpGeo, tpMat);
      tp.position.set(0, 0.085, -0.6);
      group.add(tp);

      // Screen lid (opened at ~110 degrees)
      const lidGroup = new THREE.Group();
      lidGroup.position.set(0, 0.08, -0.85);
      lidGroup.rotation.x = -Math.PI / 2 + 0.35; // tilted back

      const lidGeo = new THREE.BoxGeometry(2.4, 1.6, 0.06);
      const lidMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
      const lid = new THREE.Mesh(lidGeo, lidMat);
      lid.position.set(0, 0.8, 0);
      lid.castShadow = true;
      lidGroup.add(lid);

      // Screen display with dynamic canvas
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 340;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#050b14';
      ctx.fillRect(0, 0, 512, 340);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(title, 20, 35);

      const texture = new THREE.CanvasTexture(canvas);
      const screenGeo = new THREE.PlaneGeometry(2.25, 1.45);
      const screenMat = new THREE.MeshBasicMaterial({ map: texture });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, 0.8, 0.035);
      lidGroup.add(screen);

      group.add(lidGroup);
      return { group, canvas, texture };
    }

    // ==========================================
    // 8. ASSEMBLE TRANSMITTER SIDE (Left)
    // ==========================================
    const txGroup = new THREE.Group();
    txGroup.position.set(-3.6, 0, 0);

    // TX Laptop
    const txLaptop = createLaptop('Li-Fi TRANSMITTER TERMINAL');
    txLaptop.group.position.set(-1.2, 0, 0.4);
    txLaptop.group.rotation.y = Math.PI / 8;
    txGroup.add(txLaptop.group);

    // TX Arduino Uno
    const txArduino = createArduino(true);
    txArduino.group.position.set(0.6, 0, 0.7);
    txArduino.group.rotation.y = -Math.PI / 12;
    txGroup.add(txArduino.group);

    // TX Breadboard
    const txBreadboard = createBreadboard();
    txBreadboard.position.set(1.5, 0, -0.4);
    txGroup.add(txBreadboard);

    // Resistor on TX Breadboard (220 ohm, red-red-brown-gold)
    const resisBodyGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 16);
    const resisBodyMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.6 });
    const resis = new THREE.Mesh(resisBodyGeo, resisBodyMat);
    resis.rotation.z = Math.PI / 2;
    resis.position.set(1.4, 0.25, -0.6);
    txGroup.add(resis);

    // 5mm High-Intensity LED on TX Breadboard
    const ledDomeGeo = new THREE.SphereGeometry(0.08, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const ledCylGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.16, 16);
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x002233,
      transparent: true,
      opacity: 0.9,
      roughness: 0.1,
      metalness: 0.1
    });
    const ledDome = new THREE.Mesh(ledDomeGeo, ledMat);
    ledDome.position.y = 0.08;
    const ledCyl = new THREE.Mesh(ledCylGeo, ledMat);
    const ledMesh = new THREE.Group() as any;
    ledMesh.add(ledDome);
    ledMesh.add(ledCyl);
    ledMesh.rotation.z = -Math.PI / 2; // Point beam along +X axis towards receiver!
    ledMesh.position.set(1.65, 0.35, -0.3);
    txGroup.add(ledMesh);

    // Glowing halo mesh around LED
    const ledGlowGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const ledGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    const ledGlow = new THREE.Mesh(ledGlowGeo, ledGlowMat);
    ledGlow.position.copy(ledMesh.position);
    txGroup.add(ledGlow);

    // LED PointLight
    const ledPointLight = new THREE.PointLight(0x00f2fe, 0, 8);
    ledPointLight.position.copy(ledMesh.position);
    txGroup.add(ledPointLight);

    // Jumper Wires (Curved spline paths)
    function createWire(start: THREE.Vector3, end: THREE.Vector3, color: number): THREE.Mesh {
      const mid = start.clone().lerp(end, 0.5);
      mid.y += 0.4 + Math.random() * 0.15;
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.015, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
      return new THREE.Mesh(tubeGeo, tubeMat);
    }
    txGroup.add(createWire(new THREE.Vector3(0.6, 0.2, 0.6), new THREE.Vector3(1.3, 0.2, -0.4), 0x22c55e)); // Green signal wire
    txGroup.add(createWire(new THREE.Vector3(0.5, 0.2, 0.7), new THREE.Vector3(1.3, 0.2, -0.5), 0x111111)); // Black GND wire

    scene.add(txGroup);

    // ==========================================
    // 9. ASSEMBLE RECEIVER SIDE (Right)
    // ==========================================
    const rxGroup = new THREE.Group();
    rxGroup.position.set(3.6, 0, 0); // Position dynamically updated with opticalDistance

    // RX Breadboard
    const rxBreadboard = createBreadboard();
    rxBreadboard.position.set(-1.5, 0, -0.4);
    rxGroup.add(rxBreadboard);

    // Photodiode Component (Dark cylinder with glass window)
    const pdCanGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.18, 16);
    const pdCanMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3, metalness: 0.8 });
    const pdCan = new THREE.Mesh(pdCanGeo, pdCanMat);
    pdCan.rotation.z = Math.PI / 2; // Point aperture along -X towards LED!

    const pdLensGeo = new THREE.CircleGeometry(0.07, 16);
    const pdLensMat = new THREE.MeshStandardMaterial({
      color: 0x050515,
      emissive: 0x001122,
      roughness: 0.1,
      metalness: 0.9
    });
    const pdLens = new THREE.Mesh(pdLensGeo, pdLensMat);
    pdLens.rotation.y = -Math.PI / 2;
    pdLens.position.x = -0.091;

    const photodiodeMesh = new THREE.Group() as any;
    photodiodeMesh.add(pdCan);
    photodiodeMesh.add(pdLens);
    photodiodeMesh.position.set(-1.65, 0.35, -0.3);
    rxGroup.add(photodiodeMesh);

    // Photodiode reception glow indicator
    const pdGlowGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const pdGlowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    const photodiodeIndicator = new THREE.Mesh(pdGlowGeo, pdGlowMat);
    photodiodeIndicator.position.copy(photodiodeMesh.position);
    rxGroup.add(photodiodeIndicator);

    // Transimpedance Amplifier IC (LM358) on RX Breadboard
    const icGeo = new THREE.BoxGeometry(0.3, 0.08, 0.4);
    const icMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
    const ic = new THREE.Mesh(icGeo, icMat);
    ic.position.set(-1.4, 0.22, -0.2);
    rxGroup.add(ic);

    // RX Arduino Uno
    const rxArduino = createArduino(false);
    rxArduino.group.position.set(-0.6, 0, 0.7);
    rxArduino.group.rotation.y = Math.PI / 12;
    rxGroup.add(rxArduino.group);

    // RX Laptop
    const rxLaptop = createLaptop('Li-Fi RECEIVER WORKSTATION');
    rxLaptop.group.position.set(1.2, 0, 0.4);
    rxLaptop.group.rotation.y = -Math.PI / 8;
    rxGroup.add(rxLaptop.group);

    // RX Wires
    rxGroup.add(createWire(new THREE.Vector3(-1.3, 0.2, -0.3), new THREE.Vector3(-0.6, 0.2, 0.6), 0x38bdf8)); // Cyan analog signal wire to A0
    rxGroup.add(createWire(new THREE.Vector3(-1.3, 0.2, -0.5), new THREE.Vector3(-0.5, 0.2, 0.7), 0x111111)); // Ground wire

    scene.add(rxGroup);

    // ==========================================
    // 10. OPTICAL CHANNEL (Beam Cone & Photon Particles)
    // ==========================================
    // Volumetric light beam cone
    const beamGeo = new THREE.CylinderGeometry(0.35, 0.05, 5, 32, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.rotation.z = -Math.PI / 2;
    beamMesh.position.set(0, 0.35, -0.3);
    scene.add(beamMesh);

    // Photon wave packet particle system
    const photonCount = 180;
    const photonGeo = new THREE.BufferGeometry();
    const photonPositions = new Float32Array(photonCount * 3);
    const photonAlphas = new Float32Array(photonCount);

    for (let i = 0; i < photonCount; i++) {
      photonPositions[i * 3] = (Math.random() - 0.5) * 6;
      photonPositions[i * 3 + 1] = 0.35 + (Math.random() - 0.5) * 0.15;
      photonPositions[i * 3 + 2] = -0.3 + (Math.random() - 0.5) * 0.15;
      photonAlphas[i] = Math.random();
    }
    photonGeo.setAttribute('position', new THREE.BufferAttribute(photonPositions, 3));
    
    // Canvas texture for circular glowing photon particle
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d')!;
    const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    pGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    pGrad.addColorStop(0.3, 'rgba(0, 242, 254, 0.8)');
    pGrad.addColorStop(0.8, 'rgba(0, 150, 255, 0.2)');
    pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 64, 64);
    const photonTexture = new THREE.CanvasTexture(pCanvas);

    const photonMat = new THREE.PointsMaterial({
      color: 0x00f2fe,
      size: 0.14,
      map: photonTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const photonParticles = new THREE.Points(photonGeo, photonMat);
    scene.add(photonParticles);

    // Ambient floating dust particles
    const ambientCount = 80;
    const ambientGeo = new THREE.BufferGeometry();
    const ambientPositions = new Float32Array(ambientCount * 3);
    for (let i = 0; i < ambientCount; i++) {
      ambientPositions[i * 3] = (Math.random() - 0.5) * 12;
      ambientPositions[i * 3 + 1] = Math.random() * 3;
      ambientPositions[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPositions, 3));
    const ambientMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.05,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const ambientParticles = new THREE.Points(ambientGeo, ambientMat);
    scene.add(ambientParticles);

    // Save refs for animation loop
    sceneRef.current = {
      scene,
      camera,
      renderer,
      ledMesh,
      ledGlow,
      ledPointLight,
      beamMesh,
      photodiodeMesh,
      photodiodeIndicator,
      arduinoTxLed: txArduino.txLed,
      arduinoRxLed: rxArduino.rxLed,
      rxGroup,
      photonParticles,
      photonPositions,
      photonAlphas,
      ambientParticles,
      txScreenCanvas: txLaptop.canvas,
      txScreenTexture: txLaptop.texture,
      rxScreenCanvas: rxLaptop.canvas,
      rxScreenTexture: rxLaptop.texture,
      cameraTargetPos: new THREE.Vector3(0, 4.5, 8.5),
      cameraLookTarget: new THREE.Vector3(0, 0.5, 0),
      isUserInteracting: false,
      mousePos: { x: 0, y: 0 },
      orbitAngle: { theta: 0, phi: 0.4, radius: 9 }
    };

    // Orbit drag controls
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sceneRef.current) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };

      sceneRef.current.orbitAngle.theta -= dx * 0.006;
      sceneRef.current.orbitAngle.phi = Math.max(0.1, Math.min(Math.PI / 2.2, sceneRef.current.orbitAngle.phi + dy * 0.006));
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (!sceneRef.current) return;
      sceneRef.current.orbitAngle.radius = Math.max(3.5, Math.min(15, sceneRef.current.orbitAngle.radius + e.deltaY * 0.005));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: true });

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (!sceneRef.current) return;
      const s = sceneRef.current;

      // Smooth camera motion
      if (!isDragging) {
        // Orbit from current angle
        const targetX = s.cameraLookTarget.x + s.orbitAngle.radius * Math.sin(s.orbitAngle.theta) * Math.cos(s.orbitAngle.phi);
        const targetY = s.cameraLookTarget.y + s.orbitAngle.radius * Math.sin(s.orbitAngle.phi);
        const targetZ = s.cameraLookTarget.z + s.orbitAngle.radius * Math.cos(s.orbitAngle.theta) * Math.cos(s.orbitAngle.phi);
        s.cameraTargetPos.set(targetX, targetY, targetZ);
      }

      s.camera.position.lerp(s.cameraTargetPos, 0.06);
      s.camera.lookAt(s.cameraLookTarget);

      // Subtle ambient particle drift
      const aPos = s.ambientParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < ambientCount; i++) {
        aPos[i * 3 + 1] += Math.sin(elapsed + i) * 0.002;
      }
      s.ambientParticles.geometry.attributes.position.needsUpdate = true;

      s.renderer.render(s.scene, s.camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !sceneRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      sceneRef.current.camera.aspect = w / h;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Receiver Position based on opticalDistance slider
  useEffect(() => {
    if (!sceneRef.current) return;
    // Map opticalDistance (0.5m to 3.0m) to 3D units (e.g. 1.8 to 5.2)
    const rxX = 1.0 + opticalDistance * 1.5;
    sceneRef.current.rxGroup.position.x = rxX;

    // Adjust light beam cylinder length and center
    const txLedX = -3.6 + 1.65; // -1.95
    const rxPdX = rxX - 1.65;
    const beamLength = Math.max(0.2, rxPdX - txLedX);
    const beamCenterX = (txLedX + rxPdX) / 2;

    sceneRef.current.beamMesh.scale.set(1, beamLength / 5, 1);
    sceneRef.current.beamMesh.position.x = beamCenterX;
  }, [opticalDistance]);

  // Update Camera Target based on active target / stage
  useEffect(() => {
    if (!sceneRef.current) return;
    const s = sceneRef.current;

    switch (activeTarget) {
      case 'txLaptop':
        s.cameraLookTarget.set(-4.5, 0.8, 0.4);
        s.orbitAngle.theta = 0.25;
        s.orbitAngle.phi = 0.35;
        s.orbitAngle.radius = 4.2;
        break;
      case 'arduinoTx':
        s.cameraLookTarget.set(-2.8, 0.4, 0.6);
        s.orbitAngle.theta = -0.15;
        s.orbitAngle.phi = 0.6;
        s.orbitAngle.radius = 3.6;
        break;
      case 'led':
        s.cameraLookTarget.set(-1.95, 0.4, -0.3);
        s.orbitAngle.theta = -0.4;
        s.orbitAngle.phi = 0.3;
        s.orbitAngle.radius = 2.8;
        break;
      case 'channel':
        s.cameraLookTarget.set(0.5, 0.5, -0.2);
        s.orbitAngle.theta = 0.0;
        s.orbitAngle.phi = 0.25;
        s.orbitAngle.radius = 6.8;
        break;
      case 'photodiode':
        s.cameraLookTarget.set(s.rxGroup.position.x - 1.65, 0.4, -0.3);
        s.orbitAngle.theta = 0.5;
        s.orbitAngle.phi = 0.3;
        s.orbitAngle.radius = 2.8;
        break;
      case 'arduinoRx':
        s.cameraLookTarget.set(s.rxGroup.position.x - 0.6, 0.4, 0.6);
        s.orbitAngle.theta = 0.2;
        s.orbitAngle.phi = 0.6;
        s.orbitAngle.radius = 3.6;
        break;
      case 'rxLaptop':
        s.cameraLookTarget.set(s.rxGroup.position.x + 1.2, 0.8, 0.4);
        s.orbitAngle.theta = -0.25;
        s.orbitAngle.phi = 0.35;
        s.orbitAngle.radius = 4.2;
        break;
      case 'overview':
      default:
        s.cameraLookTarget.set(0, 0.6, 0);
        s.orbitAngle.theta = 0;
        s.orbitAngle.phi = 0.45;
        s.orbitAngle.radius = 8.5;
        break;
    }
  }, [activeTarget]);

  // Real-time synchronization of LED, Photodiode, Beam, and Laptop screens
  useEffect(() => {
    if (!sceneRef.current) return;
    const s = sceneRef.current;
    const { currentBitValue, currentBitIndex, totalBits, status, message, decodedMessage, currentStage } = simulationState;

    const isTransmitting = status === 'playing' || status === 'paused';
    const isLedOn = isTransmitting && currentBitValue === 1;

    // 1. LED Physical Glow & PointLight
    if (isLedOn) {
      (s.ledMesh.children[0] as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      (s.ledMesh.children[1] as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
      (s.ledGlow.material as THREE.MeshBasicMaterial).opacity = 0.85;
      s.ledPointLight.intensity = 3.5;
      (s.beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.45;
    } else if (isTransmitting && currentBitValue === 0) {
      (s.ledMesh.children[0] as THREE.Mesh).material = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x011b2b,
        roughness: 0.3
      });
      (s.ledMesh.children[1] as THREE.Mesh).material = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x011b2b,
        roughness: 0.3
      });
      (s.ledGlow.material as THREE.MeshBasicMaterial).opacity = 0.05;
      s.ledPointLight.intensity = 0.2;
      (s.beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.04;
    } else {
      (s.ledMesh.children[0] as THREE.Mesh).material = new THREE.MeshStandardMaterial({
        color: 0x004466,
        roughness: 0.4
      });
      (s.ledMesh.children[1] as THREE.Mesh).material = new THREE.MeshStandardMaterial({
        color: 0x004466,
        roughness: 0.4
      });
      (s.ledGlow.material as THREE.MeshBasicMaterial).opacity = 0.0;
      s.ledPointLight.intensity = 0.0;
      (s.beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
    }

    // 2. Arduino Activity LEDs
    if (isTransmitting) {
      (s.arduinoTxLed.material as THREE.MeshBasicMaterial).color.setHex(isLedOn ? 0xf59e0b : 0x451a03);
      (s.arduinoRxLed.material as THREE.MeshBasicMaterial).color.setHex(isLedOn ? 0x10b981 : 0x022c22);
      (s.photodiodeIndicator.material as THREE.MeshBasicMaterial).opacity = isLedOn ? 0.75 : 0.08;
    } else {
      (s.arduinoTxLed.material as THREE.MeshBasicMaterial).color.setHex(0x332200);
      (s.arduinoRxLed.material as THREE.MeshBasicMaterial).color.setHex(0x022c22);
      (s.photodiodeIndicator.material as THREE.MeshBasicMaterial).opacity = 0.0;
    }

    // 3. Photon particles stream update
    const txLedX = -3.6 + 1.65;
    const rxPdX = s.rxGroup.position.x - 1.65;
    const pathSpan = rxPdX - txLedX;
    const pPos = s.photonPositions;
    const pCount = pPos.length / 3;

    for (let i = 0; i < pCount; i++) {
      if (isLedOn) {
        // Particles travel from TX to RX
        pPos[i * 3] += 0.12;
        if (pPos[i * 3] > rxPdX) {
          pPos[i * 3] = txLedX + Math.random() * 0.2;
          pPos[i * 3 + 1] = 0.35 + (Math.random() - 0.5) * 0.1;
          pPos[i * 3 + 2] = -0.3 + (Math.random() - 0.5) * 0.1;
        }
      } else {
        // When bit is 0, disperse/clear particles
        pPos[i * 3] += 0.2;
        if (pPos[i * 3] > rxPdX + 1.0) {
          pPos[i * 3] = -999; // move off-screen
        }
      }
    }
    s.photonParticles.geometry.attributes.position.needsUpdate = true;

    // 4. Update TX Laptop Screen Canvas
    const txCtx = s.txScreenCanvas.getContext('2d');
    if (txCtx) {
      txCtx.fillStyle = '#050b14';
      txCtx.fillRect(0, 0, 512, 340);

      // Header
      txCtx.fillStyle = '#0ea5e9';
      txCtx.font = 'bold 18px monospace';
      txCtx.fillText('ARDUINO Li-Fi TX // UART BUFFER', 24, 35);
      txCtx.strokeStyle = '#1e293b';
      txCtx.strokeRect(16, 45, 480, 275);

      // Message info
      txCtx.fillStyle = '#94a3b8';
      txCtx.font = '14px monospace';
      txCtx.fillText(`MESSAGE: "${message}"`, 28, 75);
      txCtx.fillText(`TOTAL BITS: ${totalBits} (${message.length} BYTES)`, 28, 100);

      // Current bit progress
      txCtx.fillStyle = '#f8fafc';
      txCtx.font = 'bold 16px monospace';
      txCtx.fillText(`TX BIT [${currentBitIndex + 1}/${totalBits}]: ${currentBitValue === 1 ? 'HIGH (1)' : 'LOW (0)'}`, 28, 135);

      // Visual bit sequence preview
      txCtx.fillStyle = '#334155';
      txCtx.fillRect(28, 155, 456, 40);
      const binaryPreview = simulationState.binaryStream.slice(0, 32);
      binaryPreview.forEach((b, idx) => {
        const x = 32 + idx * 14;
        if (idx === currentBitIndex) {
          txCtx.fillStyle = '#38bdf8';
          txCtx.fillRect(x - 2, 158, 12, 34);
          txCtx.fillStyle = '#000000';
        } else {
          txCtx.fillStyle = b === 1 ? '#00f2fe' : '#64748b';
        }
        txCtx.font = 'bold 14px monospace';
        txCtx.fillText(`${b}`, x, 180);
      });

      // LED driver status
      txCtx.fillStyle = isLedOn ? '#22c55e' : '#64748b';
      txCtx.fillText(`OPTICAL EMITTER: ${isLedOn ? 'ACTIVE (P_opt > 0)' : 'IDLE / LOW'}`, 28, 230);
      txCtx.fillStyle = '#38bdf8';
      txCtx.fillText(`STAGE: ${currentStage}/16`, 28, 260);

      s.txScreenTexture.needsUpdate = true;
    }

    // 5. Update RX Laptop Screen Canvas
    const rxCtx = s.rxScreenCanvas.getContext('2d');
    if (rxCtx) {
      rxCtx.fillStyle = '#050b14';
      rxCtx.fillRect(0, 0, 512, 340);

      // Header
      rxCtx.fillStyle = '#10b981';
      rxCtx.font = 'bold 18px monospace';
      rxCtx.fillText('ARDUINO Li-Fi RX // OPTICAL RECOVERY', 24, 35);
      rxCtx.strokeStyle = '#1e293b';
      rxCtx.strokeRect(16, 45, 480, 275);

      // Decoded text
      rxCtx.fillStyle = '#94a3b8';
      rxCtx.font = '14px monospace';
      rxCtx.fillText('RECONSTRUCTED TEXT:', 28, 75);
      rxCtx.fillStyle = '#f8fafc';
      rxCtx.font = 'bold 24px monospace';
      rxCtx.fillText(`"${decodedMessage || (isTransmitting ? '...' : '')}"`, 28, 110);

      // Received stats
      rxCtx.font = '14px monospace';
      rxCtx.fillStyle = '#94a3b8';
      rxCtx.fillText(`CURRENT RX BIT: ${currentBitValue}`, 28, 145);
      rxCtx.fillText(`RECOVERED BITS: ${simulationState.decodedBits.length} / ${totalBits}`, 28, 175);
      
      const berPct = (simulationState.ber * 100).toFixed(1);
      rxCtx.fillStyle = simulationState.ber === 0 ? '#10b981' : '#f43f5e';
      rxCtx.fillText(`BER: ${berPct}% (${simulationState.errorCount} errors)`, 28, 205);

      rxCtx.fillStyle = '#38bdf8';
      rxCtx.fillText(`STATUS: ${status.toUpperCase()}`, 28, 235);
      if (simulationState.ber === 0 && decodedMessage === message && message.length > 0) {
        rxCtx.fillStyle = '#10b981';
        rxCtx.font = 'bold 16px monospace';
        rxCtx.fillText('TRANSMISSION SUCCESSFUL ✓', 28, 270);
      }

      s.rxScreenTexture.needsUpdate = true;
    }
  }, [simulationState]);

  return (
    <div className="relative w-full h-full min-h-[360px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Three.js Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Overlays */}
      <div className="absolute top-3 left-3 flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs font-mono text-slate-300">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="font-semibold text-cyan-300">SIMULATED 3D LAB</span>
        <span className="text-slate-500">|</span>
        <span>Distance: {opticalDistance.toFixed(1)}m</span>
      </div>

      {/* 3D Camera Quick Target Selectors */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto flex flex-wrap items-center gap-1.5 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-lg border border-slate-800 text-xs font-mono">
        <span className="text-slate-400 px-2 py-0.5 text-[11px] uppercase tracking-wider font-semibold">Camera:</span>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'txLaptop', label: 'TX Laptop' },
          { id: 'arduinoTx', label: 'Arduino TX' },
          { id: 'led', label: 'LED Emitter' },
          { id: 'channel', label: 'Optical Path' },
          { id: 'photodiode', label: 'Photodiode RX' },
          { id: 'arduinoRx', label: 'Arduino RX' },
          { id: 'rxLaptop', label: 'RX Laptop' },
        ].map(item => (
          <button
            key={item.id}
            id={`btn-cam-${item.id}`}
            onClick={() => onSelectTarget?.(item.id)}
            className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
              activeTarget === item.id
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Realism Badge */}
      <div className="absolute top-3 right-3 hidden sm:flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded border border-slate-800 text-[11px] font-mono text-slate-400">
        <span>Arduino TX — SIMULATED</span>
        <span className="text-slate-600">•</span>
        <span>Photodiode RX — SIMULATED</span>
      </div>
    </div>
  );
};
