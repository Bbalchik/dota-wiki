export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 text-zinc-400 py-8 px-4 sm:px-6 mt-auto">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-bold text-zinc-100 text-xs shadow-sm">
            A
          </div>
          <span className="font-extrabold tracking-tight text-zinc-100 text-sm">
            Aegis<span className="text-zinc-400">GG</span>
          </span>
          <span className="text-zinc-500 text-xs ml-2">
            Персональная аналитика матчей Dota 2
          </span>
        </div>

        <div className="text-[11px] text-zinc-500 text-center sm:text-right">
          <span>Dota 2 является торговой маркой Valve Corporation. © {new Date().getFullYear()} AegisGG.</span>
        </div>
      </div>
    </footer>
  );
}
