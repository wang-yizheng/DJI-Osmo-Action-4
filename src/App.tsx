import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { createAllModules, ModuleInfo } from './modules';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    modules: ModuleInfo[];
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    isDragging: boolean;
    previousMousePosition: { x: number; y: number };
    cameraAngle: { theta: number; phi: number };
    cameraDistance: number;
    animationProgress: number;
    targetProgress: number;
    hoveredModule: number | null;
    selectedModule: number | null;
  } | null>(null);

  const [explodeProgress, setExplodeProgress] = useState(0);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [hoveredModule, setHoveredModule] = useState<number | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);

  const initScene = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f7);
    scene.fog = new THREE.Fog(0xf5f5f7, 15, 30);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.6);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.4);
    rimLight.position.set(0, -3, 5);
    scene.add(rimLight);

    // Point lights for soft effect
    const pointLight1 = new THREE.PointLight(0x4488ff, 0.3, 10);
    pointLight1.position.set(-3, 2, 3);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff6633, 0.2, 10);
    pointLight2.position.set(3, -2, -3);
    scene.add(pointLight2);

    // Grid helper (subtle, light theme)
    const gridHelper = new THREE.GridHelper(20, 40, 0xd0d0d8, 0xe8e8ee);
    gridHelper.position.y = -4;
    scene.add(gridHelper);

    // Create modules
    const modules = createAllModules();
    modules.forEach((module) => {
      scene.add(module.group);
      module.group.position.copy(module.assembledPosition);
    });

    // State
    const state = {
      scene,
      camera,
      renderer,
      modules,
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
      isDragging: false,
      previousMousePosition: { x: 0, y: 0 },
      cameraAngle: { theta: 0.5, phi: 0.8 },
      cameraDistance: 8,
      animationProgress: 0,
      targetProgress: 0,
      hoveredModule: null as number | null,
      selectedModule: null as number | null,
    };

    sceneRef.current = state;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Smooth progress interpolation
      state.animationProgress += (state.targetProgress - state.animationProgress) * 0.05;

      // Update module positions based on progress
      state.modules.forEach((module) => {
        const targetPos = new THREE.Vector3().lerpVectors(
          module.assembledPosition,
          module.explodedPosition,
          state.animationProgress
        );
        module.group.position.lerp(targetPos, 0.1);

        // Add subtle rotation when exploded
        if (state.animationProgress > 0.1) {
          module.group.rotation.y += 0.001 * state.animationProgress;
        }
      });

      // Auto rotate
      if (autoRotate && !state.isDragging) {
        state.cameraAngle.theta += 0.003;
      }

      // Update camera position
      const x = state.cameraDistance * Math.sin(state.cameraAngle.phi) * Math.cos(state.cameraAngle.theta);
      const y = state.cameraDistance * Math.cos(state.cameraAngle.phi);
      const z = state.cameraDistance * Math.sin(state.cameraAngle.phi) * Math.sin(state.cameraAngle.theta);
      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);

      // Hover highlight
      state.raycaster.setFromCamera(state.mouse, camera);
      let foundHover = false;
      state.modules.forEach((module, index) => {
        const intersects = state.raycaster.intersectObjects(module.group.children, true);
        if (intersects.length > 0 && !foundHover) {
          state.hoveredModule = index;
          foundHover = true;
          setHoveredModule(index);
          // Highlight
          module.group.children.forEach((child) => {
            if ((child as THREE.Mesh).material) {
              const mat = (child as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
              if (mat.emissive) {
                mat.emissiveIntensity = 0.3;
              }
            }
          });
        } else {
          // Reset highlight
          module.group.children.forEach((child) => {
            if ((child as THREE.Mesh).material) {
              const mat = (child as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
              if (mat.emissive && index !== state.selectedModule) {
                mat.emissiveIntensity = mat.emissiveIntensity > 0 ? Math.max(0, mat.emissiveIntensity - 0.02) : 0;
              }
            }
          });
        }
      });
      if (!foundHover) {
        state.hoveredModule = null;
        setHoveredModule(null);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [autoRotate]);

  useEffect(() => {
    const cleanup = initScene();
    return cleanup;
  }, [initScene]);

  // Mouse/touch handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (!sceneRef.current) return;
      sceneRef.current.isDragging = true;
      sceneRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!sceneRef.current) return;
      const rect = container.getBoundingClientRect();
      sceneRef.current.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      sceneRef.current.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (sceneRef.current.isDragging) {
        const deltaX = e.clientX - sceneRef.current.previousMousePosition.x;
        const deltaY = e.clientY - sceneRef.current.previousMousePosition.y;
        sceneRef.current.cameraAngle.theta -= deltaX * 0.005;
        sceneRef.current.cameraAngle.phi = Math.max(
          0.2,
          Math.min(Math.PI - 0.2, sceneRef.current.cameraAngle.phi + deltaY * 0.005)
        );
        sceneRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      if (!sceneRef.current) return;
      sceneRef.current.isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      if (!sceneRef.current) return;
      e.preventDefault();
      sceneRef.current.cameraDistance = Math.max(
        4,
        Math.min(15, sceneRef.current.cameraDistance + e.deltaY * 0.005)
      );
    };

    const handleClick = (e: MouseEvent) => {
      if (!sceneRef.current) return;
      const rect = container.getBoundingClientRect();
      sceneRef.current.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      sceneRef.current.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      sceneRef.current.raycaster.setFromCamera(sceneRef.current.mouse, sceneRef.current.camera);
      for (let i = 0; i < sceneRef.current.modules.length; i++) {
        const intersects = sceneRef.current.raycaster.intersectObjects(
          sceneRef.current.modules[i].group.children,
          true
        );
        if (intersects.length > 0) {
          setSelectedModule(i);
          sceneRef.current.selectedModule = i;
          return;
        }
      }
      setSelectedModule(null);
      sceneRef.current.selectedModule = null;
    };

    // Touch handlers
    const handleTouchStart = (e: TouchEvent) => {
      if (!sceneRef.current || e.touches.length !== 1) return;
      sceneRef.current.isDragging = true;
      sceneRef.current.previousMousePosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!sceneRef.current || e.touches.length !== 1) return;
      e.preventDefault();
      const deltaX = e.touches[0].clientX - sceneRef.current.previousMousePosition.x;
      const deltaY = e.touches[0].clientY - sceneRef.current.previousMousePosition.y;
      sceneRef.current.cameraAngle.theta -= deltaX * 0.005;
      sceneRef.current.cameraAngle.phi = Math.max(
        0.2,
        Math.min(Math.PI - 0.2, sceneRef.current.cameraAngle.phi + deltaY * 0.005)
      );
      sceneRef.current.previousMousePosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchEnd = () => {
      if (!sceneRef.current) return;
      sceneRef.current.isDragging = false;
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('click', handleClick);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const handleExplodeChange = (value: number) => {
    setExplodeProgress(value);
    if (sceneRef.current) {
      sceneRef.current.targetProgress = value;
    }
  };

  const modules = sceneRef.current?.modules || [];
  const currentModule = selectedModule !== null && modules[selectedModule] ? modules[selectedModule] : null;
  const hoveredInfo = hoveredModule !== null && modules[hoveredModule] ? modules[hoveredModule] : null;

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#f5f5f7]">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 pointer-events-none z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">
              DJI Osmo Action 4
            </h1>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              交互式3D结构拆解 · Interactive 3D Teardown
            </p>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                showLabels
                  ? 'bg-blue-500/10 text-blue-600 border border-blue-300/50'
                  : 'bg-white/70 text-gray-500 border border-gray-200/60'
              }`}
            >
              标签
            </button>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                autoRotate
                  ? 'bg-blue-500/10 text-blue-600 border border-blue-300/50'
                  : 'bg-white/70 text-gray-500 border border-gray-200/60'
              }`}
            >
              自动旋转
            </button>
          </div>
        </div>
      </div>

      {/* Explode Slider */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-md">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/60 shadow-lg shadow-black/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">组装</span>
            <span className="text-xs text-gray-700 font-medium">拆解程度</span>
            <span className="text-xs text-gray-500">完全展开</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={explodeProgress}
            onChange={(e) => handleExplodeChange(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer
              bg-gradient-to-r from-blue-200 via-purple-300 to-orange-300
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:shadow-blue-400/40
              [&::-webkit-slider-thumb]:border
              [&::-webkit-slider-thumb]:border-gray-200
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110"
          />
          <div className="flex justify-between mt-2">
            <button
              onClick={() => handleExplodeChange(0)}
              className="text-xs text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded bg-gray-100/80 hover:bg-gray-200/80"
            >
              复原
            </button>
            <button
              onClick={() => handleExplodeChange(0.5)}
              className="text-xs text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded bg-gray-100/80 hover:bg-gray-200/80"
            >
              半展开
            </button>
            <button
              onClick={() => handleExplodeChange(1)}
              className="text-xs text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded bg-gray-100/80 hover:bg-gray-200/80"
            >
              全展开
            </button>
          </div>
        </div>
      </div>

      {/* Module List - Left Side */}
      <div className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-10 pointer-events-auto">
        <div className="flex flex-col gap-1.5">
          {modules.map((module, index) => (
            <button
              key={index}
              onClick={() => setSelectedModule(selectedModule === index ? null : index)}
              onMouseEnter={() => setHoveredModule(index)}
              onMouseLeave={() => setHoveredModule(null)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all duration-200 ${
                selectedModule === index
                  ? 'bg-blue-50 border border-blue-200 scale-105 shadow-sm'
                  : hoveredModule === index
                  ? 'bg-white/80 border border-gray-200 shadow-sm'
                  : 'bg-white/50 border border-transparent hover:bg-white/70'
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: module.color }}
              />
              {showLabels && (
                <span className="text-[10px] md:text-xs text-gray-700 whitespace-nowrap">
                  {module.name}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Module Info Panel - Right Side */}
      {(currentModule || hoveredInfo) && (
        <div className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-10 pointer-events-auto max-w-[260px]">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/60 shadow-lg shadow-black/5">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: (currentModule || hoveredInfo)!.color }}
              />
              <h3 className="text-sm font-bold text-gray-900">
                {(currentModule || hoveredInfo)!.name}
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              {(currentModule || hoveredInfo)!.nameEn}
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              {(currentModule || hoveredInfo)!.description}
            </p>
            {selectedModule !== null && (
              <div className="mt-3 pt-3 border-t border-gray-200/60">
                <p className="text-[10px] text-gray-400">
                  模块 {selectedModule + 1} / 9
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <p className="text-[10px] text-gray-400 text-center">
          拖拽旋转 · 滚轮缩放 · 点击选择模块
        </p>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-20 h-20 pointer-events-none">
        <svg viewBox="0 0 80 80" className="w-full h-full opacity-30">
          <path d="M0 20 L0 0 L20 0" fill="none" stroke="#94a3b8" strokeWidth="1" />
        </svg>
      </div>
      <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none">
        <svg viewBox="0 0 80 80" className="w-full h-full opacity-30">
          <path d="M60 0 L80 0 L80 20" fill="none" stroke="#94a3b8" strokeWidth="1" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 w-20 h-20 pointer-events-none">
        <svg viewBox="0 0 80 80" className="w-full h-full opacity-30">
          <path d="M0 60 L0 80 L20 80" fill="none" stroke="#94a3b8" strokeWidth="1" />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 w-20 h-20 pointer-events-none">
        <svg viewBox="0 0 80 80" className="w-full h-full opacity-30">
          <path d="M60 80 L80 80 L80 60" fill="none" stroke="#94a3b8" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}

export default App;
