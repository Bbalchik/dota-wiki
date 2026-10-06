"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, ExternalLink, ArrowRight, Swords, User, Sparkles } from "lucide-react";
import type { OpenDotaSearchResult } from "@/lib/opendota";

const STEAM64_BASE = BigInt("76561197960265728");

export type SmartTargetOption =
  | { type: "player"; accountId: number; label: string; desc: string }
  | { type: "match"; matchId: string; label: string; desc: string };

/** Parses smart input: Dota Match ID, Steam ID, Account ID, or profile/match URLs */
export function parseSmartInputs(raw: string): SmartTargetOption[] {
  const s = raw.trim();
  if (!s) return [];

  // Match URL: e.g. dotabuff.com/matches/9017797563 or opendota.com/matches/9017797563
  const matchUrlMatch = s.match(/(?:matches|match)\/(\d{8,11})/i);
  if (matchUrlMatch) {
    return [
      {
        type: "match",
        matchId: matchUrlMatch[1],
        label: `Матч Dota 2 #${matchUrlMatch[1]}`,
        desc: "Поминутный разбор матча, все 10 игроков и инвентарь",
      },
    ];
  }

  // Player URL: e.g. dotabuff.com/players/1068082356 or opendota.com/players/1068082356
  const playerUrlMatch = s.match(/(?:players|player)\/(\d{1,10})/i);
  if (playerUrlMatch) {
    return [
      {
        type: "player",
        accountId: Number(playerUrlMatch[1]),
        label: `Игрок #${playerUrlMatch[1]}`,
        desc: "Полный профиль игрока и статистика",
      },
    ];
  }

  // Steam Community Profile URL: e.g. steamcommunity.com/profiles/76561198...
  const steamUrlMatch = s.match(/profiles\/(7656119\d{10})/i);
  if (steamUrlMatch) {
    const accId = Number(BigInt(steamUrlMatch[1]) - STEAM64_BASE);
    return [
      {
        type: "player",
        accountId: accId,
        label: `Steam Профиль (${accId})`,
        desc: "Открыть профиль игрока в Dota 2",
      },
    ];
  }

  // Pure numeric check
  if (/^\d+$/.test(s)) {
    const n = BigInt(s);
    // SteamID64 range (e.g. 76561198000000000)
    if (n > STEAM64_BASE && n < BigInt("76561202255233023")) {
      const accId = Number(n - STEAM64_BASE);
      return [
        {
          type: "player",
          accountId: accId,
          label: `SteamID64 → Игрок #${accId}`,
          desc: "Перейти к профилю игрока",
        },
      ];
    }

    const options: SmartTargetOption[] = [];

    // If 8 to 11 digits, could be a Dota 2 match
    if (s.length >= 8 && s.length <= 11) {
      options.push({
        type: "match",
        matchId: s,
        label: `Матч Dota 2 #${s}`,
        desc: "Поминутный разбор, все 10 игроков, тайминги и инвентарь",
      });
    }

    // It can also be an account ID if <= 4294967296
    if (n > 0 && n <= BigInt("4294967296")) {
      options.push({
        type: "player",
        accountId: Number(n),
        label: `Профиль игрока #${s}`,
        desc: "История матчей, винрейт, сигнатурные герои",
      });
    }

    // For short numbers (< 8 digits), prioritize player first
    if (s.length < 8 && n > 0 && n <= BigInt("4294967296")) {
      options.reverse();
    }

    return options;
  }

  return [];
}

