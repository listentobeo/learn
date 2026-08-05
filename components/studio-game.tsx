"use client";

import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { CameraControls, ContactShadows, Html, RoundedBox, useProgress } from "@react-three/drei";
import type { CameraControls as CameraControlsImpl } from "@react-three/drei";
import { Award, Box, Camera, ChevronLeft, ChevronRight, Coins, HelpCircle, Maximize2, Menu, Minus, Move, Paintbrush, Plus, RotateCcw, Save, ShoppingCart, Sparkles, ZoomIn } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ClampToEdgeWrapping, Color, DoubleSide, LinearFilter, SRGBColorSpace, Texture, TextureLoader } from "three";
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

function LoadingRoom() {
  const { progress } = useProgress();
  return <Html center><div className="studio-3d-loader"><Sparkles /><strong>Preparing your studio</strong><span>{Math.round(progress)}%</span></div></Html>;
}

function useArtworkTexture(url: string | null) {
  const [texture, setTexture] = useState<Texture | null>(null);
  useEffect(() => {
    if (!url) return;
    let mounted = true;
    const loader = new TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(url, (next) => {
      if (!mounted) { next.dispose(); return; }
      next.colorSpace = SRGBColorSpace;
      next.minFilter = LinearFilter;
      next.wrapS = ClampToEdgeWrapping;
      next.wrapT = ClampToEdgeWrapping;
      setTexture((old) => { old?.dispose(); return next; });
    });
    return () => { mounted = false; };
  }, [url]);
  return texture;
}

function ArtworkFrame3D({ artwork, frameKey, selected, arrange, onSelect, onChange }: {
  artwork: GameArtwork;
  frameKey: string | null;
  selected: boolean;
  arrange: boolean;
  onSelect: () => void;
  onChange: (transform: ArtworkTransform) => void;
}) {
  const texture = useArtworkTexture(artwork.imageUrl);
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
    onChange({
      ...transform,
      positionX: clamp(drag.current.originX + (event.nativeEvent.clientX - drag.current.x) * 0.006, -1.45, 1.45),
      positionY: clamp(drag.current.originY - (event.nativeEvent.clientY - drag.current.y) * 0.006, 1.25, 3.75),
    });
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
        {texture ? <meshStandardMaterial map={texture} roughness={0.73} side={DoubleSide} /> : <meshStandardMaterial color="#e6dfd0" roughness={0.9} />}
      </mesh>
      <Html position={[0, -0.66, 0.09]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div className="studio-art-plaque"><strong>{artwork.lessonCode}</strong><span>{artwork.title}</span></div>
      </Html>
      {selected && arrange && <mesh position={[0, 0, 0.13]}><planeGeometry args={[1.38, 1.15]} /><meshBasicMaterial color="#c9a84c" transparent opacity={0.12} /></mesh>}
    </group>
  );
}

function WallLabel({ position, title, subtitle }: { position: [number, number, number]; title: string; subtitle: string }) {
  return <Html position={position} center distanceFactor={8} style={{ pointerEvents: "none" }}><div className="studio-wall-sign"><strong>{title}</strong><span>{subtitle}</span></div></Html>;
}

function WoodenTable({ showBrushJar }: { showBrushJar: boolean }) {
  return <group position={[-4.25, 0, -1.8]}>
    <mesh castShadow receiveShadow position={[0, 1.02, 0]}><boxGeometry args={[2.7, .18, 1.25]} /><meshStandardMaterial color="#5a321b" roughness={.68} /></mesh>
    {[[-1.08,.5,-.45],[1.08,.5,-.45],[-1.08,.5,.45],[1.08,.5,.45]].map((p, i) => <mesh castShadow key={i} position={p as [number,number,number]}><boxGeometry args={[.16,1,.16]} /><meshStandardMaterial color="#3d2215" /></mesh>)}
    {showBrushJar && <group position={[.4,1.23,0]}><mesh castShadow><cylinderGeometry args={[.16,.2,.42,16]} /><meshStandardMaterial color="#6d351b" /></mesh>{[-.1,0,.1].map((x) => <mesh key={x} position={[x,.35,0]} rotation={[0,0,x*2]}><cylinderGeometry args={[.025,.025,.7,8]} /><meshStandardMaterial color="#c39b67" /></mesh>)}</group>}
  </group>;
}

