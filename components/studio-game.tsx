"use client";

import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { CameraControls, ContactShadows, Html, RoundedBox, useProgress } from "@react-three/drei";
import type { CameraControls as CameraControlsImpl } from "@react-three/drei";
import { Award, Box, Camera, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Coins, Footprints, HelpCircle, Maximize2, Menu, Minimize2, Minus, Move, Paintbrush, Plus, RotateCcw, Save, ShoppingCart, Sparkles } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, ClampToEdgeWrapping, Color, DoubleSide, Group, LinearFilter, MathUtils, Mesh, SRGBColorSpace, Texture, TextureLoader, Vector3 } from "three";
import { toast } from "sonner";
import type { GamificationProfile, StudioCatalogItem } from "@/lib/types";

export type StudioWallId = "wall-a" | "wall-b" | "wall-c";
export type ArtworkTransform = {
  wallId: StudioWallId;
  positionX: number;
  positionY: number;
  scale: number;
  rotationZ: number;
};

export type GameArtwork = {
  id: string;
  lessonCode: string;
  title: string;
  track: string;
  imageUrl: string | null;
  reviewed: boolean;
  feedback: string | null;
  frameItemId: string | null;
  transform: ArtworkTransform;
};

type CameraView = "overview" | StudioWallId | "certificates";
type Mode = "explore" | "arrange";
type MovementInput = { forward: boolean; backward: boolean; left: boolean; right: boolean };
type OrbitSettings = { yaw: number; height: number; distance: number };

const views: CameraView[] = ["overview", "wall-a", "wall-b", "wall-c", "certificates"];
const wallCenters: Record<StudioWallId, number> = { "wall-a": -3.35, "wall-b": 0, "wall-c": 3.35 };
const frameColors: Record<string, string> = {
  "classic-gold": "#c9a84c",
  "deep-walnut": "#4b2818",
  "gallery-black": "#0b0d11",
  "ivory-mat": "#e7dfcf",
  "artist-brush": "#a66a2f",
  "graduate-gold": "#e2bd58",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function constrainArtwork(transform: ArtworkTransform): ArtworkTransform {
  const scale = clamp(transform.scale,.55,1.65);
  const horizontalLimit = Math.max(.46,1.52 - .63 * scale);
  return {
    ...transform,
    positionX: clamp(transform.positionX,-horizontalLimit,horizontalLimit),
    positionY: clamp(transform.positionY,.85 + .75 * scale,3.62),
    scale,
    rotationZ: clamp(transform.rotationZ,-.3,.3),
  };
}

function makeLabelTexture(lines: string[], options: { width?: number; height?: number; background?: string; foreground?: string; accent?: string; serif?: boolean } = {}) {
  if (typeof document === "undefined") return null;
  const width = options.width || 768;
  const height = options.height || 240;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = options.background || "#0b0e13";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = options.accent || "#c9a84c";
  context.lineWidth = 8;
  context.strokeRect(7, 7, width - 14, height - 14);
  lines.forEach((line, index) => {
    const maxSize = index === 0 ? Math.round(height * .28) : Math.round(height * .18);
    let size = maxSize;
    const family = options.serif === false ? "Arial, sans-serif" : "Georgia, serif";
    context.font = `${index === 0 ? "700" : "500"} ${size}px ${family}`;
    while (context.measureText(line).width > width * .84 && size > 22) {
      size -= 2;
      context.font = `${index === 0 ? "700" : "500"} ${size}px ${family}`;
    }
    context.fillStyle = index === 0 ? (options.accent || "#c9a84c") : (options.foreground || "#f6f1e7");
    context.textAlign = "center";
    context.textBaseline = "middle";
    const y = lines.length === 1 ? height / 2 : height * (.38 + index * .31);
    context.fillText(line, width / 2, y, width * .84);
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  return texture;
}

function MountedLabel({ lines, position, rotation = [0,0,0], size = [1.4,.42], background, foreground, accent, serif = true }: {
  lines: string[];
  position: [number,number,number];
  rotation?: [number,number,number];
  size?: [number,number];
  background?: string;
  foreground?: string;
  accent?: string;
  serif?: boolean;
}) {
  const labelText = lines.join("\n");
  const texture = useMemo(() => makeLabelTexture(labelText.split("\n"), { background, foreground, accent, serif }), [labelText, background, foreground, accent, serif]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return <group position={position} rotation={rotation}>
    <mesh castShadow><boxGeometry args={[size[0],size[1],.055]} /><meshStandardMaterial color={background || "#0b0e13"} roughness={.7} /></mesh>
    {texture && <mesh position={[0,0,.03]}><planeGeometry args={size} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>}
  </group>;
}

function LoadingRoom() {
  const { progress } = useProgress();
  return <Html center><div className="studio-3d-loader"><Sparkles /><strong>Preparing your studio</strong><span>{Math.round(progress)}%</span></div></Html>;
}

function useArtworkTexture(url: string | null) {
  const [texture, setTexture] = useState<Texture | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!url) return;
    let mounted = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(url, { credentials: "include", cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`Artwork returned ${response.status}`);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const loader = new TextureLoader();
        loader.load(objectUrl, (next) => {
          URL.revokeObjectURL(objectUrl);
          if (!mounted) { next.dispose(); return; }
          const source = next.image as HTMLImageElement;
          const canvas = document.createElement("canvas");
          canvas.width = 768;
          canvas.height = 600;
          const context = canvas.getContext("2d");
          if (!context || !source.naturalWidth || !source.naturalHeight) { next.dispose(); setFailed(true); return; }
          context.fillStyle = "#eee8dc";
          context.fillRect(0,0,canvas.width,canvas.height);
          const ratio = Math.min(canvas.width / source.naturalWidth, canvas.height / source.naturalHeight);
          const width = source.naturalWidth * ratio;
          const height = source.naturalHeight * ratio;
          context.drawImage(source, (canvas.width-width)/2, (canvas.height-height)/2, width, height);
          next.dispose();
          const fitted = new CanvasTexture(canvas);
          fitted.colorSpace = SRGBColorSpace;
          fitted.minFilter = LinearFilter;
          fitted.wrapS = ClampToEdgeWrapping;
          fitted.wrapT = ClampToEdgeWrapping;
          setTexture((old) => { old?.dispose(); return fitted; });
          setFailed(false);
        }, undefined, () => { URL.revokeObjectURL(objectUrl); if (mounted) setFailed(true); });
      } catch (error) {
        if (mounted && !(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      }
    })();
    return () => { mounted = false; controller.abort(); };
  }, [url]);
  return { texture, failed };
}

function ArtworkFrame3D({ artwork, frameKey, selected, arrange, onSelect, onChange }: {
  artwork: GameArtwork;
  frameKey: string | null;
  selected: boolean;
  arrange: boolean;
  onSelect: () => void;
  onChange: (transform: ArtworkTransform) => void;
}) {
  const { texture, failed } = useArtworkTexture(artwork.imageUrl);
  const drag = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const transform = artwork.transform;
  const wallX = wallCenters[transform.wallId];
  const frameColor = frameColors[frameKey || ""] || "#8b6a38";

  function pointerDown(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    onSelect();
    if (!arrange) return;
    drag.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY, originX: transform.positionX, originY: transform.positionY };
    (event.target as Element).setPointerCapture?.(event.pointerId);
  }

  function pointerMove(event: ThreeEvent<PointerEvent>) {
    if (!arrange || !drag.current || !selected) return;
    event.stopPropagation();
    onChange(constrainArtwork({
      ...transform,
      positionX: drag.current.originX + (event.nativeEvent.clientX - drag.current.x) * 0.006,
      positionY: drag.current.originY - (event.nativeEvent.clientY - drag.current.y) * 0.006,
    }));
  }

  return (
    <group
      position={[wallX + transform.positionX, transform.positionY, -4.61]}
      rotation={[0, 0, transform.rotationZ]}
      scale={transform.scale}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={() => { drag.current = null; }}
      onPointerMissed={() => { drag.current = null; }}
    >
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[1.25, 1.02, 0.12]} />
        <meshStandardMaterial color={frameColor} metalness={frameKey?.includes("gold") ? 0.55 : 0.08} roughness={0.42} emissive={selected ? new Color("#5f4a19") : new Color("#000000")} />
      </mesh>
      <mesh position={[0, 0, 0.067]}>
        <planeGeometry args={[1.08, 0.85]} />
        {texture ? <meshStandardMaterial map={texture} roughness={0.73} side={DoubleSide} /> : <meshStandardMaterial color={failed ? "#3c2420" : "#e6dfd0"} roughness={0.9} />}
      </mesh>
      {failed && <MountedLabel lines={["IMAGE UNAVAILABLE","Refresh or upload again"]} position={[0,0,.075]} size={[.9,.32]} background="#3c2420" foreground="#f1d9cf" accent="#d19a83" serif={false} />}
      <MountedLabel lines={[artwork.lessonCode, artwork.title]} position={[0,-.65,.04]} size={[1.08,.25]} serif={false} />
      {selected && arrange && <mesh position={[0, 0, 0.13]}><planeGeometry args={[1.38, 1.15]} /><meshBasicMaterial color="#c9a84c" transparent opacity={0.12} /></mesh>}
    </group>
  );
}

