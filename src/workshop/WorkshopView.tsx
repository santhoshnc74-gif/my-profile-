// Master 3D Interactive Miniature Workshop Component
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CarVehicle, type CarControls } from './car';
import { createWorkshopScenery, type WorkshopSceneryObject } from './scenery';
import { STATIONS, checkStationProximity, type StationTrigger } from './collision';
import { sound } from './audio';
import { StationModal } from './StationModal';
import type { Portfolio } from '../types';
import { safeUrl } from '../api';
import {
  ArrowsOutCardinal,
  SpeakerHigh,
  SpeakerSlash,
  ArrowCounterClockwise,
  ArrowRight,
  ArrowUpRight,
  HandPointing,
  CaretUp,
  CaretDown,
  CaretLeft,
  CaretRight,
  Stop,
  Eye,
  Compass,
  X,
} from '@phosphor-icons/react';

interface WorkshopViewProps {
  portfolio: Portfolio;
  onToggleSimpleView: () => void;
  isSimpleView: boolean;
}

export function WorkshopView({ portfolio, onToggleSimpleView, isSimpleView }: WorkshopViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Active station detail drawer modal
  const [activeStationModal, setActiveStationModal] = useState<
    'projects' | 'learning' | 'plans' | 'connect' | null
  >(() => {
    const param = new URLSearchParams(window.location.search).get('station');
    if (param === 'projects' || param === 'learning' || param === 'plans' || param === 'connect') return param;
    return null;
  });

  // Camera & Exploration Mode: 'intro' frames workshop alongside hero copy; 'explore' follows car closely
  const [viewMode, setViewMode] = useState<'intro' | 'explore'>('intro');

  // Currently nearby station (proximity trigger)
  const [nearbyStation, setNearbyStation] = useState<StationTrigger | null>(null);
  const nearbyStationIdRef = useRef<string | null>(null);

  // Audio mute state
  const [soundActive, setSoundActive] = useState<boolean>(sound.isEnabled());

  // Refs for 3D engine objects (initialized ONCE per mount)
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const carRef = useRef<CarVehicle | null>(null);
  const sceneryRef = useRef<WorkshopSceneryObject | null>(null);

  // Direct DOM references for 3D station tags (avoids 60 FPS React re-renders)
  const labelPillRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Input states stored in refs to prevent scene recreation
  const keyControlsRef = useRef<CarControls>({
    forward: false,
    reverse: false,
    left: false,
    right: false,
    brake: false,
  });
  const touchControlsRef = useRef<CarControls>({
    forward: false,
    reverse: false,
    left: false,
    right: false,
    brake: false,
  });

  // Modal open ref so animation loop can pause car physics
  const isModalOpenRef = useRef<boolean>(Boolean(activeStationModal));
  useEffect(() => {
    isModalOpenRef.current = Boolean(activeStationModal);
  }, [activeStationModal]);

  // View mode ref for animation loop
  const viewModeRef = useRef<'intro' | 'explore'>(viewMode);
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // Camera Orbit state (drag to look around)
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const orbitAngleRef = useRef({ azimuth: Math.PI / 4, elevation: 0.65 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0.4, 0));

  const { profile: p, projects } = portfolio;
  const carColor = p.appearance?.carColor || '#166069';

  // Update car color dynamically without scene recreation
  useEffect(() => {
    carRef.current?.setCarColor(carColor);
  }, [carColor]);

  // Update scenery dynamic textures when portfolio data updates
  useEffect(() => {
    sceneryRef.current?.updateContent(portfolio);
  }, [portfolio]);

  // Open station handler
  const handleOpenStation = useCallback((id: 'projects' | 'learning' | 'plans' | 'connect') => {
    setActiveStationModal(id);
    if (carRef.current) carRef.current.speed = 0;
  }, []);

  // Reset Car Position
  const handleResetCar = useCallback(() => {
    if (carRef.current) {
      carRef.current.reset(0, 0);
      sound.playChime();
    }
  }, []);

  // Reset Camera View to Hero Framing & switch to intro mode
  const handleResetCamera = useCallback(() => {
    orbitAngleRef.current = { azimuth: Math.PI / 4, elevation: 0.65 };
    setViewMode('intro');
  }, []);

  // Quick Travel / Focus on a station directly
  const handleTravelToStation = useCallback((id: 'projects' | 'learning' | 'plans' | 'connect') => {
    const station = STATIONS.find((s) => s.id === id);
    if (!station || !carRef.current) return;
    setViewMode('explore');
    // Place car just in front of the station center
    const offsetX = station.id === 'projects' ? 1.4 : station.id === 'plans' ? -1.4 : 0;
    const offsetZ = station.id === 'learning' ? 1.5 : station.id === 'connect' ? -1.4 : 1.2;
    carRef.current.reset(station.center[0] + offsetX, station.center[1] + offsetZ);
    sound.playChime();
  }, []);

  // Toggle Sound
  const handleToggleSound = useCallback(() => {
    const next = sound.toggle();
    setSoundActive(next);
  }, []);

  // Start exploration mode
  const handleStartExplore = useCallback(() => {
    setViewMode('explore');
    if (carRef.current && carRef.current.speed === 0) {
      carRef.current.speed = 3.0; // Gentle forward nudge
    }
  }, []);

  // Clear all held inputs (called on blur, visibility change, pointer cancel)
  const clearAllInputs = useCallback(() => {
    keyControlsRef.current = { forward: false, reverse: false, left: false, right: false, brake: false };
    touchControlsRef.current = { forward: false, reverse: false, left: false, right: false, brake: false };
  }, []);

  // Setup Three.js scene & render loop (MOUNT ONCE ONLY)
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#f5f2eb');

    // 2. Camera: Isometric Perspective
    const initialWidth = container.clientWidth || window.innerWidth;
    const initialHeight = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(36, initialWidth / initialHeight, 0.5, 100);
    cameraRef.current = camera;
    camera.position.set(12.6, 11.8, 15.8);
    camera.lookAt(-1.4, 0.5, 1.8);
    cameraTargetRef.current.set(-1.4, 0.5, 1.8);

    // 3. Renderer with soft shadow maps and ACES tone mapping
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    rendererRef.current = renderer;
    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // 4. Lighting: Golden Sunlight & Soft Daylight Fill
    const ambientLight = new THREE.AmbientLight('#faf6ee', 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#fff5ea', 2.2);
    sunLight.position.set(12, 18, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 40;
    sunLight.shadow.camera.left = -10;
    sunLight.shadow.camera.right = 10;
    sunLight.shadow.camera.top = 10;
    sunLight.shadow.camera.bottom = -10;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    const tealSkyFill = new THREE.DirectionalLight('#bce3e3', 0.5);
    tealSkyFill.position.set(-10, 8, -10);
    scene.add(tealSkyFill);

    // 5. Scenery (Ivory architectural courtyard & four stations)
    const scenery = createWorkshopScenery();
    sceneryRef.current = scenery;
    scene.add(scenery);

    // 6. Drivable Car
    const car = new CarVehicle(carColor);
    carRef.current = car;
    scene.add(car.group);

    // Vector helper for projections
    const projVector = new THREE.Vector3();
    const stationWorldPositions: Record<string, [number, number, number]> = {
      projects: [-3.8, 3.4, -3.6],
      learning: [0.6, 3.2, -4.4],
      plans: [5.2, 3.4, -4.0],
      connect: [4.6, 2.8, 2.0],
    };

    // 7. Animation Loop
    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Combine keyboard and touch controls
      const activeControls: CarControls = {
        forward: keyControlsRef.current.forward || touchControlsRef.current.forward,
        reverse: keyControlsRef.current.reverse || touchControlsRef.current.reverse,
        left: keyControlsRef.current.left || touchControlsRef.current.left,
        right: keyControlsRef.current.right || touchControlsRef.current.right,
        brake: keyControlsRef.current.brake || touchControlsRef.current.brake,
      };

      // If user starts driving while in intro mode, smoothly switch to explore mode
      if (
        (activeControls.forward || activeControls.reverse || activeControls.left || activeControls.right) &&
        viewModeRef.current === 'intro'
      ) {
        setViewMode('explore');
      }

      // Only update vehicle physics if no modal is active
      if (!isModalOpenRef.current) {
        car.update(dt, activeControls);
      }

      // Proximity check against stations (only trigger state update on change)
      const prox = checkStationProximity(car.position.x, car.position.z);
      const currentProxId = prox?.id || null;
      if (currentProxId !== nearbyStationIdRef.current) {
        nearbyStationIdRef.current = currentProxId;
        if (prox) sound.playChime();
        setNearbyStation(prox);
      }

      // Camera Follow & Framing calculation
      const currentWidth = renderer.domElement.clientWidth;
      const currentHeight = renderer.domElement.clientHeight;

      if (viewModeRef.current === 'intro') {
        // Intro mode: frame workshop on right half with cinematic overview
        const introTarget = new THREE.Vector3(-1.4, 0.5, 1.8);
        cameraTargetRef.current.lerp(introTarget, 0.04);

        const introCam = new THREE.Vector3(12.6, 11.8, 15.8);
        camera.position.lerp(introCam, 0.04);
      } else {
        // Explore mode: smoothly follow car with orbit angle
        const targetX = car.position.x * 0.45;
        const targetZ = car.position.z * 0.45;
        cameraTargetRef.current.lerp(new THREE.Vector3(targetX, 0.4, targetZ), 0.06);

        const radius = 18.0;
        const camX =
          cameraTargetRef.current.x +
          radius * Math.cos(orbitAngleRef.current.azimuth) * Math.cos(orbitAngleRef.current.elevation);
        const camY = cameraTargetRef.current.y + radius * Math.sin(orbitAngleRef.current.elevation);
        const camZ =
          cameraTargetRef.current.z +
          radius * Math.sin(orbitAngleRef.current.azimuth) * Math.cos(orbitAngleRef.current.elevation);

        camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.06);
      }
      camera.lookAt(cameraTargetRef.current);

      // Direct DOM update of 3D floating station tags (ZERO React re-renders!)
      const isMobile = currentWidth < 768;
      const isIntro = viewModeRef.current === 'intro';

      for (const [stId, pos] of Object.entries(stationWorldPositions)) {
        const el = labelPillRefs.current[stId];
        if (!el) continue;

        projVector.set(pos[0], pos[1], pos[2]);
        projVector.project(camera);

        const isBehind = projVector.z > 1;
        const screenX = ((projVector.x + 1) * currentWidth) / 2;
        const screenY = ((-projVector.y + 1) * currentHeight) / 2;

        const overlapsHero = isIntro && isMobile && screenY < 320 && screenX < 360;
        const inBounds = screenX >= 0 && screenX <= currentWidth && screenY >= 0 && screenY <= currentHeight;

        if (!isBehind && inBounds && !overlapsHero) {
          el.style.transform = `translate3d(${Math.round(screenX)}px, ${Math.round(screenY)}px, 0) translate(-50%, -100%)`;
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
        } else {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        }
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Dynamic Resize Handler using exact viewport dimensions
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Teardown: cancel RAF, remove listeners, dispose WebGL resources
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      car.dispose();
      scenery.dispose();
      renderer.dispose();
    };
  }, []); // Run ONCE on genuine mount only

  // Input Event Listeners with blur, visibilitychange, and focus safety
  useEffect(() => {
    const isInputActive = () => {
      const activeEl = document.activeElement;
      if (!activeEl) return false;
      const tag = activeEl.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || (activeEl as HTMLElement).isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputActive() || activeStationModal) return;

      const key = e.key.toLowerCase();

      if (key === 'w' || key === 'arrowup') {
        keyControlsRef.current.forward = true;
      } else if (key === 's' || key === 'arrowdown') {
        keyControlsRef.current.reverse = true;
      } else if (key === 'a' || key === 'arrowleft') {
        keyControlsRef.current.left = true;
      } else if (key === 'd' || key === 'arrowright') {
        keyControlsRef.current.right = true;
      } else if (key === ' ') {
        keyControlsRef.current.brake = true;
        e.preventDefault();
      } else if (key === 'r') {
        handleResetCar();
      } else if (key === 'e' || key === 'enter') {
        if (nearbyStation && !activeStationModal) {
          handleOpenStation(nearbyStation.id);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isInputActive()) return;

      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') {
        keyControlsRef.current.forward = false;
      } else if (key === 's' || key === 'arrowdown') {
        keyControlsRef.current.reverse = false;
      } else if (key === 'a' || key === 'arrowleft') {
        keyControlsRef.current.left = false;
      } else if (key === 'd' || key === 'arrowright') {
        keyControlsRef.current.right = false;
      } else if (key === ' ') {
        keyControlsRef.current.brake = false;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) clearAllInputs();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearAllInputs);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearAllInputs);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [nearbyStation, activeStationModal, handleResetCar, handleOpenStation, clearAllInputs]);

  // Mouse drag-to-orbit listener
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };

    orbitAngleRef.current.azimuth -= deltaX * 0.005;
    orbitAngleRef.current.elevation = Math.max(
      0.35,
      Math.min(1.2, orbitAngleRef.current.elevation + deltaY * 0.004)
    );
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Helper for touch buttons to support simultaneous steering & acceleration
  const setTouchState = (key: keyof CarControls, val: boolean) => {
    touchControlsRef.current[key] = val;
  };

  const stationsConfig = p.stations || {
    projects: { heading: 'Projects', subtitle: 'Featured engineering & software projects', visible: true },
    learning: { heading: 'Learning', subtitle: 'Education & technical curiosity', visible: true },
    plans: { heading: 'Future plans', subtitle: 'Goals & entrepreneurial roadmap', visible: true },
    connect: { heading: 'Connect', subtitle: 'Let’s start a conversation.', visible: true },
  };

  return (
    <div
      className={`workshop-viewport mode-${viewMode}`}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="workshop-canvas" />

      {/* FOREGROUND SOFT LEAF OVERLAYS (DIORAMA BOKEH FROM APPROVED CONCEPT) */}
      <div className="foreground-leaves-overlay" aria-hidden="true">
        <div className="leaf-cluster leaf-cluster-bl" />
        <div className="leaf-cluster leaf-cluster-br" />
      </div>

      {/* TOP NAVIGATION BAR */}
      <nav className="workshop-topbar" aria-label="Main Navigation">
        <div className="topbar-left">
          <span className="brand-logo">S N C</span>
          <span className="brand-divider">/</span>
          <span className="brand-section">PORTFOLIO</span>
        </div>

        <div className="topbar-links">
          <button
            className="topbar-link-btn"
            onClick={() => handleOpenStation('projects')}
          >
            {stationsConfig.projects.heading}
          </button>
          <button
            className="topbar-link-btn"
            onClick={() => handleOpenStation('learning')}
          >
            About
          </button>
          <button
            className="topbar-link-btn"
            onClick={() => handleOpenStation('connect')}
          >
            {stationsConfig.connect.heading}
          </button>
        </div>

        <div className="topbar-right">
          <label className="simple-view-toggle" title="Switch to accessible Simple view">
            <input
              type="checkbox"
              checked={isSimpleView}
              onChange={onToggleSimpleView}
              aria-label="Toggle Simple view"
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Simple view</span>
          </label>
        </div>
      </nav>

      {/* MOBILE DESTINATION QUICK CHIPS */}
      <div className="mobile-destination-bar" aria-label="Quick Stations">
        {STATIONS.map((station) => (
          <button
            key={station.id}
            className={`destination-chip ${nearbyStation?.id === station.id ? 'is-active' : ''}`}
            onClick={() => handleTravelToStation(station.id)}
            aria-label={`Go to ${station.title}`}
          >
            <span className="chip-idx">{station.index}</span>
            <span className="chip-label">{station.title}</span>
          </button>
        ))}
      </div>

      {/* LEFT INTRODUCTORY HERO COLUMN (Expands in 'intro' mode, collapses in 'explore' mode) */}
      {viewMode === 'intro' ? (
        <aside className="workshop-hero-column" aria-label="Introduction">
          <div className="hero-eyebrow">
            <span>{p.name}</span>
          </div>
          <h1 className="hero-heading">
            A small world.
            <br />
            Big ideas.
          </h1>
          <p className="hero-bio">
            {p.bio || 'AI & Data Science student. Learning, building, and working toward entrepreneurship.'}
          </p>

          <div className="hero-cta-group">
            <button
              className="hero-primary-btn"
              onClick={handleStartExplore}
              aria-label="Explore the interactive workshop"
            >
              <span>Explore the workshop</span>
              <ArrowRight size={18} />
            </button>
            <a
              href={safeUrl(p.links.resume) || '/resume'}
              className="hero-secondary-btn"
              {...(safeUrl(p.links.resume) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              <span>View résumé</span>
              <ArrowUpRight size={16} />
            </a>
          </div>
        </aside>
      ) : (
        <div className="explore-mode-badge" aria-label="Active exploration mode">
          <button
            className="overview-return-btn"
            onClick={handleResetCamera}
            title="Return to workshop overview"
          >
            <Compass size={16} />
            <span>Overview</span>
          </button>
        </div>
      )}

      {/* FLOATING 3D STATION PILLS (PROJECTED DIRECTLY ONTO DOM - NO REACT RE-RENDERS) */}
      {STATIONS.map((station) => {
        const isNearby = nearbyStation?.id === station.id;

        return (
          <div
            key={station.id}
            ref={(el) => {
              labelPillRefs.current[station.id] = el;
            }}
            className={`station-3d-marker ${isNearby ? 'is-nearby' : ''}`}
            style={{ position: 'absolute', top: 0, left: 0, opacity: 0 }}
          >
            <button
              className="station-marker-pill"
              onClick={() => handleOpenStation(station.id)}
              aria-label={`Open station ${station.index}: ${station.title}`}
            >
              <span className="marker-index">{station.index}</span>
              <span className="marker-title">{station.title}</span>
            </button>
            <span className="station-marker-pin" aria-hidden="true" />
          </div>
        );
      })}

      {/* PROXIMITY FLOATING CARD (DISPLAYED WHEN CAR IS NEAR A STATION) */}
      {nearbyStation && !activeStationModal && (
        <div className="proximity-card" role="region" aria-label="Nearby destination details">
          <div className="proximity-card-header">
            <h4>
              {nearbyStation.id === 'projects'
                ? p.currentWork.name
                : nearbyStation.id === 'learning'
                ? p.education.heading
                : nearbyStation.id === 'plans'
                ? p.futurePlansHeading
                : stationsConfig.connect.heading}
            </h4>
            {nearbyStation.id === 'projects' && <span className="status-badge">Featured project</span>}
          </div>
          <p className="proximity-card-desc">
            {nearbyStation.id === 'projects'
              ? p.currentWork.description
              : nearbyStation.id === 'learning'
              ? `${p.education.degree} · ${p.education.institution}`
              : nearbyStation.id === 'plans'
              ? 'Roadmap of projects, technical exploration and ventures.'
              : p.contact?.description || 'Get in touch for questions, collaborations and opportunities.'}
          </p>
          <button
            className="proximity-action-btn"
            onClick={() => handleOpenStation(nearbyStation.id)}
          >
            <span>Press [E] or tap to inspect</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* BOTTOM CONTROLS DOCK */}
      <footer className="workshop-bottom-bar" aria-label="Controls and status">
        <div className="bottom-left-hints">
          <div className="hint-item">
            <span className="key-cap">W</span>
            <span className="key-cap">A</span>
            <span className="key-cap">S</span>
            <span className="key-cap">D</span>
            <span className="hint-label">Drive</span>
          </div>

          <div className="hint-divider" />

          <div className="hint-item">
            <HandPointing size={18} />
            <span className="hint-label">Drag to orbit</span>
          </div>

          <div className="hint-divider" />

          <div className="hint-item">
            <ArrowsOutCardinal size={18} />
            <span className="hint-label">Select stations</span>
          </div>
        </div>

        <div className="bottom-center-actions">
          <button
            className="dock-icon-btn"
            onClick={handleToggleSound}
            aria-label={soundActive ? 'Mute audio' : 'Enable audio'}
            title={soundActive ? 'Mute audio' : 'Enable audio'}
          >
            {soundActive ? <SpeakerHigh size={18} /> : <SpeakerSlash size={18} />}
          </button>

          <button
            className="dock-icon-btn"
            onClick={handleResetCar}
            aria-label="Reset car to start pad (R)"
            title="Reset car to center (R)"
          >
            <ArrowCounterClockwise size={18} />
            <span className="btn-subtext">R</span>
          </button>

          <button
            className="dock-icon-btn"
            onClick={handleResetCamera}
            aria-label="Reset camera view to overview"
            title="Overview view"
          >
            <Eye size={18} />
          </button>
        </div>

        <div className="bottom-right-status">
          <span className="status-label">Current project</span>
          <span className="status-project">{p.currentWork.name}</span>
          <span className="status-badge">In development</span>
        </div>
      </footer>

      {/* MOBILE MULTI-TOUCH CONTROLS (SIMULTANEOUS STEERING & DRIVE) */}
      <div className="mobile-touch-dock" aria-label="Mobile Driving Controls">
        {/* Left Thumb: Steering */}
        <div className="touch-steering-zone">
          <button
            className="touch-btn steer-btn"
            onTouchStart={(e) => {
              e.preventDefault();
              setTouchState('left', true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              setTouchState('left', false);
            }}
            onTouchCancel={() => setTouchState('left', false)}
            aria-label="Steer Left"
          >
            <CaretLeft size={28} weight="bold" />
          </button>
          <button
            className="touch-btn steer-btn"
            onTouchStart={(e) => {
              e.preventDefault();
              setTouchState('right', true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              setTouchState('right', false);
            }}
            onTouchCancel={() => setTouchState('right', false)}
            aria-label="Steer Right"
          >
            <CaretRight size={28} weight="bold" />
          </button>
        </div>

        {/* Right Thumb: Drive & Brake */}
        <div className="touch-drive-zone">
          <button
            className="touch-btn drive-btn"
            onTouchStart={(e) => {
              e.preventDefault();
              setTouchState('forward', true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              setTouchState('forward', false);
            }}
            onTouchCancel={() => setTouchState('forward', false)}
            aria-label="Drive Forward"
          >
            <CaretUp size={28} weight="bold" />
          </button>

          <button
            className="touch-btn brake-btn"
            onTouchStart={(e) => {
              e.preventDefault();
              setTouchState('brake', true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              setTouchState('brake', false);
            }}
            onTouchCancel={() => setTouchState('brake', false)}
            aria-label="Brake"
          >
            <Stop size={22} weight="fill" />
          </button>

          <button
            className="touch-btn reverse-btn"
            onTouchStart={(e) => {
              e.preventDefault();
              setTouchState('reverse', true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              setTouchState('reverse', false);
            }}
            onTouchCancel={() => setTouchState('reverse', false)}
            aria-label="Drive Reverse"
          >
            <CaretDown size={28} weight="bold" />
          </button>

          {nearbyStation && (
            <button
              className="touch-action-btn interact-btn"
              onClick={() => handleOpenStation(nearbyStation.id)}
              aria-label="Open Station"
            >
              <span>OPEN</span>
            </button>
          )}

          <button
            className="touch-action-btn reset-btn"
            onClick={handleResetCar}
            aria-label="Reset Car"
          >
            <ArrowCounterClockwise size={18} />
          </button>
        </div>
      </div>

      {/* ACCESSIBLE STATION DETAIL DRAWER MODAL */}
      <StationModal
        stationId={activeStationModal}
        portfolio={portfolio}
        onClose={() => setActiveStationModal(null)}
      />
    </div>
  );
}