function Easel({ artwork }: { artwork: GameArtwork | null }) {
  const texture = useArtworkTexture(artwork?.imageUrl || null);
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

function Avatar() {
  return <group position={[0,0,1.1]} rotation={[0,.08,0]}>
    <mesh castShadow position={[0,2.05,0]}><sphereGeometry args={[.24,24,18]} /><meshStandardMaterial color="#684228" /></mesh>
    <mesh castShadow position={[0,1.42,0]}><capsuleGeometry args={[.33,.62,8,16]} /><meshStandardMaterial color="#17191d" roughness={.86} /></mesh>
    <mesh castShadow position={[-.18,.58,0]}><capsuleGeometry args={[.105,.62,6,12]} /><meshStandardMaterial color="#22242a" /></mesh>
    <mesh castShadow position={[.18,.58,0]}><capsuleGeometry args={[.105,.62,6,12]} /><meshStandardMaterial color="#22242a" /></mesh>
    <Html position={[0,1.53,.35]} center distanceFactor={8} style={{ pointerEvents:"none" }}><span className="avatar-beo">Beo</span></Html>
  </group>;
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
    <Avatar />
    {decorated.has("gallery-lamp") && <pointLight position={[0,3.65,-3.8]} intensity={35} distance={5} color="#ffcf7a" />}
    {decorated.has("gallery-lamp") && <group position={[0,4.55,-3.95]}><mesh castShadow><cylinderGeometry args={[.08,.08,.7,12]} /><meshStandardMaterial color="#1a1712" metalness={.6} /></mesh><mesh castShadow position={[0,-.38,0]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[.22,.28,20]} /><meshStandardMaterial color="#b89138" metalness={.6} /></mesh></group>}

    <group position={[5.93,2.7,.9]} rotation={[0,-Math.PI/2,0]}>
      <Html position={[0,1.5,.02]} center distanceFactor={8} style={{pointerEvents:"none"}}><div className="studio-wall-sign"><strong>CERTIFICATES</strong><span>Beo graduate wall</span></div></Html>
      {certificates.map((certificate,index) => <group key={certificate.code} position={[-1.15+index*1.15,.25,0]}>
        <mesh castShadow><boxGeometry args={[.95,1.25,.09]} /><meshStandardMaterial color="#b68b35" metalness={.45} /></mesh>
        <mesh position={[0,0,.051]}><planeGeometry args={[.79,1.07]} /><meshStandardMaterial color="#f0e8d7" /></mesh>
        <Html position={[0,0,.08]} center distanceFactor={6} style={{pointerEvents:"none"}}><div className="certificate-3d"><Award /><strong>{certificate.track}</strong><small>{certificate.code}</small></div></Html>
      </group>)}
      {decorated.has("graduate-plaque") && <group position={[0,-1.15,0]}><mesh castShadow><boxGeometry args={[1.5,.55,.11]} /><meshStandardMaterial color="#3f2617" /></mesh><Html position={[0,0,.07]} center distanceFactor={7} style={{pointerEvents:"none"}}><div className="graduate-plaque-3d"><Award /> Beo Graduate Studio</div></Html></group>}
    </group>
    <ContactShadows position={[0,.025,0]} opacity={.58} scale={13} blur={2.7} far={7} frames={1} />
    <mesh visible={false} onPointerDown={() => onSelect(null)}><boxGeometry args={[30,20,30]} /><meshBasicMaterial transparent opacity={0} /></mesh>
  </>;
}

function CameraRig({ view, controlsRef }: { view: CameraView; controlsRef: React.RefObject<CameraControlsImpl | null> }) {
  const { camera } = useThree();
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const destinations: Record<CameraView, [number,number,number,number,number,number]> = {
      overview: [0,2.45,8.1,0,2.05,-2.2],
      "wall-a": [-3.35,2.7,1,-3.35,2.45,-4.6],
      "wall-b": [0,2.7,1,0,2.45,-4.6],
      "wall-c": [3.35,2.7,1,3.35,2.45,-4.6],
      certificates: [2.1,2.7,.8,5.9,2.55,.8],
    };
    void controls.setLookAt(...destinations[view], true);
  }, [view, controlsRef, camera]);
  return <CameraControls ref={controlsRef} minDistance={2.1} maxDistance={11} minPolarAngle={.65} maxPolarAngle={1.55} truckSpeed={1.2} dollySpeed={.65} smoothTime={.45} />;
}

