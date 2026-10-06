export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { startDotaAutoUpdater } = await import("@/lib/dota-auto-updater");
      startDotaAutoUpdater();
    } catch (err) {
      console.warn("Could not start Dota Auto-Updater in instrumentation:", err);
    }
  }
}
