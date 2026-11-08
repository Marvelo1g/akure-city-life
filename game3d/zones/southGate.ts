// game3d/zones/southGate.ts
// The South Gate zone of FUTA, laid out along the main road.
// The road runs north to south through the middle (x = 0). The gate is at the south end.
// Buildings on the west side face east, and buildings on the east side face west.
// Models are named by kit: "suburban/..." or "commercial/...". Open the model gallery at
// localhost:3000/models to see what each one looks like, then swap names here to taste.

import type { Place } from "@/game3d/places";

// Half a turn in each direction, so buildings face the road.
const FACE_EAST = Math.PI / 2; // for buildings on the west side of the road
const FACE_WEST = -Math.PI / 2; // for buildings on the east side of the road
const FACE_NORTH = Math.PI; // for things south of the road end, facing the gate

export const southGate: Place[] = [
  // ---- The gate itself ----
  { name: "FUTA South Gate", kind: "landmark", shape: "gate", x: 0, z: 29.5, rotation: 0 },

  // ---- Outside the gate: the busy side ----
  { name: "Restaurant", kind: "food", model: "commercial/building-c", x: -10, z: 34, rotation: FACE_EAST },
  { name: "Student Lodge", kind: "lodging", model: "suburban/building-type-t", x: 10, z: 34, rotation: FACE_WEST },
  { name: "Kiosk", kind: "shop", shape: "kiosk", x: -4.8, z: 36, rotation: FACE_NORTH },
  { name: "Gadgets", kind: "shop", shape: "kiosk", x: 4.8, z: 36, rotation: FACE_NORTH },
  { name: "Okada Park", kind: "transport", shape: "stand", x: -5, z: 31.5, rotation: 0 },
  { name: "Oja Oba Taxis", kind: "transport", shape: "stand", x: 5, z: 31.5, rotation: 0 },

  // ---- Inside, west side of the road ----
  { name: "Great Hall", kind: "admin", model: "commercial/building-n", x: -10, z: 21, rotation: FACE_EAST, size: 14 },
  { name: "FUTA Health Centre", kind: "health", model: "commercial/building-b", x: -10, z: 9, rotation: FACE_EAST },
  { name: "Physics Department", kind: "education", model: "suburban/building-type-j", x: -10, z: -3, rotation: FACE_EAST },
  { name: "Obanla ICT Centre", kind: "service", model: "commercial/building-e", x: -10, z: -15, rotation: FACE_EAST },
  { name: "Staff Secondary School", kind: "education", model: "suburban/building-type-k", x: -10, z: -27, rotation: FACE_EAST },

  // ---- Inside, east side of the road ----
  { name: "Shuttle Garage", kind: "transport", model: "commercial/building-l", x: 10, z: 21, rotation: FACE_WEST },
  { name: "FUTA Printing Press", kind: "service", model: "commercial/building-g", x: 10, z: 9, rotation: FACE_WEST },
  { name: "Akindeko Hostel", kind: "hostel", model: "suburban/building-type-m", x: 10, z: -3, rotation: FACE_WEST },
  { name: "Bisi Balogun Hostel", kind: "hostel", model: "suburban/building-type-p", x: 10, z: -15, rotation: FACE_WEST },
  { name: "Mosque", kind: "religion", model: "suburban/building-type-r", x: 10, z: -27, rotation: FACE_WEST },

  // ---- Trees along the road ----
  { name: "Tree", kind: "decor", model: "suburban/tree-large", x: -4.6, z: 15, rotation: 0 },
  { name: "Tree", kind: "decor", model: "suburban/tree-small", x: 4.6, z: 15, rotation: 0 },
  { name: "Tree", kind: "decor", model: "suburban/tree-large", x: -4.6, z: -9, rotation: 0 },
  { name: "Tree", kind: "decor", model: "suburban/tree-small", x: 4.6, z: -9, rotation: 0 },
  { name: "Tree", kind: "decor", model: "suburban/tree-large", x: -4.6, z: -21, rotation: 0 },
  { name: "Tree", kind: "decor", model: "suburban/tree-small", x: 4.6, z: -21, rotation: 0 },
];