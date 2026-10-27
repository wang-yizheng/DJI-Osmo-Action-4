import * as THREE from 'three';
import {
  createShellTexture,
  createLensTexture,
  createPCBTexture,
  createLCDTexture,
  createBatteryTexture,
  createHeatsinkTexture,
  createSensorTexture,
  createMicTexture,
  createUSBTexture,
} from './textures';

export interface ModuleInfo {
  name: string;
  nameEn: string;
  description: string;
  group: THREE.Group;
  assembledPosition: THREE.Vector3;
  explodedPosition: THREE.Vector3;
  color: string;
}

function createRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments: number = 4
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const w = width / 2 - radius;
  const h = height / 2 - radius;

  shape.moveTo(-w, -height / 2);
  shape.lineTo(w, -height / 2);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -h);
  shape.lineTo(width / 2, h);
  shape.quadraticCurveTo(width / 2, height / 2, w, height / 2);
  shape.lineTo(-w, height / 2);
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, h);
  shape.lineTo(-width / 2, -h);
  shape.quadraticCurveTo(-width / 2, -height / 2, -w, -height / 2);

  const extrudeSettings = {
    depth: depth,
    bevelEnabled: true,
    bevelThickness: radius * 0.3,
    bevelSize: radius * 0.3,
    bevelSegments: segments,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.center();
  return geometry;
}

// Module 1: Outer Shell
function createShellModule(): ModuleInfo {
  const group = new THREE.Group();

  // Main body - front half
  const shellGeo = createRoundedBoxGeometry(3.2, 2.2, 1.6, 0.2);
  const shellTex = createShellTexture();
  const shellMat = new THREE.MeshPhysicalMaterial({
    map: shellTex,
    color: 0x1a1a2e,
    roughness: 0.5,
    metalness: 0.3,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
    transparent: true,
    opacity: 0.88,
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  group.add(shell);

  // Lens opening
  const lensRingGeo = new THREE.TorusGeometry(0.55, 0.08, 16, 32);
  const lensRingMat = new THREE.MeshPhysicalMaterial({
    color: 0x333344,
    roughness: 0.3,
    metalness: 0.8,
  });
  const lensRing = new THREE.Mesh(lensRingGeo, lensRingMat);
  lensRing.position.set(-0.4, 0, 0.85);
  group.add(lensRing);

  // Screen cutout on back
  const screenFrameGeo = new THREE.BoxGeometry(1.8, 1.3, 0.05);
  const screenFrameMat = new THREE.MeshPhysicalMaterial({
    color: 0x111122,
    roughness: 0.4,
    metalness: 0.5,
  });
  const screenFrame = new THREE.Mesh(screenFrameGeo, screenFrameMat);
  screenFrame.position.set(0, 0, -0.82);
  group.add(screenFrame);

  // DJI logo area
  const logoGeo = new THREE.PlaneGeometry(0.6, 0.15);
  const logoTex = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DJI', 128, 45);
    return new THREE.CanvasTexture(canvas);
  })();
  const logoMat = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true });
  const logo = new THREE.Mesh(logoGeo, logoMat);
  logo.position.set(0.8, -0.7, 0.82);
  group.add(logo);

  // Button on top
  const buttonGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16);
  const buttonMat = new THREE.MeshPhysicalMaterial({
    color: 0xcc2222,
    roughness: 0.3,
    metalness: 0.5,
    emissive: 0x440000,
  });
  const button = new THREE.Mesh(buttonGeo, buttonMat);
  button.position.set(0.8, 1.15, 0);
  group.add(button);

  // Side buttons
  const sideButtonGeo = new THREE.BoxGeometry(0.1, 0.3, 0.15);
  const sideButtonMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a2a3e,
    roughness: 0.4,
    metalness: 0.6,
  });
  const sideButton1 = new THREE.Mesh(sideButtonGeo, sideButtonMat);
  sideButton1.position.set(1.65, 0.3, 0);
  group.add(sideButton1);
  const sideButton2 = new THREE.Mesh(sideButtonGeo, sideButtonMat);
  sideButton2.position.set(1.65, -0.3, 0);
  group.add(sideButton2);

  return {
    name: '防水外壳',
    nameEn: 'Waterproof Housing',
    description: 'IP68防水等级，10米裸机防水。高强度聚碳酸酯材质，耐冲击设计。',
    group,
    assembledPosition: new THREE.Vector3(0, 0, 0),
    explodedPosition: new THREE.Vector3(0, 3.5, 0),
    color: '#1a1a2e',
  };
}