function relativeTime(isoStr: string) {
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}д назад`;
  return new Date(isoStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function PlayerSearchBar({
  className = "",
  placeholder = "Поиск игрока, Steam ID, или ID любого матча...",
}: {
  className?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpenDotaSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [directTargets, setDirectTargets] = useState<SmartTargetOption[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setDirectTargets([]);
      setOpen(false);
      return;
    }

    // Check direct input targets (Match ID, Steam ID, URL)
    const directList = parseSmartInputs(trimmed);
    if (directList.length > 0) {
      setDirectTargets(directList);
      setResults([]);
      setOpen(true);
      return;
    }

    if (trimmed.length < 2) {
      setResults([]);
      setDirectTargets([]);
      setOpen(false);
      return;
    }

    setDirectTargets([]);
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      const data: OpenDotaSearchResult[] = await res.json();
      setResults(data);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(v), 300);
  };

  const executeTarget = (target: SmartTargetOption) => {
    if (target.type === "player") {
      router.push(`/player/${target.accountId}`);
    } else {
      router.push(`/match/${target.matchId}`);
    }
    clear();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (directTargets.length > 0) {
        executeTarget(directTargets[0]);
      } else {
        doSearch(query);
      }
    }
    if (e.key === "Escape") clear();
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setDirectTargets([]);
    setOpen(false);
  };

  return (
    <div
      className={`relative ${className}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      {/* Search Input Bar (Minimalist Zinc) */}
      <div className="flex items-center gap-2.5 rounded-full border border-zinc-800 bg-zinc-900/80 backdrop-blur-xl px-4 py-2 focus-within:border-zinc-600 focus-within:ring-2 focus-within:ring-zinc-700/30 shadow-md transition-all">
        <Search className="size-4 text-zinc-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => (results.length > 0 || directTargets.length > 0) && setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 outline-none min-w-0"
        />
        {loading && (
          <div className="size-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin shrink-0" />
        )}
        {!loading && query && (
          <button
            onClick={clear}
            className="shrink-0 p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Suggestions */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-2xl shadow-2xl overflow-hidden divide-y divide-zinc-800/60">
          {/* Direct Match or Direct Player */}
          {directTargets.map((target, tIdx) => (
            <button
              key={tIdx}
              type="button"
              onClick={() => executeTarget(target)}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-zinc-800/60 transition text-left group cursor-pointer"
            >
              <div className="size-9 rounded-xl flex items-center justify-center shrink-0 bg-zinc-800 border border-zinc-700/60 text-zinc-200 shadow-sm">
                {target.type === "match" ? (
                  <Swords className="size-4" />
                ) : (
                  <User className="size-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-zinc-100 group-hover:text-white transition">
                    {target.label}
                  </span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                    {target.type === "match" ? "Матч Dota 2" : "Игрок"}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  {target.desc}
                </div>
              </div>
              <ArrowRight className="size-4 text-zinc-500 group-hover:text-zinc-200 group-hover:translate-x-0.5 transition shrink-0" />
            </button>
          ))}

          {/* Nickname search results */}
          {results.map((r) => (
            <Link
              key={r.account_id}
              href={`/player/${r.account_id}`}
              onClick={clear}
              className="flex items-center gap-3.5 px-4 py-3 hover:bg-white/[0.06] transition group"
            >
              {r.avatarfull ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.avatarfull}
                  alt=""
                  className="size-9 rounded-xl object-cover border border-white/10 shrink-0"
                />
              ) : (
                <div className="size-9 rounded-xl bg-white/[0.06] border border-white/10 shrink-0 flex items-center justify-center text-zinc-400 text-sm font-bold">
                  {r.personaname[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-zinc-100 truncate group-hover:text-white transition">
                  {r.personaname}
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  ID: {r.account_id} {r.last_match_time ? `• ${relativeTime(r.last_match_time)}` : ""}
                </div>
              </div>
              <ExternalLink className="size-3.5 text-zinc-500 group-hover:text-zinc-200 transition shrink-0" />
            </Link>
          ))}

          {directTargets.length === 0 && query.length >= 2 && results.length === 0 && !loading && (
            <div className="px-4 py-6 text-center text-xs text-zinc-400 space-y-1">
              <div>Ничего не найдено по запросу «{query}»</div>
              <div className="text-[11px] text-zinc-500">
                Попробуйте ввести цифровой ID игрока или номер матча
              </div>
            </div>
          )}

          {results.length > 0 && directTargets.length === 0 && (
            <div className="px-4 py-2 bg-white/[0.02] text-[10px] text-zinc-500 text-center font-mono">
              Найдено {results.length} игроков • Выберите профиль для просмотра
            </div>
          )}
        </div>
      )}
    </div>
  );
}
