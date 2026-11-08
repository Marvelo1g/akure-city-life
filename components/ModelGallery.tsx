"use client";

// components/ModelGallery.tsx
// The page piece for the model gallery. It starts the 3D gallery and shows a status message.

import { useEffect, useRef, useState } from "react";

export default function ModelGallery() {
  // The empty box the 3D picture is drawn into.
  const holder = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Starting...");

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;

    (async () => {
      // 3D drawing needs the browser, so we load it here instead of at the top of the file.
      const { startGallery } = await import("@/game3d/gallery");
      if (cancelled || !holder.current) return;
      stop = startGallery(holder.current, setStatus);
    })();

    // Clean up when the page closes.
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-sky-200">
      <div ref={holder} className="h-full w-full" />
      <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/60 px-3 py-1 font-mono text-xs text-white">
        {status}
      </div>
    </div>
  );
}