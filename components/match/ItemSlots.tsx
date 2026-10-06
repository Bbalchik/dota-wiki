import { getItemIconUrl, getItemName } from "@/lib/opendota";

export function ItemSlots({
  items,
  backpack = [],
  neutral = 0,
  size = 28,
}: {
  items: number[];
  backpack?: number[];
  neutral?: number;
  size?: number;
}) {
  const px = `${size}px`;
  return (
    <div className="flex items-center gap-0.5">
      {items.map((itemId, idx) => (
        <Slot key={idx} itemId={itemId} px={px} />
      ))}
      {backpack.some((id) => id > 0) && (
        <div className="flex items-center gap-0.5 ml-1 opacity-80">
          {backpack.map((itemId, idx) => (
            <Slot key={`bp-${idx}`} itemId={itemId} px={`${Math.max(18, size - 6)}px`} />
          ))}
        </div>
      )}
      {neutral > 0 && (
        <div
          className="rounded-full border border-amber-500/40 bg-zinc-900 overflow-hidden ml-1 shrink-0"
          style={{ width: px, height: px }}
          title={`Нейтралка: ${getItemName(neutral)}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getItemIconUrl(neutral) || ""}
            alt=""
            className="size-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
    </div>
  );
}

function Slot({ itemId, px }: { itemId: number; px: string }) {
  return (
    <div
      className="rounded-[3px] border border-zinc-700/80 bg-[#0b0e14] overflow-hidden shrink-0"
      style={{ width: px, height: px }}
      title={itemId > 0 ? getItemName(itemId) : "Пусто"}
    >
      {itemId > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getItemIconUrl(itemId) || ""}
          alt=""
          className="size-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}
    </div>
  );
}

export function PosBadge({ pos }: { pos: number | undefined }) {
  if (!pos || pos < 1 || pos > 5) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded bg-zinc-800 text-[10px] font-black text-zinc-500">
        —
      </span>
    );
  }
  const roman = ["I", "II", "III", "IV", "V"][pos - 1];
  return (
    <span className="inline-flex size-6 items-center justify-center rounded bg-[#151b28] border border-teal-500/30 text-[10px] font-black text-teal-300">
      {roman}
    </span>
  );
}