// Module 2: Lens Assembly
function createLensModule(): ModuleInfo {
  const group = new THREE.Group();

  // Lens barrel
  const barrelGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.8, 32);
  const barrelMat = new THREE.MeshPhysicalMaterial({
    color: 0x222233,
    roughness: 0.2,
    metalness: 0.9,
  });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.rotation.x = Math.PI / 2;
  group.add(barrel);

  // Lens elements (multiple glass elements)
  // 性能优化：贴图只生成一次并被 4 个镜片共享；降低球体细分段数；
  // 用 ior/opacity 近似玻璃质感，避免 transmission 触发每帧透射渲染通道（开销极大）
  const sharedLensTex = createLensTexture();
  for (let i = 0; i < 4; i++) {
    const lensGeo = new THREE.SphereGeometry(0.4 - i * 0.05, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3);
    const lensMat = new THREE.MeshPhysicalMaterial({
      map: sharedLensTex,
      color: 0x1a0a3a,
      roughness: 0.0,
      metalness: 0.1,
      ior: 1.5,
      reflectivity: 0.5,
      transparent: true,
      opacity: 0.9,
    });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.z = 0.3 - i * 0.15;
    lens.rotation.x = Math.PI;
    group.add(lens);
  }

  // Front glass
  const frontGlassGeo = new THREE.CircleGeometry(0.42, 32);
  const frontGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a2a,
    roughness: 0.0,
    metalness: 0.1,
    ior: 1.5,
    transparent: true,
    opacity: 0.7,
  });
  const frontGlass = new THREE.Mesh(frontGlassGeo, frontGlassMat);
  frontGlass.position.z = 0.42;
  group.add(frontGlass);

  // IR filter
  const irFilterGeo = new THREE.CircleGeometry(0.35, 32);
  const irFilterMat = new THREE.MeshPhysicalMaterial({
    color: 0x330033,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.6,
  });
  const irFilter = new THREE.Mesh(irFilterGeo, irFilterMat);
  irFilter.position.z = -0.1;
  group.add(irFilter);

  return {
    name: '镜头模组',
    nameEn: 'Lens Assembly',
    description: 'f/2.8超大光圈，155°超广角FOV。7片光学玻璃镜片组，支持自动对焦。',
    group,
    assembledPosition: new THREE.Vector3(-0.4, 0, 0.5),
    explodedPosition: new THREE.Vector3(-3.5, 0, 2),
    color: '#222233',
  };
}

// Module 3: Image Sensor
function createSensorModule(): ModuleInfo {
  const group = new THREE.Group();

  // Sensor chip
  const sensorGeo = new THREE.BoxGeometry(0.8, 0.6, 0.1);
  const sensorTex = createSensorTexture();
  const sensorMat = new THREE.MeshPhysicalMaterial({
    map: sensorTex,
    color: 0x1a1a2a,
    roughness: 0.3,
    metalness: 0.4,
  });
  const sensor = new THREE.Mesh(sensorGeo, sensorMat);
  group.add(sensor);

  // Sensor substrate
  const substrateGeo = new THREE.BoxGeometry(1.0, 0.8, 0.05);
  const substrateMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a3a1a,
    roughness: 0.5,
    metalness: 0.3,
  });
  const substrate = new THREE.Mesh(substrateGeo, substrateMat);
  substrate.position.z = -0.08;
  group.add(substrate);

  // Bond wires (simplified)
  const wireMat = new THREE.MeshBasicMaterial({ color: 0xd4a030 });
  for (let i = 0; i < 8; i++) {
    const wireGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.3, 4);
    const wire = new THREE.Mesh(wireGeo, wireMat);
    wire.position.set(-0.35 + i * 0.1, 0.35, -0.05);
    wire.rotation.z = Math.PI / 4;
    group.add(wire);
  }

  // FPC connector
  const fpcGeo = new THREE.BoxGeometry(0.6, 0.1, 0.08);
  const fpcMat = new THREE.MeshPhysicalMaterial({
    color: 0x333333,
    roughness: 0.5,
    metalness: 0.6,
  });
  const fpc = new THREE.Mesh(fpcGeo, fpcMat);
  fpc.position.set(0, -0.45, 0);
  group.add(fpc);

  return {
    name: '图像传感器',
    nameEn: 'Image Sensor',
    description: '1/1.3英寸CMOS传感器，4800万有效像素。1.12μm单位像素尺寸，支持HDR视频。',
    group,
    assembledPosition: new THREE.Vector3(-0.4, 0, -0.1),
    explodedPosition: new THREE.Vector3(-3.5, 0, 0),
    color: '#1a1a2a',
  };
}

