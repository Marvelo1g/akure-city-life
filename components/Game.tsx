"use client";

import { useEffect, useRef } from "react";

export default function Game() {
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: { destroy: (removeCanvas: boolean) => void } | undefined;
    let cancelled = false;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !holder.current) return;

      class BootScene extends Phaser.Scene {
        constructor() {
          super("boot");
        }

        preload() {
          this.load.image("urban", "/assets/tiles/tilemap_packed.png");
          this.load.tilemapTiledJSON("test-map", "/assets/maps/test-map.tmj");
        }

        create() {
          const map = this.make.tilemap({ key: "test-map" });
          const tileset = map.addTilesetImage("urban", "urban");
          if (!tileset) return;

          map.createLayer("Ground", tileset);
          map.createLayer("Buildings", tileset);

          const collision = map.createLayer("Collision", tileset);
          collision?.setVisible(false);
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: holder.current,
        width: 480,
        height: 320,
        backgroundColor: "#0e1a2e",
        pixelArt: true,
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