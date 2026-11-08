// game3d/scene.ts
// The 3D test world: a ground, some placeholder buildings, a 3D character that
// plays idle and run animations, a camera that follows, and tap to walk.
// This file is only loaded in the browser, because 3D drawing needs the browser.

import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import type { SkinName } from "@/game3d/skins";
// The catalog of place kinds, and the South Gate zone layout.
import { PLACE_KINDS, type Place, type Zone } from "@/game3d/places";
import { southGate } from "@/game3d/zones/southGate";
// Fits each building model to the space we give it.
import { fitScale, TARGET_FOOTPRINT } from "@/game3d/fit";
// Our connection to the game server, and the chat message shape.
import { joinCity, type CityRoom, type NetPlayer3D } from "@/game/network";
import {
  incomingChat,
  incomingWhisper,
  outgoingChat,
  outgoingWhisper,
  whisperTarget,
  type ChatMessage,
  type WhisperMessage,
} from "@/game/bridge";

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
const CAMERA_OFFSET = new THREE.Vector3(0, 12, 10);
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

// ---- The city: real 3D models from the Kenney City Kit (Suburban) ----

// Where the model files live. Models are named by their kit, for example "suburban/building-type-a".
// Each kit folder needs its own Textures folder next to its .glb files.
const CITY_FOLDER = "/assets/3d/city/";
// Trees use their own smaller size, so they do not tower over the houses.
const TREE_SCALE = 5;
// If the doors face away from the road, change this to Math.PI (half a turn).
const FRONT_ROTATION = 0;