// Module 4: LCD Display
function createLCDModule(): ModuleInfo {
  const group = new THREE.Group();

  // LCD panel
  const lcdGeo = new THREE.BoxGeometry(1.7, 1.2, 0.06);
  const lcdTex = createLCDTexture();
  const lcdMat = new THREE.MeshPhysicalMaterial({
    map: lcdTex,
    color: 0xffffff,
    roughness: 0.1,
    metalness: 0.0,
    emissive: 0x112233,
    emissiveIntensity: 0.3,
  });
  const lcd = new THREE.Mesh(lcdGeo, lcdMat);
  group.add(lcd);

  // Touch panel (glass overlay)
  const touchGeo = new THREE.BoxGeometry(1.75, 1.25, 0.02);
  const touchMat = new THREE.MeshPhysicalMaterial({
    color: 0x111111,
    roughness: 0.0,
    metalness: 0.1,
    ior: 1.5,
    transparent: true,
    opacity: 0.4,
  });
  const touch = new THREE.Mesh(touchGeo, touchMat);
  touch.position.z = -0.04;
  group.add(touch);

  // FPC ribbon cable
  const fpcGeo = new THREE.BoxGeometry(0.3, 0.6, 0.01);
  const fpcMat = new THREE.MeshPhysicalMaterial({
    color: 0xd4a030,
    roughness: 0.6,
    metalness: 0.3,
  });
  const fpc = new THREE.Mesh(fpcGeo, fpcMat);
  fpc.position.set(0.9, 0, 0);
  fpc.rotation.z = -0.2;
  group.add(fpc);

  // Front small screen
  const frontScreenGeo = new THREE.BoxGeometry(0.8, 0.5, 0.04);
  const frontScreenTex = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000810';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('00:12:34', 30, 60);
    ctx.font = '14px sans-serif';
    ctx.fillText('4K 120fps', 30, 100);
    ctx.beginPath();
    ctx.arc(220, 30, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
  })();
  const frontScreenMat = new THREE.MeshPhysicalMaterial({
    map: frontScreenTex,
    emissive: 0x112233,
    emissiveIntensity: 0.2,
  });
  const frontScreen = new THREE.Mesh(frontScreenGeo, frontScreenMat);
  frontScreen.position.set(0, 1.0, 0);
  group.add(frontScreen);

  return {
    name: 'LCD显示屏',
    nameEn: 'LCD Display',
    description: '后置2.25英寸触控LCD，前置1.4英寸自拍屏。支持触控操作和实时预览。',
    group,
    assembledPosition: new THREE.Vector3(0, 0, -0.7),
    explodedPosition: new THREE.Vector3(0, 0, -3.5),
    color: '#000810',
  };
}

