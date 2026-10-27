import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createAllModules, disposeAllModules, ModuleInfo } from './modules';

// 模块列表静态信息（不含 Three.js 对象），供 React UI 渲染，避免持有整个场景引用
interface ModuleMeta {
  name: string;
  nameEn: string;
  description: string;
  color: string;
}

// 交互状态全部存放在 ref 中，避免状态变化导致 WebGL 上下文销毁重建
interface SceneState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  modules: ModuleInfo[];
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  mouseActive: boolean; // 鼠标是否在画布内
  pointerMoved: boolean; // 自上次拾取后指针是否移动过
  isDragging: boolean;
  previousMousePosition: { x: number; y: number };
  cameraAngle: { theta: number; phi: number };
  cameraDistance: number;
  animationProgress: number;
  targetProgress: number;
  hoveredModule: number | null;
  selectedModule: number | null;
}

// 渲染帧率上限：避免在高刷新率屏幕上做无意义的多余绘制
const MAX_FPS = 60;
const FRAME_INTERVAL = 1000 / MAX_FPS;
// 悬停拾取的节流间隔（不必每帧都做射线检测）
const HOVER_INTERVAL = 80;

// 模块高亮/恢复用的发光强度常量
const EMISSIVE_HOVER = 0.3;

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneState | null>(null);
  // 供动画循环读取的最新 UI 开关状态（用 ref 而非闭包捕获，避免重建场景）
  const autoRotateRef = useRef(true);
  const baseEmissiveRef = useRef<Map<THREE.Material, number>>(new Map());

  const [explodeProgress, setExplodeProgress] = useState(0);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [hoveredModule, setHoveredModule] = useState<number | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  // 场景初始化完成后同步模块元数据到 React state（供 UI 渲染，一次性）
  const [modules, setModules] = useState<ModuleMeta[]>([]);
  // 列表悬停（UI-only），与 3D 射线拾取的高亮分开维护，避免相互覆盖
  const [listHovered, setListHovered] = useState<number | null>(null);
  const listHoveredRef = useRef<number | null>(null);

  // autoRotate 变化时只更新 ref，不重建场景
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // 选中/列表悬停变化时，统一刷新 3D 场景中的高亮状态
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    const applyToModule = (index: number | null, on: boolean) => {
      if (index === null) return;
      state.modules[index].group.children.forEach((child) => {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && mat.emissive) {
          mat.emissiveIntensity = on ? EMISSIVE_HOVER : baseEmissiveRef.current.get(mat) ?? 1;
        }
      });
    };
    // 清除旧的选中/列表悬停高亮
    applyToModule(state.selectedModule, false);
    applyToModule(listHoveredRef.current, false);
    // 应用新的高亮（3D 射线悬停优先级更高，由动画循环维护）
    state.selectedModule = selectedModule;
    listHoveredRef.current = listHovered;
    applyToModule(selectedModule !== null ? selectedModule : listHovered, true);
  }, [selectedModule, listHovered]);

  // 场景只初始化一次（空依赖），所有动态状态通过 ref 传递
  useEffect(() => {
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

    // Renderer（powerPreference 提示 GPU 使用高性能模式；关闭无用功能）
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
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
    // 阴影贴图从 2048 降到 1024：显存占用降为 1/4，视觉差异很小
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    // 限定阴影相机视锥，提高贴图利用率
    mainLight.shadow.camera.near = 1;
    mainLight.shadow.camera.far = 25;
    mainLight.shadow.camera.left = -8;
    mainLight.shadow.camera.right = 8;
    mainLight.shadow.camera.top = 8;
    mainLight.shadow.camera.bottom = -8;
    mainLight.shadow.bias = -0.0005;
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

    // 记录每个材质原始的 emissiveIntensity，用于高亮后精确恢复
    const baseEmissive = baseEmissiveRef.current;
    baseEmissive.clear();
    modules.forEach((module) => {
      module.group.traverse((child) => {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (mat && !Array.isArray(mat) && 'emissive' in mat) {
          const pm = mat as THREE.MeshStandardMaterial;
          baseEmissive.set(pm, pm.emissiveIntensity ?? 1);
        }
      });
    });

    // State
    const state: SceneState = {
      scene,
      camera,
      renderer,
      modules,
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
      mouseActive: false,
      pointerMoved: false,
      isDragging: false,
      previousMousePosition: { x: 0, y: 0 },
      cameraAngle: { theta: 0.5, phi: 0.8 },
      cameraDistance: 8,
      animationProgress: 0,
      targetProgress: 0,
      hoveredModule: null,
      selectedModule: null,
    };

    sceneRef.current = state;
    // 同步模块元数据到 UI（一次性，仅存轻量字段）
    setModules(
      modules.map((m) => ({ name: m.name, nameEn: m.nameEn, description: m.description, color: m.color }))
    );

    // 复用临时向量，避免每帧在动画循环里分配新对象造成 GC 压力
    const tmpTargetPos = new THREE.Vector3();

    // 设置模块悬停高亮（只在变化时更新材质）
    const applyHoverHighlight = (index: number | null) => {
      if (state.hoveredModule === index) return;
      const prev = state.hoveredModule;
      state.hoveredModule = index;

      // 恢复上一个悬停模块（若未被选中）
      if (prev !== null && prev !== state.selectedModule) {
        state.modules[prev].group.children.forEach((child) => {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat && mat.emissive) {
            mat.emissiveIntensity = baseEmissive.get(mat) ?? 1;
          }
        });
      }
      // 高亮当前模块
      if (index !== null) {
        state.modules[index].group.children.forEach((child) => {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat && mat.emissive) {
            mat.emissiveIntensity = EMISSIVE_HOVER;
          }
        });
      }
      setHoveredModule(index);
    };

    // 射线拾取：按深度找最近命中的模块（原实现按模块顺序返回，会误选后面的模块）
    const pickModule = (): number | null => {
      state.raycaster.setFromCamera(state.mouse, camera);
      let best: number | null = null;
      let bestDist = Infinity;
      for (let i = 0; i < state.modules.length; i++) {
        const intersects = state.raycaster.intersectObjects(state.modules[i].group.children, true);
        if (intersects.length > 0 && intersects[0].distance < bestDist) {
          bestDist = intersects[0].distance;
          best = i;
        }
      }
      return best;
    };

    // 是否需要继续渲染（有动画进行中 / 自动旋转 / 交互中）
    let rafId = 0;
    let lastTime = 0;
    let lastHoverTime = 0;

    const animate = (time: number) => {
      rafId = requestAnimationFrame(animate);

      // 帧率上限控制：跳过过快的帧
      if (time - lastTime < FRAME_INTERVAL) return;
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // 页面不可见时不渲染
      if (document.hidden) return;

      const progressDelta = Math.abs(state.targetProgress - state.animationProgress);
      const animating = progressDelta > 0.0005 || state.isDragging || autoRotateRef.current;

      // 静止且无动画时跳过本帧渲染
      if (!animating && !state.pointerMoved) {
        return;
      }

      // 拆解进度插值（与帧率无关的平滑系数）
      const lerpFactor = 1 - Math.pow(1 - 0.05, dt * 60);
      state.animationProgress += (state.targetProgress - state.animationProgress) * lerpFactor;

      // Update module positions based on progress
      state.modules.forEach((module) => {
        tmpTargetPos.lerpVectors(
          module.assembledPosition,
          module.explodedPosition,
          state.animationProgress
        );
        module.group.position.lerp(tmpTargetPos, 1 - Math.pow(1 - 0.1, dt * 60));

        // Add subtle rotation when exploded
        if (state.animationProgress > 0.1) {
          module.group.rotation.y += 0.001 * state.animationProgress * (dt * 60);
        }
      });

      // Auto rotate
      if (autoRotateRef.current && !state.isDragging) {
        state.cameraAngle.theta += 0.003 * (dt * 60);
      }

      // Update camera position
      const x = state.cameraDistance * Math.sin(state.cameraAngle.phi) * Math.cos(state.cameraAngle.theta);
      const y = state.cameraDistance * Math.cos(state.cameraAngle.phi);
      const z = state.cameraDistance * Math.sin(state.cameraAngle.phi) * Math.sin(state.cameraAngle.theta);
      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);

      // 悬停拾取：仅在指针移动且距上次拾取超过节流间隔时执行
      if (state.pointerMoved && time - lastHoverTime > HOVER_INTERVAL) {
        lastHoverTime = time;
        state.pointerMoved = false;
        if (state.mouseActive && !state.isDragging) {
          applyHoverHighlight(pickModule());
        } else {
          applyHoverHighlight(null);
        }
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    // Handle resize（去抖，避免拖拽窗口时频繁重建渲染缓冲）
    let resizeTimer = 0;
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }, 150);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      sceneRef.current = null;
      // 完整释放 GPU 资源，防止 WebGL 上下文泄漏
      disposeAllModules(modules);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Mouse/touch handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (!sceneRef.current) return;
      sceneRef.current.isDragging = true;
      sceneRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    // 快进缓存，避免同一事件内多次调用 getBoundingClientRect 触发强制重排
    const handleMouseMove = (e: MouseEvent) => {
      const state = sceneRef.current;
      if (!state) return;
      const rect = container.getBoundingClientRect();
      state.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.mouseActive = true;
      state.pointerMoved = true;

      if (state.isDragging) {
        const deltaX = e.clientX - state.previousMousePosition.x;
        const deltaY = e.clientY - state.previousMousePosition.y;
        state.cameraAngle.theta -= deltaX * 0.005;
        state.cameraAngle.phi = Math.max(
          0.2,
          Math.min(Math.PI - 0.2, state.cameraAngle.phi + deltaY * 0.005)
        );
        state.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      if (!sceneRef.current) return;
      sceneRef.current.isDragging = false;
    };

    const handleMouseLeave = () => {
      const state = sceneRef.current;
      if (!state) return;
      state.isDragging = false;
      state.mouseActive = false;
      state.pointerMoved = true; // 让动画循环清除悬停高亮
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
      const state = sceneRef.current;
      if (!state) return;
      const rect = container.getBoundingClientRect();
      state.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // 按深度取最近命中的模块
      state.raycaster.setFromCamera(state.mouse, state.camera);
      let best: number | null = null;
      let bestDist = Infinity;
      for (let i = 0; i < state.modules.length; i++) {
        const intersects = state.raycaster.intersectObjects(
          state.modules[i].group.children,
          true
        );
        if (intersects.length > 0 && intersects[0].distance < bestDist) {
          bestDist = intersects[0].distance;
          best = i;
        }
      }

      // 维护选中模块的发光高亮
      const prevSelected = state.selectedModule;
      if (prevSelected !== null && prevSelected !== state.hoveredModule) {
        state.modules[prevSelected].group.children.forEach((child) => {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat && mat.emissive) {
            mat.emissiveIntensity = baseEmissiveRef.current.get(mat) ?? 1;
          }
        });
      }
      if (best !== null) {
        state.modules[best].group.children.forEach((child) => {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat && mat.emissive) {
            mat.emissiveIntensity = EMISSIVE_HOVER;
          }
        });
      }

      state.selectedModule = best;
      setSelectedModule(best);
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
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('click', handleClick);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseLeave);
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

  const currentModule = selectedModule !== null ? modules[selectedModule] ?? null : null;
  const hoveredInfo =
    listHovered !== null ? modules[listHovered] ?? null : hoveredModule !== null ? modules[hoveredModule] ?? null : null;

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
