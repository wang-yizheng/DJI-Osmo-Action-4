import * as THREE from 'three';

// Create a canvas-based procedural texture
export function createCanvasTexture(
  width: number,
  height: number,
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  drawFn(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Dark metallic shell texture
export function createShellTexture(): THREE.CanvasTexture {
  return createCanvasTexture(512, 512, (ctx, w, h) => {
    // Base dark gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.5, '#16213e');
    grad.addColorStop(1, '#0f0f1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle noise for texture
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const alpha = Math.random() * 0.05;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // Fine grid pattern (matte finish)
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  });
}

// Lens glass texture
export function createLensTexture(): THREE.CanvasTexture {
  return createCanvasTexture(512, 512, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2;

    // Dark glass base
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(0.3, '#1a0a3a');
    grad.addColorStop(0.6, '#0a1a2a');
    grad.addColorStop(0.8, '#050510');
    grad.addColorStop(1, '#000005');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Lens coating reflections (purple/blue/green)
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3 + 0.5;
      const rx = cx + Math.cos(angle) * r * 0.3;
      const ry = cy + Math.sin(angle) * r * 0.3;
      const lg = ctx.createRadialGradient(rx, ry, 0, rx, ry, r * 0.4);
      const colors = ['rgba(100,50,200,0.15)', 'rgba(50,100,200,0.12)', 'rgba(50,200,100,0.1)'];
      lg.addColorStop(0, colors[i]);
      lg.addColorStop(1, 'transparent');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, w, h);
    }

    // Circular lens rings
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * (i / 6), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100,150,255,${0.05 + i * 0.01})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
}

// PCB circuit board texture
export function createPCBTexture(): THREE.CanvasTexture {
  return createCanvasTexture(1024, 1024, (ctx, w, h) => {
    // Green PCB base
    ctx.fillStyle = '#0a4a2a';
    ctx.fillRect(0, 0, w, h);

    // Solder mask texture
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle = `rgba(0,${60 + Math.random() * 40},${20 + Math.random() * 20},0.3)`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Copper traces
    ctx.strokeStyle = '#c8960a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      let x = Math.random() * w;
      let y = Math.random() * h;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        if (Math.random() > 0.5) {
          x += (Math.random() - 0.5) * 200;
          ctx.lineTo(x, y);
        } else {
          y += (Math.random() - 0.5) * 200;
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // SMD pads
    ctx.fillStyle = '#d4a520';
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const pw = 4 + Math.random() * 12;
      const ph = 3 + Math.random() * 6;
      ctx.fillRect(x, y, pw, ph);
    }

    // Vias
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#d4a520';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0a4a2a';
      ctx.fill();
    }

    // IC chips (dark rectangles)
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * (w - 60);
      const y = Math.random() * (h - 40);
      const cw = 30 + Math.random() * 40;
      const ch = 20 + Math.random() * 30;
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x, y, cw, ch);
      // Pins
      ctx.fillStyle = '#c0c0c0';
      for (let p = 0; p < cw / 5; p++) {
        ctx.fillRect(x + p * 5 + 1, y - 3, 2, 3);
        ctx.fillRect(x + p * 5 + 1, y + ch, 2, 3);
      }
    }

    // Silkscreen text
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px monospace';
    ctx.fillText('R1', 50, 50);
    ctx.fillText('C12', 150, 100);
    ctx.fillText('U3', 300, 200);
    ctx.fillText('DJI', 400, 400);
    ctx.font = '8px monospace';
    ctx.fillText('ACTION4', 420, 420);
  });
}

