"use client";

// components/Scene3D.tsx
// The page piece that starts the 3D test world and shows a few controls on top of it.

import { useEffect, useRef, useState } from "react";
import { SKINS, type SkinName } from "@/game3d/skins";

export default function Scene3D() {
  // The empty box the 3D picture is drawn into.
  const holder = useRef<HTMLDivElement>(null);
  // Lets the skin buttons talk to the 3D world once it has started.
  const controls = useRef<{ setSkin: (name: SkinName) => void } | null>(null);

  // A message in the corner, and the speed (frames per second) so we can check phones.
  const [status, setStatus] = useState("Starting 3D...");
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;

    (async () => {
      // 3D drawing needs the browser, so we load it here instead of at the top of the file.
      const { startScene } = await import("@/game3d/scene");
      if (cancelled || !holder.current) return;

      const scene = startScene(holder.current, { onStatus: setStatus, onFps: setFps });
      controls.current = scene;
      stop = scene.dispose;
    })();

    // Clean up when the page closes.
    return () => {
      cancelled = true;
      stop?.();
      controls.current = null;
    };
  }, []);

  return (
    // touch-none stops the page from scrolling or zooming while you play.
    <div className="relative h-dvh w-full touch-none overflow-hidden bg-sky-200">
      <div ref={holder} className="h-full w-full" />

      {/* Loading or error message, and the speed. */}
      <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1 font-mono text-xs text-white">
        {status && <div className="w-fit rounded-full bg-black/60 px-3 py-1">{status}</div>}
        <div className="w-fit rounded-full bg-black/60 px-3 py-1">FPS: {fps}</div>
      </div>

      {/* Buttons to try the different skins. */}
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        {SKINS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => controls.current?.setSkin(name)}
            className="rounded bg-black/60 px-3 py-1 text-xs text-white"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}