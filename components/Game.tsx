"use client";

// components/Game.tsx
// Starts the Phaser game inside the page.

import { useEffect, useRef } from "react";

export default function Game() {
  // The empty box Phaser draws its canvas into.
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Remember the game so we can shut it down when the page closes.
    let game: { destroy: (removeCanvas: boolean) => void } | undefined;
    let cancelled = false;

    (async () => {
      // Phaser needs the browser, so we load it here instead of at the top of the file.
      const Phaser = (await import("phaser")).default;
      const { BootScene } = await import("@/game/BootScene");
      if (cancelled || !holder.current) return;

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: holder.current,
        // Fill the whole screen. The camera zoom (in BootScene) decides how much map we see.
        width: "100%",
        height: "100%",
        backgroundColor: "#0e1a2e",
        pixelArt: true, // keep pixel art sharp, no blurring
        physics: { default: "arcade", arcade: { debug: false } },
        // RESIZE makes the game match the screen shape, in portrait or landscape.
        scale: { mode: Phaser.Scale.RESIZE },
        scene: [BootScene],
      });
    })();

    // Clean up when the component is removed.
    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, []);

  // h-dvh fits phones whose address bar grows and shrinks.
  // touch-none stops the browser from scrolling or zooming while you play.
  return (
    <div className="relative h-dvh w-full touch-none overflow-hidden">
      <div ref={holder} className="h-full w-full" />
    </div>
  );
}