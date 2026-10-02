// Akure City Life: location data format (Day 6 draft)
// Every place in the game is one entry here. Adding a new area means adding an entry, not new code.
// Anything marked null is something only you can fill in from real life.

export type LocationKind = "campus-zone" | "outside-gate" | "city-area";

export type PoiKind =
  | "transport"
  | "food"
  | "shop"
  | "hostel"
  | "admin"
  | "health"
  | "academic"
  | "religion"
  | "sports"
  | "service"
  | "people";

export interface Poi {
  id: string;
  name: string;
  kind: PoiKind;
  description: string;
}

export interface Exit {
  to: string; // id of another location
  mode: "walk" | "bus" | "taxi" | "okada";
  costNaira: number; // 0 for walking
  minutes: number | null; // null until you confirm the real time
  note?: string;
}

export interface Location {
  id: string;
  name: string;
  district: string;
  kind: LocationKind;
  isSpawn: boolean; // where new players can start
  description: string;
  pois: Poi[];
  exits: Exit[];
  npcIds: string[]; // ids from slang.ts
  slangPlaces: string[]; // place keys used in slang.ts lines
  playlistId: string | null; // set when the music system exists
}

export const locations: Location[] = [
  {
    id: "outside-south-gate",
    name: "Outside South Gate",
    district: "futa",
    kind: "outside-gate",
    isSpawn: true,
    description:
      "The busiest face of FUTA. Bikemen wait, blue and yellow taxis drop passengers from Oja Oba, and shops, churches and lodges line the road.",
    pois: [
      { id: "bikemen", name: "Bikemen", kind: "transport", description: "Okada riders waiting beside the gate to carry people." },
      { id: "oja-oba-taxis", name: "Oja Oba taxis", kind: "transport", description: "Blue and yellow taxis from Oja Oba, passing Oyemekun Road and Cathedral Road." },
      { id: "shops-row", name: "Shops", kind: "shop", description: "Shops selling food, gadgets and foodstuff." },
      { id: "market-women", name: "Market women", kind: "people", description: "Older Akure women advertising their goods in Yoruba." },
      { id: "aboki-watch", name: "Aboki", kind: "people", description: "Seller of wristwatches." },
      { id: "restaurant", name: "Restaurant", kind: "food", description: "Restaurant beside the football pitch." },
      { id: "football-pitch", name: "Football pitch", kind: "sports", description: "A well finished football pitch near the gate." },
      { id: "south-churches", name: "Churches", kind: "religion", description: "Student fellowship church and the main church." },
      { id: "south-lodges", name: "Lodges and hostels", kind: "hostel", description: "Private lodges all around the gate." },
    ],
    exits: [
      { to: "south-gate", mode: "walk", costNaira: 0, minutes: null, note: "Through the South Gate" },
      { to: "oja-oba", mode: "taxi", costNaira: 0, minutes: null, note: "Fare to confirm" },
    ],
    npcIds: ["n2", "n4"],
    slangPlaces: ["south-gate"],
    playlistId: null,
  },
  {
    id: "south-gate",
    name: "South Gate zone",
    district: "futa",
    kind: "campus-zone",
    isSpawn: false,
    description:
      "A major entry zone for students, pedestrians, vehicles, okada and keke. Home to the health centre, Great Hall and the garage for buses between the gates.",
    pois: [
      { id: "garage", name: "Shuttle garage", kind: "transport", description: "18 seater buses, cabs and keke carry students between South Gate and North Gate." },
      { id: "health-centre", name: "FUTA health centre", kind: "health", description: "The campus health centre." },
      { id: "physics-dept", name: "Physics department", kind: "academic", description: "Where practicals are held." },
      { id: "great-hall", name: "Great Hall", kind: "admin", description: "Large hall for school gatherings." },
      { id: "staff-secondary", name: "FUTA staff secondary school", kind: "academic", description: "The staff secondary school." },
      { id: "mosque", name: "Mosque", kind: "religion", description: "Mosque in the zone." },
      { id: "obanla-ict", name: "Obanla ICT centre", kind: "academic", description: "ICT centre." },
      { id: "akindeko", name: "Akindeko hostel", kind: "hostel", description: "Boys hostel." },
      { id: "bisi-balogun", name: "Bisi Balogun hostel", kind: "hostel", description: "Postgraduate hostel." },
      { id: "old-id-studio", name: "Old industrial design studio", kind: "academic", description: "The old industrial design studio." },
      { id: "printing-press", name: "FUTA printing press", kind: "service", description: "The school printing press." },
    ],
    exits: [
      { to: "outside-south-gate", mode: "walk", costNaira: 0, minutes: null },
      { to: "senate-sub", mode: "walk", costNaira: 0, minutes: null },
      { to: "north-gate", mode: "bus", costNaira: 300, minutes: null, note: "18 seater shuttle" },
    ],
    npcIds: ["n1"],
    slangPlaces: ["south-gate", "campus"],
    playlistId: null,
  },
];

// Not built yet, but already referenced above: senate-sub, north-gate, oja-oba.

export function getLocation(id: string): Location | undefined {
  return locations.find((l) => l.id === id);
}