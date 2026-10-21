// game3d/scene.ts
// The 3D test world: a ground, some placeholder buildings, a 3D character that
// plays idle and run animations, a camera that follows, and tap to walk.
// This file is only loaded in the browser, because 3D drawing needs the browser.

import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import type { SkinName } from "@/game3d/skins";

// ---- Settings you can change ----

// How tall the character is in world units (about 1 unit = 1 metre).
const CHARACTER_HEIGHT = 1.7;
// How fast the character walks, in units per second.
const WALK_SPEED = 3.2;
// How quickly the character turns to face where it is going.
const TURN_SPEED = 10;
// Closer than this to the tapped spot counts as arrived.
const ARRIVE_DISTANCE = 0.12;
// The ground is 80 by 80 units, so the character stays within 38 of the middle.
const WORLD_HALF = 38;
// Where the camera sits compared to the character: above and behind.
const CAMERA_OFFSET = new THREE.Vector3(0, 9, 9);
// How quickly the camera catches up with the character.
const CAMERA_FOLLOW_SPEED = 5;
// Shadows look great but cost speed on cheap phones. Switch off if the FPS is low.
const USE_SHADOWS = true;
// How wide the character is for bumping into walls, in units.
const BODY_RADIUS = 0.4;

// ---- Files ----
const CHARACTER_URL = "/assets/3d/character/characterMedium.fbx";
const IDLE_URL = "/assets/3d/character/idle.fbx";
const RUN_URL = "/assets/3d/character/run.fbx";

// Placeholder buildings, until we place real ones from the building kits.
// Each one: x, z (position), width, depth, height, colour.
const BUILDINGS: Array<[number, number, number, number, number, number]> = [
  [-10, -9, 6, 5, 4, 0xd9a066],
  [-3, -12, 5, 4, 6, 0xc86f5d],
  [6, -10, 7, 5, 3.5, 0xe8d28a],
  [14, -8, 5, 6, 5, 0x8fb8c9],
  [-14, 4, 5, 7, 4.5, 0xb99ad1],
  [12, 6, 6, 6, 4, 0xd9a066],
  [-6, 11, 7, 4, 3.5, 0x9ccf9c],
  [5, 14, 5, 5, 7, 0xc86f5d],
];

// What the page gives us, so it can show messages and the speed.
type Options = {
  onStatus: (text: string) => void; // "Loading..." style messages
  onFps: (fps: number) => void; // frames per second, to check speed on phones
};

// A wall the character cannot walk through, as a flat rectangle seen from above.
type Wall = { minX: number; maxX: number; minZ: number; maxZ: number };

// Keeps a number between a minimum and a maximum.
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Turns an angle a little toward a target angle, the short way around the circle.
function turnToward(current: number, target: number, amount: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * Math.min(amount, 1);
}