function WallLabel({ position, title, subtitle }: { position: [number, number, number]; title: string; subtitle: string }) {
  return <MountedLabel lines={[title, subtitle]} position={position} size={[1.7,.48]} serif={false} />;
}

function WoodenTable({ showBrushJar }: { showBrushJar: boolean }) {
  return <group position={[-4.25, 0, -1.8]}>
    <mesh castShadow receiveShadow position={[0, 1.02, 0]}><boxGeometry args={[2.7, .18, 1.25]} /><meshStandardMaterial color="#5a321b" roughness={.68} /></mesh>
    {[[-1.08,.5,-.45],[1.08,.5,-.45],[-1.08,.5,.45],[1.08,.5,.45]].map((p, i) => <mesh castShadow key={i} position={p as [number,number,number]}><boxGeometry args={[.16,1,.16]} /><meshStandardMaterial color="#3d2215" /></mesh>)}
    {showBrushJar && <group position={[.4,1.23,0]}><mesh castShadow><cylinderGeometry args={[.16,.2,.42,16]} /><meshStandardMaterial color="#6d351b" /></mesh>{[-.1,0,.1].map((x) => <mesh key={x} position={[x,.35,0]} rotation={[0,0,x*2]}><cylinderGeometry args={[.025,.025,.7,8]} /><meshStandardMaterial color="#c39b67" /></mesh>)}</group>}
  </group>;
}

