import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, Sparkles } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { NEIGHBORHOODS, cardById, seasonFor } from "../data";
import { useEmpire } from "../store";
import { cardMap } from "../sim";
import {
  Cars,
  CityFabric,
  Dust,
  Ground,
  Lamps,
  Landmark,
  Parks,
  River,
  Roads,
  Statehouse,
  TilePad,
  Trees,
} from "./parts";

function skyFor(season: string) {
  if (season === "Winter") return { bg: "#0b1018", fog: "#0a0c12", amb: 0.32, sun: 0.55 };
  if (season === "Summer") return { bg: "#1c2430", fog: "#151a22", amb: 0.5, sun: 0.95 };
  if (season === "Autumn") return { bg: "#16110e", fog: "#120e0c", amb: 0.4, sun: 0.7 };
  return { bg: "#120e14", fog: "#0e0b10", amb: 0.38, sun: 0.72 };
}

function CameraRig({ target, title }: { target: [number, number] | null; title: boolean }) {
  const controls = useRef<{ target: THREE.Vector3 } | null>(null);
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 0.45, 0));
  const desired = useRef(new THREE.Vector3(0, 0.45, 0));
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    if (target) desired.current.set(target[0], 0.55, target[1]);
    else desired.current.set(0, 0.45, 0);
    look.current.lerp(desired.current, 1 - Math.exp(-3.2 * d));
    controls.current?.target.copy(look.current);
    if (title) {
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 11.5, 1 - Math.exp(-1.2 * d));
    }
  });
  return (
    <OrbitControls
      ref={controls as never}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      autoRotate
      autoRotateSpeed={title ? 0.55 : 0.22}
      minPolarAngle={0.38}
      maxPolarAngle={1.18}
      minDistance={title ? 14 : 8}
      maxDistance={22}
      makeDefault
    />
  );
}

function Scene() {
  const phase = useEmpire((s) => s.phase);
  const cycle = useEmpire((s) => s.cycle);
  const ownedIds = useEmpire((s) => s.ownedIds);
  const rivals = useEmpire((s) => s.rivals);
  const selectedId = useEmpire((s) => s.selectedId);
  const lastPlaceHood = useEmpire((s) => s.lastPlaceHood);
  const lastPlaceAt = useEmpire((s) => s.lastPlaceAt);
  const upgrades = useEmpire((s) => s.upgrades);
  const reduced = useEmpire((s) => s.reducedMotion);
  const placeOnTile = useEmpire((s) => s.placeOnTile);
  const inspect = useEmpire((s) => s.inspect);
  const season = seasonFor(cycle);
  const sky = skyFor(season);
  const night = season === "Winter" || season === "Autumn";
  const selected = selectedId ? cardById(selectedId) : null;
  const playerOwned = useMemo(() => cardMap(ownedIds), [ownedIds]);
  const playerHoods = useMemo(() => new Set(playerOwned.map((c) => c.neighborhood)), [playerOwned]);
  const rivalMap = useMemo(() => {
    const m = new Map<string, "rival-a" | "rival-b">();
    rivals.forEach((r, i) => {
      for (const id of r.ownedIds) {
        const c = cardById(id);
        if (c) m.set(c.neighborhood, i === 0 ? "rival-a" : "rival-b");
      }
    });
    return m;
  }, [rivals]);

  const constructing = lastPlaceHood && performance.now() - lastPlaceAt < 1600 ? lastPlaceHood : null;
  const fly = selected
    ? ([
        NEIGHBORHOODS.find((n) => n.name === selected.neighborhood)?.x ?? 0,
        NEIGHBORHOODS.find((n) => n.name === selected.neighborhood)?.z ?? 0,
      ] as [number, number])
    : null;

  useFrame(({ scene }) => {
    const bg = new THREE.Color(sky.bg);
    scene.background = bg;
    if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(bg);
  });

  return (
    <>
      <color attach="background" args={[sky.bg]} />
      <fog attach="fog" args={[sky.fog, 12, 34]} />
      <ambientLight intensity={sky.amb + 0.22} color="#d8dce6" />
      <directionalLight
        position={[6, 14, 7]}
        intensity={sky.sun + 0.25}
        color="#fff1dc"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={40}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <directionalLight position={[-6, 6, -4]} intensity={0.28} color="#88a0c0" />
      <pointLight position={[0, 3.4, 0]} intensity={night ? 1.8 : 0.7} color="#7a2433" distance={18} />
      <Ground />
      <Roads />
      <River />
      <Parks />
      <CityFabric />
      <Trees />
      <Lamps night={night} />
      <Cars night={night} />
      <Statehouse />
      <ContactShadows opacity={0.35} scale={18} blur={2.2} far={8} />
      {!reduced && <Sparkles count={40} scale={16} size={1.4} speed={0.25} color="#d4a843" opacity={0.35} />}
      {NEIGHBORHOODS.map((n) => (
        <TilePad
          key={n.id}
          name={n.name}
          selected={selected?.neighborhood === n.name}
          owned={playerHoods.has(n.name)}
          rival={rivalMap.has(n.name)}
          showLabel={phase === "playing" || phase === "won" || phase === "lost"}
          onClick={(hood) => {
            if (playerHoods.has(hood)) inspect(hood);
            else placeOnTile(hood);
          }}
        />
      ))}
      {playerOwned.map((card) => (
        <Landmark
          key={card.id}
          card={card}
          owner="player"
          upgrade={upgrades[card.id] ?? 0}
          constructing={constructing === card.neighborhood}
          night={night}
        />
      ))}
      {rivals.flatMap((r, i) =>
        r.ownedIds.map((id) => {
          const card = cardById(id);
          if (!card) return null;
          return (
            <Landmark
              key={`${r.id}-${id}`}
              card={card}
              owner={i === 0 ? "rival-a" : "rival-b"}
              upgrade={0}
              constructing={false}
              night={night}
            />
          );
        }),
      )}
      {constructing && (
        <Dust
          active
          x={NEIGHBORHOODS.find((n) => n.name === constructing)?.x ?? 0}
          z={NEIGHBORHOODS.find((n) => n.name === constructing)?.z ?? 0}
        />
      )}
      <CameraRig target={phase === "playing" ? fly : null} title={phase === "title" || phase === "briefing"} />
      <EffectComposer>
        <Bloom luminanceThreshold={0.72} intensity={night ? 0.55 : 0.28} mipmapBlur />
        <Vignette eskil={false} offset={0.25} darkness={0.55} />
      </EffectComposer>
    </>
  );
}

export function CityCanvas() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div className="axis-map-canvas axis-map-boot" aria-hidden />;
  return (
    <Canvas
      className="axis-map-canvas"
      camera={{ position: [11, 9.5, 13], fov: 36, near: 0.1, far: 90 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      shadows
      onCreated={({ gl }) => {
        gl.domElement.style.touchAction = "none";
      }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