// LCD screen texture
export function createLCDTexture(): THREE.CanvasTexture {
  return createCanvasTexture(512, 512, (ctx, w, h) => {
    // Screen background
    ctx.fillStyle = '#000810';
    ctx.fillRect(0, 0, w, h);

    // Pixel grid
    for (let x = 0; x < w; x += 3) {
      for (let y = 0; y < h; y += 3) {
        const r = Math.random();
        if (r > 0.97) {
          ctx.fillStyle = `rgba(${50 + Math.random() * 100},${100 + Math.random() * 155},${200 + Math.random() * 55},0.3)`;
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }

    // UI elements mockup
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('4K/120fps', 20, 50);
    ctx.font = '16px sans-serif';
    ctx.fillText('00:12:34', 20, 80);

    // Battery icon
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 80, 20, 50, 25);
    ctx.fillRect(w - 30, 28, 5, 10);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(w - 77, 23, 35, 19);

    // Recording indicator
    ctx.beginPath();
    ctx.arc(w - 40, h - 40, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(w / 3, 0);
    ctx.lineTo(w / 3, h);
    ctx.moveTo((w * 2) / 3, 0);
    ctx.lineTo((w * 2) / 3, h);
    ctx.moveTo(0, h / 3);
    ctx.lineTo(w, h / 3);
    ctx.moveTo(0, (h * 2) / 3);
    ctx.lineTo(w, (h * 2) / 3);
    ctx.stroke();
  });
}

// Battery texture
export function createBatteryTexture(): THREE.CanvasTexture {
  return createCanvasTexture(512, 256, (ctx, w, h) => {
    // Battery body
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2a2a2a');
    grad.addColorStop(0.5, '#3a3a3a');
    grad.addColorStop(1, '#2a2a2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Label area
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(20, 20, w - 40, h - 40);

    // Battery info text
    ctx.fillStyle = '#888';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('DJI', 40, 60);
    ctx.font = '12px sans-serif';
    ctx.fillText('Li-ion Battery', 40, 85);
    ctx.fillText('1770mAh / 6.72Wh', 40, 110);
    ctx.fillText('3.85V', 40, 135);
    ctx.fillText('BP-1', 40, 160);

    // Warning symbols
    ctx.fillStyle = '#ff6600';
    ctx.font = '10px sans-serif';
    ctx.fillText('⚠ Do not disassemble', 40, 190);
    ctx.fillText('⚠ Keep away from fire', 40, 205);

    // Terminal contacts
    ctx.fillStyle = '#c0a030';
    ctx.fillRect(w - 30, h / 2 - 20, 15, 10);
    ctx.fillRect(w - 30, h / 2, 15, 10);
    ctx.fillRect(w - 30, h / 2 + 20, 15, 10);
  });
}

// Heatsink texture
export function createHeatsinkTexture(): THREE.CanvasTexture {
  return createCanvasTexture(512, 512, (ctx, w, h) => {
    // Copper/silver base
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#8a7050');
    grad.addColorStop(0.5, '#b8956a');
    grad.addColorStop(1, '#8a7050');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Fin pattern
    const finWidth = 12;
    const gap = 4;
    for (let x = 0; x < w; x += finWidth + gap) {
      const finGrad = ctx.createLinearGradient(x, 0, x + finWidth, 0);
      finGrad.addColorStop(0, '#a08060');
      finGrad.addColorStop(0.5, '#c0a080');
      finGrad.addColorStop(1, '#907050');
      ctx.fillStyle = finGrad;
      ctx.fillRect(x, 0, finWidth, h);

      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(x + 2, 0, 2, h);
    }

    // Heat pipe indicators
    ctx.strokeStyle = '#d4a060';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.3);
    ctx.quadraticCurveTo(w * 0.5, h * 0.1, w * 0.8, h * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.7);
    ctx.quadraticCurveTo(w * 0.5, h * 0.9, w * 0.8, h * 0.7);
    ctx.stroke();
  });
}

// Sensor texture
export function createSensorTexture(): THREE.CanvasTexture {
  return createCanvasTexture(512, 512, (ctx, w, h) => {
    // Silicon wafer base
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(0, 0, w, h);

    // Active area
    const margin = 60;
    const activeW = w - margin * 2;
    const activeH = h - margin * 2;

    // Bayer pattern simulation
    for (let x = margin; x < w - margin; x += 4) {
      for (let y = margin; y < h - margin; y += 4) {
        const px = (x - margin) % 8;
        const py = (y - margin) % 8;
        if (px < 4 && py < 4) {
          ctx.fillStyle = 'rgba(200,50,50,0.4)'; // Red
        } else if (px >= 4 && py < 4) {
          ctx.fillStyle = 'rgba(50,200,50,0.4)'; // Green
        } else if (px < 4 && py >= 4) {
          ctx.fillStyle = 'rgba(50,200,50,0.4)'; // Green
        } else {
          ctx.fillStyle = 'rgba(50,50,200,0.4)'; // Blue
        }
        ctx.fillRect(x, y, 3, 3);
      }
    }

    // Bond wires
    ctx.strokeStyle = '#d4a030';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const x1 = margin + (i / 20) * activeW;
      ctx.beginPath();
      ctx.moveTo(x1, margin);
      ctx.quadraticCurveTo(x1 + 5, margin - 15, x1 + 10, margin - 25);
      ctx.stroke();
    }

    // Package frame
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 3;
    ctx.strokeRect(margin - 5, margin - 5, activeW + 10, activeH + 10);

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px monospace';
    ctx.fillText('1/1.3" CMOS', margin, h - 20);
    ctx.fillText('48MP', w - margin - 40, h - 20);
  });
}

// Microphone mesh texture
export function createMicTexture(): THREE.CanvasTexture {
  return createCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, w, h);

    // Mesh pattern
    const spacing = 8;
    for (let x = 0; x < w; x += spacing) {
      for (let y = 0; y < h; y += spacing) {
        ctx.beginPath();
        ctx.arc(x + spacing / 2, y + spacing / 2, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
      }
    }

    // Subtle gradient
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(100,100,100,0.1)');
    grad.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

// USB-C port texture
export function createUSBTexture(): THREE.CanvasTexture {
  return createCanvasTexture(256, 128, (ctx, w, h) => {
    // Metal housing
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#888');
    grad.addColorStop(0.3, '#aaa');
    grad.addColorStop(0.7, '#999');
    grad.addColorStop(1, '#777');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Port opening
    ctx.fillStyle = '#1a1a1a';
    const portW = 60;
    const portH = 20;
    const portX = (w - portW) / 2;
    const portY = (h - portH) / 2;
    ctx.beginPath();
    ctx.roundRect(portX, portY, portW, portH, 8);
    ctx.fill();

    // Inner tongue
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.roundRect(portX + 5, portY + 6, portW - 10, portH - 12, 3);
    ctx.fill();

    // Contact pins
    ctx.fillStyle = '#d4a030';
    for (let i = 0; i < 12; i++) {
      ctx.fillRect(portX + 8 + i * 4, portY + 8, 2, 4);
    }

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '8px sans-serif';
    ctx.fillText('USB-C', w / 2 - 15, h - 10);
  });
}
