"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Award, Check, Coins, Lock, ShoppingBag } from "lucide-react";
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

const previewColours: Record<string,string> = { "classic-gold":"#c9a84c", "deep-walnut":"#58301c", "gallery-black":"#11141a", "ivory-mat":"#e6dfd1", "artist-brush":"#a66231", "graduate-gold":"#e4be55" };

function StudioItemPreview({ item }: { item: StudioCatalogItem }) {
  const colour = previewColours[item.item_key] || "#c9a84c";
  return <div className={`shop-object-preview object-preview-${item.item_key}`} aria-label={`Preview of ${item.name}`}>
    <svg viewBox="0 0 240 150" role="img" aria-hidden="true">
      <defs><linearGradient id={`wall-${item.id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={item.item_key === "warm-atelier" ? "#795b43" : item.item_key === "midnight-gallery" ? "#071b36" : "#22262c"} /><stop offset="1" stopColor="#090d13" /></linearGradient><linearGradient id={`art-${item.id}`}><stop stopColor="#d99d62"/><stop offset=".5" stopColor="#587993"/><stop offset="1" stopColor="#273b2c"/></linearGradient></defs>
      <rect width="240" height="150" fill="#0a0e16" />
      {item.category === "frame" && <><rect x="55" y="14" width="130" height="116" rx="2" fill={colour} /><rect x="67" y="26" width="106" height="92" fill="#eee7d8" /><rect x="75" y="34" width="90" height="76" fill={`url(#art-${item.id})`} /><path d="M75 98 100 71l18 17 18-28 29 38" fill="none" stroke="#f3dfb5" strokeWidth="5" /></>}
      {item.category === "theme" && <><rect x="18" y="14" width="204" height="103" fill={`url(#wall-${item.id})`} /><path d="M18 117h204l-26 33H42z" fill="#5a3420" /><rect x="83" y="28" width="74" height="63" fill="#8b672d" /><rect x="90" y="35" width="60" height="49" fill={`url(#art-${item.id})`} /><circle cx="43" cy="88" r="14" fill="#31513a" /></>}
      {item.item_key === "easel" && <><path d="m82 140 28-115m48 115L130 25m-51 86h83" stroke="#8b542e" strokeWidth="9" strokeLinecap="round"/><rect x="79" y="34" width="82" height="69" fill="#d8cfbe" stroke="#6b3d21" strokeWidth="6"/><rect x="88" y="43" width="64" height="51" fill={`url(#art-${item.id})`}/></>}
      {item.item_key === "brush-jar" && <><path d="M78 72h84l-10 67H88z" fill="#7b4425"/><path d="m94 82-8-67m28 65 5-70m17 72 21-62" stroke="#d2a56c" strokeWidth="6"/><path d="m82 15 8-9 4 12m21-8 7-7 2 11m30 5 10-4-5 10" fill="#c9a84c"/></>}
      {item.item_key === "studio-plant" && <><path d="M91 94h58l-8 47H99z" fill="#9b6535"/><path d="M120 96V34m0 45-34-29m34 11 34-32" stroke="#477250" strokeWidth="7"/><ellipse cx="80" cy="45" rx="26" ry="13" transform="rotate(30 80 45)" fill="#315d3e"/><ellipse cx="158" cy="27" rx="27" ry="13" transform="rotate(-32 158 27)" fill="#3d7048"/><ellipse cx="120" cy="28" rx="15" ry="27" fill="#487d52"/></>}
      {item.item_key === "paint-shelf" && <><rect x="31" y="35" width="178" height="11" fill="#684027"/><rect x="31" y="102" width="178" height="11" fill="#684027"/>{["#a94137","#d5a13b","#2f6893","#47734e","#eee1ca"].map((paint,index)=><g key={paint} transform={`translate(${48+index*34} 0)`}><rect y="59" width="24" height="38" rx="3" fill={paint}/><rect y="54" width="24" height="8" fill="#c0b29e"/></g>)}</>}
      {item.item_key === "gallery-lamp" && <><path d="M120 18v41" stroke="#c9a84c" strokeWidth="8"/><path d="m80 76 40-25 40 25z" fill="#b98b36"/><path d="m92 77-30 63m86-63 30 63" stroke="#ffe4a8" strokeWidth="5" opacity=".55"/></>}
      {item.item_key === "graduate-plaque" && <><rect x="38" y="38" width="164" height="75" rx="4" fill="#4b2c1b" stroke="#d2aa4f" strokeWidth="5"/><circle cx="76" cy="75" r="19" fill="#d2aa4f"/><path d="m68 75 6 7 13-17" fill="none" stroke="#38210f" strokeWidth="5"/><text x="104" y="70" fill="#f2dfae" fontSize="13" fontWeight="700">BEO GRADUATE</text><text x="104" y="89" fill="#c9a84c" fontSize="9">STUDIO PLAQUE</text></>}
      {item.category === "resource" && <><rect x="53" y="27" width="98" height="104" rx="4" fill="#e8dfcf" transform="rotate(-7 53 27)"/><rect x="86" y="19" width="101" height="112" rx="4" fill="#172235" stroke="#c9a84c" strokeWidth="3"/><text x="136" y="65" textAnchor="middle" fill="#c9a84c" fontSize="12" fontWeight="700">BEO PRACTICE</text><path d="M106 79h61m-61 13h48m-48 13h56" stroke="#aeb8c7" strokeWidth="4"/></>}
    </svg>
    <small>Actual studio preview</small>
  </div>;
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
        const isOwned = ownedIds.has(item.id);
        const locked = profile.current_level < item.minimum_level;
        const insufficient = profile.gold_brush_balance < item.price;
        const selected = item.category === "theme" && themeId === item.id;
        const placed = item.item_key === "easel" ? ownedIds.has(item.id) : placedIds.has(item.id);
        return <article className={`shop-item ${isOwned ? "owned" : ""}`} key={item.id}>
          <StudioItemPreview item={item} /><span className="shop-category">{item.category}</span><h3>{item.name}</h3><p>{item.description}</p>
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
