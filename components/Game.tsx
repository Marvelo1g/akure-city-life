"use client";

import { useEffect, useRef } from "react";

export default function Game() {
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: { destroy: (removeCanvas: boolean) => void } | undefined;
    let cancelled = false;

    (async () => {
      const Phaser = (await import("phaser")).default;
      const { BootScene } = await import("@/game/BootScene");
      if (cancelled || !holder.current) return;

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: holder.current,
        width: 480,
        height: 320,
        backgroundColor: "#0e1a2e",
        pixelArt: true,
        physics: { default: "arcade", arcade: { debug: false } },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [BootScene],
      });
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, []);

  return <div ref={holder} className="h-screen w-full" />;
}