function Easel({ artwork }: { artwork: GameArtwork | null }) {
  const { texture } = useArtworkTexture(artwork?.imageUrl || null);
  return <group position={[-2.1, 0, -1.9]} rotation={[0,.22,0]}>
    {[-.48,.48].map((x) => <mesh castShadow key={x} position={[x,.95,0]} rotation={[0,0,x*.12]}><boxGeometry args={[.1,1.9,.1]} /><meshStandardMaterial color="#7b4a27" /></mesh>)}
    <mesh castShadow position={[0,1.35,.02]}><boxGeometry args={[1.25,.95,.09]} /><meshStandardMaterial color="#d8cdbb" /></mesh>
    {texture && <mesh position={[0,1.35,.071]}><planeGeometry args={[1.12,.82]} /><meshStandardMaterial map={texture} /></mesh>}
    <mesh castShadow position={[0,.9,.13]}><boxGeometry args={[1.45,.12,.3]} /><meshStandardMaterial color="#7b4a27" /></mesh>
  </group>;
}

function Shelving({ decorated }: { decorated: Set<string> }) {
  return <group position={[4.35, 0, -2.2]}>
    {[-1.15,1.15].map((x) => <mesh key={x} castShadow position={[x,1.65,0]}><boxGeometry args={[.12,3.25,.55]} /><meshStandardMaterial color="#3a2116" /></mesh>)}
    {[.35,1.12,1.9,2.67,3.28].map((y) => <mesh key={y} castShadow position={[0,y,0]}><boxGeometry args={[2.42,.11,.62]} /><meshStandardMaterial color="#51301c" /></mesh>)}
    {decorated.has("paint-shelf") && [0,1,2,3,4].map((i) => <mesh key={i} castShadow position={[-.78+i*.39,2.12,.1]}><cylinderGeometry args={[.09,.1,.27,12]} /><meshStandardMaterial color={["#9a3d32","#d19b36","#2e567c","#47654b","#d9d0bd"][i]} /></mesh>)}
    {decorated.has("studio-plant") && <group position={[.72,2.98,.05]}><mesh castShadow><cylinderGeometry args={[.18,.14,.3,12]} /><meshStandardMaterial color="#9a6a3d" /></mesh>{[-.18,0,.18].map((x) => <mesh key={x} position={[x,.34,0]} rotation={[0,0,x*2.2]}><sphereGeometry args={[.18,10,8]} /><meshStandardMaterial color="#31533a" /></mesh>)}</group>}
  </group>;
}

function Sofa() {
  return <group position={[3.4,.15,2]} rotation={[0,-.38,0]}>
    <RoundedBox castShadow args={[2.25,.55,.85]} radius={.12} position={[0,.48,0]}><meshStandardMaterial color="#70442e" roughness={.9} /></RoundedBox>
    <RoundedBox castShadow args={[2.25,.82,.22]} radius={.1} position={[0,.95,-.34]} rotation={[-.1,0,0]}><meshStandardMaterial color="#613825" roughness={.92} /></RoundedBox>
    {[-.9,.9].map((x) => <mesh key={x} castShadow position={[x,.18,0]}><boxGeometry args={[.12,.35,.12]} /><meshStandardMaterial color="#261711" /></mesh>)}
  </group>;
}

function ArtistAvatar({ name, leftArm, rightArm, leftLeg, rightLeg }: {
  name: string;
  leftArm: React.RefObject<Group | null>;
  rightArm: React.RefObject<Group | null>;
  leftLeg: React.RefObject<Group | null>;
  rightLeg: React.RefObject<Group | null>;
}) {
  const firstName = name.trim().split(/\s+/)[0]?.slice(0,14) || "Artist";
  return <group scale={.9}>
    <mesh castShadow position={[0,2.13,0]}><sphereGeometry args={[.25,40,28]} /><meshStandardMaterial color="#6f482f" roughness={.72} /></mesh>
    <mesh castShadow position={[0,2.29,.015]} scale={[1.08,.62,1.08]}><sphereGeometry args={[.255,36,22]} /><meshStandardMaterial color="#17110e" roughness={.95} /></mesh>
    <mesh castShadow position={[-.08,2.14,-.225]}><sphereGeometry args={[.025,16,12]} /><meshStandardMaterial color="#17110e" /></mesh>
    <mesh castShadow position={[.08,2.14,-.225]}><sphereGeometry args={[.025,16,12]} /><meshStandardMaterial color="#17110e" /></mesh>
    <mesh castShadow position={[0,2.055,-.244]} scale={[1,.34,.35]}><sphereGeometry args={[.06,16,10]} /><meshStandardMaterial color="#3c1d18" /></mesh>
    <mesh castShadow position={[0,1.55,0]}><capsuleGeometry args={[.34,.63,14,28]} /><meshStandardMaterial color="#15191f" roughness={.82} /></mesh>
    <mesh castShadow position={[0,1.86,.04]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.28,.07,12,30,Math.PI]} /><meshStandardMaterial color="#20252d" /></mesh>
    <MountedLabel lines={[firstName]} position={[0,1.55,.345]} size={[.57,.19]} background="#15191f" foreground="#f6f1e7" accent="#c9a84c" serif={false} />
    <group ref={leftArm} position={[-.39,1.73,0]}><mesh castShadow position={[0,-.35,0]}><capsuleGeometry args={[.105,.53,10,20]} /><meshStandardMaterial color="#171c23" /></mesh><mesh castShadow position={[0,-.69,0]}><sphereGeometry args={[.105,20,14]} /><meshStandardMaterial color="#6f482f" /></mesh></group>
    <group ref={rightArm} position={withSign(.39,1.73,0)}><mesh castShadow position={[0,-.35,0]}><capsuleGeometry args={[.105,.53,10,20]} /><meshStandardMaterial color="#171c23" /></mesh><mesh castShadow position={[0,-.69,0]}><sphereGeometry args={[.105,20,14]} /><meshStandardMaterial color="#6f482f" /></mesh></group>
    <group ref={leftLeg} position={[-.18,1.14,0]}><mesh castShadow position={[0,-.44,0]}><capsuleGeometry args={[.115,.66,10,20]} /><meshStandardMaterial color="#242932" /></mesh><mesh castShadow position={[0,-.86,-.055]} scale={[1,.65,1.6]}><sphereGeometry args={[.14,20,14]} /><meshStandardMaterial color="#0a0d12" /></mesh></group>
    <group ref={rightLeg} position={[.18,1.14,0]}><mesh castShadow position={[0,-.44,0]}><capsuleGeometry args={[.115,.66,10,20]} /><meshStandardMaterial color="#242932" /></mesh><mesh castShadow position={[0,-.86,-.055]} scale={[1,.65,1.6]}><sphereGeometry args={[.14,20,14]} /><meshStandardMaterial color="#0a0d12" /></mesh></group>
  </group>;
}

