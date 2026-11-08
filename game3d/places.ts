// game3d/places.ts
// The catalog of kinds of places in the city. Every place on the map has a kind,
// and the kind decides the colour of its sign. Add a new kind here when you need one.

// All the kinds of places we have so far.
export type PlaceKind =
  | "landmark" // gates and other places everyone knows
  | "admin" // offices and halls
  | "health" // hospitals and clinics
  | "education" // schools and departments
  | "hostel" // student hostels
  | "food" // restaurants and bukas
  | "shop" // kiosks and shops
  | "transport" // garages, taxi and okada stands
  | "service" // printing, ICT and other services
  | "religion" // mosques and churches
  | "lodging" // lodges and hotels
  | "decor"; // trees and other decoration, with no sign

// How each kind looks. The colour is used for the sign board, and for simple built shapes.
export const PLACE_KINDS: Record<PlaceKind, { color: string }> = {
  landmark: { color: "#10233f" },
  admin: { color: "#7a4fd6" },
  health: { color: "#d64545" },
  education: { color: "#3b6fd6" },
  hostel: { color: "#d9822b" },
  food: { color: "#d9a21f" },
  shop: { color: "#2fa36b" },
  transport: { color: "#1f8fa8" },
  service: { color: "#5b6472" },
  religion: { color: "#6f8f2f" },
  lodging: { color: "#a35a2e" },
  decor: { color: "#3a7a3a" },
};

// Simple shapes the code can build by itself, for things the free kits do not have.
export type PlaceShape =
  | "kiosk" // a small box shop with an awning
  | "gate" // two pillars and a beam over the road
  | "stand"; // a flat platform with a pole, for taxi and okada stands

// One place in the world.
export type Place = {
  name: string; // shown on the sign
  kind: PlaceKind;
  x: number; // position: negative is west, positive is east
  z: number; // position: negative is north, positive is south
  rotation: number; // which way the front faces, in radians
  model?: string; // a model from the city kits, like "suburban/building-type-a" or "commercial/building-c"...
  shape?: PlaceShape; // ...or a simple shape built in code
  size?: number; // how wide the building should be in units. The default is 10.
};