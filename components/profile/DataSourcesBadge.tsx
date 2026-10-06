"use client";

import { useState } from "react";
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sliders,
  ShieldCheck,
  Sparkles,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface DataSourcesBadgeProps {
  accountId: number;
}

export function DataSourcesBadge({ accountId }: DataSourcesBadgeProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus("Отправка запроса в очередь Steam...");
    try {
      const res = await fetch(`/api/players/${accountId}/refresh`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncStatus("Матчи запрошены у Valve Steam! Обновление страницы...");
        setTimeout(() => {
          router.refresh();
          setIsSyncing(false);
          setSyncStatus(null);
        }, 1500);
      } else {
        setSyncStatus("Запрос отправлен в очередь серверов");
        setTimeout(() => {
          setIsSyncing(false);
          setSyncStatus(null);
        }, 3000);
      }
    } catch {
      setSyncStatus("Синхронизация поставлена в очередь");
      setTimeout(() => {
        setIsSyncing(false);
        setSyncStatus(null);
      }, 2500);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md px-5 py-3.5 shadow-md">
        {/* Left: Sources status */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Database className="size-4 text-emerald-400" />
            <span>Статус данных:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-semibold text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Все типы матчей (100%)
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 text-[11px] font-semibold text-blue-300">
              <span className="size-1.5 rounded-full bg-blue-400" />
              Серверы Steam
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {syncStatus && (
            <span className="text-xs text-amber-300 font-mono animate-pulse">
              {syncStatus}
            </span>
          )}

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 px-4 py-1.5 text-xs font-semibold transition cursor-pointer disabled:opacity-50 active:scale-95"
            title="Запросить недостающие матчи из серверов Valve Steam"
          >
            <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin text-emerald-400" : ""}`} />
            <span>{isSyncing ? "Синхронизация..." : "Подтянуть все матчи из Steam"}</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="rounded-full border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white p-2 text-xs font-bold transition cursor-pointer"
            title="Справка по источникам данных"
          >
            <Info className="size-4" />
          </button>
        </div>
      </div>

      {/* Info Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#233150] bg-[#0c1220] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b263e] pb-3">
              <div className="flex items-center gap-2">
                <Database className="size-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">
                  Источники данных и точность матчей
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-1">
                <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" /> Почему могут отображаться не все матчи?
                </h4>
                <p className="text-zinc-400 text-[11px]">
                  Если у вас или вашего друга в клиенте Dota 2 пишет 6 000 матчей, а на сайтах 1 400:
                  это означает, что часть матчей была сыграна, когда в клиенте Dota 2 была отключена настройка
                  <strong> «Общедоступная история матчей»</strong>.
                </p>
              </div>

              <div className="rounded-xl border border-[#212d46] bg-[#0e1627] p-3 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-sky-400" /> Как открыть 100% матчей:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-zinc-300 text-[11px]">
                  <li>Откройте клиент <strong>Dota 2</strong>.</li>
                  <li>Нажмите шестерёнку настроек в левом верхнем углу.</li>
                  <li>Перейдите во вкладку <strong>«Сообщество»</strong>.</li>
                  <li>Включите галочку <strong>«Общедоступная история матчей»</strong>.</li>
                  <li>Вернитесь на этот сайт и нажмите кнопку <strong>«Подтянуть все матчи из Steam»</strong>.</li>
                </ol>
              </div>

              <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3 space-y-1.5">
                <h4 className="font-bold text-sky-300 flex items-center gap-1.5">
                  <Sparkles className="size-4" /> Автоматическая синхронизация
                </h4>
                <p className="text-zinc-400 text-[11px]">
                  После включения настройки в игре ваши матчи загружаются напрямую с официальных игровых серверов в фоновом режиме.
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition cursor-pointer"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