// Module 5: Battery
function createBatteryModule(): ModuleInfo {
  const group = new THREE.Group();

  // Battery cell
  const battGeo = new THREE.BoxGeometry(1.8, 1.0, 0.4);
  const battTex = createBatteryTexture();
  const battMat = new THREE.MeshPhysicalMaterial({
    map: battTex,
    color: 0x3a3a3a,
    roughness: 0.5,
    metalness: 0.3,
  });
  const battery = new THREE.Mesh(battGeo, battMat);
  group.add(battery);

  // Battery wrap
  const wrapGeo = new THREE.BoxGeometry(1.82, 1.02, 0.42);
  const wrapMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a2a2a,
    roughness: 0.7,
    metalness: 0.1,
    transparent: true,
    opacity: 0.3,
  });
  const wrap = new THREE.Mesh(wrapGeo, wrapMat);
  group.add(wrap);

  // Connector
  const connGeo = new THREE.BoxGeometry(0.3, 0.15, 0.1);
  const connMat = new THREE.MeshPhysicalMaterial({
    color: 0xeeeeee,
    roughness: 0.3,
    metalness: 0.7,
  });
  const conn = new THREE.Mesh(connGeo, connMat);
  conn.position.set(0.8, 0.5, 0);
  group.add(conn);

  // Wires
  const wireMat1 = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const wireMat2 = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const wireGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8);
  const wire1 = new THREE.Mesh(wireGeo, wireMat1);
  wire1.position.set(0.9, 0.5, 0.03);
  wire1.rotation.z = Math.PI / 2;
  group.add(wire1);
  const wire2 = new THREE.Mesh(wireGeo, wireMat2);
  wire2.position.set(0.9, 0.5, -0.03);
  wire2.rotation.z = Math.PI / 2;
  group.add(wire2);

  return {
    name: '锂电池',
    nameEn: 'Li-ion Battery',
    description: '1770mAh/6.72Wh锂离子电池，3.85V标称电压。支持快充，续航约160分钟。',
    group,
    assembledPosition: new THREE.Vector3(0, -0.4, 0),
    explodedPosition: new THREE.Vector3(3.5, -1.5, 0),
    color: '#3a3a3a',
  };
}

// Module 6: Mainboard PCB
function createMainboardModule(): ModuleInfo {
  const group = new THREE.Group();

  // PCB board
  const pcbGeo = new THREE.BoxGeometry(2.4, 1.6, 0.08);
  const pcbTex = createPCBTexture();
  const pcbMat = new THREE.MeshPhysicalMaterial({
    map: pcbTex,
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0.2,
  });
  const pcb = new THREE.Mesh(pcbGeo, pcbMat);
  group.add(pcb);

  // Main SoC chip
  const socGeo = new THREE.BoxGeometry(0.5, 0.5, 0.08);
  const socMat = new THREE.MeshPhysicalMaterial({
    color: 0x111111,
    roughness: 0.3,
    metalness: 0.5,
  });
  const soc = new THREE.Mesh(socGeo, socMat);
  soc.position.set(-0.3, 0.2, 0.08);
  group.add(soc);

  // SoC label
  const socLabelTex = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#888';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Ambarella', 64, 50);
    ctx.font = '12px monospace';
    ctx.fillText('A12SE', 64, 80);
    return new THREE.CanvasTexture(canvas);
  })();
  const socLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.45, 0.45),
    new THREE.MeshBasicMaterial({ map: socLabelTex })
  );
  socLabel.position.set(-0.3, 0.2, 0.125);
  group.add(socLabel);

  // Memory chip
  const memGeo = new THREE.BoxGeometry(0.35, 0.25, 0.06);
  const memMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a1a,
    roughness: 0.3,
    metalness: 0.4,
  });
  const mem = new THREE.Mesh(memGeo, memMat);
  mem.position.set(0.4, 0.3, 0.07);
  group.add(mem);

  // Capacitors
  const capMat = new THREE.MeshPhysicalMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.6 });
  for (let i = 0; i < 12; i++) {
    const capGeo = new THREE.BoxGeometry(0.06, 0.04, 0.04);
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(
      -0.8 + Math.random() * 1.6,
      -0.5 + Math.random() * 1.0,
      0.06
    );
    group.add(cap);
  }

  // Mounting holes
  const holeMat = new THREE.MeshBasicMaterial({ color: 0xd4a030 });
  const holePositions = [
    [-1.0, 0.6], [1.0, 0.6], [-1.0, -0.6], [1.0, -0.6]
  ];
  holePositions.forEach(([x, y]) => {
    const holeGeo = new THREE.RingGeometry(0.04, 0.07, 16);
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.position.set(x, y, 0.045);
    group.add(hole);
  });

  return {
    name: '主控电路板',
    nameEn: 'Mainboard PCB',
    description: 'Ambarella A12SE主控芯片，支持4K/120fps视频处理。集成WiFi、蓝牙模块。',
    group,
    assembledPosition: new THREE.Vector3(0, 0.2, 0),
    explodedPosition: new THREE.Vector3(0, 0, 0),
    color: '#0a4a2a',
  };
}

