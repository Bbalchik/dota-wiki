"use client";

import { useState } from "react";
import {
  Trophy,
  Swords,
  Users,
  Shield,
  Flame,
  Sparkles,
  ArrowRight,
  Search,
  Calendar,
  MapPin,
  CircleDot,
  TrendingUp,
  FileText,
  Clock,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Tournament = {
  id: number;
  name: string;
  tier: string;
  prizePool: string;
  dates: string;
  location: string;
  logoUrl: string | null;
  status: string;
};

type Player = {
  id: number;
  nickname: string;
  realName: string | null;
  country: string | null;
  teamId: number | null;
};

type Team = {
  id: number;
  name: string;
  tag: string;
  logoUrl: string | null;
  region: string | null;
  players: Player[];
};

type Match = {
  id: number;
  radiantScore: number;
  direScore: number;
  status: string;
  startTime: Date;
  bo: number;
  stage: string | null;
  tournament: { name: string; tier: string } | null;
  radiantTeam: { id: number; name: string; tag: string; logoUrl: string | null };
  direTeam: { id: number; name: string; tag: string; logoUrl: string | null };
};

type Hero = {
  id: number;
  name: string;
  localizedName: string;
  primaryAttr: string;
  iconUrl: string | null;
};

type Transfer = {
  id: number;
  date: Date;
  role: string | null;
  player: { nickname: string; country: string | null };
  fromTeam: { name: string; tag: string; logoUrl: string | null } | null;
  toTeam: { name: string; tag: string; logoUrl: string | null } | null;
};

interface LiquipediaPortalProps {
  tournaments: Tournament[];
  teams: Team[];
  matches: Match[];
  heroes: Hero[];
  transfers: Transfer[];
}

export function LiquipediaPortal({
  tournaments,
  teams,
  matches,
  heroes,
  transfers,
}: LiquipediaPortalProps) {
  const [matchFilter, setMatchFilter] = useState<"all" | "live" | "upcoming" | "finished">("all");
  const [heroAttrFilter, setHeroAttrFilter] = useState<"all" | "str" | "agi" | "int" | "universal">("all");
  const [heroSearch, setHeroSearch] = useState("");

  const filteredMatches = matches.filter((m) => {
    if (matchFilter === "all") return true;
    if (matchFilter === "live") return m.status === "live";
    if (matchFilter === "upcoming") return m.status === "scheduled";
    if (matchFilter === "finished") return m.status === "finished";
    return true;
  });

  const filteredHeroes = heroes.filter((h) => {
    const matchesSearch = h.localizedName.toLowerCase().includes(heroSearch.toLowerCase());
    const matchesAttr = heroAttrFilter === "all" || (heroAttrFilter === "universal" ? h.primaryAttr === "all" : h.primaryAttr === heroAttrFilter);
    return matchesSearch && matchesAttr;
  });

  const attrMeta: Record<string, { label: string; badgeClass: string; borderClass: string }> = {
    str: { label: "Strength", badgeClass: "bg-red-500/20 text-red-400 border-red-500/30", borderClass: "hover:border-red-500/50" },
    agi: { label: "Agility", badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", borderClass: "hover:border-emerald-500/50" },
    int: { label: "Intelligence", badgeClass: "bg-sky-500/20 text-sky-400 border-sky-500/30", borderClass: "hover:border-sky-500/50" },
    all: { label: "Universal", badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30", borderClass: "hover:border-amber-500/50" },
  };

  return (
    <div className="min-h-screen bg-[#11141c] text-[#e1e7f0] font-sans antialiased">
      {/* Top Liquipedia Header Bar */}
      <header className="sticky top-0 z-50 border-b border-[#252b3b] bg-[#161a25]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 py-2.5">
          {/* Logo & Wiki Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded bg-[#2570eb] font-black text-white shadow-sm shadow-[#2570eb]/40 text-base">
                L
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-base tracking-tight leading-none">
                    Liquipedia
                  </span>
                  <span className="bg-[#e62935] text-white text-[10px] font-black px-1.5 py-0.5 rounded leading-none uppercase">
                    Dota 2
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 leading-none">The Esports Encyclopedia</span>
              </div>
            </div>
          </div>

          {/* Quick Wiki Navigation Links */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold text-zinc-300">
            <a href="#tournaments" className="hover:text-[#4f8ef7] transition flex items-center gap-1">
              <Trophy className="size-3.5 text-[#e6a117]" /> Tournaments
            </a>
            <a href="#matches" className="hover:text-[#4f8ef7] transition flex items-center gap-1">
              <Swords className="size-3.5 text-[#e62935]" /> Matches
              <span className="bg-[#e62935] text-white text-[9px] px-1 py-0.2 rounded font-mono">
                {matches.filter((m) => m.status === "live").length} LIVE
              </span>
            </a>
            <a href="#transfers" className="hover:text-[#4f8ef7] transition flex items-center gap-1">
              <TrendingUp className="size-3.5 text-emerald-400" /> Transfers
            </a>
            <a href="#teams" className="hover:text-[#4f8ef7] transition flex items-center gap-1">
              <Users className="size-3.5 text-zinc-400" /> Teams
            </a>
            <a href="#heroes" className="hover:text-[#4f8ef7] transition flex items-center gap-1">
              <Shield className="size-3.5 text-sky-400" /> Heroes
            </a>
          </nav>

          {/* Search Bar / System Status */}
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block w-44 md:w-56">
              <Search className="absolute left-2.5 top-2 size-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search Liquipedia..."
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                className="w-full rounded border border-[#2e374d] bg-[#1a202e] py-1 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:border-[#2570eb] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 rounded border border-[#2e374d] bg-[#1a202e] px-2.5 py-1 text-[11px] font-mono text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>v7.37d</span>
            </div>
          </div>
        </div>

        {/* Secondary Navigation Strip */}
        <div className="border-t border-[#222837] bg-[#141822] px-3 sm:px-6 py-1.5 text-[11px] font-medium text-zinc-400 overflow-x-auto whitespace-nowrap flex items-center gap-4">
          <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Trending:</span>
          <span className="text-zinc-200 hover:text-[#4f8ef7] cursor-pointer">The International 2026</span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-200 hover:text-[#4f8ef7] cursor-pointer">DreamLeague S24</span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-200 hover:text-[#4f8ef7] cursor-pointer">Team Spirit</span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-200 hover:text-[#4f8ef7] cursor-pointer">Team Liquid</span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-200 hover:text-[#4f8ef7] cursor-pointer">Post-TI Transfers</span>
        </div>
      </header>

      {/* Main Liquipedia 2-Column Grid */}
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Main Content (8 cols on desktop)            */}
        {/* ========================================================= */}
        <main className="lg:col-span-8 space-y-8">
          {/* Liquipedia Welcome Box */}
          <div className="rounded-lg border border-[#2b354a] bg-gradient-to-r from-[#172033] via-[#1a2337] to-[#1a1f2e] p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Welcome to the Liquipedia Dota 2 wiki!
                </h1>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  An encyclopedic resource for all things related to professional Dota 2, featuring tournaments, match tickers, transfer tracking, and roster records.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="border-[#2570eb]/50 bg-[#2570eb]/10 text-[#4f8ef7] text-xs">
                  {teams.length} Teams
                </Badge>
                <Badge variant="outline" className="border-[#e6a117]/50 bg-[#e6a117]/10 text-[#e6a117] text-xs">
                  {tournaments.length} Tournaments
                </Badge>
              </div>
            </div>

            {/* Quick Wiki Hub Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-[#283247]">
              <a
                href="#tournaments"
                className="flex items-center gap-2 rounded bg-[#1e273a] hover:bg-[#25324c] border border-[#2c3750] px-3 py-2 text-xs font-semibold text-zinc-200 transition"
              >
                <Trophy className="size-4 text-[#e6a117]" />
                <span>Tournaments</span>
              </a>
              <a
                href="#transfers"
                className="flex items-center gap-2 rounded bg-[#1e273a] hover:bg-[#25324c] border border-[#2c3750] px-3 py-2 text-xs font-semibold text-zinc-200 transition"
              >
                <TrendingUp className="size-4 text-emerald-400" />
                <span>Transfers</span>
              </a>
              <a
                href="#teams"
                className="flex items-center gap-2 rounded bg-[#1e273a] hover:bg-[#25324c] border border-[#2c3750] px-3 py-2 text-xs font-semibold text-zinc-200 transition"
              >
                <Users className="size-4 text-purple-400" />
                <span>Teams & Rosters</span>
              </a>
              <a
                href="#heroes"
                className="flex items-center gap-2 rounded bg-[#1e273a] hover:bg-[#25324c] border border-[#2c3750] px-3 py-2 text-xs font-semibold text-zinc-200 transition"
              >
                <Shield className="size-4 text-sky-400" />
                <span>Heroes ({heroes.length})</span>
              </a>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION: Tournaments (Tier 1 Showcase)                   */}
          {/* ========================================================= */}
          <section id="tournaments" className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#252c3c] pb-2">
              <div className="flex items-center gap-2">
                <Trophy className="size-5 text-[#e6a117]" />
                <h2 className="text-lg font-bold text-white tracking-tight">Ongoing & Upcoming Tournaments</h2>
              </div>
              <span className="text-xs text-zinc-400">Premier & Major Championships</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {tournaments.map((t) => {
                const isOngoing = t.status === "ongoing";
                const isUpcoming = t.status === "upcoming";

                return (
                  <div
                    key={t.id}
                    className="relative flex flex-col justify-between rounded-lg border border-[#252c3d] bg-[#161b27] p-4 hover:border-[#3b4763] transition shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-[#e6a117] text-zinc-950 font-black text-[10px] px-1.5 py-0.5 rounded uppercase">
                            {t.tier}
                          </span>
                          {isOngoing ? (
                            <span className="flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                              ONGOING
                            </span>
                          ) : isUpcoming ? (
                            <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              UPCOMING
                            </span>
                          ) : (
                            <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              COMPLETED
                            </span>
                          )}
                        </div>

                        <span className="font-mono text-xs font-extrabold text-emerald-400">
                          {t.prizePool}
                        </span>
                      </div>

                      <h3 className="mt-2.5 text-base font-bold text-white hover:text-[#4f8ef7] cursor-pointer transition">
                        {t.name}
                      </h3>

                      <div className="mt-2 space-y-1 text-xs text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-zinc-500" />
                          <span>{t.dates}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 text-zinc-500" />
                          <span>{t.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#222938] flex items-center justify-between text-xs font-semibold text-[#4f8ef7]">
                      <span>View Tournament Details</span>
                      <ArrowRight className="size-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION: Recent Transfers (Iconic Liquipedia Table)       */}
          {/* ========================================================= */}
          <section id="transfers" className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#252c3c] pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">Recent Transfers (Трансферы)</h2>
              </div>
              <span className="text-xs text-zinc-400">Post-Tournament Rosters</span>
            </div>

            <div className="overflow-hidden rounded-lg border border-[#252c3d] bg-[#161b27]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#252c3d] bg-[#1a2130] text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Player</th>
                    <th className="py-2 px-3">Role</th>
                    <th className="py-2 px-3">Old Team</th>
                    <th className="py-2 px-3"></th>
                    <th className="py-2 px-3">New Team</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222838]">
                  {transfers.map((tr) => (
                    <tr key={tr.id} className="hover:bg-[#1d2333] transition">
                      <td className="py-2.5 px-3 font-mono text-zinc-400 whitespace-nowrap">
                        {new Date(tr.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                        <span className="text-zinc-500 font-mono text-[10px]">[{tr.player.country ?? "UN"}]</span>
                        <span className="hover:text-[#4f8ef7] cursor-pointer">{tr.player.nickname}</span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400">{tr.role ?? "Player"}</td>
                      <td className="py-2.5 px-3 text-zinc-300">
                        {tr.fromTeam ? (
                          <span className="hover:text-white cursor-pointer font-medium">
                            {tr.fromTeam.name}
                          </span>
                        ) : (
                          <span className="text-zinc-500 italic">None / Free Agent</span>
                        )}
                      </td>
                      <td className="py-2.5 px-1 text-zinc-500">
                        <ArrowRight className="size-3.5 text-emerald-400" />
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">
                        {tr.toTeam ? (
                          <span className="hover:underline cursor-pointer">
                            {tr.toTeam.name}
                          </span>
                        ) : (
                          <span className="text-zinc-500 italic">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION: Heroes Grid (4 Attributes)                      */}
          {/* ========================================================= */}
          <section id="heroes" className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#252c3c] pb-2">
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-sky-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">Герои Dota 2 (Heroes)</h2>
              </div>

              {/* Attribute Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-semibold">
                <button
                  onClick={() => setHeroAttrFilter("all")}
                  className={`px-2.5 py-1 rounded transition ${heroAttrFilter === "all" ? "bg-[#2570eb] text-white" : "bg-[#1b2230] text-zinc-400 hover:text-white"}`}
                >
                  All ({heroes.length})
                </button>
                <button
                  onClick={() => setHeroAttrFilter("str")}
                  className={`px-2.5 py-1 rounded transition ${heroAttrFilter === "str" ? "bg-red-600 text-white" : "bg-[#1b2230] text-red-400 hover:bg-red-950/40"}`}
                >
                  Strength
                </button>
                <button
                  onClick={() => setHeroAttrFilter("agi")}
                  className={`px-2.5 py-1 rounded transition ${heroAttrFilter === "agi" ? "bg-emerald-600 text-white" : "bg-[#1b2230] text-emerald-400 hover:bg-emerald-950/40"}`}
                >
                  Agility
                </button>
                <button
                  onClick={() => setHeroAttrFilter("int")}
                  className={`px-2.5 py-1 rounded transition ${heroAttrFilter === "int" ? "bg-sky-600 text-white" : "bg-[#1b2230] text-sky-400 hover:bg-sky-950/40"}`}
                >
                  Intelligence
                </button>
                <button
                  onClick={() => setHeroAttrFilter("universal")}
                  className={`px-2.5 py-1 rounded transition ${heroAttrFilter === "universal" ? "bg-amber-600 text-white" : "bg-[#1b2230] text-amber-400 hover:bg-amber-950/40"}`}
                >
                  Universal
                </button>
              </div>
            </div>

            {/* Hero Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {filteredHeroes.map((h) => {
                const meta = attrMeta[h.primaryAttr] ?? {
                  label: h.primaryAttr,
                  badgeClass: "bg-zinc-800 text-zinc-300 border-zinc-700",
                  borderClass: "hover:border-zinc-500",
                };

                return (
                  <div
                    key={h.id}
                    className={`group relative flex flex-col items-center rounded-lg border border-[#252c3d] bg-[#161b27] p-2 ${meta.borderClass} transition cursor-pointer`}
                  >
                    {h.iconUrl && (
                      <div className="relative size-12 overflow-hidden rounded bg-zinc-900 border border-[#2a3346]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={h.iconUrl}
                          alt={h.localizedName}
                          className="size-full object-cover group-hover:scale-105 transition"
                        />
                      </div>
                    )}
                    <span className="mt-1.5 text-center text-xs font-semibold text-zinc-200 group-hover:text-white truncate w-full">
                      {h.localizedName}
                    </span>
                    <span className={`mt-0.5 text-[9px] font-mono px-1 py-0.2 rounded border ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION: Teams & Rosters (Liquipedia Style)               */}
          {/* ========================================================= */}
          <section id="teams" className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#252c3c] pb-2">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-purple-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">Active Pro Teams & Rosters</h2>
              </div>
              <span className="text-xs text-zinc-400">{teams.length} World-Class Rosters</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-[#252c3d] bg-[#161b27] p-4 hover:border-[#38435d] transition shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-[#222938] pb-3">
                    <div className="flex items-center gap-3">
                      {t.logoUrl && (
                        <div className="size-11 shrink-0 rounded bg-[#1d2333] p-1.5 border border-[#2c364c]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={t.logoUrl}
                            alt={t.name}
                            className="size-full object-contain"
                          />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-base text-white hover:text-[#4f8ef7] cursor-pointer flex items-center gap-2">
                          {t.name}
                          <span className="text-xs font-mono font-normal text-zinc-400">[{t.tag}]</span>
                        </h3>
                        <p className="text-xs text-zinc-400">{t.region}</p>
                      </div>
                    </div>
                  </div>

                  {/* Active Roster List */}
                  <div className="mt-3 divide-y divide-[#202737] rounded border border-[#222838] bg-[#131722]">
                    {t.players.map((p, idx) => (
                      <div key={p.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-600 font-mono text-[11px] w-3">#{idx + 1}</span>
                          <span className="font-bold text-zinc-200 hover:text-white cursor-pointer">
                            {p.nickname}
                          </span>
                          {p.realName && (
                            <span className="text-zinc-500 text-[11px] truncate max-w-[120px]">
                              ({p.realName})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 bg-[#1a202d] px-1.5 py-0.5 rounded border border-[#283247]">
                          {p.country ?? "UN"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Sidebar (Matches Ticker & Info) (4 cols)   */}
        {/* ========================================================= */}
        <aside id="matches" className="lg:col-span-4 space-y-6">
          {/* Matches Ticker Widget (The Liquipedia Signature Widget) */}
          <div className="rounded-lg border border-[#2b354a] bg-[#161b27] p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#252c3c] pb-3">
              <div className="flex items-center gap-2">
                <Swords className="size-4 text-[#e62935]" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">Matches Ticker</h3>
              </div>
              <span className="size-2 rounded-full bg-red-500 animate-pulse" />
            </div>

            {/* Match filter buttons */}
            <div className="grid grid-cols-4 gap-1 mt-3 p-1 rounded bg-[#131722] border border-[#222838] text-[10px] font-semibold text-center">
              <button
                onClick={() => setMatchFilter("all")}
                className={`py-1 rounded transition ${matchFilter === "all" ? "bg-[#2570eb] text-white" : "text-zinc-400 hover:text-white"}`}
              >
                All
              </button>
              <button
                onClick={() => setMatchFilter("live")}
                className={`py-1 rounded transition ${matchFilter === "live" ? "bg-red-600 text-white" : "text-red-400 hover:text-white"}`}
              >
                Live ({matches.filter((m) => m.status === "live").length})
              </button>
              <button
                onClick={() => setMatchFilter("upcoming")}
                className={`py-1 rounded transition ${matchFilter === "upcoming" ? "bg-sky-600 text-white" : "text-sky-400 hover:text-white"}`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setMatchFilter("finished")}
                className={`py-1 rounded transition ${matchFilter === "finished" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
              >
                Recent
              </button>
            </div>

            {/* Matches list */}
            <div className="mt-3 space-y-2">
              {filteredMatches.map((m) => {
                const isLive = m.status === "live";
                const isFinished = m.status === "finished";

                return (
                  <div
                    key={m.id}
                    className={`rounded border p-2.5 transition ${
                      isLive
                        ? "border-red-500/40 bg-red-950/20"
                        : "border-[#252c3c] bg-[#1a202d] hover:border-[#38435d]"
                    }`}
                  >
                    {/* Header: Tournament + Bo3 / Stage */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-[#252c3c]/60 pb-1.5 mb-2">
                      <span className="truncate max-w-[170px] font-semibold text-zinc-300">
                        {m.tournament?.name ?? "Dota Pro Match"}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isLive ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                            <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                            LIVE
                          </span>
                        ) : isFinished ? (
                          <span className="text-[10px] text-zinc-400 font-mono">FT</span>
                        ) : (
                          <span className="text-[10px] text-sky-400 font-mono">Bo{m.bo}</span>
                        )}
                      </div>
                    </div>

                    {/* Team 1 vs Team 2 */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {m.radiantTeam.logoUrl && (
                            <img
                              src={m.radiantTeam.logoUrl}
                              alt=""
                              className="size-4 object-contain rounded"
                            />
                          )}
                          <span className="text-xs font-semibold text-zinc-200">
                            {m.radiantTeam.name}
                          </span>
                        </div>
                        <span
                          className={`font-mono text-xs font-bold ${
                            m.radiantScore > m.direScore ? "text-emerald-400" : "text-zinc-400"
                          }`}
                        >
                          {m.radiantScore}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {m.direTeam.logoUrl && (
                            <img
                              src={m.direTeam.logoUrl}
                              alt=""
                              className="size-4 object-contain rounded"
                            />
                          )}
                          <span className="text-xs font-semibold text-zinc-200">
                            {m.direTeam.name}
                          </span>
                        </div>
                        <span
                          className={`font-mono text-xs font-bold ${
                            m.direScore > m.radiantScore ? "text-emerald-400" : "text-zinc-400"
                          }`}
                        >
                          {m.direScore}
                        </span>
                      </div>
                    </div>

                    {/* Match Time / Stage Footer */}
                    <div className="mt-2 pt-1.5 border-t border-[#252c3c]/50 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>{m.stage ?? `Bo${m.bo}`}</span>
                      <span>
                        {new Date(m.startTime).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DPC / EPT Pro Circuit Rankings Box */}
          <div className="rounded-lg border border-[#252c3d] bg-[#161b27] p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#252c3c] pb-2 mb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
                <Trophy className="size-3.5 text-[#e6a117]" /> EPT Leaderboard
              </h3>
              <span className="text-[10px] text-zinc-400">2026 Season</span>
            </div>

            <div className="space-y-1.5 text-xs">
              {[
                { rank: 1, team: "Team Falcons", points: "4,640", tag: "FLCN" },
                { rank: 2, team: "Team Liquid", points: "4,120", tag: "Liquid" },
                { rank: 3, team: "Gaimin Gladiators", points: "3,890", tag: "GG" },
                { rank: 4, team: "Team Spirit", points: "3,510", tag: "Spirit" },
                { rank: 5, team: "BetBoom Team", points: "3,100", tag: "BB" },
              ].map((item) => (
                <div
                  key={item.rank}
                  className="flex items-center justify-between rounded px-2.5 py-1.5 bg-[#1a202e] hover:bg-[#202737] transition"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[11px] font-bold w-3 text-center ${
                        item.rank === 1
                          ? "text-[#e6a117]"
                          : item.rank === 2
                          ? "text-zinc-300"
                          : item.rank === 3
                          ? "text-amber-700"
                          : "text-zinc-500"
                      }`}
                    >
                      {item.rank}
                    </span>
                    <span className="font-semibold text-zinc-200 hover:text-white cursor-pointer">
                      {item.team}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-emerald-400">
                    {item.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Wiki Portals & Help */}
          <div className="rounded-lg border border-[#252c3d] bg-[#161b27] p-4 text-xs space-y-2.5">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider border-b border-[#252c3c] pb-2">
              Wiki Resources
            </h4>
            <div className="space-y-1.5 text-zinc-300">
              <div className="flex items-center justify-between hover:text-[#4f8ef7] cursor-pointer">
                <span>Dota 2 Patch 7.37d Notes</span>
                <span className="text-[10px] text-zinc-500 font-mono">Latest</span>
              </div>
              <div className="flex items-center justify-between hover:text-[#4f8ef7] cursor-pointer">
                <span>Neutral Items Tier List</span>
                <span className="text-[10px] text-zinc-500 font-mono">Guide</span>
              </div>
              <div className="flex items-center justify-between hover:text-[#4f8ef7] cursor-pointer">
                <span>Aghanim's Shard & Scepter Upgrades</span>
                <span className="text-[10px] text-zinc-500 font-mono">Database</span>
              </div>
              <div className="flex items-center justify-between hover:text-[#4f8ef7] cursor-pointer">
                <span>Dota Pro Circuit Prize Records</span>
                <span className="text-[10px] text-zinc-500 font-mono">Stats</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Liquipedia Style Footer */}
      <footer className="mt-12 border-t border-[#222938] bg-[#0e1118] py-8 text-center text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl px-4 space-y-2">
          <p className="font-semibold text-zinc-400">
            Liquipedia Dota 2 Wiki Clone • Built with Next.js App Router, Tailwind CSS, Prisma ORM & SQLite
          </p>
          <p className="text-[11px]">
            Text is available under Creative Commons Attribution-ShareAlike 3.0 • Dota 2 is a registered trademark of Valve Corporation.
          </p>
        </div>
      </footer>
    </div>
  );
}
