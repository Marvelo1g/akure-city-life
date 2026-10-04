// game/BootScene.ts
// A "scene" in Phaser is one screen of the game. This one loads the test map,
// puts a character on it, and lets the player walk around by tapping or by keyboard.

import Phaser from "phaser";
// EasyStar finds a walkable route between two tiles on a grid (the A* algorithm).
import * as EasyStar from "easystarjs";

// How fast the character walks, in pixels per second.
const SPEED = 70;

// The size of one map tile in pixels.
const TILE_SIZE = 16;

// How many tiles we want to see across the shorter side of the screen.
// The camera zooms in or out to match, so phones and laptops both look right.
const TILES_ACROSS = 12;

// The tilesheet is a grid of 16 by 16 pixel squares, 27 squares wide.
// Phaser numbers every square from 0, left to right then top to bottom,
// so the square at row r and column c has the number: r * 27 + c.
const COLS = 27;

// The character we use starts at row 15 and column 23 of the tilesheet.
// Each character has 3 rows (standing, walk step 1, walk step 2)
// and 4 columns (one for each direction).
const FIRST_ROW = 15;
const FIRST_COL = 23;

// When the character is this close (in pixels) to the middle of a tile,
// we count it as arrived and head for the next tile on the route.
const ARRIVE_DISTANCE = 3;

// The four directions the character can face.
type Dir = "left" | "down" | "up" | "right";

// A position on the map grid, counted in tiles (not pixels).
type TilePos = { x: number; y: number };

// Which column (counting from FIRST_COL) shows each direction.
const OFFSET: Record<Dir, number> = { left: 0, down: 1, up: 2, right: 3 };

// Works out the frame number for a direction and a step.
// step 0 = standing, 1 = first walking pose, 2 = second walking pose.
function frameFor(dir: Dir, step: 0 | 1 | 2): number {
  return (FIRST_ROW + step) * COLS + FIRST_COL + OFFSET[dir];
}

export class BootScene extends Phaser.Scene {
  // These are filled in later, inside create(). The "!" tells TypeScript
  // "trust me, this will have a value before it is used".
  private player!: Phaser.Physics.Arcade.Sprite; // the walking character
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys; // arrow keys
  private keys!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>; // WASD keys
  private facing: Dir = "down"; // the direction the character is facing now

  // The route finder, and the tiles left to walk on the current route.
  private finder = new EasyStar.js();
  private path: TilePos[] = [];

  constructor() {
    // "boot" is the name of this scene.
    super("boot");
  }

  // preload() runs first. It loads every file the scene needs.
  preload() {
    // The tilesheet as one image, used to draw the map.
    this.load.image("urban", "/assets/tiles/tilemap_packed.png");

    // The same file again, but cut into 16 by 16 frames, used for the character.
    this.load.spritesheet("people", "/assets/tiles/tilemap_packed.png", {
      frameWidth: 16,
      frameHeight: 16,
    });

    // The map we painted in Tiled.
    this.load.tilemapTiledJSON("test-map", "/assets/maps/test-map.tmj");
  }

  // create() runs once, after everything has loaded. It builds the scene.
  create() {
    // Build the map from the file we loaded, then connect it to the tilesheet.
    const map = this.make.tilemap({ key: "test-map" });
    const tileset = map.addTilesetImage("urban", "urban");
    if (!tileset) return; // stop if the tilesheet did not load

    // Draw the layers from the bottom up: ground first, buildings on top.
    map.createLayer("Ground", tileset);
    map.createLayer("Buildings", tileset);

    // The Collision layer marks where the player cannot walk.
    const collision = map.createLayer("Collision", tileset);
    if (!collision) return;
    collision.setCollisionByExclusion([-1]); // every painted tile becomes a wall
    collision.setVisible(false); // walls work but we do not draw them

    // Keep the player inside the edges of the map.
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // Create the player at pixel position (88, 264), standing and facing down.
    this.player = this.physics.add.sprite(88, 264, "people", frameFor("down", 0));
    this.player.setDepth(10); // draw the player above the map layers
    this.player.setCollideWorldBounds(true);

    // Shrink the hitbox to the feet, so the head can pass behind things.
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 8);
    body.setOffset(3, 8);

    // Make the player bump into the walls on the Collision layer.
    this.physics.add.collider(this.player, collision);

