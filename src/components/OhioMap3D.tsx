import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MAP_TILES, type PropertyCard } from "../data/properties";

interface OhioMap3DProps {
  owned: Record<string, PropertyCard>;
  selectedCard: PropertyCard | null;
  onTileClick: (neighborhood: string) => void;
}

const CATEGORY_COLOR: Record<string, number> = {
  residential: 0x8a9bb0,
  commercial: 0xd4a843,
};

function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

export default function OhioMap3D({ owned, selectedCard, onTileClick }: OhioMap3DProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const onTileClickRef = useRef(onTileClick);
  const selectedRef = useRef(selectedCard);
  onTileClickRef.current = onTileClick;
  selectedRef.current = selectedCard;

  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    buildings: Map<string, THREE.Group>;
    tiles: Map<string, THREE.Mesh>;
    animId: number;
    resize: () => void;
  } | null>(null);

  useEffect(() => {
    const mount = wrapRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 14, 32);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const resize = () => {
      const w = Math.max(1, mount.clientWidth);
      const h = Math.max(1, mount.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();

    scene.add(new THREE.AmbientLight(0x404050, 0.6));
    const dir = new THREE.DirectionalLight(0xfff4e8, 0.9);
    dir.position.set(5, 12, 6);
    dir.castShadow = true;
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x88aacc, 0.28);
    fill.position.set(-4, 6, -3);
    scene.add(fill);
    const rim = new THREE.PointLight(0x7a2433, 1.4, 18);
    rim.position.set(0, 3.2, 0);
    scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(8.2, 72),
      new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.92, metalness: 0.06 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(8.15, 8.35, 72),
      new THREE.MeshBasicMaterial({ color: 0x2a1a1e, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);

    const grid = new THREE.GridHelper(16, 32, 0x1e1e1e, 0x161616);
    grid.position.y = 0.01;
    scene.add(grid);

    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 10),
      new THREE.MeshStandardMaterial({
        color: 0x1a2a3a,
        roughness: 0.35,
        metalness: 0.25,
        transparent: true,
        opacity: 0.72,
      }),
    );
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = 0.15;
    river.position.set(-0.3, 0.025, 0);
    scene.add(river);

    const buildings = new Map<string, THREE.Group>();
    const tiles = new Map<string, THREE.Mesh>();

    Object.entries(MAP_TILES).forEach(([name, [x, z]]) => {
      const tile = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.44, 0.09, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.8, metalness: 0.1 }),
      );
      tile.position.set(x, 0.05, z);
      tile.userData = { neighborhood: name };
      tile.castShadow = true;
      tile.receiveShadow = true;
      scene.add(tile);
      tiles.set(name, tile);

      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 256, 64);
      ctx.font = "600 26px Space Grotesk, system-ui, sans-serif";
      ctx.fillStyle = "#8A8F98";
      ctx.textAlign = "center";
      const label = name.split(" ")[0] ?? name;
      ctx.fillText(label, 128, 40);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }),
      );
      sprite.scale.set(1.55, 0.38, 1);
      sprite.position.set(x, 0.38, z);
      sprite.userData.label = true;
      scene.add(sprite);
    });

    let isDragging = false;
    let moved = false;
    let prevX = 0;
    let theta = 0.45;
    let phi = 0.88;
    const radius = 15.2;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const updateCamera = () => {
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 0.45, 0);
    };
    updateCamera();

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      moved = false;
      prevX = e.clientX;
    };
    const onPointerUp = () => {
      isDragging = false;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      prevX = e.clientX;
      if (Math.abs(dx) > 2) moved = true;
      theta -= dx * 0.005;
      updateCamera();
    };
    const onClick = (e: MouseEvent) => {
      if (moved) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(Array.from(tiles.values()));
      if (hits[0]) {
        const hood = hits[0].object.userData.neighborhood as string;
        onTileClickRef.current(hood);
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("click", onClick);

    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let animId = 0;
    let t = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, 1 / 60);
      t += dt;
      if (!isDragging) {
        theta += 0.00055;
        updateCamera();
      }
      const sel = selectedRef.current;
      tiles.forEach((tile, name) => {
        if (sel && sel.neighborhood === name) {
          const s = 1 + Math.sin(t * 4) * 0.07;
          tile.scale.set(s, 1, s);
        } else {
          tile.scale.set(1, 1, 1);
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { scene, camera, renderer, buildings, tiles, animId, resize };

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
        if (obj instanceof THREE.Sprite) {
          const mat = obj.material;
          mat.map?.dispose();
          mat.dispose();
        }
      });
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ref = sceneRef.current;
    if (!ref) return;
    const { scene, buildings, tiles } = ref;

    tiles.forEach((tile, name) => {
      const card = owned[name];
      const mat = tile.material as THREE.MeshStandardMaterial;
      if (card) {
        mat.color.setHex(CATEGORY_COLOR[card.category] ?? 0x4ade80);
        mat.emissive.setHex(card.category === "commercial" ? 0x332200 : 0x111822);
      } else if (selectedCard && selectedCard.neighborhood === name) {
        mat.color.setHex(0xd4a843);
        mat.emissive.setHex(0x3a2a10);
      } else {
        mat.color.setHex(0x1e1e1e);
        mat.emissive.setHex(0x000000);
      }
      mat.needsUpdate = true;
    });

    Object.entries(owned).forEach(([hood, card]) => {
      if (buildings.has(hood)) return;
      const pos = MAP_TILES[hood];
      if (!pos) return;
      const group = new THREE.Group();
      const [x, z] = pos;
      const jitter = hash01(card.id);
      let height = 0.85 + jitter * 0.25;
      let widthScale = 0.55;
      if (card.subtype === "Office") {
        height = 1.7 + jitter * 0.7;
        widthScale = 0.44;
      } else if (card.subtype === "Industrial") {
        height = 0.68;
        widthScale = 0.92;
      } else if (card.subtype === "Mixed-Use") {
        height = 1.25 + jitter * 0.2;
        widthScale = 0.62;
      } else if (card.subtype === "Retail") {
        height = 0.62;
        widthScale = 0.78;
      }

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(widthScale, height, widthScale * 0.85),
        new THREE.MeshStandardMaterial({
          color: CATEGORY_COLOR[card.category] ?? 0x888888,
          roughness: 0.62,
          metalness: 0.18,
        }),
      );
      body.position.y = height / 2 + 0.08;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(widthScale * 1.06, 0.07, widthScale * 0.92),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.7 }),
      );
      roof.position.y = height + 0.12;
      group.add(roof);

      if (card.subtype === "Office") {
        const windows = new THREE.Mesh(
          new THREE.BoxGeometry(widthScale * 0.72, height * 0.62, 0.02),
          new THREE.MeshStandardMaterial({
            color: 0xe8e4dc,
            emissive: 0xd4a843,
            emissiveIntensity: 0.35,
            roughness: 0.3,
          }),
        );
        windows.position.set(0, height * 0.45, widthScale * 0.44);
        group.add(windows);
      }

      group.position.set(x, 0, z);
      scene.add(group);
      buildings.set(hood, group);
    });

    buildings.forEach((group, hood) => {
      if (owned[hood]) return;
      scene.remove(group);
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
      buildings.delete(hood);
    });
  }, [owned, selectedCard]);

  return <div ref={wrapRef} className="axis-map-canvas" aria-label="Central Ohio 3D map" />;
}