// Module 7: Heat Sink
function createHeatSinkModule(): ModuleInfo {
  const group = new THREE.Group();

  // Main heatsink body
  const hsGeo = new THREE.BoxGeometry(1.4, 1.0, 0.3);
  const hsTex = createHeatsinkTexture();
  const hsMat = new THREE.MeshPhysicalMaterial({
    map: hsTex,
    color: 0xb8956a,
    roughness: 0.3,
    metalness: 0.8,
  });
  const heatsink = new THREE.Mesh(hsGeo, hsMat);
  group.add(heatsink);

  // Heat fins
  const finMat = new THREE.MeshPhysicalMaterial({
    color: 0xa08060,
    roughness: 0.3,
    metalness: 0.9,
  });
  for (let i = 0; i < 10; i++) {
    const finGeo = new THREE.BoxGeometry(0.03, 0.9, 0.25);
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.position.set(-0.6 + i * 0.13, 0, 0.02);
    group.add(fin);
  }

  // Heat pipe
  const pipeGeo = new THREE.TorusGeometry(0.3, 0.04, 8, 32, Math.PI);
  const pipeMat = new THREE.MeshPhysicalMaterial({
    color: 0xd4a060,
    roughness: 0.2,
    metalness: 0.9,
  });
  const pipe = new THREE.Mesh(pipeGeo, pipeMat);
  pipe.position.set(0, 0, 0.18);
  pipe.rotation.y = Math.PI / 2;
  group.add(pipe);

  // Thermal pad
  const padGeo = new THREE.BoxGeometry(0.5, 0.5, 0.02);
  const padMat = new THREE.MeshPhysicalMaterial({
    color: 0x6666aa,
    roughness: 0.8,
    metalness: 0.0,
    transparent: true,
    opacity: 0.8,
  });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.set(-0.3, 0.2, -0.16);
  group.add(pad);

  return {
    name: '散热模组',
    nameEn: 'Heat Sink',
    description: '铜质散热片+热管设计，高效导热。确保长时间录制时芯片温度稳定。',
    group,
    assembledPosition: new THREE.Vector3(0.2, 0.2, 0.2),
    explodedPosition: new THREE.Vector3(3.5, 1.5, 0),
    color: '#b8956a',
  };
}

// Module 8: Microphone Module
function createMicModule(): ModuleInfo {
  const group = new THREE.Group();

  // Mic housing
  const housingGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 16);
  const housingMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a2a2a,
    roughness: 0.4,
    metalness: 0.6,
  });
  const housing = new THREE.Mesh(housingGeo, housingMat);
  housing.rotation.x = Math.PI / 2;
  group.add(housing);

  // Mic mesh
  const meshGeo = new THREE.CircleGeometry(0.18, 32);
  const meshTex = createMicTexture();
  const meshMat = new THREE.MeshPhysicalMaterial({
    map: meshTex,
    color: 0x3a3a3a,
    roughness: 0.5,
    metalness: 0.4,
  });
  const mesh = new THREE.Mesh(meshGeo, meshMat);
  mesh.position.z = 0.08;
  group.add(mesh);

  // MEMS microphone chip
  const memsGeo = new THREE.BoxGeometry(0.12, 0.08, 0.04);
  const memsMat = new THREE.MeshPhysicalMaterial({
    color: 0x222222,
    roughness: 0.3,
    metalness: 0.5,
  });
  const mems = new THREE.Mesh(memsGeo, memsMat);
  mems.position.z = -0.05;
  group.add(mems);

  // Second mic (stereo)
  const housing2 = housing.clone();
  housing2.position.x = 0.5;
  group.add(housing2);
  const mesh2 = mesh.clone();
  mesh2.position.set(0.5, 0, 0.08);
  group.add(mesh2);

  // Windscreen foam
  const foamGeo = new THREE.SphereGeometry(0.22, 16, 16);
  const foamMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a1a,
    roughness: 1.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.4,
  });
  const foam = new THREE.Mesh(foamGeo, foamMat);
  foam.position.z = 0.1;
  foam.scale.z = 0.5;
  group.add(foam);

  return {
    name: '麦克风模组',
    nameEn: 'Microphone Module',
    description: '双MEMS麦克风阵列，支持立体声录音。智能降噪算法，防风噪设计。',
    group,
    assembledPosition: new THREE.Vector3(0.8, 0.8, 0.5),
    explodedPosition: new THREE.Vector3(3.5, 3, 2),
    color: '#2a2a2a',
  };
}