function withSign(x: number, y: number, z: number): [number,number,number] { return [x,y,z]; }

const roomObstacles = [
  { minX:-5.85,maxX:-2.65,minZ:-2.65,maxZ:-.75 },
  { minX:2.9,maxX:5.65,minZ:-2.85,maxZ:-1.45 },
  { minX:2.05,maxX:4.85,minZ:1.15,maxZ:2.95 },
];
const easelObstacle = { minX:-2.9,maxX:-1.3,minZ:-2.65,maxZ:-1.15 };

function validPlayerPosition(x: number, z: number, hasEasel: boolean) {
  const radius = .3;
  if (x < -5.45 || x > 5.45 || z < -3.95 || z > 4.1) return false;
  const obstacles = hasEasel ? [...roomObstacles,easelObstacle] : roomObstacles;
  return !obstacles.some((box) => x + radius > box.minX && x - radius < box.maxX && z + radius > box.minZ && z - radius < box.maxZ);
}

function CharacterController({ name, active, controlsEnabled, view, input, orbit, hasEasel, onMoving }: { name: string; active: boolean; controlsEnabled: boolean; view: CameraView; input: MovementInput; orbit: OrbitSettings; hasEasel: boolean; onMoving: (moving: boolean) => void }) {
  const root = useRef<Group | null>(null);
  const leftArm = useRef<Group | null>(null);
  const rightArm = useRef<Group | null>(null);
  const leftLeg = useRef<Group | null>(null);
  const rightLeg = useRef<Group | null>(null);
  const rotation = useRef(0);
  const phase = useRef(0);
  const reportedMoving = useRef(false);
  const keys = useRef<MovementInput>({ forward:false, backward:false, left:false, right:false });
  const current = useRef(new Vector3(0,0,1.2));
  const { camera, invalidate } = useThree();

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (!active || !controlsEnabled) return;
      if ((event.target as HTMLElement)?.matches("input,select,textarea,button")) return;
      const key = event.key.toLowerCase();
      if (!["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," "].includes(key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (["w","arrowup"].includes(key)) keys.current.forward = true;
      if (["s","arrowdown"].includes(key)) keys.current.backward = true;
      if (["a","arrowleft"].includes(key)) keys.current.left = true;
      if (["d","arrowright"].includes(key)) keys.current.right = true;
      invalidate();
    };
    const up = (event: KeyboardEvent) => {
      if (!active || !controlsEnabled) return;
      const key = event.key.toLowerCase();
      if (!["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," "].includes(key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (["w","arrowup"].includes(key)) keys.current.forward = false;
      if (["s","arrowdown"].includes(key)) keys.current.backward = false;
      if (["a","arrowleft"].includes(key)) keys.current.left = false;
      if (["d","arrowright"].includes(key)) keys.current.right = false;
      invalidate();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [active,controlsEnabled,invalidate]);

  useEffect(() => {
    if (controlsEnabled) return;
    keys.current = { forward:false,backward:false,left:false,right:false };
    if (reportedMoving.current) { reportedMoving.current = false; onMoving(false); }
  }, [controlsEnabled,onMoving]);

  useEffect(() => {
    if (!active || !root.current) return;
    const destinations: Record<CameraView, { position:[number,number,number]; rotation:number }> = {
      overview:{position:[0,0,1.2],rotation:0},
      "wall-a":{position:[-3.35,0,-3.15],rotation:0},
      "wall-b":{position:[0,0,-3],rotation:0},
      "wall-c":{position:[3.35,0,-3.2],rotation:0},
      certificates:{position:[4.55,0,.8],rotation:-Math.PI/2},
    };
    const target = destinations[view];
    current.current.set(...target.position);
    rotation.current = target.rotation;
    root.current.position.copy(current.current);
    root.current.rotation.y = rotation.current;
    invalidate();
  }, [view,active,invalidate]);

  useFrame((state, delta) => {
    if (!active || !root.current) return;
    const controls = {
      forward: keys.current.forward || input.forward,
      backward: keys.current.backward || input.backward,
      left: keys.current.left || input.left,
      right: keys.current.right || input.right,
    };
    const moving = controls.forward || controls.backward;
    const turning = controls.left || controls.right;
    if (controls.left) rotation.current += delta * 1.9;
    if (controls.right) rotation.current -= delta * 1.9;
    if (moving) {
      const direction = controls.forward ? 1 : -1;
      const distance = delta * 1.85 * direction;
      const nextX = current.current.x - Math.sin(rotation.current) * distance;
      const nextZ = current.current.z - Math.cos(rotation.current) * distance;
      if (validPlayerPosition(nextX,nextZ,hasEasel)) current.current.set(nextX,0,nextZ);
      phase.current += delta * 9;
    }
    root.current.position.copy(current.current);
    root.current.rotation.y = MathUtils.lerp(root.current.rotation.y, rotation.current, .28);
    const swing = moving ? Math.sin(phase.current) * .62 : 0;
    if (leftArm.current) leftArm.current.rotation.x = MathUtils.lerp(leftArm.current.rotation.x,swing,.25);
    if (rightArm.current) rightArm.current.rotation.x = MathUtils.lerp(rightArm.current.rotation.x,-swing,.25);
    if (leftLeg.current) leftLeg.current.rotation.x = MathUtils.lerp(leftLeg.current.rotation.x,-swing,.25);
    if (rightLeg.current) rightLeg.current.rotation.x = MathUtils.lerp(rightLeg.current.rotation.x,swing,.25);
    const cameraAngle = rotation.current + orbit.yaw;
    const behind = new Vector3(Math.sin(cameraAngle) * orbit.distance,orbit.height,Math.cos(cameraAngle) * orbit.distance).add(current.current);
    behind.x = clamp(behind.x,-5.65,5.65);
    behind.z = clamp(behind.z,-4.25,4.45);
    state.camera.position.lerp(behind,1-Math.pow(.001,delta));
    state.camera.lookAt(current.current.x,1.42,current.current.z);
    if (reportedMoving.current !== moving) { reportedMoving.current = moving; onMoving(moving); }
    if (moving || turning || state.camera.position.distanceTo(behind) > .02) invalidate();
  });
  return <group ref={root}><ArtistAvatar name={name} leftArm={leftArm} rightArm={rightArm} leftLeg={leftLeg} rightLeg={rightLeg} /></group>;
}

function StudioRoom({ artworks, catalog, certificates, selectedId, mode, decorated, featuredArtwork, themeKey, onSelect, onTransform }: {
  artworks: GameArtwork[];
  catalog: StudioCatalogItem[];
  certificates: Array<{ track: string; code: string }>;
  selectedId: string | null;
  mode: Mode;
  decorated: Set<string>;
  featuredArtwork: GameArtwork | null;
  themeKey: string | null;
  onSelect: (id: string | null) => void;
  onTransform: (id: string, transform: ArtworkTransform) => void;
}) {
  const palette = themeKey === "warm-atelier"
    ? { background: "#17100b", wall: "#574536", side: "#302419", floor: "#754a2d" }
    : themeKey === "midnight-gallery"
      ? { background: "#030710", wall: "#07152b", side: "#0b1728", floor: "#33261e" }
      : themeKey === "charcoal-wall"
        ? { background: "#08090a", wall: "#242424", side: "#191919", floor: "#4a3020" }
        : { background: "#080b11", wall: "#101923", side: "#18202a", floor: "#5c331d" };
  return <>
    <color attach="background" args={[palette.background]} />
    <fog attach="fog" args={[palette.background, 12, 23]} />
    <hemisphereLight args={["#b8d7f0", "#3a2417", .7]} />
    <ambientLight intensity={.34} />
    <directionalLight castShadow position={[-4,7,5]} intensity={2.1} color="#ffd7a0" shadow-mapSize={[1024,1024]} />
    {[-4,0,4].map((x) => <spotLight key={x} castShadow position={[x,4.7,-2]} target-position={[x,2.1,-4.6]} angle={.5} penumbra={.7} intensity={48} distance={9} color="#ffd59b" />)}

    <mesh receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,0,0]}><planeGeometry args={[14,15,18,18]} /><meshStandardMaterial color={palette.floor} roughness={.78} /></mesh>
    {Array.from({ length: 18 }).map((_,i) => <mesh key={i} receiveShadow rotation={[-Math.PI/2,0,0]} position={[-6.5+i*.77,.012,0]}><planeGeometry args={[.735,14]} /><meshStandardMaterial color={i%2 ? palette.floor : new Color(palette.floor).multiplyScalar(.82)} roughness={.82} /></mesh>)}
    <mesh receiveShadow position={[0,2.55,-4.72]}><boxGeometry args={[12.4,5.1,.22]} /><meshStandardMaterial color={palette.wall} roughness={.91} /></mesh>
    <mesh receiveShadow position={[-6.1,2.55,0]}><boxGeometry args={[.22,5.1,9.5]} /><meshStandardMaterial color={palette.side} roughness={.9} /></mesh>
    <mesh receiveShadow position={[6.1,2.55,0]}><boxGeometry args={[.22,5.1,9.5]} /><meshStandardMaterial color={palette.side} roughness={.9} /></mesh>
    <mesh receiveShadow position={[0,5,0]}><boxGeometry args={[12.4,.18,9.6]} /><meshStandardMaterial color="#382213" roughness={.86} /></mesh>
    {[-4,-2,0,2,4].map((x) => <mesh key={x} castShadow position={[x,4.86,0]}><boxGeometry args={[.16,.28,9.6]} /><meshStandardMaterial color="#21130d" /></mesh>)}

    <WallLabel position={[-3.35,4.2,-4.48]} title="WALL A" subtitle="Portraits & People" />
    <WallLabel position={[0,4.2,-4.48]} title="WALL B" subtitle="Creativity & Imagination" />
    <WallLabel position={[3.35,4.2,-4.48]} title="WALL C" subtitle="Nature & Environment" />
    {artworks.map((artwork) => {
      const frame = catalog.find((item) => item.id === artwork.frameItemId);
      return <ArtworkFrame3D key={artwork.id} artwork={artwork} frameKey={frame?.item_key || null} selected={artwork.id === selectedId} arrange={mode === "arrange"} onSelect={() => onSelect(artwork.id)} onChange={(next) => onTransform(artwork.id, next)} />;
    })}

    <WoodenTable showBrushJar={decorated.has("brush-jar")} />
    {decorated.has("easel") && <Easel artwork={featuredArtwork} />}
    <Shelving decorated={decorated} />
    <Sofa />
    {decorated.has("gallery-lamp") && <pointLight position={[0,3.65,-3.8]} intensity={35} distance={5} color="#ffcf7a" />}
    {decorated.has("gallery-lamp") && <group position={[0,4.55,-3.95]}><mesh castShadow><cylinderGeometry args={[.08,.08,.7,12]} /><meshStandardMaterial color="#1a1712" metalness={.6} /></mesh><mesh castShadow position={[0,-.38,0]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[.22,.28,20]} /><meshStandardMaterial color="#b89138" metalness={.6} /></mesh></group>}

    <group position={[5.93,2.7,.9]} rotation={[0,-Math.PI/2,0]}>
      <MountedLabel lines={["CERTIFICATES","Beo graduate wall"]} position={[0,1.5,.02]} size={[1.7,.48]} serif={false} />
      {certificates.map((certificate,index) => <group key={certificate.code} position={[-1.15+index*1.15,.25,0]}>
        <mesh castShadow><boxGeometry args={[.95,1.25,.09]} /><meshStandardMaterial color="#b68b35" metalness={.45} /></mesh>
        <MountedLabel lines={[certificate.track,certificate.code]} position={[0,0,.051]} size={[.79,1.07]} background="#f0e8d7" foreground="#65542d" accent="#a67f2d" />
      </group>)}
      {decorated.has("graduate-plaque") && <MountedLabel lines={["BEO GRADUATE","Personal Studio"]} position={[0,-1.15,0]} size={[1.5,.55]} background="#3f2617" />}
    </group>
    <ContactShadows position={[0,.025,0]} opacity={.58} scale={13} blur={2.7} far={7} frames={1} />
    <mesh visible={false} onPointerDown={() => onSelect(null)}><boxGeometry args={[30,20,30]} /><meshBasicMaterial transparent opacity={0} /></mesh>
  </>;
}

function CameraRig({ view, active, controlsRef }: { view: CameraView; active: boolean; controlsRef: React.RefObject<CameraControlsImpl | null> }) {
  const { camera } = useThree();
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !active) return;
    const destinations: Record<CameraView, [number,number,number,number,number,number]> = {
      overview: [0,2.45,8.1,0,2.05,-2.2],
      "wall-a": [-3.35,2.7,1,-3.35,2.45,-4.6],
      "wall-b": [0,2.7,1,0,2.45,-4.6],
      "wall-c": [3.35,2.7,1,3.35,2.45,-4.6],
      certificates: [2.1,2.7,.8,5.9,2.55,.8],
    };
    void controls.setLookAt(...destinations[view], true);
  }, [view, active, controlsRef, camera]);
  if (!active) return null;
  return <CameraControls ref={controlsRef} minDistance={2.1} maxDistance={10.5} minPolarAngle={.65} maxPolarAngle={1.48} truckSpeed={1.05} dollySpeed={.65} smoothTime={.45} />;
}

