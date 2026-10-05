// game/network.ts
// Everything about talking to the game server lives here, so the game scene stays tidy.

import { Client, Callbacks } from "@colyseus/sdk";

// Where the game server lives when we set it in the environment.
// Later, when the server is hosted online, we set NEXT_PUBLIC_SERVER_URL to its address.
const CONFIGURED_URL = process.env.NEXT_PUBLIC_SERVER_URL;

// The information the server shares about each player.
// It must match the Player definition in the server's CityState.ts.
export type NetPlayer = {
  name: string;
  x: number;
  y: number;
  facing: string;
  moving: boolean;
};

// Works out which server to use, or nothing if there is none.
function serverUrl(): string | null {
  // An online server was configured: use it.
  if (CONFIGURED_URL) return CONFIGURED_URL;

  // On your own laptop, use the local server on port 2567.
  if (window.location.hostname === "localhost") return "http://localhost:2567";

  // On the live website with no server set up, do not try to connect.
  // This also stops browsers from asking visitors for permission to reach their own computer.
  return null;
}

// Connects to the server and joins the "city" room.
// Returns the room (to send messages) and callbacks (to hear about changes).
export async function joinCity(name: string) {
  const url = serverUrl();
  if (!url) throw new Error("No game server configured");

  const client = new Client(url);
  const room = await client.joinOrCreate("city", { name });
  const callbacks = Callbacks.get(room);
  return { room, callbacks };
}

// The type of the room object, so other files can store it.
export type CityRoom = Awaited<ReturnType<typeof joinCity>>["room"];