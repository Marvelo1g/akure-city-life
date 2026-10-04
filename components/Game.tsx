"use client";

// components/Game.tsx
// Starts the Phaser game inside the page and shows the on-screen joystick on top.

import { useEffect, useRef } from "react";
import Joystick from "@/components/Joystick";

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
        width: 480, // game width in pixels
        height: 320, // game height in pixels
        backgroundColor: "#0e1a2e",
        pixelArt: true, // keep pixel art sharp, no blurring
        physics: { default: "arcade", arcade: { debug: false } },
        // Scale the game to fit the screen and keep it centered.
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [BootScene],
      });
    })();

    // Clean up when the component is removed.
    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, []);

  return (
    <div className="relative h-screen w-full">
      <div ref={holder} className="h-full w-full" />
      {/* Only visible on touch screens. */}
      <Joystick />
    </div>
  );
}