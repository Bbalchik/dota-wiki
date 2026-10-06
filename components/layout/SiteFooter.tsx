import Link from "next/link";
import { TOP_PRO_PLAYERS } from "@/lib/opendota";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 text-zinc-400 py-12 px-4 sm:px-6 mt-auto">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-bold text-zinc-100 text-sm shadow-sm">
                A
              </div>
              <span className="font-extrabold tracking-tight text-zinc-100 text-base">
                Aegis<span className="text-zinc-400">GG</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Открытая платформа аналитики Dota 2: поминутная реконструкция закупа, динамика нетворса, интерактивная миникарта и полная статистика игроков.
            </p>
            <div className="text-[11px] text-zinc-500">
              Актуальная версия: <span className="text-zinc-300 font-mono">Patch 7.41</span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-white uppercase tracking-wider">Разделы сайта</div>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/" className="hover:text-white transition">Главная страница</Link>
              </li>
              <li>
                <Link href="/heroes" className="hover:text-white transition">Мета и герои 7.41</Link>
              </li>
              <li>
                <Link href="/pro-matches" className="hover:text-white transition">Pro-матчи турниров</Link>
              </li>
              <li>
                <Link href="/matches" className="hover:text-white transition">База данных матчей</Link>
              </li>
              <li>
                <Link href="/#pro-players" className="hover:text-white transition">Звёзды и топ ладдера</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Popular Pro Players */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-white uppercase tracking-wider">Профили киберспортсменов</div>
            <ul className="space-y-1.5 text-xs">
              {TOP_PRO_PLAYERS.slice(0, 5).map((p) => (
                <li key={p.accountId}>
                  <Link href={`/player/${p.accountId}`} className="hover:text-blue-400 transition flex items-center justify-between">
                    <span>{p.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{p.teamTag}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Legal & Disclaimer */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-white uppercase tracking-wider">Информация</div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Dota 2 является зарегистрированной торговой маркой Valve Corporation. Статистика и данные матчей получены из официальных API Steam и OpenDota.
            </p>
            <div className="pt-2 text-[11px] text-zinc-500">
              © {new Date().getFullYear()} AegisGG. Создано для сообщества игроков.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
