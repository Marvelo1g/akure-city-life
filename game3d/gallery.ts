// game3d/gallery.ts
// A gallery that shows every building model from the city kits in a grid, with its name,
// so you can see what each one looks like and pick the right one for each place.
// Drag to look around, scroll or pinch to zoom.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { fitScale } from "@/game3d/fit";

// The letters used in the kit's model names.
const SUBURBAN_LETTERS = "abcdefghijklmnopqrstu".split("");
const COMMERCIAL_LETTERS = "abcdefghijklmn".split("");
const SKYSCRAPER_LETTERS = "abcde".split("");

// Every model we show, named like the zone files name them.
const MODELS: string[] = [
  ...SUBURBAN_LETTERS.map((letter) => `suburban/building-type-${letter}`),
  ...COMMERCIAL_LETTERS.map((letter) => `commercial/building-${letter}`),
  ...SKYSCRAPER_LETTERS.map((letter) => `commercial/building-skyscraper-${letter}`),
];

// How the models are laid out on the grid.
const COLUMNS = 7;
const SPACING_X = 16;
const SPACING_Z = 18;

// Makes a flat picture of a name, to float in front of each model.
function makeLabel(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  context.font = "bold 84px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 14;
  context.lineJoin = "round";
  context.strokeStyle = "#000000";
  context.strokeText(text, canvas.width / 2, canvas.height / 2);
  context.fillStyle = "#ffffff";
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(14, 2.2, 1);
  return sprite;
}

// Builds the gallery inside the page element. Returns a function that shuts it down.
export function startGallery(container: HTMLElement, onStatus: (text: string) => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfe3ff);

  const rows = Math.ceil(MODELS.length / COLUMNS);
  const centerZ = ((rows - 1) * SPACING_Z) / 2;

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
  camera.position.set(0, 60, centerZ + 80);

  // Mouse or finger controls to look around.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, centerZ);
  controls.enableDamping = true;
  controls.update();

  // Keeps the picture the right shape when the screen size changes.
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

  // Lights and a ground.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7a9a6a, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(30, 60, 40);
  scene.add(sun);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    new THREE.MeshLambertMaterial({ color: 0x78b36a }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.02, centerZ);
  scene.add(ground);

  // Load every model, place it on the grid and add its name.
  let disposed = false;
  const loader = new GLTFLoader();
  let loaded = 0;
  let failed = 0;

  // The name of the model the player last tapped, and each model's name by its 3D object.
  let selected = "";
  const names = new Map<THREE.Object3D, string>();

  // Shows how many models loaded, and which one is selected.
  function showStatus() {
    onStatus(
      `Loaded ${loaded} of ${MODELS.length} models` +
        (failed ? `, ${failed} missing` : "") +
        (selected ? ` | Selected: ${selected}` : " | Tap a building to see its name"),
    );
  }

  // Tapping a building (not dragging) shows its exact name, ready to copy into the zone file.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downX = 0;
  let downY = 0;

  function onPointerDown(event: PointerEvent) {
    downX = event.clientX;
    downY = event.clientY;
  }

  function onPointerUp(event: PointerEvent) {
    // If the finger or mouse moved a lot, it was a drag to look around, not a tap.
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > 6) return;

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(Array.from(names.keys()), true);
    if (hits.length === 0) return;

    // Walk up from the exact part we hit until we find the whole model.
    let object: THREE.Object3D | null = hits[0].object;
    while (object) {
      const name = names.get(object);
      if (name) {
        selected = name;
        showStatus();
        return;
      }
      object = object.parent;
    }
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);

  MODELS.forEach((name, index) => {
    const x = ((index % COLUMNS) - (COLUMNS - 1) / 2) * SPACING_X;
    const z = Math.floor(index / COLUMNS) * SPACING_Z;

    loader
      .loadAsync(`/assets/3d/city/${name}.glb`)
      .then((gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        model.scale.setScalar(fitScale(model)); // the same fitting the game uses
        model.position.set(x, 0, z);
        scene.add(model);
        names.set(model, name); // so tapping it can tell us the name
        const label = makeLabel(name.replace("suburban/", "").replace("commercial/", "c: "));
        label.position.set(x, 0.8, z + 8);
        scene.add(label);
        loaded += 1;
      })
      .catch(() => {
        failed += 1;
      })
      .finally(() => {
        showStatus();
      });
  });

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  // Shutting down: free everything.
  return function dispose() {
    disposed = true;
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    controls.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}