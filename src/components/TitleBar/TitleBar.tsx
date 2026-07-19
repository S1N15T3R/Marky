import { useFileStore } from "@/stores/fileStore";
import { useThemeStore } from "@/stores/themeStore";
import { runningInTauri } from "@/lib/platform";

export default function TitleBar() {
  const name = useFileStore((s) => s.name);
  const dirty = useFileStore((s) => s.dirty);

  async function close() {
    if (runningInTauri) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } else window.close();
  }
  async function minimize() {
    if (runningInTauri) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    }
  }
  async function toggleMax() {
    if (runningInTauri) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const w = getCurrentWindow();
      const max = await w.isMaximized();
      if (max) await w.unmaximize();
      else await w.maximize();
    }
  }

  return (
    <div
      className="flex h-9 select-none items-center justify-between border-b border-border bg-surface px-2"
      style={{ appRegion: "drag" } as any}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-accent" style={{ appRegion: "no-drag" } as any}>
          <span className="glitch" data-text="MARKY">
            MARKY
          </span>
        </span>
        <span className="text-xs text-text-muted">{dirty ? "● " : ""}{name}</span>
      </div>

      {/* macOS-style traffic lights (shown on all platforms) */}
      <div className="flex items-center gap-2" style={{ appRegion: "no-drag" } as any}>
        <button
          onClick={minimize}
          className="h-3 w-3 rounded-full bg-yellow-400 hover:brightness-110"
          title="Minimize"
          aria-label="Minimize"
        />
        <button
          onClick={toggleMax}
          className="h-3 w-3 rounded-full bg-green-400 hover:brightness-110"
          title="Maximize"
          aria-label="Maximize"
        />
        <button
          onClick={close}
          className="h-3 w-3 rounded-full bg-red-500 hover:brightness-110"
          title="Close"
          aria-label="Close"
        />
      </div>
    </div>
  );
}