// Builds the whole 3D world inside the given page element.
// It returns functions to change the skin and to shut everything down.
export function startScene(container: HTMLElement, options: Options) {
  // ---- The renderer: the thing that draws the 3D picture on a canvas ----
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  // Phones have very sharp screens. Limit to 2x so the game does not get too heavy.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = USE_SHADOWS;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // ---- The scene (the world) and a sky colour with fog for depth ----
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfe3ff);
  scene.fog = new THREE.Fog(0xbfe3ff, 30, 70);

  // ---- The camera ----
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

  // Keeps the picture the right shape when the screen size changes, like turning a phone.
  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  // ---- Lights: soft light from the sky, plus sunlight that casts shadows ----
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7a9a6a, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.castShadow = USE_SHADOWS;
  sun.shadow.mapSize.set(1024, 1024);
  // The shadow area is small and follows the character, which keeps it sharp and cheap.
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 50;
  scene.add(sun);
  scene.add(sun.target);

  // ---- The ground and two roads ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF * 2 + 4, WORLD_HALF * 2 + 4),
    new THREE.MeshLambertMaterial({ color: 0x78b36a }),
  );
  ground.rotation.x = -Math.PI / 2; // lay it flat
  ground.receiveShadow = true;
  scene.add(ground);

  const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x55585e });
  const roadAcross = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_HALF * 2, 5), roadMaterial);
  roadAcross.rotation.x = -Math.PI / 2;
  roadAcross.position.y = 0.01; // just above the ground so they do not flicker
  roadAcross.receiveShadow = true;
  scene.add(roadAcross);
  const roadDown = new THREE.Mesh(new THREE.PlaneGeometry(5, WORLD_HALF * 2), roadMaterial);
  roadDown.rotation.x = -Math.PI / 2;
  roadDown.position.y = 0.01;
  roadDown.receiveShadow = true;
  scene.add(roadDown);

  // ---- Placeholder buildings, plus their walls for bumping into ----
  const walls: Wall[] = [];
  for (const [x, z, width, depth, height, colour] of BUILDINGS) {
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshLambertMaterial({ color: colour }),
    );
    building.position.set(x, height / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
    // The wall is the building's footprint, made a little bigger to fit the character's body.
    walls.push({
      minX: x - width / 2 - BODY_RADIUS,
      maxX: x + width / 2 + BODY_RADIUS,
      minZ: z - depth / 2 - BODY_RADIUS,
      maxZ: z + depth / 2 + BODY_RADIUS,
    });
  }

  // If the character is inside a wall, push it out the nearest side.
  function pushOutOfWalls(position: THREE.Vector3) {
    for (const wall of walls) {
      if (position.x > wall.minX && position.x < wall.maxX && position.z > wall.minZ && position.z < wall.maxZ) {
        const toLeft = position.x - wall.minX;
        const toRight = wall.maxX - position.x;
        const toFront = position.z - wall.minZ;
        const toBack = wall.maxZ - position.z;
        const nearest = Math.min(toLeft, toRight, toFront, toBack);
        if (nearest === toLeft) position.x = wall.minX;
        else if (nearest === toRight) position.x = wall.maxX;
        else if (nearest === toFront) position.z = wall.minZ;
        else position.z = wall.maxZ;
      }
    }
  }

  // ---- The player: an empty group we move, with the character model inside ----
  const player = new THREE.Group();
  player.position.set(0, 0, 8);
  scene.add(player);

  // The camera starts in place, so it does not swoop in from far away.
  camera.position.copy(player.position).add(CAMERA_OFFSET);

  // ---- The skin: the painted picture wrapped around the character ----
  const textureLoader = new THREE.TextureLoader();
  const skinMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  let skinTexture: THREE.Texture | null = null;

  function setSkin(name: SkinName) {
    textureLoader.load(`/assets/3d/skins/${name}.png`, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace; // so colours look right
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      skinTexture?.dispose(); // free the old picture from memory
      skinTexture = texture;
      skinMaterial.map = texture;
      skinMaterial.needsUpdate = true;
    });
  }
  setSkin("skaterMaleA");

  // ---- Animations: idle (standing) and run, which we use for walking ----
  let mixer: THREE.AnimationMixer | null = null;
  let idleAction: THREE.AnimationAction | null = null;
  let runAction: THREE.AnimationAction | null = null;
  let moving = false;

  // Smoothly switches between standing and running.
  function setMoving(next: boolean) {
    if (next === moving || !idleAction || !runAction) return;
    moving = next;
    const from = next ? idleAction : runAction;
    const to = next ? runAction : idleAction;
    to.reset().fadeIn(0.2).play();
    from.fadeOut(0.2);
  }

  // ---- Loading the character model and animations ----
  let disposed = false;
  (async () => {
    try {
      options.onStatus("Loading the character...");
      const loader = new FBXLoader();
      const [model, idleFile, runFile] = await Promise.all([
        loader.loadAsync(CHARACTER_URL),
        loader.loadAsync(IDLE_URL),
        loader.loadAsync(RUN_URL),
      ]);
      if (disposed) return;

      // The model comes in odd units, so we measure it and scale it to our height.
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model, true);
      model.scale.multiplyScalar(CHARACTER_HEIGHT / (box.max.y - box.min.y));
      model.updateMatrixWorld(true);
      // Then lower it so the feet sit exactly on the ground.
      const scaledBox = new THREE.Box3().setFromObject(model, true);
      model.position.y -= scaledBox.min.y;

      // Wrap the model in our skin, and let it cast shadows.
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = skinMaterial;
          child.castShadow = true;
          // Moving bodies can be wrongly hidden by the camera check, so turn it off.
          child.frustumCulled = false;
        }
      });
      player.add(model);

      // The animations live in separate files. We take the clip we need from each.
      const idleClip = idleFile.animations.find((clip) => clip.name.includes("Idle"));
      const runClip = runFile.animations.find((clip) => clip.name.includes("Run"));
      if (!idleClip || !runClip) throw new Error("Animation clips not found");

      mixer = new THREE.AnimationMixer(model);
      idleAction = mixer.clipAction(idleClip);
      runAction = mixer.clipAction(runClip);
      runAction.timeScale = 0.85; // a little slower, so it looks like fast walking
      idleAction.play();

      options.onStatus(""); // clear the loading message
    } catch (error) {
      console.error("Could not load the 3D character", error);
      options.onStatus("Could not load the character. Check the files in public/assets/3d.");
    }
  })();

  // ---- Tap to walk ----
  let target: THREE.Vector3 | null = null; // where we are heading, or nothing
  let stuckTime = 0; // how long we have been blocked

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // the flat ground, as a maths shape
  const hit = new THREE.Vector3();

  // A ring that pops up where you tapped.
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.4, 24),
    new THREE.MeshBasicMaterial({ color: 0xf2a900, transparent: true, opacity: 0, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  scene.add(marker);
  let markerLife = 0;

  function onPointerDown(event: PointerEvent) {
    // Turn the tap position on the screen into a line going into the 3D world.
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);

    // Find where that line meets the ground.
    if (raycaster.ray.intersectPlane(groundPlane, hit)) {
      target = new THREE.Vector3(clamp(hit.x, -WORLD_HALF, WORLD_HALF), 0, clamp(hit.z, -WORLD_HALF, WORLD_HALF));
      stuckTime = 0;
      marker.position.set(target.x, 0.03, target.z);
      markerLife = 0.5;
    }
  }
  renderer.domElement.addEventListener("pointerdown", onPointerDown);

  // Moves the character toward the tapped spot, every frame.
  function updatePlayer(delta: number) {
    if (!target) {
      setMoving(false);
      return;
    }

    const dx = target.x - player.position.x;
    const dz = target.z - player.position.z;
    const distance = Math.hypot(dx, dz);

    // Arrived.
    if (distance < ARRIVE_DISTANCE) {
      target = null;
      setMoving(false);
      return;
    }

    setMoving(true);

    // Step toward the target, but never past it.
    const step = Math.min(WALK_SPEED * delta, distance);
    player.position.x += (dx / distance) * step;
    player.position.z += (dz / distance) * step;
    pushOutOfWalls(player.position);

    // Turn to face the way we are going. The model faces +Z, so yaw is atan2(x, z).
    player.rotation.y = turnToward(player.rotation.y, Math.atan2(dx, dz), TURN_SPEED * delta);

    // If a wall keeps us from getting closer for a moment, give up on this tap.
    const newDistance = Math.hypot(target.x - player.position.x, target.z - player.position.z);
    if (distance - newDistance < step * 0.3) {
      stuckTime += delta;
      if (stuckTime > 0.6) {
        target = null;
        stuckTime = 0;
      }
    } else {
      stuckTime = 0;
    }
  }

  // The camera glides after the character, and the sun and its shadow follow too.
  function updateCamera(delta: number) {
    const desired = player.position.clone().add(CAMERA_OFFSET);
    camera.position.lerp(desired, 1 - Math.exp(-CAMERA_FOLLOW_SPEED * delta));
    camera.lookAt(player.position.x, 1, player.position.z);

    sun.position.set(player.position.x + 8, 14, player.position.z + 6);
    sun.target.position.copy(player.position);
  }

  // The tap ring grows and fades out.
  function updateMarker(delta: number) {
    const material = marker.material as THREE.MeshBasicMaterial;
    if (markerLife > 0) {
      markerLife = Math.max(markerLife - delta, 0);
      const progress = 1 - markerLife / 0.5; // 0 at the tap, 1 at the end
      marker.scale.setScalar(1 + progress);
      material.opacity = 1 - progress;
    } else {
      material.opacity = 0;
    }
  }

  // ---- The main loop: runs once per frame ----
  const clock = new THREE.Clock();
  let frames = 0;
  let fpsTimer = 0;

  function tick() {
    const rawDelta = clock.getDelta();
    // Cap the step, so a long pause (like switching tabs) does not make the character jump.
    const delta = Math.min(rawDelta, 0.1);

    // Count frames and report the speed twice a second.
    frames += 1;
    fpsTimer += rawDelta;
    if (fpsTimer >= 0.5) {
      options.onFps(Math.round(frames / fpsTimer));
      frames = 0;
      fpsTimer = 0;
    }

    updatePlayer(delta);
    mixer?.update(delta);
    updateCamera(delta);
    updateMarker(delta);
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(tick);

  // ---- Shutting down: free everything when the page closes ----
  function dispose() {
    disposed = true;
    renderer.setAnimationLoop(null);
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    resizeObserver.disconnect();
    skinTexture?.dispose();
    skinMaterial.dispose();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry) object.geometry.dispose();
    });
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { setSkin, dispose };
}