    // Camera: make the view follow the player so the map scrolls as they walk.
    const camera = this.cameras.main;
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels); // never show outside the map

    // Work out how far to zoom for this screen.
    const applyZoom = () => {
      const shorterSide = Math.min(this.scale.width, this.scale.height);

      // The zoom we would like: about 12 tiles across the shorter side.
      // Math.round (not floor) so a 360 pixel wide phone gets zoom 2 instead of 1.
      const wanted = Math.max(1, Math.round(shorterSide / (TILE_SIZE * TILES_ACROSS)));

      // The smallest zoom that makes the map cover the whole screen, so there
      // are no empty dark areas around it.
      const cover = Math.max(
        this.scale.width / map.widthInPixels,
        this.scale.height / map.heightInPixels,
      );

      // Use whichever is bigger, so the map always fills the screen.
      camera.setZoom(Math.max(wanted, cover));
    };
    applyZoom();
    // Zoom again whenever the screen changes size, like turning the phone sideways.
    this.scale.on("resize", applyZoom);
    // Stop listening when this scene ends, so nothing is left running.
    this.events.once("shutdown", () => this.scale.off("resize", applyZoom));

    // The 0.1 values make the camera glide after the player instead of snapping.
    // The true after the player keeps the pixel art sharp while moving.
    camera.startFollow(this.player, true, 0.1, 0.1);

    // ---- Tap to walk ----

    // Turn the Collision layer into a grid for the route finder.
    // 1 means a wall, 0 means a tile you can walk on.
    const grid: number[][] = [];
    for (let y = 0; y < map.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < map.width; x++) {
        row.push(collision.getTileAt(x, y) ? 1 : 0);
      }
      grid.push(row);
    }
    this.finder.setGrid(grid);
    this.finder.setAcceptableTiles([0]); // only tiles marked 0 can be walked on

    // A small yellow ring that pops up where you tapped.
    const showMarker = (tileX: number, tileY: number) => {
      const ring = this.add.circle(
        tileX * TILE_SIZE + TILE_SIZE / 2,
        tileY * TILE_SIZE + TILE_SIZE / 2,
        5,
        0xf2a900,
        0.9,
      );
      ring.setDepth(9);
      // Grow and fade out, then remove it.
      this.tweens.add({
        targets: ring,
        scale: 2,
        alpha: 0,
        duration: 450,
        onComplete: () => ring.destroy(),
      });
    };

    // When the screen is tapped or clicked, find a route there and start walking.
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // worldX and worldY are the tap position on the map, already
      // adjusted for camera zoom and scrolling. Divide by tile size to get the tile.
      const endX = Math.floor(pointer.worldX / TILE_SIZE);
      const endY = Math.floor(pointer.worldY / TILE_SIZE);

      // Ignore taps outside the map.
      if (endX < 0 || endY < 0 || endX >= map.width || endY >= map.height) return;

      // Start from the tile under the character's feet.
      const feet = this.player.body as Phaser.Physics.Arcade.Body;
      const startX = Math.floor(feet.center.x / TILE_SIZE);
      const startY = Math.floor(feet.center.y / TILE_SIZE);

      this.finder.findPath(startX, startY, endX, endY, (route) => {
        // route is null when there is no way to get there, like tapping a wall.
        if (!route) return;
        // The first tile is where we already stand, so skip it.
        this.path = route.slice(1);
        showMarker(endX, endY);
      });
    });

    // Create one walking animation for each direction.
    // The order is step 1, stand, step 2, stand, which looks like walking.
    (["left", "down", "up", "right"] as Dir[]).forEach((dir) => {
      this.anims.create({
        key: `walk-${dir}`,
        frames: this.anims.generateFrameNumbers("people", {
          frames: [frameFor(dir, 1), frameFor(dir, 0), frameFor(dir, 2), frameFor(dir, 0)],
        }),
        frameRate: 8, // frames shown per second
        repeat: -1, // repeat forever while walking
      });
    });

    // Set up the keyboard: arrow keys and W, A, S, D.
    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys("W,A,S,D") as typeof this.keys;
  }

  // update() runs about 60 times every second. It handles movement.
  update() {
    if (!this.player) return; // nothing to move if create() stopped early

    // Let the route finder do a little work each frame.
    this.finder.calculate();

    // Check which keys are held down right now.
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;

    // Turn the keys into a direction: -1, 0 or 1 on each axis.
    let vx = (right ? 1 : 0) - (left ? 1 : 0);
    let vy = (down ? 1 : 0) - (up ? 1 : 0);
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    if (vx !== 0 || vy !== 0) {
      // Pressing a key cancels any tap route, so the keyboard always wins.
      this.path = [];
    } else {
      // No keys pressed: follow the tap route, if there is one.
      while (this.path.length > 0) {
        const next = this.path[0];
        // The middle of the next tile, and how far the feet are from it.
        const dx = next.x * TILE_SIZE + TILE_SIZE / 2 - body.center.x;
        const dy = next.y * TILE_SIZE + TILE_SIZE / 2 - body.center.y;
        const dist = Math.hypot(dx, dy);

        if (dist < ARRIVE_DISTANCE) {
          // Reached this tile, so move on to the next one.
          this.path.shift();
          continue;
        }
        // Head toward the middle of the next tile.
        vx = dx / dist;
        vy = dy / dist;
        break;
      }
    }

    // Nothing to do: stop, and show the standing pose.
    if (vx === 0 && vy === 0) {
      body.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(frameFor(this.facing, 0));
      return;
    }

    // Move. Normalising keeps diagonal walking the same speed as straight walking.
    body.setVelocity(vx, vy);
    body.velocity.normalize().scale(SPEED);

    // Pick which way to face: whichever direction is pushed harder.
    // On a tie (like walking diagonally) left and right win.
    if (Math.abs(vx) >= Math.abs(vy)) {
      this.facing = vx < 0 ? "left" : "right";
    } else {
      this.facing = vy < 0 ? "up" : "down";
    }

    // Play the walking animation for that direction.
    this.player.anims.play(`walk-${this.facing}`, true);
  }
}