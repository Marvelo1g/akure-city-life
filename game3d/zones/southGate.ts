// game3d/zones/southGate.ts
// The South Gate zone of FUTA, laid out from the hand sketch.
// Think of the ground as a map seen from above: x goes west (negative) to east (positive),
// and z goes north (negative) to south (positive). The gate is near the south end.
//
// The layout follows the sketch:
//   - Outside the gate: the road to Oja Oba, okada and taxi stands, kiosks, shops, market stalls,
//     the football pitch, the restaurant and lodges.
//   - Inside the gate: a plaza, then a roundabout with four roads: south to the gate,
//     north into campus, west to the hostels and east toward the North Gate.
//
// Models are named by kit: "suburban/..." or "commercial/...". Open the model gallery at
// localhost:3000/models to see what each one looks like, then swap names below to taste.
// Facing: 0 faces south, PI faces north, PI/2 faces east, -PI/2 faces west.

import type { Zone } from "@/game3d/places";

const SOUTH = 0; // front faces south (toward the gate)
const NORTH = Math.PI; // front faces north
const EAST = Math.PI / 2; // front faces east
const WEST = -Math.PI / 2; // front faces west

export const southGate: Zone = {
  roads: [
    // The main road, north to south through the middle.
    { kind: "rect", x: 0, z: 0, width: 5, depth: 76 },
    // The roundabout just inside the gate, where four roads meet.
    { kind: "ring", x: 0, z: 8, outer: 7, inner: 3 },
    // The west road to the hostels, and the east road toward the North Gate.
    { kind: "rect", x: -22.5, z: 8, width: 31, depth: 5 },
    { kind: "rect", x: 22.5, z: 8, width: 31, depth: 5 },
    // The paved plaza just inside the gate.
    { kind: "rect", x: 0, z: 21, width: 22, depth: 6, color: 0xb9b3a4 },
    // The road to Oja Oba, turning west outside the gate.
    { kind: "rect", x: -19, z: 30, width: 38, depth: 4 },
  ],

  places: [
    // ---- The gate ----
    { name: "FUTA South Gate", kind: "landmark", shape: "gate", x: 0, z: 26, rotation: 0 },

    // ---- Outside the gate, west side ----
    { name: "To Oja Oba", kind: "transport", shape: "stand", x: -30, z: 27, rotation: 0 },
    { name: "Okada Park", kind: "transport", shape: "stand", x: -6, z: 33, rotation: 0 },
    { name: "Kiosk", kind: "shop", shape: "kiosk", x: -12, z: 34, rotation: NORTH },
    { name: "Gadget Shop", kind: "shop", shape: "kiosk", x: -17, z: 34, rotation: NORTH },
    { name: "Shop", kind: "shop", shape: "kiosk", x: -22, z: 34, rotation: NORTH },
    { name: "Student Lodge", kind: "lodging", model: "suburban/building-type-t", x: -31, z: 35, rotation: NORTH },

    // ---- Outside the gate, east side ----
    { name: "Oja Oba Taxis", kind: "transport", shape: "stand", x: 6, z: 33, rotation: 0 },
    { name: "Market Women", kind: "shop", shape: "stall", x: 11, z: 33, rotation: 0 },
    { name: "Provisions", kind: "shop", shape: "stall", x: 15, z: 33, rotation: 0 },
    { name: "Aboki Watches", kind: "shop", shape: "stall", x: 19, z: 33, rotation: 0 },
    { name: "Football Pitch", kind: "landmark", shape: "pitch", x: 29, z: 33, rotation: 0 },
    { name: "Restaurant", kind: "food", model: "commercial/building-c", x: 12, z: 18, rotation: WEST },

    // ---- West arm: north side of the road, facing south ----
    { name: "Great Hall", kind: "admin", model: "commercial/building-n", x: -16, z: 0, rotation: SOUTH, size: 13 },
    { name: "Obanla ICT Centre", kind: "service", model: "commercial/building-e", x: -29, z: 0, rotation: SOUTH },
    // ---- West arm: south side of the road, facing north ----
    { name: "Shuttle Garage", kind: "transport", model: "commercial/building-l", x: -16, z: 16, rotation: NORTH },
    { name: "Akindeko Hostel", kind: "hostel", model: "suburban/building-type-m", x: -29, z: 16, rotation: NORTH },

    // ---- East arm: north side of the road, facing south ----
    { name: "FUTA Health Centre", kind: "health", model: "commercial/building-b", x: 16, z: 0, rotation: SOUTH },
    { name: "FUTA Printing Press", kind: "service", model: "commercial/building-g", x: 29, z: 0, rotation: SOUTH },
    // ---- East arm: south side of the road, facing north ----
    { name: "Staff Secondary School", kind: "education", model: "suburban/building-type-k", x: 29, z: 16, rotation: NORTH },

    // ---- North of the roundabout, along the main road ----
    { name: "Physics Department", kind: "education", model: "suburban/building-type-j", x: -10, z: -14, rotation: EAST },
    { name: "Bisi Balogun Hostel", kind: "hostel", model: "suburban/building-type-p", x: -10, z: -26, rotation: EAST },
    { name: "Mosque", kind: "religion", model: "suburban/building-type-r", x: 10, z: -14, rotation: WEST },
    { name: "Old Industrial Design Studio", kind: "education", model: "commercial/building-d", x: 10, z: -26, rotation: WEST },

    // ---- Trees ----
    { name: "Tree", kind: "decor", model: "suburban/tree-large", x: 0, z: 8, rotation: 0 },
    { name: "Tree", kind: "decor", model: "suburban/tree-large", x: -4.6, z: -9, rotation: 0 },
    { name: "Tree", kind: "decor", model: "suburban/tree-small", x: 4.6, z: -9, rotation: 0 },
    { name: "Tree", kind: "decor", model: "suburban/tree-small", x: -4.6, z: 21, rotation: 0 },
    { name: "Tree", kind: "decor", model: "suburban/tree-large", x: 4.6, z: 21, rotation: 0 },
    { name: "Tree", kind: "decor", model: "suburban/tree-large", x: -4.6, z: -21, rotation: 0 },
    { name: "Tree", kind: "decor", model: "suburban/tree-small", x: 4.6, z: -21, rotation: 0 },
    { name: "Tree", kind: "decor", model: "suburban/tree-small", x: -22, z: 25, rotation: 0 },
    { name: "Tree", kind: "decor", model: "suburban/tree-large", x: 22, z: 25, rotation: 0 },
  ],
};