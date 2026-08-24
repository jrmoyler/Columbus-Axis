import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { PropertyCard } from "../types";
import { NEIGHBORHOODS } from "../data";

export function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

const PLAYER = new THREE.Color("#8a3144");
const PLAYER_LIT = new THREE.Color("#d4a843");
const RIVAL_A = new THREE.Color("#4d6478");
const RIVAL_B = new THREE.Color("#5c6b48");
const EMPTY = new THREE.Color("#1c1c20");
const GOLD = new THREE.Color("#d4a843");

export function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(9.4, 96);
    const pos = g.attributes.position!;
    const colors = new Float32Array(pos.count * 3);
    const cPark = new THREE.Color("#1a241c");
    const cUrban = new THREE.Color("#141416");
    const cDirt = new THREE.Color("#1a1814");
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i); // circle is in XY before rotation
      const r = Math.hypot(x, z);
      const n = hash01(`g${i}`);
      tmp.copy(cUrban);
      if (r > 5.2) tmp.lerp(cPark, 0.55 + n * 0.2);
      else if (Math.abs(x + 0.4) < 0.8) tmp.lerp(new THREE.Color("#161c22"), 0.4);
      else tmp.lerp(cDirt, n * 0.2);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.94} metalness={0.04} />
    </mesh>
  );
}

const riverVert = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vUv = uv;
    vec3 p = position;
    vWave = sin(p.x * 3.4 + uTime * 1.1) * 0.015 + sin(p.y * 5.0 - uTime * 0.8) * 0.01;
    p.y += vWave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const riverFrag = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    float spark = pow(0.5 + 0.5 * sin(vUv.x * 40.0 + uTime * 2.0), 8.0) * 0.25;
    vec3 col = uColor + spark * vec3(0.55, 0.48, 0.32);
    col += vWave * 2.0;
    gl_FragColor = vec4(col, 0.88);
  }
