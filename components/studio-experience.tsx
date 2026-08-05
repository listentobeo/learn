"use client";

import Image from "next/image";
import Link from "next/link";
import { Award, Brush, Check, ChevronLeft, ChevronRight, Coins, Frame, ImageIcon, LampDesk, Leaf, Lock, PackageOpen, Palette, Paintbrush, ShoppingBag, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { GamificationProfile, StudioCatalogItem } from "@/lib/types";

export type StudioArtwork = {
  id: string;
  lessonCode: string;
  title: string;
  track: string;
  imageUrl: string | null;
  submittedAt: string;
  reviewed: boolean;
  feedback: string | null;
  frameItemId: string | null;
};

export type StudioLayout = {
  featuredArtworkId: string | null;
  decorSlots: Record<string, string>;
};

type OwnedItem = StudioCatalogItem & { inventoryId: string };
type Wall = "gallery" | "workshop" | "achievements";

const walls: Array<{ id: Wall; label: string; room: string }> = [
  { id: "gallery", label: "Gallery Wall", room: "1 of 3" },
  { id: "workshop", label: "Working Studio", room: "2 of 3" },
  { id: "achievements", label: "Achievement Wall", room: "3 of 3" },
];
const decorSlots = ["work-left", "work-right", "work-shelf", "gallery-light", "achievement-left", "achievement-right"];

function itemIcon(item: StudioCatalogItem) {
  if (item.category === "frame") return Frame;
  if (item.category === "theme") return Palette;
  if (item.category === "resource") return PackageOpen;
  if (item.item_key === "studio-plant") return Leaf;
  if (item.item_key === "gallery-lamp") return LampDesk;
  if (item.item_key === "graduate-plaque") return Award;
  if (item.item_key === "paint-shelf") return Palette;
  if (item.item_key === "brush-jar") return Paintbrush;
  return Brush;
}

function roomForDecor(item: StudioCatalogItem) {
  if (item.item_key === "gallery-lamp") return ["gallery-light"];
  if (item.item_key === "graduate-plaque") return ["achievement-left", "achievement-right"];
  return ["work-left", "work-right", "work-shelf"];
}

export function StudioExperience({ name, initialProfile, artworks, catalog, initialOwned, initialThemeId, initialLayout, certificates, enabled }: {
  name: string;
  initialProfile: GamificationProfile;
  artworks: StudioArtwork[];
  catalog: StudioCatalogItem[];
  initialOwned: OwnedItem[];
  initialThemeId: string | null;
  initialLayout: StudioLayout;
  certificates: Array<{ track: string; code: string }>;
  enabled: boolean;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [owned, setOwned] = useState(initialOwned);
  const [themeId, setThemeId] = useState(initialThemeId);
  const [layout, setLayout] = useState(initialLayout);
  const [wallIndex, setWallIndex] = useState(0);
  const [artworkFrames, setArtworkFrames] = useState<Record<string, string | null>>(() => Object.fromEntries(artworks.map((artwork) => [artwork.id, artwork.frameItemId])));
  const [shopCategory, setShopCategory] = useState<StudioCatalogItem["category"] | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const touchStart = useRef<number | null>(null);
  const ownedIds = useMemo(() => new Set(owned.map((item) => item.id)), [owned]);
  const ownedFrames = owned.filter((item) => item.category === "frame");
  const selectedTheme = catalog.find((item) => item.id === themeId);
  const themeClass = selectedTheme?.visual_config?.className || "studio-theme-default";
  const visibleCatalog = catalog.filter((item) => shopCategory === "all" || item.category === shopCategory);
  const featuredArtwork = artworks.find((artwork) => artwork.id === layout.featuredArtworkId) || artworks.at(-1) || null;
  const hasEasel = owned.some((item) => item.item_key === "easel");
  const placedIds = new Set(Object.values(layout.decorSlots));

  function move(direction: number) {
    setWallIndex((current) => Math.min(walls.length - 1, Math.max(0, current + direction)));
  }

  async function persistLayout(next: StudioLayout, success?: string) {
    const previous = layout;
    setLayout(next);
    try {
      const response = await fetch("/api/studio/equip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "layout", layout: next }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save the room layout.");
      if (success) toast.success(success);
      return true;
    } catch (error) {
      setLayout(previous);
      toast.error(error instanceof Error ? error.message : "Unable to save the room layout.");
      return false;
    }
  }

  async function purchase(item: StudioCatalogItem) {
    setBusy(item.id);
    try {
      const response = await fetch("/api/studio/purchase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: item.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to purchase this studio item.");
      setOwned((current) => [...current, { ...item, inventoryId: result.inventory?.id || item.id }]);
      if (result.profile) setProfile(result.profile);
      if (item.item_key === "easel") {
        setWallIndex(1);
        toast.success("Your Studio Easel is ready on the Working Studio wall.");
      } else if (item.category === "decor") {
        const slot = roomForDecor(item).find((candidate) => !layout.decorSlots[candidate]);
        if (slot) await persistLayout({ ...layout, decorSlots: { ...layout.decorSlots, [slot]: item.id } }, `${item.name} was added to your room.`);
        else toast.success(`${item.name} is in your inventory. Remove a room object to place it.`);
      } else if (item.category === "resource") toast.success(`${item.name} is ready in Resources.`);
      else toast.success(`${item.name} is now in your studio inventory.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your connection changed. Please try again.");
    } finally { setBusy(null); }
  }

  async function equipFrame(assignmentId: string, itemId: string | null) {
    setBusy(`frame-${assignmentId}`);
    try {
      const response = await fetch("/api/studio/equip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "frame", assignmentId, itemId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to change this frame.");
      setArtworkFrames((current) => ({ ...current, [assignmentId]: itemId }));
      toast.success("Artwork frame updated.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Frame update failed."); }
    finally { setBusy(null); }
  }

  async function equipTheme(itemId: string | null) {
    setBusy(`theme-${itemId || "default"}`);
    try {
      const response = await fetch("/api/studio/equip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "theme", itemId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to change your studio wall.");
      setThemeId(itemId);
      toast.success("The whole studio atmosphere has changed.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Theme update failed."); }
    finally { setBusy(null); }
  }

  async function toggleDecor(item: StudioCatalogItem) {
    if (item.item_key === "easel") { setWallIndex(1); return; }
    const currentSlot = Object.entries(layout.decorSlots).find(([, itemId]) => itemId === item.id)?.[0];
    if (currentSlot) {
      const nextSlots = { ...layout.decorSlots };
      delete nextSlots[currentSlot];
      await persistLayout({ ...layout, decorSlots: nextSlots }, `${item.name} returned to your inventory.`);
      return;
    }
    const slot = roomForDecor(item).find((candidate) => !layout.decorSlots[candidate]);
    if (!slot) return toast.error("That part of the room is full. Remove an object first.");
    await persistLayout({ ...layout, decorSlots: { ...layout.decorSlots, [slot]: item.id } }, `${item.name} was placed in your room.`);
    setWallIndex(slot.startsWith("gallery") ? 0 : slot.startsWith("achievement") ? 2 : 1);
  }

  function renderDecor(slot: string) {
    const item = catalog.find((candidate) => candidate.id === layout.decorSlots[slot]);
    if (!item) return null;
    const Icon = itemIcon(item);
    return <button className={`room-object object-${item.item_key} slot-${slot}`} type="button" onClick={() => toggleDecor(item)} title={`Remove ${item.name}`}><Icon size={item.item_key === "gallery-lamp" ? 31 : 36} /><span>{item.name}</span></button>;
  }

  function renderArtwork(artwork: StudioArtwork, compact = false) {
    const frameItem = catalog.find((item) => item.id === artworkFrames[artwork.id]);
    const frameClass = frameItem?.visual_config?.className || "frame-basic";
    return <article className={`wall-artwork ${compact ? "featured-artwork" : ""}`} key={artwork.id}><div className={`art-frame ${frameClass}`}><div className="art-mat">{artwork.imageUrl ? <Image src={artwork.imageUrl} alt={`${artwork.lessonCode} assignment by ${name}`} width={640} height={480} unoptimized /> : <div className="artwork-missing"><ImageIcon size={30} /><span>Private image unavailable</span></div>}</div></div><div className="art-plaque"><span>{artwork.lessonCode} · {artwork.track}</span><strong>{artwork.title}</strong><small className={artwork.reviewed ? "mastered" : "awaiting"}>{artwork.reviewed ? "Review complete" : "Awaiting review"}</small></div>{!compact && <label className="frame-picker"><span>Frame</span><select value={artworkFrames[artwork.id] || ""} onChange={(event) => equipFrame(artwork.id, event.target.value || null)} disabled={busy !== null}><option value="">Beo Basic</option>{ownedFrames.map((frame) => <option value={frame.id} key={frame.id}>{frame.name}</option>)}</select></label>}</article>;
  }

  return <>
    <section className="studio-hud"><div><span className="eyebrow">{name}&apos;s private space</span><h1>Personal Studio.</h1><p>Move wall to wall, display your work and shape a room earned through practice.</p></div><div className="studio-currency"><span><Sparkles size={17} /> Level {profile.current_level}</span><strong><Coins size={18} /> {profile.gold_brush_balance} Gold Brushes</strong><small>{profile.lifetime_xp.toLocaleString()} lifetime XP</small></div></section>

    <section className={`immersive-studio ${themeClass}`}>
      <header className="room-navigation"><button className="room-arrow" type="button" onClick={() => move(-1)} disabled={wallIndex === 0} aria-label="Previous studio wall"><ChevronLeft /></button><div className="room-map">{walls.map((wall, index) => <button className={wallIndex === index ? "active" : ""} type="button" onClick={() => setWallIndex(index)} key={wall.id}><small>{wall.room}</small><span>{wall.label}</span></button>)}</div><button className="room-arrow" type="button" onClick={() => move(1)} disabled={wallIndex === walls.length - 1} aria-label="Next studio wall"><ChevronRight /></button></header>
      <div className="room-viewport" onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX || null; }} onTouchEnd={(event) => { if (touchStart.current === null) return; const distance = event.changedTouches[0]?.clientX - touchStart.current; if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1); touchStart.current = null; }}>
        <div className="room-track" style={{ transform: `translateX(-${wallIndex * 100}%)` }}>
          <section className="studio-room gallery-room" aria-hidden={wallIndex !== 0} inert={wallIndex !== 0}><div className="room-light-wash" />{renderDecor("gallery-light")}<div className="room-title"><span>Gallery Wall</span><strong>{artworks.length} framed {artworks.length === 1 ? "work" : "works"}</strong></div>{artworks.length ? <div className="artwork-wall">{artworks.map((artwork) => renderArtwork(artwork))}</div> : <div className="studio-empty"><Frame size={38} /><h2>Your first frame is waiting.</h2><p>Submit a practical assignment and it will appear here automatically.</p><Link className="button" href="/dashboard">Go to my lessons</Link></div>}<div className="room-floorboards" /></section>

          <section className="studio-room workshop-room" aria-hidden={wallIndex !== 1} inert={wallIndex !== 1}><div className="room-light-wash" /><div className="room-title"><span>Working Studio</span><strong>Your current focus</strong></div>{renderDecor("work-left")}{renderDecor("work-right")}{renderDecor("work-shelf")}<div className={`easel-stage ${hasEasel ? "owned" : "locked"}`}>{hasEasel ? <><div className="wooden-easel">{featuredArtwork ? renderArtwork(featuredArtwork, true) : <div className="blank-canvas"><Paintbrush size={36} /><span>Your next assignment will sit here</span></div>}</div>{artworks.length > 0 && <label className="featured-picker"><span>Artwork on easel</span><select value={featuredArtwork?.id || ""} onChange={(event) => persistLayout({ ...layout, featuredArtworkId: event.target.value || null }, "Featured artwork updated.")}>{artworks.map((artwork) => <option value={artwork.id} key={artwork.id}>{artwork.lessonCode} · {artwork.title}</option>)}</select></label>}</> : <div className="easel-locked"><Lock size={24} /><strong>The easel space is empty</strong><span>Own the Studio Easel to feature one assignment here.</span><button type="button" onClick={() => { setShopCategory("decor"); document.getElementById("reward-shop")?.scrollIntoView({ behavior: "smooth" }); }}>Find the easel</button></div>}</div><div className="room-floorboards" /></section>

          <section className="studio-room achievement-room" aria-hidden={wallIndex !== 2} inert={wallIndex !== 2}><div className="room-light-wash" /><div className="room-title"><span>Achievement Wall</span><strong>Proof of the journey</strong></div>{renderDecor("achievement-left")}{renderDecor("achievement-right")}<div className="certificate-gallery">{certificates.length ? certificates.map((certificate) => <article className="certificate-corner" key={certificate.code}><Award size={30} /><span>Certificate</span><strong>{certificate.track}</strong><small>{certificate.code}</small></article>) : <div className="studio-empty"><Award size={36} /><h2>Your certificate wall is waiting.</h2><p>Complete every quiz and reviewed assignment in a full track.</p></div>}<div className="artist-level-plaque"><Sparkles size={25} /><span>Artist level</span><strong>{profile.current_level}</strong><small>{profile.lifetime_xp.toLocaleString()} lifetime XP</small></div></div><div className="room-floorboards" /></section>
        </div>
      </div>
      <footer className="room-instructions"><span>Swipe or use the arrows to move wall to wall</span><button type="button" onClick={() => equipTheme(null)} disabled={!themeId || busy !== null}>Restore original room</button></footer>
    </section>

    {enabled ? <section className="reward-shop" id="reward-shop"><div className="shop-heading"><div><span className="eyebrow">Every purchase changes the room</span><h2>Reward Shop.</h2><p>Frames present artwork, themes transform the room, decor occupies a real studio position, and resources unlock practice activities.</p></div><div className="shop-balance"><Coins size={18} /><strong>{profile.gold_brush_balance}</strong><span>available</span></div></div><div className="shop-tabs" role="tablist" aria-label="Reward categories">{(["all", "frame", "theme", "decor", "resource"] as const).map((category) => <button className={shopCategory === category ? "active" : ""} type="button" onClick={() => setShopCategory(category)} key={category}>{category === "all" ? "All rewards" : category}</button>)}</div><div className="shop-grid">{visibleCatalog.map((item) => { const Icon = itemIcon(item); const isOwned = ownedIds.has(item.id); const locked = profile.current_level < item.minimum_level; const insufficient = profile.gold_brush_balance < item.price; const selected = item.category === "theme" && themeId === item.id; const placed = item.item_key === "easel" ? hasEasel : placedIds.has(item.id); return <article className={`shop-item ${isOwned ? "owned" : ""}`} key={item.id}><div className={`shop-preview preview-${item.item_key} ${item.visual_config?.className || ""}`}><Icon size={29} /></div><span className="shop-category">{item.category}</span><h3>{item.name}</h3><p>{item.description}</p><div className="shop-item-meta"><span><Coins size={14} /> {item.price}</span><span>Level {item.minimum_level}</span></div>{isOwned ? item.category === "theme" ? <button className="button ghost small" type="button" disabled={selected || busy !== null} onClick={() => equipTheme(item.id)}>{selected ? <><Check size={14} /> In use</> : "Use this room"}</button> : item.category === "decor" ? <button className="button ghost small" type="button" onClick={() => toggleDecor(item)}>{item.item_key === "easel" ? "View working studio" : placed ? "Remove from room" : "Place in room"}</button> : item.category === "resource" ? <Link className="button ghost small" href={`/resources#${item.item_key}`}>Open practice pack</Link> : <span className="owned-label"><Check size={14} /> Choose on any artwork</span> : <button className="button small" type="button" disabled={locked || insufficient || busy !== null} onClick={() => purchase(item)}>{locked ? <><Lock size={14} /> Reach level {item.minimum_level}</> : insufficient ? "Save more brushes" : busy === item.id ? "Adding…" : <><ShoppingBag size={14} /> Add to studio</>}</button>}</article>; })}</div></section> : <section className="settings-note"><strong>The Reward Shop is paused.</strong><p>Your assignments, room, items and balance remain safe.</p></section>}
  </>;
}
