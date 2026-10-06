"use client";

import Link from "next/link";
import { useState } from "react";
import { Swords, Trophy, Users, Sparkles, Menu, X, Shield, Search, Database, Zap } from "lucide-react";
import { PlayerSearchBar } from "@/components/search/PlayerSearchBar";

interface SiteHeaderProps {
  currentPath?: string;
  userAvatar?: string | null;
  userName?: string | null;
  accountId?: number | null;
}

export function SiteHeader({
  currentPath = "/",
  userAvatar: initialUserAvatar,
  userName: initialUserName,
  accountId: initialAccountId,
}: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [quickLoginOpen, setQuickLoginOpen] = useState(false);
  const [inputAccountId, setInputAccountId] = useState("");

  const [currentUser, setCurrentUser] = useState<{
    accountId: number | null;
    userName: string | null;
    userAvatar: string | null;
  }>({
    accountId: initialAccountId ?? null,
    userName: initialUserName ?? null,
    userAvatar: initialUserAvatar ?? null,
  });

  // Automatically check active account on client mount if not passed as prop
  useState(() => {
    // sync initial props if changed
    if (initialAccountId && initialAccountId !== currentUser.accountId) {
      setCurrentUser({
        accountId: initialAccountId,
        userName: initialUserName ?? null,
        userAvatar: initialUserAvatar ?? null,
      });
    }
  });

  // Client-side detection if account was not passed
  useState(() => {
    if (typeof window !== "undefined" && !currentUser.accountId) {
      // 1. Check localStorage first for instant render
      try {
        const stored = localStorage.getItem("dota_active_account");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.accountId) {
            setCurrentUser({
              accountId: parsed.accountId,
              userName: parsed.personaName || parsed.name || `Игрок #${parsed.accountId}`,
              userAvatar: parsed.avatarUrl || parsed.avatar || null,
            });
          }
        }
      } catch {}

      // 2. Fetch /api/auth/me to verify server cookie
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data?.activeAccount && data?.accountId) {
            setCurrentUser({
              accountId: data.accountId,
              userName: data.personaName || `Игрок #${data.accountId}`,
              userAvatar: data.avatarUrl || null,
            });
            try {
              localStorage.setItem(
                "dota_active_account",
                JSON.stringify({
                  accountId: data.accountId,
                  personaName: data.personaName,
                  avatarUrl: data.avatarUrl,
                })
              );
            } catch {}
          }
        })
        .catch(() => {});
    }
  });

  const handleQuickSwitch = async (accId: number | string) => {
    const num = Number(accId);
    if (isNaN(num) || num <= 0) return;
    try {
      const res = await fetch("/api/auth/set-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: num }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(
          "dota_active_account",
          JSON.stringify({
            accountId: data.accountId,
            personaName: data.personaName,
            avatarUrl: data.avatarUrl,
          })
        );
        window.location.href = `/player/${data.accountId}`;
      }
    } catch {
      window.location.href = `/player/${num}`;
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("dota_active_account");
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-2xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        
        {/* ── Brand Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="size-8 rounded-xl bg-zinc-800/90 border border-zinc-700/60 flex items-center justify-center font-bold text-zinc-100 text-sm shadow-sm group-hover:scale-105 group-hover:bg-zinc-700 transition-all">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-zinc-100 text-base sm:text-lg leading-none">
                Aegis<span className="text-zinc-400">GG</span>
              </span>
              <span className="hidden sm:inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 font-mono border border-zinc-800">
                DOTA 2
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-none mt-1 hidden md:block">
              Аналитика матчей, игроков и мета героев
            </p>
          </div>
        </Link>

        {/* ── Desktop Navigation Links ── */}
        <nav className="hidden lg:flex items-center gap-1 bg-zinc-900/80 border border-zinc-800/80 rounded-full p-1 shadow-inner">
          <Link
            href="/"
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              currentPath === "/"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            Главная
          </Link>
          <Link
            href="/heroes"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              currentPath === "/heroes"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <Swords className="size-3.5 text-zinc-400" />
            <span>Мета & Билды</span>
          </Link>
          <Link
            href="/matches"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              currentPath === "/matches"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-400" />
            </span>
            <span>Лайв матчи</span>
          </Link>
        </nav>

        {/* ── Search Bar (Desktop / Tablet) ── */}
        <div className="flex-1 max-w-sm mx-2 hidden md:block">
          <PlayerSearchBar />
        </div>

        {/* ── User Auth or Steam Login ── */}
        <div className="flex items-center gap-2 relative">
          {currentUser.accountId ? (
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 px-3 py-1.5 transition group cursor-pointer"
              >
                {currentUser.userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentUser.userAvatar} alt="" className="size-6 rounded-full object-cover border border-zinc-700/50" />
                ) : (
                  <div className="size-6 rounded-full bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center">
                    {(currentUser.userName || "Я")[0]}
                  </div>
                )}
                <span className="text-xs font-semibold text-zinc-200 max-w-[110px] truncate">
                  {currentUser.userName || `Игрок #${currentUser.accountId}`}
                </span>
                <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              </button>

              {/* Profile dropdown */}
              {profileDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-2xl p-2 shadow-2xl z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setProfileDropdownOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-zinc-800 mb-1">
                    <div className="font-semibold text-zinc-100 truncate">{currentUser.userName}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">ID: {currentUser.accountId}</div>
                  </div>

                  <Link
                    href={`/player/${currentUser.accountId}`}
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition"
                  >
                    <span>👤</span>
                    <span>Мой профиль</span>
                  </Link>

                  <Link
                    href="/"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition"
                  >
                    <span>📊</span>
                    <span>Главный дашборд</span>
                  </Link>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setQuickLoginOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition text-left cursor-pointer"
                  >
                    <span>🔄</span>
                    <span>Сменить аккаунт</span>
                  </button>

                  <div className="border-t border-zinc-800 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition text-left cursor-pointer"
                    >
                      <span>🚪</span>
                      <span>Выйти из аккаунта</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setQuickLoginOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800/80 px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition cursor-pointer"
              >
                <span>Мой ID</span>
              </button>
              <Link
                href="/api/auth/steam"
                className="flex items-center gap-2 rounded-full bg-zinc-100 hover:bg-white text-zinc-900 px-4 py-1.5 text-xs font-semibold transition shadow-sm active:scale-95 shrink-0"
              >
                <svg viewBox="0 0 24 24" className="size-3.5 fill-current">
                  <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.87c0-2.748 2.352-4.985 5.095-4.985 2.744 0 4.986 2.238 4.986 4.985s-2.242 4.985-4.986 4.985h-.117l-4.078 2.911c0 .052.004.105.004.159 0 2.06-1.671 3.727-3.727 3.727-1.812 0-3.326-1.285-3.676-2.99L.164 12.986C1.385 19.214 6.647 24 12.021 24 18.628 24 24 18.617 24 12 24 5.383 18.628 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.497 1.009 2.455-.397.957-1.494 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.826-1.483-3.313-3.31-3.313-1.828 0-3.311 1.487-3.311 3.313 0 1.826 1.483 3.312 3.311 3.312 1.827 0 3.31-1.486 3.31-3.312zm-5.789.001c0-1.366 1.112-2.475 2.479-2.475 1.366 0 2.479 1.109 2.479 2.475 0 1.367-1.113 2.476-2.479 2.476-1.367 0-2.479-1.109-2.479-2.476z" />
                </svg>
                <span>Steam</span>
              </Link>
            </div>
          )}

          {/* Quick Account Switcher Modal */}
          {quickLoginOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <span>⚡</span> Выбор профиля
                  </h3>
                  <button
                    onClick={() => setQuickLoginOpen(false)}
                    className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Введите ваш Dota 2 Account ID (например <span className="font-mono text-zinc-200">1068082356</span>). Профиль закрепится как ваш основной и никогда не сбросится.
                </p>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Account ID (напр. 1068082356)"
                    value={inputAccountId}
                    onChange={(e) => setInputAccountId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 font-mono focus:border-zinc-600 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleQuickSwitch(inputAccountId || "1068082356")}
                      className="flex-1 rounded-xl bg-zinc-100 hover:bg-white py-2.5 text-xs font-semibold text-zinc-900 transition shadow-sm"
                    >
                      Закрепить мой аккаунт
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800">
                  <div className="text-[11px] text-zinc-500 mb-2">Быстрый вход:</div>
                  <button
                    onClick={() => handleQuickSwitch(1068082356)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-800 text-xs transition"
                  >
                    <span className="font-medium text-zinc-200">Мой аккаунт (#1068082356)</span>
                    <span className="text-[10px] text-zinc-400 font-mono">Выбрать →</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 lg:hidden text-zinc-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Navigation Drawer ── */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-2xl px-4 py-4 space-y-4">
          <div className="w-full">
            <PlayerSearchBar />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-200"
            >
              <span>Главная</span>
            </Link>
            <Link
              href="/heroes"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-xs font-semibold text-amber-300"
            >
              <Swords className="size-4" />
              <span>Мета & Билды</span>
            </Link>
            <Link
              href="/matches"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300 col-span-2 sm:col-span-1"
            >
              <span className="size-2 rounded-full bg-green-400 animate-pulse" />
              <span>Лайв матчи</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
