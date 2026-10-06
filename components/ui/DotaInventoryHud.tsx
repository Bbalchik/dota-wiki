"use client";

import { useMemo } from "react";
import { type ResolvedItem, resolveItemKey } from "@/lib/item-utils";

interface DotaInventoryHudProps {
  items: (ResolvedItem | number | null | undefined)[];
  backpack?: (ResolvedItem | number | null | undefined)[];
  neutralItem?: ResolvedItem | number | null | undefined;
  hasScepter?: boolean;
  hasShard?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  layout?: "hud" | "row";
  showBackpack?: boolean;
  showNeutral?: boolean;
  showAghs?: boolean;
  className?: string;
}

const TP_SCROLL_URL = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/tpscroll.png";
const SCEPTER_URL = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/ultimate_scepter.png";
const SHARD_URL = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/aghanims_shard.png";

function toResolved(item: ResolvedItem | number | null | undefined): ResolvedItem | null {
  if (!item) return null;
  if (typeof item === "number") {
    if (item <= 0) return null;
    return resolveItemKey(item);
  }
  if ("name" in item && "icon" in item) return item;
  return null;
}

export function DotaInventoryHud({
  items,
  backpack = [],
  neutralItem,
  hasScepter = false,
  hasShard = false,
  size = "md",
  layout = "hud",
  showBackpack,
  showNeutral = true,
  showAghs = true,
  className = "",
}: DotaInventoryHudProps) {
  const resolvedItems = useMemo(() => {
    const list: (ResolvedItem | null)[] = [];
    for (let i = 0; i < 6; i++) {
      list.push(toResolved(items[i]));
    }
    return list;
  }, [items]);

  const resolvedBackpack = useMemo(() => {
    const list: (ResolvedItem | null)[] = [];
    for (let i = 0; i < 3; i++) {
      list.push(toResolved(backpack[i]));
    }
    return list;
  }, [backpack]);

  const resolvedNeutral = useMemo(() => toResolved(neutralItem), [neutralItem]);

  const hasBackpackItems = useMemo(
    () => resolvedBackpack.some((b) => b !== null),
    [resolvedBackpack]
  );

  const shouldShowBackpack =
    showBackpack !== undefined
      ? showBackpack
      : size === "lg" || size === "md"
      ? true
      : hasBackpackItems;

  // Dimensions based on authentic Dota 2 item ratio 88:64 (~1.375:1)
  const slotDimensions = {
    xs: { slot: "w-7 h-5", radius: "rounded-[4px]", neutral: "size-5", bp: "w-7 h-4 sm:w-full sm:h-3.5" },
    sm: { slot: "w-9 h-[26px]", radius: "rounded-[5px]", neutral: "size-6", bp: "w-9 h-[18px] sm:w-full sm:h-[18px]" },
    md: { slot: "w-11 h-8 sm:w-12 sm:h-[34px]", radius: "rounded-md", neutral: "size-8", bp: "w-11 h-6 sm:w-full sm:h-6" },
    lg: { slot: "w-14 h-10 sm:w-16 sm:h-[44px]", radius: "rounded-lg", neutral: "size-10", bp: "w-14 h-7 sm:w-full sm:h-8" },
  }[size];

  return (
    <div className={`inline-flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md shadow-sm select-none ${className}`}>
      
      {/* ── Main Inventory Block (2 rows of 3 in HUD mode, or 1 row of 6 in Row mode) ── */}
      <div className={`flex ${layout === "row" ? "flex-row items-center gap-1.5" : "flex-col gap-1"}`}>
        {/* 6 Main Inventory Slots */}
        <div className={layout === "row" ? "flex items-center gap-1" : "grid grid-cols-3 gap-1"}>
          {resolvedItems.map((item, idx) => {
            // In authentic Dota 2, single items NEVER display a "1" badge.
            // Badges are ONLY shown when charges/count is 2 or more!
            const showBadge = Boolean(item && typeof item.count === "number" && item.count > 1);
            const displayCount = item?.count ?? 1;

            return (
              <div
                key={idx}
                className={`relative ${slotDimensions.slot} ${slotDimensions.radius} overflow-hidden bg-zinc-900 border border-zinc-800/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] transition-all group/item`}
                title={item ? `Слот ${idx + 1}: ${item.name}${item.count && item.count > 1 ? ` (${item.count} шт.)` : ""}${item.cost ? ` (${item.cost} 🪙)` : ""}` : `Слот ${idx + 1} (пусто)`}
              >
                {item?.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.icon}
                    alt={item.name}
                    className="size-full object-cover transition-transform group-hover/item:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="size-full bg-zinc-850/30 flex items-center justify-center">
                    <span className="text-[7px] font-mono text-zinc-700/60 font-bold">{idx + 1}</span>
                  </div>
                )}

                {/* Authentic Dota 2 item charge / count badge (only when >= 2) */}
                {showBadge && (
                  <span
                    className="absolute bottom-0 right-0 px-1 py-0.2 rounded-tl bg-black/90 border-t border-l border-white/20 text-[9px] font-mono font-black text-amber-300 leading-tight shadow-md z-20 pointer-events-none select-none"
                    title={`${displayCount} шт.`}
                  >
                    {displayCount}
                  </span>
                )}

                <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.04] pointer-events-none rounded-[inherit]" />
              </div>
            );
          })}
        </div>

        {/* 3 Backpack Slots */}
        {shouldShowBackpack && (
          <div className={layout === "row" ? "flex items-center gap-1 pl-1 border-l border-zinc-800/80" : "grid grid-cols-3 gap-1 pt-1 border-t border-zinc-800/80"}>
            {resolvedBackpack.map((item, idx) => {
              const showBadge = Boolean(item && typeof item.count === "number" && item.count > 1);
              const displayCount = item?.count ?? 1;

              return (
                <div
                  key={idx}
                  className={`relative ${layout === "row" ? slotDimensions.slot : slotDimensions.bp} ${slotDimensions.radius} overflow-hidden bg-zinc-900/60 border border-zinc-800/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.7)] opacity-80 hover:opacity-100 transition-opacity group/bp`}
                  title={item ? `Рюкзак (слот ${idx + 1}): ${item.name}${item.count && item.count > 1 ? ` (${item.count} шт.)` : ""}${item.cost ? ` (${item.cost} 🪙)` : ""}` : `Рюкзак (слот ${idx + 1} пусто)`}
                >
                  {item?.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.icon}
                      alt={item.name}
                      className="size-full object-cover grayscale-[25%] group-hover/bp:grayscale-0 transition"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="size-full bg-zinc-900 flex items-center justify-center">
                      <span className="text-[7px] font-mono text-zinc-600 font-bold uppercase tracking-widest">BP</span>
                    </div>
                  )}

                  {/* Quantity / Charges badge */}
                  {showBadge && (
                    <span
                      className="absolute bottom-0 right-0 px-1 py-0.2 rounded-tl bg-black/90 border-t border-l border-white/20 text-[8px] font-mono font-black text-amber-300 leading-tight shadow-md z-20 pointer-events-none select-none"
                      title={`${displayCount} шт.`}
                    >
                      {displayCount}
                    </span>
                  )}

                  <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.03] pointer-events-none rounded-[inherit]" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Neutral Item & TP Scroll Column ── */}
      {(showNeutral || showAghs) && (
        <div className="flex flex-col items-center justify-between gap-1 self-stretch py-0.5 border-l border-zinc-800/80 pl-1.5 sm:pl-2">
          {/* Neutral Slot */}
          {showNeutral && (
            <div
              className={`relative ${slotDimensions.neutral} rounded-full overflow-hidden bg-zinc-900 border ${
                resolvedNeutral ? "border-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.25)]" : "border-zinc-800"
              } flex items-center justify-center group/neu`}
              title={resolvedNeutral ? `Нейтральный предмет: ${resolvedNeutral.name}` : "Нейтральный слот пуст"}
            >
              {resolvedNeutral?.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvedNeutral.icon}
                  alt={resolvedNeutral.name}
                  className="size-full object-cover rounded-full"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <span className="text-[9px] font-mono text-zinc-600 font-bold">0</span>
              )}
            </div>
          )}

          {/* TP Scroll slot */}
          <div
            className="size-5 rounded-md overflow-hidden bg-zinc-900 border border-zinc-700/60 flex items-center justify-center shrink-0"
            title="Свиток телепортации (TP Scroll)"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={TP_SCROLL_URL} alt="TP" className="size-full object-cover opacity-85" />
          </div>
        </div>
      )}

      {/* ── Aghanim's Scepter & Shard Indicators ── */}
      {showAghs && (
        <div className="flex flex-col gap-1 border-l border-white/[0.08] pl-1.5 self-center">
          {/* Scepter */}
          <div
            className={`size-4 sm:size-5 rounded-md overflow-hidden border p-0.5 transition ${
              hasScepter
                ? "bg-blue-950/60 border-blue-400 ring-1 ring-blue-400/40 shadow-[0_0_8px_rgba(96,165,250,0.5)]"
                : "bg-black/40 border-white/10 opacity-30 grayscale"
            }`}
            title={hasScepter ? "Aghanim's Scepter: Приобретён (+Улучшение ульты)" : "Aghanim's Scepter: Отсутствует"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SCEPTER_URL} alt="Scepter" className="size-full object-cover" />
          </div>

          {/* Shard */}
          <div
            className={`size-4 sm:size-5 rounded-md overflow-hidden border p-0.5 transition ${
              hasShard
                ? "bg-cyan-950/60 border-cyan-400 ring-1 ring-cyan-400/40 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                : "bg-black/40 border-white/10 opacity-30 grayscale"
            }`}
            title={hasShard ? "Aghanim's Shard: Приобретён (+Улучшение навыка)" : "Aghanim's Shard: Отсутствует"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SHARD_URL} alt="Shard" className="size-full object-cover" />
          </div>
        </div>
      )}
    </div>
  );
}