function Scene({ view, ...props }: React.ComponentProps<typeof StudioRoom> & { view: CameraView }) {
  const controlsRef = useRef<CameraControlsImpl | null>(null);
  return <><CameraRig view={view} controlsRef={controlsRef} /><StudioRoom {...props} /></>;
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
  const [artworks, setArtworks] = useState(initialArtworks);
  const [mode, setMode] = useState<Mode>("explore");
  const [view, setView] = useState<CameraView>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
    setArtworks((current) => current.map((artwork) => artwork.id === selectedId ? { ...artwork, transform: { ...artwork.transform, ...change } } : artwork));
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

  return <section className="studio-game-shell">
    <div className="studio-game-canvas">
      <Canvas shadows frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0,2.45,8.1], fov: 48, near: .1, far: 40 }} gl={{ antialias: true, powerPreference: "high-performance" }} fallback={<div className="studio-webgl-fallback"><Box /><h2>Your studio is ready, but 3D is unavailable.</h2><p>Turn on hardware acceleration or use a modern browser to enter the room.</p></div>}>
        <Suspense fallback={<LoadingRoom />}><Scene view={view} artworks={artworks} catalog={catalog} certificates={certificates} selectedId={selectedId} mode={mode} decorated={decorated} featuredArtwork={featuredArtwork} themeKey={themeKey} onSelect={setSelectedId} onTransform={(id, transform) => setArtworks((current) => current.map((artwork) => artwork.id === id ? { ...artwork, transform } : artwork))} /></Suspense>
      </Canvas>
    </div>

    <aside className="studio-player-card">
      <div className="studio-avatar">{name.split(" ").map((part) => part[0]).slice(0,2).join("")}</div>
      <div><strong>{name}</strong><span>Artist Level {profile.current_level}</span><div className="studio-level-bar"><i style={{width:`${progress}%`}} /></div><small>{profile.lifetime_xp.toLocaleString()} lifetime XP</small></div>
      <footer><span><Coins /> {profile.gold_brush_balance}</span><span><Paintbrush /> {owned.length}</span></footer>
    </aside>
    <div className="studio-help"><HelpCircle /><div><strong>{mode === "arrange" ? "Arrange your wall" : "Explore your studio"}</strong><span>{mode === "arrange" ? "Select and drag a frame, then save" : "Drag to look around, scroll or pinch to zoom"}</span></div></div>
    <div className="studio-top-actions"><button type="button" aria-label="Capture studio view" title="Capture studio view" onClick={() => toast.info("Use your device screenshot to capture this view.")}><Camera /></button><button type="button" aria-label="Studio help" title="Studio help" onClick={() => toast.info("Drag to look around. Scroll or pinch to zoom. In Arrange mode, select and move your artwork.")}><HelpCircle /></button><button type="button" aria-label="Studio menu" title="Studio menu" onClick={onOpenShop}><Menu /></button></div>
    <button className="studio-view-arrow previous" type="button" onClick={() => cycle(-1)} aria-label="Previous wall"><ChevronLeft /></button>
    <button className="studio-view-arrow next" type="button" onClick={() => cycle(1)} aria-label="Next wall"><ChevronRight /></button>
    <div className="studio-room-dots">{views.map((item) => <button key={item} className={item === view ? "active" : ""} type="button" onClick={() => setView(item)} aria-label={`View ${item}`} />)}</div>

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
      <button className={mode === "explore" ? "active" : ""} type="button" onClick={() => {setMode("explore");setSelectedId(null);}}><ZoomIn /> Explore</button>
      <button className={mode === "arrange" ? "active" : ""} type="button" onClick={() => setMode("arrange")}><Move /> Arrange</button>
      <button type="button" onClick={onOpenShop}><ShoppingCart /> Shop</button>
      <button type="button" onClick={() => setView("certificates")}><Award /> Awards</button>
    </nav>
    <div className="studio-mobile-pad"><button onClick={() => cycle(-1)} aria-label="Turn left"><ChevronLeft /></button><button onClick={() => setView("overview")} aria-label="Studio overview"><Maximize2 /></button><button onClick={() => cycle(1)} aria-label="Turn right"><ChevronRight /></button></div>
  </section>;
}