// The zone we are building now. Later we will load a different zone as the player travels.
const ZONE: Zone = southGate;

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

  // ---- Roads, plazas and roundabouts, drawn from the zone's list ----
  const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x55585e });
  const islandMaterial = new THREE.MeshLambertMaterial({ color: 0x6fae62 });
  ZONE.roads.forEach((road, index) => {
    // Each piece sits a tiny bit higher than the last, so overlapping pieces never flicker.
    const height = 0.01 + index * 0.002;

    if (road.kind === "rect") {
      const material = road.color ? new THREE.MeshLambertMaterial({ color: road.color }) : roadMaterial;
      const flat = new THREE.Mesh(new THREE.PlaneGeometry(road.width, road.depth), material);
      flat.rotation.x = -Math.PI / 2; // lay it flat
      flat.position.set(road.x, height, road.z);
      flat.receiveShadow = true;
      scene.add(flat);
    } else {
      // A roundabout: a ring of road, with a grass island in the middle.
      const ring = new THREE.Mesh(new THREE.RingGeometry(road.inner, road.outer, 48), roadMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(road.x, height, road.z);
      ring.receiveShadow = true;
      scene.add(ring);

      const island = new THREE.Mesh(new THREE.CircleGeometry(road.inner, 32), islandMaterial);
      island.rotation.x = -Math.PI / 2;
      island.position.set(road.x, height + 0.003, road.z);
      island.receiveShadow = true;
      scene.add(island);
    }
  });

  // ---- Walls the character cannot walk through. Filled in as the buildings load. ----
  const walls: Wall[] = [];

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
  // Our connection to the city room. It stays empty until we have joined.
  let room: CityRoom | undefined;

  const textureLoader = new THREE.TextureLoader();
  const skinMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  // Skin pictures we have already loaded, so each picture is only downloaded once.
  const skinCache = new Map<string, THREE.Texture>();
  // The skin we are wearing now.
  let currentSkin: SkinName = "skaterMaleA";

  // Puts a skin picture onto a material. Used for us and for other players.
  function applySkinTo(material: THREE.MeshLambertMaterial, name: string) {
    const cached = skinCache.get(name);
    if (cached) {
      material.map = cached;
      material.needsUpdate = true;
      return;
    }
    textureLoader.load(`/assets/3d/skins/${name}.png`, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace; // so colours look right
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      skinCache.set(name, texture);
      material.map = texture;
      material.needsUpdate = true;
    });
  }

  // Changes our own skin, and tells the server so other players see it too.
  function setSkin(name: SkinName) {
    currentSkin = name;
    applySkinTo(skinMaterial, name);
    room?.send("skin", { skin: name });
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
  // Kept so we can make copies of the character for other players.
  let characterTemplate: THREE.Group | null = null;
  let sharedIdleClip: THREE.AnimationClip | null = null;
  let sharedRunClip: THREE.AnimationClip | null = null;

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
      characterTemplate = model; // other players are copies of this

      // The animations live in separate files. We take the clip we need from each.
      const idleClip = idleFile.animations.find((clip) => clip.name.includes("Idle"));
      const runClip = runFile.animations.find((clip) => clip.name.includes("Run"));
      if (!idleClip || !runClip) throw new Error("Animation clips not found");
      sharedIdleClip = idleClip;
      sharedRunClip = runClip;

      mixer = new THREE.AnimationMixer(model);
      idleAction = mixer.clipAction(idleClip);
      runAction = mixer.clipAction(runClip);
      runAction.timeScale = 0.85; // a little slower, so it looks like fast walking
      idleAction.play();

      options.onStatus(""); // clear the loading message

      // Now that the character is ready, join the city.
      void connect();
    } catch (error) {
      console.error("Could not load the 3D character", error);
      options.onStatus("Could not load the character. Check the files in public/assets/3d.");
    }
  })();

  // ---- Placing the places of the zone ----
  const gltfLoader = new GLTFLoader();
  // Each model file is loaded once, then copied for every place we use it.
  const modelCache = new Map<string, Promise<THREE.Group>>();

  function loadModel(name: string): Promise<THREE.Group> {
    let promise = modelCache.get(name);
    if (!promise) {
      promise = gltfLoader.loadAsync(`${CITY_FOLDER}${name}.glb`).then((gltf) => gltf.scene);
      modelCache.set(name, promise);
    }
    return promise;
  }

  // Adds a wall around a box, made a little bigger for the character's body.
  function addWall(box: THREE.Box3) {
    walls.push({
      minX: box.min.x - BODY_RADIUS,
      maxX: box.max.x + BODY_RADIUS,
      minZ: box.min.z - BODY_RADIUS,
      maxZ: box.max.z + BODY_RADIUS,
    });
  }

  // A sign board above a place, coloured by the kind of place it is.
  function addSign(place: Place, centerX: number, centerZ: number, top: number) {
    const sign = makeTextSprite(place.name, {
      fontSize: 34,
      color: "#ffffff",
      background: PLACE_KINDS[place.kind].color,
      maxWidth: 360,
      depthTest: true, // buildings in front hide it, like a real sign
    });
    sign.position.set(centerX, top + 0.5 + sign.scale.y / 2, centerZ);
    scene.add(sign);
  }

  // Marks every mesh in an object so it casts and receives shadows.
  function enableShadows(object: THREE.Object3D) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  // Places a place that uses a 3D model from the city kit.
  async function placeModel(place: Place, modelName: string) {
    const source = await loadModel(modelName);
    if (disposed) return;

    // A copy that shares the same shapes and colours, so memory stays small.
    const copy = source.clone(true);
    // Trees have a fixed size. Buildings are measured and fitted to the width we want.
    const isTree = modelName.includes("tree");
    copy.scale.setScalar(isTree ? TREE_SCALE : fitScale(source, place.size ?? TARGET_FOOTPRINT));
    copy.position.set(place.x, 0, place.z);
    copy.rotation.y = place.rotation + FRONT_ROTATION;
    enableShadows(copy);
    scene.add(copy);

    // Measure where it ended up, for its wall and its sign.
    copy.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(copy);
    addWall(box);
    if (place.kind !== "decor") {
      addSign(place, (box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2, box.max.y);
    }
  }

  // Builds a simple shape in code, for places the free kits do not have.
  function placeShape(place: Place) {
    const group = new THREE.Group();
    const paint = new THREE.MeshLambertMaterial({ color: PLACE_KINDS[place.kind].color });
    const grey = new THREE.MeshLambertMaterial({ color: 0x4a4f58 });

    // A helper that adds one box to the group.
    function addBox(size: [number, number, number], at: [number, number, number], material: THREE.Material) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...at);
      group.add(mesh);
    }

    // Where the sign sits, and whether the whole shape blocks walking.
    let signTop = 3;
    let solid = true;

    if (place.shape === "kiosk") {
      addBox([2.4, 2.4, 2], [0, 1.2, 0], paint); // the shop body
      addBox([3.2, 0.15, 1.4], [0, 2.5, 1.3], grey); // the awning over the counter
      signTop = 2.7;
    } else if (place.shape === "stand") {
      addBox([3, 0.15, 3], [0, 0.08, 0], grey); // the flat platform
      addBox([0.15, 2.2, 0.15], [1.3, 1.1, 1.3], paint); // the pole
      signTop = 2.3;
      solid = false; // you can walk over a stand
    } else if (place.shape === "stall") {
      addBox([2.4, 0.9, 1.2], [0, 0.45, 0], grey); // the table
      addBox([0.1, 2, 0.1], [0, 1.4, 0], grey); // the parasol pole
      const parasol = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.6, 12), paint); // the parasol
      parasol.position.set(0, 2.5, 0);
      group.add(parasol);
      signTop = 2.9;
    } else if (place.shape === "pitch") {
      addBox([14, 0.05, 9], [0, 0.03, 0], new THREE.MeshLambertMaterial({ color: 0x3f8f45 })); // the grass
      const line = new THREE.MeshLambertMaterial({ color: 0xffffff });
      addBox([14, 0.06, 0.15], [0, 0.04, 4.4], line); // the long edges
      addBox([14, 0.06, 0.15], [0, 0.04, -4.4], line);
      addBox([0.15, 0.06, 9], [6.9, 0.04, 0], line); // the short edges
      addBox([0.15, 0.06, 9], [-6.9, 0.04, 0], line);
      addBox([0.15, 0.06, 9], [0, 0.04, 0], line); // the halfway line
      signTop = 1;
      solid = false; // you can walk across a pitch
    } else if (place.shape === "gate") {
      addBox([1, 5, 1], [-3.5, 2.5, 0], paint); // left pillar
      addBox([1, 5, 1], [3.5, 2.5, 0], paint); // right pillar
      addBox([8.5, 1, 1], [0, 5.5, 0], paint); // the beam across the top
      signTop = 6;
      solid = false; // we add walls for the pillars only, below
    }

    group.position.set(place.x, 0, place.z);
    group.rotation.y = place.rotation;
    enableShadows(group);
    scene.add(group);

    // Walls: the whole shape for a kiosk, or just the two pillars for the gate.
    group.updateMatrixWorld(true);
    if (place.shape === "gate") {
      addWall(new THREE.Box3(new THREE.Vector3(place.x - 4, 0, place.z - 0.5), new THREE.Vector3(place.x - 3, 5, place.z + 0.5)));
      addWall(new THREE.Box3(new THREE.Vector3(place.x + 3, 0, place.z - 0.5), new THREE.Vector3(place.x + 4, 5, place.z + 0.5)));
    } else if (solid) {
      addWall(new THREE.Box3().setFromObject(group));
    }
    addSign(place, place.x, place.z, signTop);
  }

  // Places everything in the zone. allSettled lets the rest show up even if one file is missing.
  (async () => {
    try {
      // Wait until the rest of the world has finished setting up. Building the simple shapes
      // needs things (like the text size for signs) that are created further down this function.
      await Promise.resolve();

      const results = await Promise.allSettled(
        ZONE.places.map(async (place) => {
          if (place.model) await placeModel(place, place.model);
          else if (place.shape) placeShape(place);
        }),
      );

      // Tell the player (and the console) if any model failed to load.
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        console.error("Some city models could not load", failed);
        options.onStatus(`${failed.length} city models could not load. Check public/assets/3d/city.`);
      }
    } catch (error) {
      console.error("Could not load the city", error);
      options.onStatus("Could not load the buildings. Check public/assets/3d/city.");
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

    // First check whether the tap landed on another player. If so, pick them for a whisper
    // instead of walking.
    const hitboxes = Array.from(remotes.values()).map((remote) => remote.hitbox);
    const playerHit = raycaster.intersectObjects(hitboxes, false)[0];
    if (playerHit) {
      const id = playerHit.object.userData.id as string;
      const remote = remotes.get(id);
      if (remote) {
        whisperId = id;
        whisperTarget.emit({ id, name: remote.net.name });
        // Show the yellow ring at their feet so the player sees who was picked.
        marker.position.set(remote.group.position.x, 0.03, remote.group.position.z);
        markerLife = 0.5;
        return;
      }
    }

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

  // ---- Multiplayer: other players, name tags and speech bubbles ----

  // Everything we keep for one other player.
  type Remote = {
    group: THREE.Group; // holds their model, name tag and speech bubble
    mixer: THREE.AnimationMixer;
    idle: THREE.AnimationAction;
    run: THREE.AnimationAction;
    moving: boolean; // what their animation is showing now
    skin: string; // the skin they are wearing now
    material: THREE.MeshLambertMaterial;
    label: THREE.Sprite; // their name tag
    hitbox: THREE.Mesh; // an invisible shape around them, so we can tell when they are tapped
    net: NetPlayer3D; // the live data from the server
  };

  const remotes = new Map<string, Remote>(); // other players, by session id
  const bubbles = new Map<string, { sprite: THREE.Sprite; expires: number }>(); // speech bubbles showing now
  let myId = ""; // our own session id
  let whisperId: string | null = null; // the player we are about to whisper to
  let myLabel: THREE.Sprite | null = null; // our own name tag
  let lastSent = 0; // when we last told the server where we are
  let wasMoving = false;
  const cleanups: Array<() => void> = []; // things to switch off when we shut down

  // How many text picture pixels make one world unit. Bigger means smaller text in the world.
  const TEXT_PIXELS_PER_UNIT = 60;

  // How a piece of floating text should look.
  type TextStyle = {
    fontSize: number;
    color: string;
    background: string | null;
    maxWidth: number;
    depthTest?: boolean; // true makes buildings hide the text when they are in front of it
  };

  // Makes a flat picture of some text that always faces the camera. We use it for name tags and bubbles.
  function makeTextSprite(text: string, style: TextStyle): THREE.Sprite {
    const scale = 2; // draw at double size so the text stays sharp
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available");

    const font = `bold ${style.fontSize * scale}px sans-serif`;
    context.font = font;

    // Break the text into lines that fit the maximum width.
    const maxPixels = style.maxWidth * scale;
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(" ")) {
      const attempt = line ? `${line} ${word}` : word;
      if (line && context.measureText(attempt).width > maxPixels) {
        lines.push(line);
        line = word;
      } else {
        line = attempt;
      }
    }
    if (line) lines.push(line);

    // Work out how big the picture needs to be.
    const padding = 8 * scale;
    const lineHeight = style.fontSize * scale * 1.3;
    const widest = Math.max(...lines.map((entry) => context.measureText(entry).width));
    canvas.width = Math.ceil(widest + padding * 2);
    canvas.height = Math.ceil(lines.length * lineHeight + padding * 2);

    // Changing the size of a canvas clears its settings, so we set them again.
    context.font = font;
    context.textAlign = "center";
    context.textBaseline = "middle";

    // A rounded box behind the text, for speech bubbles.
    if (style.background) {
      const width = canvas.width;
      const height = canvas.height;
      const radius = 10 * scale;
      context.fillStyle = style.background;
      context.beginPath();
      context.moveTo(radius, 0);
      context.arcTo(width, 0, width, height, radius);
      context.arcTo(width, height, 0, height, radius);
      context.arcTo(0, height, 0, 0, radius);
      context.arcTo(0, 0, width, 0, radius);
      context.closePath();
      context.fill();
    }

    // Draw each line. Name tags get a dark outline so they can be read on any background.
    lines.forEach((entry, index) => {
      const y = padding + lineHeight * (index + 0.5);
      if (!style.background) {
        context.lineWidth = 4 * scale;
        context.lineJoin = "round";
        context.strokeStyle = "#000000";
        context.strokeText(entry, canvas.width / 2, y);
      }
      context.fillStyle = style.color;
      context.fillText(entry, canvas.width / 2, y);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    // By default the text shows even when a building is in front, which suits name tags.
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: style.depthTest ?? false }),
    );
    sprite.scale.set(canvas.width / (scale * TEXT_PIXELS_PER_UNIT), canvas.height / (scale * TEXT_PIXELS_PER_UNIT), 1);
    sprite.renderOrder = 10; // draw on top of everything else
    return sprite;
  }

  // Frees a text sprite from memory and removes it from the world.
  function disposeSprite(sprite: THREE.Sprite) {
    sprite.material.map?.dispose();
    sprite.material.dispose();
    sprite.removeFromParent();
  }

  // A name tag, floating just above a character's head.
  function makeNameTag(name: string): THREE.Sprite {
    const tag = makeTextSprite(name, { fontSize: 22, color: "#ffffff", background: null, maxWidth: 200 });
    tag.position.set(0, CHARACTER_HEIGHT + 0.3, 0);
    return tag;
  }

  // Shows a speech bubble above a player for five seconds.
  function showBubble(id: string, text: string) {
    // The bubble belongs to either us or one of the other players.
    const host = id === myId ? player : remotes.get(id)?.group;
    if (!host) return;

    // A new message replaces the old bubble.
    const old = bubbles.get(id);
    if (old) disposeSprite(old.sprite);

    const sprite = makeTextSprite(text, {
      fontSize: 20,
      color: "#10233f",
      background: "rgba(255,255,255,0.95)",
      maxWidth: 220,
    });
    // Sit above the name tag.
    sprite.position.set(0, CHARACTER_HEIGHT + 0.7 + sprite.scale.y / 2, 0);
    host.add(sprite);
    bubbles.set(id, { sprite, expires: performance.now() + 5000 });
  }

  // Removes speech bubbles whose time is up.
  function updateBubbles() {
    const now = performance.now();
    bubbles.forEach((bubble, id) => {
      if (now > bubble.expires) {
        disposeSprite(bubble.sprite);
        bubbles.delete(id);
      }
    });
  }

  // Makes a copy of our character for another player.
  function addRemote(id: string, net: NetPlayer3D) {
    if (!characterTemplate || !sharedIdleClip || !sharedRunClip) return;

    // SkeletonUtils.clone copies a character that has bones, so it can still animate.
    const copy = SkeletonUtils.clone(characterTemplate) as THREE.Group;
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    applySkinTo(material, net.skin);
    copy.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
        child.castShadow = true;
        child.frustumCulled = false;
      }
    });

    // The group is what we move around. It starts where the server says they are.
    const group = new THREE.Group();
    group.add(copy);
    group.position.set(net.x, 0, net.z);
    group.rotation.y = net.rotation;
    scene.add(group);

    // Their own animation player, so they can stand or run on their own schedule.
    const mixer = new THREE.AnimationMixer(copy);
    const idle = mixer.clipAction(sharedIdleClip);
    const run = mixer.clipAction(sharedRunClip);
    run.timeScale = 0.85;
    idle.play();

    const label = makeNameTag(net.name);
    group.add(label);

    // An invisible tube around the character. Tapping it picks this player.
    // It is wider than the body, so it is easy to hit with a finger.
    const hitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, CHARACTER_HEIGHT + 0.3, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hitbox.position.y = (CHARACTER_HEIGHT + 0.3) / 2;
    hitbox.userData.id = id; // remember whose hitbox this is
    group.add(hitbox);

    remotes.set(id, { group, mixer, idle, run, moving: false, skin: net.skin, material, label, hitbox, net });
  }

  // Removes another player from the world.
  function removeRemote(id: string) {
    const remote = remotes.get(id);
    if (!remote) return;
    const bubble = bubbles.get(id);
    if (bubble) {
      disposeSprite(bubble.sprite);
      bubbles.delete(id);
    }
    disposeSprite(remote.label);
    remote.hitbox.geometry.dispose();
    (remote.hitbox.material as THREE.Material).dispose();
    // If we were about to whisper to this player, clear it, because they have gone.
    if (whisperId === id) {
      whisperId = null;
      whisperTarget.emit(null);
    }
    remote.mixer.stopAllAction();
    remote.material.dispose();
    scene.remove(remote.group);
    remotes.delete(id);
  }

  // Moves every other player toward where the server says they are.
  function updateRemotes(delta: number) {
    // How much of the gap to close this frame. It depends on time, so it looks the same on any phone.
    const smoothing = 1 - Math.exp(-delta / 0.075);

    remotes.forEach((remote) => {
      const { group, net } = remote;

      // Glide toward their position, or jump if they are far away (after a bad connection).
      const gap = Math.hypot(net.x - group.position.x, net.z - group.position.z);
      if (gap > 6) {
        group.position.set(net.x, 0, net.z);
      } else {
        group.position.x += (net.x - group.position.x) * smoothing;
        group.position.z += (net.z - group.position.z) * smoothing;
      }
      group.rotation.y = turnToward(group.rotation.y, net.rotation, TURN_SPEED * delta);

      // Switch between standing and running when they start or stop.
      if (net.moving !== remote.moving) {
        remote.moving = net.moving;
        const from = net.moving ? remote.idle : remote.run;
        const to = net.moving ? remote.run : remote.idle;
        to.reset().fadeIn(0.2).play();
        from.fadeOut(0.2);
      }

      // If they changed skin, change the picture on their model.
      if (net.skin !== remote.skin) {
        remote.skin = net.skin;
        applySkinTo(remote.material, net.skin);
      }

      remote.mixer.update(delta);
    });
  }

  // Tells the server where we are. While walking it sends about 10 times a second,
  // and when we stop it sends once straight away.
  function sendPosition() {
    if (!room) return;
    const now = performance.now();
    const justStopped = !moving && wasMoving;
    const timeToSend = moving && now - lastSent >= 100;
    if (justStopped || timeToSend) {
      room.send("move", {
        x: player.position.x,
        z: player.position.z,
        rotation: player.rotation.y,
        moving,
      });
      lastSent = now;
    }
    wasMoving = moving;
  }

  // Joins the city room and keeps the other players in step with the server.
  async function connect() {
    try {
      options.onStatus("Connecting to the city...");
      const joined = await joinCity((text) => options.onStatus(text), { room: "city3d", skin: currentSkin });
      if (disposed) {
        void joined.room.leave();
        return;
      }
      room = joined.room;
      myId = joined.room.sessionId;
      const callbacks = joined.callbacks;

      // Shows how many people are in the city, counting us.
      const showOnline = () => options.onStatus(`Online: ${remotes.size + 1}`);
      showOnline();

      // Chat: send what the player types to the server.
      cleanups.push(outgoingChat.on((text) => room?.send("chat", { text })));

      // Chat: when the server sends a message, show it in the chat box and as a bubble.
      joined.room.onMessage("chat", (message: ChatMessage) => {
        incomingChat.emit(message);
        showBubble(message.id, message.text);
      });

      // Whispers: send private messages to the server, and show the ones that come back.
      cleanups.push(outgoingWhisper.on(({ to, text }) => room?.send("whisper", { to, text })));
      joined.room.onMessage("whisper", (message: WhisperMessage) => {
        incomingWhisper.emit({
          mine: message.from === myId,
          name: message.name,
          toName: message.toName,
          text: message.text,
        });
      });

      // If the connection drops, clear the other players and carry on alone.
      joined.room.onLeave((code: number) => {
        console.warn("Disconnected from the city server. Code:", code);
        Array.from(remotes.keys()).forEach(removeRemote);
        room = undefined;
        options.onStatus("Disconnected: playing alone");
      });

      // Runs once for every player in the room, now and whenever someone new joins.
      callbacks.onAdd("players", (value: unknown, key: unknown) => {
        const net = value as NetPlayer3D;
        const id = key as string;

        // The list includes us. We already have a body, so we only add our name tag.
        if (id === myId) {
          myLabel = makeNameTag(net.name);
          player.add(myLabel);
          return;
        }
        addRemote(id, net);
        showOnline();
      });

      // Runs when someone leaves.
      callbacks.onRemove("players", (_value: unknown, key: unknown) => {
        removeRemote(key as string);
        showOnline();
      });
    } catch (error) {
      // No server, no problem. We keep playing alone.
      console.warn("Could not join the city server. Playing offline.", error);
      options.onStatus("Offline: playing alone");
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
    sendPosition();
    updateRemotes(delta);
    updateBubbles();
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
    // Leave the city and remove everything to do with other players.
    cleanups.forEach((stop) => stop());
    void room?.leave();
    Array.from(remotes.keys()).forEach(removeRemote);
    bubbles.forEach((bubble) => disposeSprite(bubble.sprite));
    bubbles.clear();
    if (myLabel) disposeSprite(myLabel);
    skinCache.forEach((texture) => texture.dispose());
    skinMaterial.dispose();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry) object.geometry.dispose();
    });
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { setSkin, dispose };
}