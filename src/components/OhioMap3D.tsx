import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { PropertyCard } from "../data/properties";

interface OhioMap3DProps {
  owned: Record<string, PropertyCard>;
  selectedCard: PropertyCard | null;
  onTileClick: (neighborhood: string) => void;
  width?: number;
  height?: number;
}

const TILE_POSITIONS: Record<string, [number, number]> = {
  "Short North": [-0.8, 0.6],
  "German Village": [0.4, -1.2],
  Downtown: [0, 0],
  "New Albany": [3.8, 2.4],
  "Polaris Fashion District": [1.6, 3.2],
  "Rickenbacker Corridor": [2.2, -3.0],
  Clintonville: [-1.4, 2.0],
  "Arena District": [-0.6, 0.3],
  "Dublin Bridge Street": [-3.2, 2.6],
  "Upper Arlington": [-2.4, 1.4],
  Franklinton: [-1.8, -1.0],
  "Groveport Logistics Park": [3.0, -3.4],
};

const CATEGORY_COLOR: Record<string, number> = {
  residential: 0x38bdf8,
  commercial: 0xf59e0b,
};

export default function OhioMap3D({
  owned,
  selectedCard,
  onTileClick,
  width = 640,
  height = 420,
}: OhioMap3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    buildings: Map<string, THREE.Group>;
    tiles: Map<string, THREE.Mesh>;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    animId: number;
  } | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 12, 28);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 9.5, 11);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x404050, 0.55);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(5, 12, 6);
    dir.castShadow = true;
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x88aacc, 0.25);
    fill.position.set(-4, 6, -3);
    scene.add(fill);

    const groundGeo = new THREE.CircleGeometry(7.5, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x141414,
      roughness: 0.92,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(14, 28, 0x1e1e1e, 0x161616);
    grid.position.y = 0.01;
    scene.add(grid);

    const riverGeo = new THREE.PlaneGeometry(0.35, 9);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a3a,
      roughness: 0.4,
      metalness: 0.2,
      transparent: true,
      opacity: 0.7,
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = 0.15;
    river.position.set(-0.3, 0.02, 0);
    scene.add(river);

    const buildings = new Map<string, THREE.Group>();
    const tiles = new Map<string, THREE.Mesh>();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    Object.entries(TILE_POSITIONS).forEach(([name, [x, z]]) => {
      const tileGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.08, 16);
      const tileMat = new THREE.MeshStandardMaterial({
        color: 0x1e1e1e,
        roughness: 0.8,
        metalness: 0.1,
      });
      const tile = new THREE.Mesh(tileGeo, tileMat);
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
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, 256, 64);
      ctx.font = "bold 28px Space Grotesk, system-ui, sans-serif";
      ctx.fillStyle = "#8A8F98";
      ctx.textAlign = "center";
      ctx.fillText(name.split(" ")[0], 128, 40);
      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(1.6, 0.4, 1);
      sprite.position.set(x, 0.35, z);
      scene.add(sprite);
    });

    let isDragging = false;
    let prevX = 0;
    let theta = 0.4;
    let phi = 0.85;
    const radius = 14;

    const updateCamera = () => {
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 0.5, 0);
    };
    updateCamera();

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
    };
    const onPointerUp = () => {
      isDragging = false;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      prevX = e.clientX;
      theta -= dx * 0.005;
      updateCamera();
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(Array.from(tiles.values()));
      if (intersects.length > 0) {
        const hood = intersects[0].object.userData.neighborhood as string;
        onTileClick(hood);
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("click", onClick);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isDragging) {
        theta += 0.0008;
        updateCamera();
      }
      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = {
      scene,
      camera,
      renderer,
      buildings,
      tiles,
      raycaster,
      mouse,
      animId,
    };

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      sceneRef.current = null;
    };
  }, [width, height]);

  useEffect(() => {
    const ref = sceneRef.current;
    if (!ref) return;
    const { scene, buildings, tiles } = ref;

    tiles.forEach((tile, name) => {
      const card = owned[name];
      const mat = tile.material as THREE.MeshStandardMaterial;
      if (card) {
        mat.color.setHex(CATEGORY_COLOR[card.category] ?? 0x4ade80);
        mat.emissive.setHex(0x111111);
      } else if (selectedCard && selectedCard.neighborhood === name) {
        mat.color.setHex(0xd4a843);
        mat.emissive.setHex(0x332200);
      } else {
        mat.color.setHex(0x1e1e1e);
        mat.emissive.setHex(0x000000);
      }
      mat.needsUpdate = true;
    });

    Object.entries(owned).forEach(([hood, card]) => {
      if (buildings.has(hood)) return;
      const pos = TILE_POSITIONS[hood];
      if (!pos) return;

      const group = new THREE.Group();
      const [x, z] = pos;

      let height = 0.9;
      let widthScale = 0.55;
      if (card.subtype === "Office") {
        height = 1.8 + Math.random() * 0.6;
        widthScale = 0.45;
      } else if (card.subtype === "Industrial") {
        height = 0.7;
        widthScale = 0.9;
      } else if (card.subtype === "Mixed-Use") {
        height = 1.3;
        widthScale = 0.65;
      } else if (card.subtype === "Retail") {
        height = 0.65;
        widthScale = 0.75;
      }

      const geo = new THREE.BoxGeometry(widthScale, height, widthScale * 0.85);
      const mat = new THREE.MeshStandardMaterial({
        color: CATEGORY_COLOR[card.category] ?? 0x888888,
        roughness: 0.65,
        metalness: 0.15,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = height / 2 + 0.08;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(widthScale * 1.05, 0.08, widthScale * 0.9),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 })
      );
      roof.position.y = height + 0.1;
      group.add(roof);

      group.position.set(x, 0, z);
      scene.add(group);
      buildings.set(hood, group);
    });

    buildings.forEach((group, hood) => {
      if (!owned[hood]) {
        scene.remove(group);
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            (obj.material as THREE.Material).dispose();
          }
        });
        buildings.delete(hood);
      }
    });
  }, [owned, selectedCard]);

  return (
    <div
      ref={mountRef}
      style={{
        width,
        height,
        border: "1px solid #1E1E1E",
        background: "#0A0A0A",
        position: "relative",
        overflow: "hidden",
      }}
    />
  );
}
