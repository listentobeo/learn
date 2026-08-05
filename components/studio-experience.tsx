"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Award, Brush, Check, Coins, Frame, LampDesk, Leaf, Lock, PackageOpen, Palette, Paintbrush, ShoppingBag } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { ArtworkTransform, GameArtwork, StudioWallId } from "@/components/studio-game";
import type { GamificationProfile, StudioCatalogItem } from "@/lib/types";

const StudioGame = dynamic(() => import("@/components/studio-game").then((module) => module.StudioGame), {
  ssr: false,
  loading: () => <div className="studio-game-loading"><span className="skeleton-bone" /><strong>Opening your Personal Studio…</strong></div>,
});

export type StudioArtwork = Omit<GameArtwork, "transform"> & {
  submittedAt: string;
  transform: ArtworkTransform;
};

export type StudioLayout = {
  featuredArtworkId: string | null;
  decorSlots: Record<string, string>;
};

type OwnedItem = StudioCatalogItem & { inventoryId: string };

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

const decorSlots = ["work-left", "work-right", "work-shelf", "gallery-light", "achievement-left", "achievement-right"];
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
  const [shopCategory, setShopCategory] = useState<StudioCatalogItem["category"] | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const shopRef = useRef<HTMLElement | null>(null);
  const ownedIds = useMemo(() => new Set(owned.map((item) => item.id)), [owned]);
  const placedIds = useMemo(() => new Set(Object.values(layout.decorSlots)), [layout.decorSlots]);
  const visibleCatalog = catalog.filter((item) => shopCategory === "all" || item.category === shopCategory);
  const activeThemeKey = catalog.find((item) => item.id === themeId)?.item_key || null;

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
      if (item.category === "decor") {
        const slot = roomForDecor(item).find((candidate) => !layout.decorSlots[candidate]);
        if (slot) await persistLayout({ ...layout, decorSlots: { ...layout.decorSlots, [slot]: item.id } }, `${item.name} is now in your 3D room.`);
        else toast.success(`${item.name} is in your inventory.`);
      } else if (item.category === "theme") await equipTheme(item.id);
      else if (item.category === "resource") toast.success(`${item.name} is ready in Resources.`);
      else toast.success(`${item.name} is ready for your artwork.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Your connection changed. Please try again."); }
    finally { setBusy(null); }
  }

  async function equipTheme(itemId: string | null) {
    setBusy(`theme-${itemId || "default"}`);
    try {
      const response = await fetch("/api/studio/equip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "theme", itemId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to change your studio atmosphere.");
      setThemeId(itemId);
      toast.success("Studio atmosphere updated.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Theme update failed."); }
    finally { setBusy(null); }
  }

  async function toggleDecor(item: StudioCatalogItem) {
    const currentSlot = Object.entries(layout.decorSlots).find(([, itemId]) => itemId === item.id)?.[0];
    if (currentSlot) {
      const nextSlots = { ...layout.decorSlots };
      delete nextSlots[currentSlot];
      await persistLayout({ ...layout, decorSlots: nextSlots }, `${item.name} returned to inventory.`);
      return;
    }
    const slot = roomForDecor(item).find((candidate) => !layout.decorSlots[candidate]);
    if (!slot) return toast.error("That room area is full. Remove one object first.");
    await persistLayout({ ...layout, decorSlots: { ...layout.decorSlots, [slot]: item.id } }, `${item.name} placed in the room.`);
  }

  const studioArtworks = artworks.map((artwork, index) => {
    const wallId = artwork.transform.wallId || (`wall-${String.fromCharCode(97 + index % 3)}` as StudioWallId);
    return { ...artwork, transform: { ...artwork.transform, wallId } };
  });

  return <>
    <section className="studio-intro">
      <div><span className="eyebrow">A room built by practice</span><h1>Your Personal Studio.</h1><p>Walk through your gallery, inspect your work, arrange every frame, and turn the rewards from learning into a place that is unmistakably yours.</p></div>
      <div className="studio-intro-stats"><span><Coins /> {profile.gold_brush_balance} brushes</span><span><Award /> Level {profile.current_level}</span></div>
    </section>

    <StudioGame name={name} profile={profile} initialArtworks={studioArtworks} catalog={catalog} owned={owned} activeDecorItemIds={[...placedIds]} themeKey={activeThemeKey} certificates={certificates} featuredArtworkId={layout.featuredArtworkId} onOpenShop={() => shopRef.current?.scrollIntoView({ behavior: "smooth" })} />

    {enabled ? <section className="reward-shop studio-3d-shop" id="reward-shop" ref={shopRef}>
      <div className="shop-heading"><div><span className="eyebrow">Spend what practice earns</span><h2>Reward Shop.</h2><p>Every item now has a purpose: frames style real work, decor appears inside the room, themes change its atmosphere, and practice packs open in Resources.</p></div><div className="shop-balance"><Coins /><strong>{profile.gold_brush_balance}</strong><span>available</span></div></div>
      <div className="shop-tabs" role="tablist" aria-label="Reward categories">{(["all", "frame", "theme", "decor", "resource"] as const).map((category) => <button className={shopCategory === category ? "active" : ""} type="button" onClick={() => setShopCategory(category)} key={category}>{category === "all" ? "All rewards" : category}</button>)}</div>
      <div className="shop-grid">{visibleCatalog.map((item) => {
        const Icon = itemIcon(item);
        const isOwned = ownedIds.has(item.id);
        const locked = profile.current_level < item.minimum_level;
        const insufficient = profile.gold_brush_balance < item.price;
        const selected = item.category === "theme" && themeId === item.id;
        const placed = item.item_key === "easel" ? ownedIds.has(item.id) : placedIds.has(item.id);
        return <article className={`shop-item ${isOwned ? "owned" : ""}`} key={item.id}>
          <div className={`shop-preview preview-${item.item_key} ${item.visual_config?.className || ""}`}><Icon /></div><span className="shop-category">{item.category}</span><h3>{item.name}</h3><p>{item.description}</p>
          <div className="shop-item-meta"><span><Coins /> {item.price}</span><span>Level {item.minimum_level}</span></div>
          {isOwned ? item.category === "theme" ? <button className="button ghost small" type="button" disabled={selected || busy !== null} onClick={() => equipTheme(item.id)}>{selected ? <><Check /> In use</> : "Use atmosphere"}</button>
            : item.category === "decor" ? <button className="button ghost small" type="button" onClick={() => toggleDecor(item)}>{placed ? "Remove from room" : "Place in room"}</button>
            : item.category === "resource" ? <Link className="button ghost small" href={`/resources#${item.item_key}`}>Open practice pack</Link>
            : <span className="owned-label"><Check /> Available in Arrange mode</span>
          : <button className="button small" type="button" disabled={locked || insufficient || busy !== null} onClick={() => purchase(item)}>{locked ? <><Lock /> Reach level {item.minimum_level}</> : insufficient ? "Save more brushes" : busy === item.id ? "Adding…" : <><ShoppingBag /> Add to studio</>}</button>}
        </article>;
      })}</div>
    </section> : <section className="settings-note"><strong>The Reward Shop is paused.</strong><p>Your artwork, room, items and balance remain safe.</p></section>}
  </>;
}