function Scene({ view, name, input, orbit, controlsEnabled, onMoving, ...props }: React.ComponentProps<typeof StudioRoom> & { view: CameraView; name: string; input: MovementInput; orbit: OrbitSettings; controlsEnabled: boolean; onMoving: (moving:boolean) => void }) {
  const controlsRef = useRef<CameraControlsImpl | null>(null);
  return <><CameraRig view={view} active={props.mode === "arrange"} controlsRef={controlsRef} /><StudioRoom {...props} /><CharacterController name={name} active={props.mode === "explore"} controlsEnabled={controlsEnabled} view={view} input={input} orbit={orbit} hasEasel={props.decorated.has("easel")} onMoving={onMoving} /></>;
}

export function StudioGame({ name, profile, initialArtworks, catalog, owned, activeDecorItemIds, themeKey, certificates, featuredArtworkId, onOpenShop }: {
  name: string;
  profile: GamificationProfile;
  initialArtworks: GameArtwork[];
  catalog: StudioCatalogItem[];
  owned: Array<StudioCatalogItem & { inventoryId: string }>;
  activeDecorItemIds: string[];
  themeKey: string | null;
  certificates: Array<{ track: string; code: string }>;
  featuredArtworkId: string | null;
  onOpenShop: () => void;
}) {
  const [artworks, setArtworks] = useState(() => initialArtworks.map((artwork) => ({ ...artwork, transform: constrainArtwork(artwork.transform) })));
  const [mode, setMode] = useState<Mode>("explore");
  const [view, setView] = useState<CameraView>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [walking, setWalking] = useState(false);
  const [movement, setMovement] = useState<MovementInput>({ forward:false, backward:false, left:false, right:false });
  const [orbit, setOrbit] = useState<OrbitSettings>({ yaw:0, height:2.65, distance:3.15 });
  const [gameFocused, setGameFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const shellRef = useRef<HTMLElement | null>(null);
  const orbitDrag = useRef<{ x:number; y:number } | null>(null);
  const selected = artworks.find((artwork) => artwork.id === selectedId) || null;
  const decorated = useMemo(() => new Set(owned.filter((item) => item.category === "decor" && (item.item_key === "easel" || activeDecorItemIds.includes(item.id))).map((item) => item.item_key)), [owned, activeDecorItemIds]);
  const ownedFrames = owned.filter((item) => item.category === "frame");
  const featuredArtwork = artworks.find((artwork) => artwork.id === featuredArtworkId) || artworks.at(-1) || null;
  const totalForLevel = Math.max(250, profile.current_level * 450);
  const progress = Math.min(100, Math.round((profile.lifetime_xp % totalForLevel) / totalForLevel * 100));

  function cycle(direction: number) {
    const index = views.indexOf(view);
    setView(views[(index + direction + views.length) % views.length]);
  }
  function updateSelected(change: Partial<ArtworkTransform>) {
    if (!selectedId) return;
    setArtworks((current) => current.map((artwork) => artwork.id === selectedId ? { ...artwork, transform: constrainArtwork({ ...artwork.transform, ...change }) } : artwork));
  }
  async function saveSelected() {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch("/api/studio/transform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignmentId: selected.id, ...selected.transform, frameItemId: selected.frameItemId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The room could not be saved.");
      toast.success("Artwork position saved.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "The room could not be saved."); }
    finally { setSaving(false); }
  }
  function changeWall(wallId: StudioWallId) {
    updateSelected({ wallId });
    setView(wallId);
  }
  function pressMovement(key: keyof MovementInput, pressed: boolean) {
    setMovement((current) => current[key] === pressed ? current : { ...current, [key]: pressed });
  }
  function beginOrbit(event: React.PointerEvent<HTMLElement>) {
    shellRef.current?.focus({ preventScroll:true });
    if (mode !== "explore" || (event.target as HTMLElement).tagName !== "CANVAS") return;
    orbitDrag.current = { x:event.clientX,y:event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveOrbit(event: React.PointerEvent<HTMLElement>) {
    if (!orbitDrag.current || mode !== "explore") return;
    const dx = event.clientX - orbitDrag.current.x;
    const dy = event.clientY - orbitDrag.current.y;
    orbitDrag.current = { x:event.clientX,y:event.clientY };
    setOrbit((current) => ({ ...current, yaw:current.yaw + dx * .007, height:clamp(current.height + dy * .008,1.75,4.05) }));
  }
  function endOrbit(event: React.PointerEvent<HTMLElement>) {
    orbitDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function zoomExplore(event: React.WheelEvent<HTMLElement>) {
    if (mode !== "explore") return;
    event.preventDefault();
    shellRef.current?.focus({ preventScroll:true });
    setOrbit((current) => ({ ...current, distance:clamp(current.distance + event.deltaY * .003,1.8,4.8) }));
  }
  function toggleExpanded() {
    setExpanded((value) => !value);
    window.requestAnimationFrame(() => shellRef.current?.focus({ preventScroll:true }));
  }

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [expanded]);

  return <section ref={shellRef} className={`studio-game-shell ${gameFocused ? "game-focused" : ""} ${expanded ? "game-expanded" : ""}`} tabIndex={0} onFocusCapture={() => setGameFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setGameFocused(false); }} onPointerDown={beginOrbit} onPointerMove={moveOrbit} onPointerUp={endOrbit} onPointerCancel={endOrbit} onWheel={zoomExplore}>
    <div className="studio-game-canvas">
      <Canvas shadows frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0,2.45,8.1], fov: 48, near: .1, far: 40 }} gl={{ antialias: true, powerPreference: "high-performance" }} fallback={<div className="studio-webgl-fallback"><Box /><h2>Your studio is ready, but 3D is unavailable.</h2><p>Turn on hardware acceleration or use a modern browser to enter the room.</p></div>}>
        <Suspense fallback={<LoadingRoom />}><Scene view={view} name={name} input={movement} orbit={orbit} controlsEnabled={gameFocused || expanded} onMoving={setWalking} artworks={artworks} catalog={catalog} certificates={certificates} selectedId={selectedId} mode={mode} decorated={decorated} featuredArtwork={featuredArtwork} themeKey={themeKey} onSelect={setSelectedId} onTransform={(id, transform) => setArtworks((current) => current.map((artwork) => artwork.id === id ? { ...artwork, transform } : artwork))} /></Suspense>
      </Canvas>
    </div>

    <aside className="studio-player-card">
      <div className="studio-avatar">{name.split(" ").map((part) => part[0]).slice(0,2).join("")}</div>
      <div><strong>{name}</strong><span>Artist Level {profile.current_level}</span><div className="studio-level-bar"><i style={{width:`${progress}%`}} /></div><small>{profile.lifetime_xp.toLocaleString()} lifetime XP</small></div>
      <footer><span><Coins /> {profile.gold_brush_balance}</span><span><Paintbrush /> {owned.length}</span></footer>
    </aside>
    <div className="studio-help">{mode === "explore" ? <Footprints /> : <Move />}<div><strong>{mode === "arrange" ? "Arrange your wall" : walking ? "Walking through your studio" : gameFocused ? "Game controls active" : "Tap the room to play"}</strong><span>{mode === "arrange" ? "Select and drag a frame, then save" : "Walk with keys · drag to orbit · scroll to zoom"}</span></div></div>
    <div className="studio-top-actions"><button type="button" aria-label="Capture studio view" title="Capture studio view" onClick={() => toast.info("Use your device screenshot to capture this view.")}><Camera /></button><button type="button" aria-label="Studio help" title="Studio help" onClick={() => toast.info("Tap the room first. Use WASD or arrow keys to walk, drag the room to orbit the camera, and scroll to zoom. Page scrolling stays locked while the game is focused.")}><HelpCircle /></button><button type="button" aria-label={expanded ? "Exit full-screen game" : "Expand game to full screen"} title={expanded ? "Exit full screen" : "Full screen"} aria-pressed={expanded} onClick={toggleExpanded}>{expanded ? <Minimize2 /> : <Maximize2 />}</button><button type="button" aria-label="Studio menu" title="Studio menu" onClick={onOpenShop}><Menu /></button></div>
    <button className="studio-view-arrow previous" type="button" onClick={() => cycle(-1)} aria-label="Previous wall"><ChevronLeft /></button>
    <button className="studio-view-arrow next" type="button" onClick={() => cycle(1)} aria-label="Next wall"><ChevronRight /></button>
    <div className="studio-room-dots">{views.map((item) => <button key={item} className={item === view ? "active" : ""} type="button" onClick={() => setView(item)} aria-label={`View ${item}`} />)}</div>

    {selected && mode === "explore" && <aside className="studio-art-inspector"><button type="button" onClick={() => setSelectedId(null)} aria-label="Close artwork information">×</button><span>{selected.lessonCode} · {selected.track}</span><strong>{selected.title}</strong><small>{selected.reviewed ? "Review complete" : "Awaiting Benjamin's review"}</small>{selected.feedback && <p>{selected.feedback}</p>}</aside>}

    {mode === "arrange" && <div className="arrange-toolbar">
      {selected ? <>
        <div className="arrange-selection"><span>Selected</span><strong>{selected.lessonCode} · {selected.title}</strong></div>
        <label><span>Wall</span><select value={selected.transform.wallId} onChange={(event) => changeWall(event.target.value as StudioWallId)}><option value="wall-a">Wall A</option><option value="wall-b">Wall B</option><option value="wall-c">Wall C</option></select></label>
        <button type="button" onClick={() => updateSelected({ positionX: clamp(selected.transform.positionX - .12,-1.45,1.45) })} title="Move left"><ChevronLeft /></button>
        <button type="button" onClick={() => updateSelected({ positionX: clamp(selected.transform.positionX + .12,-1.45,1.45) })} title="Move right"><ChevronRight /></button>
        <button type="button" onClick={() => updateSelected({ scale: clamp(selected.transform.scale - .08,.55,1.65) })} title="Make smaller"><Minus /></button>
        <button type="button" onClick={() => updateSelected({ scale: clamp(selected.transform.scale + .08,.55,1.65) })} title="Make larger"><Plus /></button>
        <button type="button" onClick={() => updateSelected({ rotationZ: clamp(selected.transform.rotationZ + .06,-.3,.3) })} title="Rotate"><RotateCcw /></button>
        <label><span>Frame</span><select value={selected.frameItemId || ""} onChange={(event) => setArtworks((current) => current.map((artwork) => artwork.id === selected.id ? {...artwork,frameItemId:event.target.value || null}:artwork))}><option value="">Beo Basic</option>{ownedFrames.map((frame) => <option value={frame.id} key={frame.id}>{frame.name}</option>)}</select></label>
        <button className="arrange-save" type="button" onClick={saveSelected} disabled={saving}><Save /> {saving ? "Saving" : "Save"}</button>
      </> : <div className="arrange-empty"><Move /><span>Select an artwork on a wall to arrange it.</span></div>}
    </div>}
    <nav className="studio-game-nav" aria-label="Studio game modes">
      <button className={mode === "explore" ? "active" : ""} type="button" onClick={() => {setMode("explore");setSelectedId(null);}}><Footprints /> Explore</button>
      <button className={mode === "arrange" ? "active" : ""} type="button" onClick={() => setMode("arrange")}><Move /> Arrange</button>
      <button type="button" onClick={onOpenShop}><ShoppingCart /> Shop</button>
      <button type="button" onClick={() => setView("certificates")}><Award /> Awards</button>
    </nav>
    {mode === "explore" && <div className="studio-mobile-pad" aria-label="Move around the studio">
      <button className="pad-up" onPointerDown={() => pressMovement("forward",true)} onPointerUp={() => pressMovement("forward",false)} onPointerLeave={() => pressMovement("forward",false)} aria-label="Walk forward"><ChevronUp /></button>
      <button className="pad-left" onPointerDown={() => pressMovement("left",true)} onPointerUp={() => pressMovement("left",false)} onPointerLeave={() => pressMovement("left",false)} aria-label="Turn left"><ChevronLeft /></button>
      <button className="pad-center" type="button" onClick={() => setView("overview")} aria-label="Return to studio entrance"><Footprints /></button>
      <button className="pad-right" onPointerDown={() => pressMovement("right",true)} onPointerUp={() => pressMovement("right",false)} onPointerLeave={() => pressMovement("right",false)} aria-label="Turn right"><ChevronRight /></button>
      <button className="pad-down" onPointerDown={() => pressMovement("backward",true)} onPointerUp={() => pressMovement("backward",false)} onPointerLeave={() => pressMovement("backward",false)} aria-label="Walk backward"><ChevronDown /></button>
    </div>}
  </section>;
}