// Module 9: USB-C & Connectivity
function createUSBModule(): ModuleInfo {
  const group = new THREE.Group();

  // USB-C port housing
  const portGeo = new THREE.BoxGeometry(0.5, 0.2, 0.3);
  const portTex = createUSBTexture();
  const portMat = new THREE.MeshPhysicalMaterial({
    map: portTex,
    color: 0x888888,
    roughness: 0.2,
    metalness: 0.9,
  });
  const port = new THREE.Mesh(portGeo, portMat);
  group.add(port);

  // USB-C inner
  const innerGeo = new THREE.BoxGeometry(0.35, 0.12, 0.2);
  const innerMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a1a,
    roughness: 0.5,
    metalness: 0.3,
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.position.z = 0.06;
  group.add(inner);

  // Contact pins
  const pinMat = new THREE.MeshPhysicalMaterial({
    color: 0xd4a030,
    roughness: 0.2,
    metalness: 0.9,
  });
  for (let i = 0; i < 12; i++) {
    const pinGeo = new THREE.BoxGeometry(0.015, 0.04, 0.08);
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(-0.12 + i * 0.022, 0, 0.1);
    group.add(pin);
  }

  // microSD slot
  const sdGeo = new THREE.BoxGeometry(0.6, 0.15, 0.25);
  const sdMat = new THREE.MeshPhysicalMaterial({
    color: 0x666666,
    roughness: 0.3,
    metalness: 0.7,
  });
  const sd = new THREE.Mesh(sdGeo, sdMat);
  sd.position.set(0.8, 0, 0);
  group.add(sd);

  // SD slot opening
  const sdOpenGeo = new THREE.BoxGeometry(0.5, 0.08, 0.1);
  const sdOpenMat = new THREE.MeshPhysicalMaterial({
    color: 0x111111,
    roughness: 0.5,
    metalness: 0.3,
  });
  const sdOpen = new THREE.Mesh(sdOpenGeo, sdOpenMat);
  sdOpen.position.set(0.8, 0, 0.1);
  group.add(sdOpen);

  // WiFi/BT antenna
  const antGeo = new THREE.BoxGeometry(0.8, 0.3, 0.02);
  const antMat = new THREE.MeshPhysicalMaterial({
    color: 0x444444,
    roughness: 0.6,
    metalness: 0.3,
  });
  const ant = new THREE.Mesh(antGeo, antMat);
  ant.position.set(0, 0.4, 0);
  group.add(ant);

  // Antenna trace
  const traceGeo = new THREE.PlaneGeometry(0.7, 0.2);
  const traceTex = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#d4a030';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 10; x < 246; x += 15) {
      ctx.moveTo(x, 10);
      ctx.lineTo(x, 54);
      ctx.lineTo(x + 8, 54);
      ctx.lineTo(x + 8, 10);
    }
    ctx.stroke();
    return new THREE.CanvasTexture(canvas);
  })();
  const traceMat = new THREE.MeshBasicMaterial({ map: traceTex, transparent: true });
  const trace = new THREE.Mesh(traceGeo, traceMat);
  trace.position.set(0, 0.4, 0.015);
  group.add(trace);

  return {
    name: '接口与连接',
    nameEn: 'USB-C & Connectivity',
    description: 'USB-C接口支持快充和数据传输。microSD卡槽最大256GB。WiFi 5 + 蓝牙5.0。',
    group,
    assembledPosition: new THREE.Vector3(0, -0.9, 0.3),
    explodedPosition: new THREE.Vector3(-3.5, -2.5, 1.5),
    color: '#888888',
  };
}

export function createAllModules(): ModuleInfo[] {
  return [
    createShellModule(),
    createLensModule(),
    createSensorModule(),
    createLCDModule(),
    createBatteryModule(),
    createMainboardModule(),
    createHeatSinkModule(),
    createMicModule(),
    createUSBModule(),
  ];
}

// 释放模块占用的 GPU 资源（几何体/材质/贴图），防止上下文泄漏
export function disposeAllModules(modules: ModuleInfo[]): void {
  modules.forEach((module) => {
    module.group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.geometry) mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((mat) => {
        if (!mat) return;
        // 释放材质上引用的所有贴图
        Object.values(mat as unknown as Record<string, unknown>).forEach((value) => {
          if (value instanceof THREE.Texture) value.dispose();
        });
        mat.dispose();
      });
    });
  });
}
