"use client";

import { Award, Brush, Check, Coins, Frame, ImageIcon, LampDesk, Lock, PackageOpen, Palette, ShoppingBag, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
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

type OwnedItem = StudioCatalogItem & { inventoryId: string };

function itemIcon(item: StudioCatalogItem) {
  if (item.category === "frame") return Frame;
  if (item.category === "theme") return Palette;
  if (item.category === "resource") return PackageOpen;
  const icon = item.visual_config?.icon;
  if (icon === "lamp") return LampDesk;
  if (icon === "award") return Award;
  if (icon === "brush" || icon === "paint") return Brush;
  return Sparkles;
}

export function StudioExperience({
  name,
  initialProfile,
  artworks,
  catalog,
  initialOwned,
  initialThemeId,
  certificates,
  enabled,
}: {
  name: string;
  initialProfile: GamificationProfile;
  artworks: StudioArtwork[];
  catalog: StudioCatalogItem[];
  initialOwned: OwnedItem[];
  initialThemeId: string | null;
  certificates: Array<{ track: string; code: string }>;
  enabled: boolean;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [owned, setOwned] = useState(initialOwned);
  const [themeId, setThemeId] = useState(initialThemeId);
  const [artworkFrames, setArtworkFrames] = useState<Record<string, string | null>>(() => Object.fromEntries(artworks.map((artwork) => [artwork.id, artwork.frameItemId])));
  const [shopCategory, setShopCategory] = useState<StudioCatalogItem["category"] | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const ownedIds = useMemo(() => new Set(owned.map((item) => item.id)), [owned]);
  const ownedFrames = owned.filter((item) => item.category === "frame");
  const ownedDecor = owned.filter((item) => item.category === "decor");
  const selectedTheme = catalog.find((item) => item.id === themeId);
  const themeClass = selectedTheme?.visual_config?.className || "studio-theme-default";
  const visibleCatalog = catalog.filter((item) => shopCategory === "all" || item.category === shopCategory);

  async function purchase(item: StudioCatalogItem) {
    setBusy(item.id);
    try {
      const response = await fetch("/api/studio/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const result = await response.json();
      if (!response.ok) return toast.error(result.error || "Unable to purchase this studio item.");
      setOwned((current) => [...current, { ...item, inventoryId: result.inventory?.id || item.id }]);
      if (result.profile) setProfile(result.profile);
      toast.success(`${item.name} is now in your studio inventory.`);
    } catch {
      toast.error("Your connection changed. Please try the purchase again.");
    } finally {
      setBusy(null);
    }
  }

  async function equipFrame(assignmentId: string, itemId: string | null) {
    setBusy(`frame-${assignmentId}`);
    try {
      const response = await fetch("/api/studio/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "frame", assignmentId, itemId }),
      });
      const result = await response.json();
      if (!response.ok) return toast.error(result.error || "Unable to change this frame.");
      setArtworkFrames((current) => ({ ...current, [assignmentId]: itemId }));
      toast.success("Artwork frame updated.");
    } finally {
      setBusy(null);
    }
  }

  async function equipTheme(itemId: string | null) {
    setBusy(`theme-${itemId || "default"}`);
    try {
      const response = await fetch("/api/studio/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "theme", itemId }),
      });
      const result = await response.json();
      if (!response.ok) return toast.error(result.error || "Unable to change your studio wall.");
      setThemeId(itemId);
      toast.success("Studio wall updated.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <section className="studio-hud">
        <div><span className="eyebrow">{name}&apos;s private space</span><h1>Personal Studio.</h1><p>Your assignments, achievements and collected studio pieces live here.</p></div>
        <div className="studio-currency"><span><Sparkles size={17} /> Level {profile.current_level}</span><strong><Coins size={18} /> {profile.gold_brush_balance} Gold Brushes</strong><small>{profile.lifetime_xp.toLocaleString()} lifetime XP</small></div>
      </section>

      <section className={`personal-studio ${themeClass}`}>
        <div className="studio-room-light" />
        <div className="studio-wall-heading"><div><span>Assignment wall</span><strong>{artworks.length} framed {artworks.length === 1 ? "work" : "works"}</strong></div><button className="studio-reset-theme" type="button" onClick={() => equipTheme(null)} disabled={!themeId || busy !== null}>Use original wall</button></div>
        {artworks.length ? (
          <div className="artwork-wall">
            {artworks.map((artwork) => {
              const frameItem = catalog.find((item) => item.id === artworkFrames[artwork.id]);
              const frameClass = frameItem?.visual_config?.className || "frame-basic";
              return (
                <article className="wall-artwork" key={artwork.id}>
                  <div className={`art-frame ${frameClass}`}>
                    <div className="art-mat">
                      {artwork.imageUrl ? <Image src={artwork.imageUrl} alt={`${artwork.lessonCode} assignment by ${name}`} width={640} height={480} unoptimized /> : <div className="artwork-missing"><ImageIcon size={30} /><span>Private image unavailable</span></div>}
                    </div>
                  </div>
                  <div className="art-plaque"><span>{artwork.lessonCode} · {artwork.track}</span><strong>{artwork.title}</strong><small className={artwork.reviewed ? "mastered" : "awaiting"}>{artwork.reviewed ? "Review complete" : "Awaiting review"}</small></div>
                  <label className="frame-picker"><span>Frame</span><select value={artworkFrames[artwork.id] || ""} onChange={(event) => equipFrame(artwork.id, event.target.value || null)} disabled={busy !== null}><option value="">Beo Basic</option>{ownedFrames.map((frame) => <option value={frame.id} key={frame.id}>{frame.name}</option>)}</select></label>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="studio-empty"><Frame size={38} /><h2>Your first frame is waiting.</h2><p>Submit a practical assignment and it will appear here automatically in a Beo Basic frame.</p><Link className="button" href="/dashboard">Go to my current lesson</Link></div>
        )}

        <div className="studio-floor">
          <div className="studio-shelf"><span className="shelf-label">Collected studio pieces</span><div>{ownedDecor.length ? ownedDecor.map((item) => { const Icon = itemIcon(item); return <span className="decor-piece" title={item.name} key={item.id}><Icon size={23} /><small>{item.name}</small></span>; }) : <span className="empty-shelf">Use Gold Brushes to add studio pieces.</span>}</div></div>
          <div className="certificate-corner"><Award size={30} /><span>Certificate Wall</span>{certificates.length ? certificates.map((certificate) => <strong key={certificate.code}>{certificate.track}<small>{certificate.code}</small></strong>) : <small>Complete a full track to place your certificate here.</small>}</div>
        </div>
      </section>

      {enabled ? <section className="reward-shop" id="reward-shop">
        <div className="shop-heading"><div><span className="eyebrow">Spend what practice earns</span><h2>Reward Shop.</h2><p>Everything here is optional. Your lessons, feedback and certificates never cost Gold Brushes.</p></div><div className="shop-balance"><Coins size={18} /><strong>{profile.gold_brush_balance}</strong><span>available</span></div></div>
        <div className="shop-tabs" role="tablist" aria-label="Reward categories">{(["all", "frame", "theme", "decor", "resource"] as const).map((category) => <button className={shopCategory === category ? "active" : ""} type="button" onClick={() => setShopCategory(category)} key={category}>{category === "all" ? "All rewards" : category}</button>)}</div>
        <div className="shop-grid">
          {visibleCatalog.map((item) => {
            const Icon = itemIcon(item);
            const isOwned = ownedIds.has(item.id);
            const locked = profile.current_level < item.minimum_level;
            const insufficient = profile.gold_brush_balance < item.price;
            const selected = item.category === "theme" && themeId === item.id;
            return (
              <article className={`shop-item ${isOwned ? "owned" : ""}`} key={item.id}>
                <div className={`shop-preview ${item.visual_config?.className || ""}`}><Icon size={29} /></div>
                <span className="shop-category">{item.category}</span><h3>{item.name}</h3><p>{item.description}</p>
                <div className="shop-item-meta"><span><Coins size={14} /> {item.price}</span><span>Level {item.minimum_level}</span></div>
                {isOwned ? item.category === "theme" ? <button className="button ghost small" type="button" disabled={selected || busy !== null} onClick={() => equipTheme(item.id)}>{selected ? <><Check size={14} /> Equipped</> : "Use this wall"}</button> : <span className="owned-label"><Check size={14} /> In your inventory</span> : <button className="button small" type="button" disabled={locked || insufficient || busy !== null} onClick={() => purchase(item)}>{locked ? <><Lock size={14} /> Reach level {item.minimum_level}</> : insufficient ? "Save more brushes" : busy === item.id ? "Adding…" : <><ShoppingBag size={14} /> Add to studio</>}</button>}
              </article>
            );
          })}
        </div>
      </section> : <section className="settings-note"><strong>The Reward Shop is paused.</strong><p>Your assignments, frames, items and balance remain safe. Benjamin can reopen new rewards from the admin control room.</p></section>}
    </>
  );
}