`;

export function River() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.35, 0.03, 5.2),
        new THREE.Vector3(-1.05, 0.03, 3.1),
        new THREE.Vector3(-0.7, 0.03, 1.4),
        new THREE.Vector3(-0.45, 0.03, 0.15),
        new THREE.Vector3(-0.25, 0.03, -1.2),
        new THREE.Vector3(0.35, 0.03, -2.8),
        new THREE.Vector3(0.95, 0.03, -5.0),
      ]),
    [],
  );
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 80, 0.22, 10, false), [curve]);
  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });
  return (
    <mesh geometry={geo}>
      <shaderMaterial
        ref={mat}
        transparent
        uniforms={{
          uTime: { value: 0 },
          uColor: { value: new THREE.Color("#1a2a38") },
        }}
        vertexShader={riverVert}
        fragmentShader={riverFrag}
      />
    </mesh>
  );
}

export function Roads() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[7.15, 7.55, 96]} />
        <meshStandardMaterial color="#1a1a1c" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.15, 0.026, 0]}>
        <planeGeometry args={[0.28, 14]} />
        <meshStandardMaterial color="#18181b" roughness={0.72} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.026, 0.1]}>
        <planeGeometry args={[0.26, 13]} />
        <meshStandardMaterial color="#18181b" roughness={0.72} />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-1.1 + i * 0.42, 0.028, 0.05]}
        >
          <planeGeometry args={[0.045, 2.4]} />
          <meshStandardMaterial color="#2a2a30" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export function Parks() {
  const spots: [number, number, number][] = [
    [-0.2, 0.03, 1.05],
    [0.9, 0.03, -0.7],
    [-2.1, 0.03, 2.4],
    [2.1, 0.03, 1.6],
  ];
  return (
    <group>
      {spots.map((p, i) => (
        <mesh key={i} position={p} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.55 + (i % 2) * 0.18, 24]} />
          <meshStandardMaterial color="#1c2a1e" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

export function CityFabric() {
  const count = 160;
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    let i = 0;
    for (let n = 0; n < count; n++) {
      const a = hash01(`fa${n}`) * Math.PI * 2;
      const r = 1.6 + hash01(`fr${n}`) * 6.4;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      let tooClose = false;
      for (const hood of NEIGHBORHOODS) {
        if (Math.hypot(x - hood.x, z - hood.z) < 0.72) {
          tooClose = true;
          break;
        }
      }
      if (tooClose || Math.abs(x + 0.4) < 0.35) continue;
      const h = 0.28 + hash01(`fh${n}`) * (r < 2.6 ? 1.6 : 0.7);
      dummy.position.set(x, h / 2, z);
      dummy.scale.set(0.22 + hash01(`fw${n}`) * 0.28, h, 0.2 + hash01(`fd${n}`) * 0.26);
      dummy.rotation.y = hash01(`fy${n}`) * 0.4;
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
      i += 1;
    }
    mesh.current.count = i;
    mesh.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#26262c" roughness={0.74} metalness={0.12} />
    </instancedMesh>
  );
}

export function Trees() {
  const count = 70;
  const trunk = useRef<THREE.InstancedMesh>(null);
  const crown = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    let i = 0;
    for (let n = 0; n < count; n++) {
      const a = hash01(`ta${n}`) * Math.PI * 2;
      const r = 2.4 + hash01(`tr${n}`) * 6.0;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x, z) < 1.4) continue;
      dummy.position.set(x, 0.18, z);
      dummy.scale.set(0.05, 0.36, 0.05);
      dummy.updateMatrix();
      trunk.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, 0.48, z);
      dummy.scale.set(0.22, 0.32, 0.22);
      dummy.updateMatrix();
      crown.current?.setMatrixAt(i, dummy.matrix);
      i += 1;
    }
    if (trunk.current) {
      trunk.current.count = i;
      trunk.current.instanceMatrix.needsUpdate = true;
    }
    if (crown.current) {
      crown.current.count = i;
      crown.current.instanceMatrix.needsUpdate = true;
    }
  }, []);
  return (
    <group>
      <instancedMesh ref={trunk} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#2a2218" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={crown} args={[undefined, undefined, count]}>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial color="#243226" roughness={0.85} />
      </instancedMesh>
    </group>
  );
}

export function Cars({ night }: { night: boolean }) {
  const group = useRef<THREE.Group>(null);
  const count = 14;
  const data = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        r: 7.32,
        speed: 0.08 + hash01(`cs${i}`) * 0.12,
        phase: hash01(`cp${i}`) * Math.PI * 2,
        color: i % 3 === 0 ? "#d4a843" : i % 3 === 1 ? "#c8ccd4" : "#7a2433",
      })),
    [],
  );
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.children.forEach((child, i) => {
      const d = data[i];
      if (!d) return;
      d.phase += d.speed * dt;
      child.position.set(Math.cos(d.phase) * d.r, 0.08, Math.sin(d.phase) * d.r);
      child.rotation.y = -d.phase + Math.PI / 2;
    });
  });
  return (
    <group ref={group}>
      {data.map((d, i) => (
        <mesh key={i} castShadow>
          <boxGeometry args={[0.16, 0.06, 0.08]} />
          <meshStandardMaterial
            color={d.color}
            emissive={night ? d.color : "#000"}
            emissiveIntensity={night ? 0.4 : 0}
            roughness={0.4}
            metalness={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

export function Lamps({ night }: { night: boolean }) {
  return (
    <group>
      {Array.from({ length: 18 }).map((_, i) => {
        const a = (i / 18) * Math.PI * 2;
        const r = 4.6;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 0.28, 0]}>
              <cylinderGeometry args={[0.02, 0.025, 0.56, 6]} />
              <meshStandardMaterial color="#2a2a2e" />
            </mesh>
            <mesh position={[0, 0.58, 0]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial
                color="#e8e4dc"
                emissive={GOLD}
                emissiveIntensity={night ? 1.4 : 0.15}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function bodyColor(owner: "player" | "rival-a" | "rival-b" | "empty", subtype: string) {
  if (owner === "empty") return EMPTY;
  if (owner === "rival-a") return RIVAL_A;
  if (owner === "rival-b") return RIVAL_B;
  if (subtype === "Office" || subtype === "Mixed-Use") return PLAYER;
  if (subtype === "Retail") return PLAYER_LIT.clone().lerp(PLAYER, 0.35);
  return PLAYER.clone().lerp(new THREE.Color("#c4b8a8"), 0.35);
}

export function Landmark({
  card,
  owner,
  upgrade,
  constructing,
  night,
}: {
  card: PropertyCard;
  owner: "player" | "rival-a" | "rival-b";
  upgrade: number;
  constructing: boolean;
  night: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const start = useRef(constructing ? 0.04 : 1);
  const hood = NEIGHBORHOODS.find((n) => n.name === card.neighborhood);
  const jitter = hash01(card.id);
  let height = 0.85 + jitter * 0.25 + upgrade * 0.22;
  let width = 0.48;
  if (card.subtype === "Office") {
    height = 1.85 + jitter * 0.55 + upgrade * 0.3;
    width = 0.38;
  } else if (card.subtype === "Industrial") {
    height = 0.55 + upgrade * 0.08;
    width = 0.92;
  } else if (card.subtype === "Mixed-Use") {
    height = 1.28 + jitter * 0.2 + upgrade * 0.18;
    width = 0.56;
  } else if (card.subtype === "Retail") {
    height = 0.58 + upgrade * 0.1;
    width = 0.78;
  } else if (card.subtype === "Residential") {
    height = 0.72 + jitter * 0.18 + upgrade * 0.12;
    width = 0.5;
  }
  const color = bodyColor(owner, card.subtype);
  useFrame((_, dt) => {
    if (!group.current) return;
    if (constructing && start.current < 1) {
      start.current = Math.min(1, start.current + dt * 1.7);
      const t = start.current;
      const e = 1 - Math.pow(1 - t, 3);
      group.current.scale.set(1, 0.04 + e * 0.96, 1);
    } else {
      group.current.scale.set(1, 1, 1);
    }
  });
  if (!hood) return null;
  const windowE = night ? 0.55 : 0.12;
  return (
    <group ref={group} position={[hood.x, 0, hood.z]} scale={[1, constructing ? 0.04 : 1, 1]}>
      <mesh position={[0, height / 2 + 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, width * 0.82]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.22} />
      </mesh>
      <mesh position={[0, height + 0.12, 0]}>
        <boxGeometry args={[width * 1.08, 0.07, width * 0.9]} />
        <meshStandardMaterial color="#141416" roughness={0.7} />
      </mesh>
      {(card.subtype === "Office" || card.subtype === "Mixed-Use") && (
        <mesh position={[0, height * 0.5, width * 0.42]}>
          <boxGeometry args={[width * 0.7, height * 0.7, 0.02]} />
          <meshStandardMaterial
            color="#e8e4dc"
            emissive={GOLD}
            emissiveIntensity={windowE}
            roughness={0.25}
            metalness={0.4}
          />
        </mesh>
      )}
      {card.subtype === "Residential" && (
        <mesh position={[0, height + 0.28, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[width * 0.62, 0.32, 4]} />
          <meshStandardMaterial color="#3a2428" roughness={0.8} />
        </mesh>
      )}
      {card.subtype === "Industrial" && (
        <mesh position={[width * 0.2, height + 0.18, 0]}>
          <boxGeometry args={[width * 0.5, 0.22, width * 0.5]} />
          <meshStandardMaterial color="#2a2a2c" roughness={0.6} metalness={0.35} />
        </mesh>
      )}
      {card.neighborhood === "Downtown" && (
        <mesh position={[0, height + 0.42, 0]}>
          <sphereGeometry args={[0.14, 16, 12]} />
          <meshStandardMaterial color="#c8ccd4" metalness={0.5} roughness={0.3} />
        </mesh>
      )}
      {card.neighborhood === "New Albany" && (
        <mesh position={[0.28, 0.42, 0.1]}>
          <cylinderGeometry args={[0.08, 0.1, 0.7, 10]} />
          <meshStandardMaterial color="#8a8f98" metalness={0.4} roughness={0.4} />
        </mesh>
      )}
    </group>
  );
}

export function TilePad({
  name,
  selected,
  owned,
  rival,
  showLabel,
  onClick,
}: {
  name: string;
  selected: boolean;
  owned: boolean;
  rival: boolean;
  showLabel: boolean;
  onClick: (n: string) => void;
}) {
  const hood = NEIGHBORHOODS.find((n) => n.name === name);
  const pulse = useRef(0);
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!mesh.current) return;
    pulse.current += dt;
    const s = selected ? 1 + Math.sin(pulse.current * 4) * 0.08 : 1;
    mesh.current.scale.set(s, 1, s);
  });
  if (!hood) return null;
  const color = owned ? "#7a2433" : rival ? "#3d4a38" : selected ? "#d4a843" : "#1e1e22";
  const em = selected ? "#3a2a10" : owned ? "#1a080c" : "#000000";
  return (
    <group position={[hood.x, 0, hood.z]}>
      <mesh
        ref={mesh}
        position={[0, 0.045, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick(name);
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.42, 0.46, 0.08, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={em}
          emissiveIntensity={selected ? 0.6 : owned ? 0.25 : 0}
          roughness={0.72}
          metalness={0.12}
        />
      </mesh>
      {showLabel ? (
        <Html position={[0, 0.55, 0]} center distanceFactor={16} style={{ pointerEvents: "none" }}>
          <div className="axis-pin">{name.split(" ")[0]}</div>
        </Html>
      ) : null}
    </group>
  );
}

export function Statehouse() {
  return (
    <group position={[0.35, 0, 0.25]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.55, 0.42, 0.55]} />
        <meshStandardMaterial color="#c8c0b0" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.28, 12]} />
        <meshStandardMaterial color="#b8b0a0" />
      </mesh>
      <mesh position={[0, 0.96, 0]}>
        <sphereGeometry args={[0.16, 16, 12]} />
        <meshStandardMaterial color="#d4a843" metalness={0.45} roughness={0.35} emissive="#d4a843" emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

export function Dust({ active, x, z }: { active: boolean; x: number; z: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 40;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (hash01(`dx${i}`) - 0.5) * 0.8;
      pos[i * 3 + 1] = hash01(`dy${i}`) * 0.9;
      pos[i * 3 + 2] = (hash01(`dz${i}`) - 0.5) * 0.8;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame((_, dt) => {
    if (!ref.current || !active) return;
    ref.current.rotation.y += dt * 0.4;
    ref.current.position.y = Math.min(0.8, ref.current.position.y + dt * 0.5);
  });
  if (!active) return null;
  return (
    <points ref={ref} position={[x, 0.1, z]} geometry={geo}>
      <pointsMaterial color="#c8c0b0" size={0.05} transparent opacity={0.55} />
    </points>
  );
}



