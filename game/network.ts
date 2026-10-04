// game/network.ts
// Everything about talking to the game server lives here, so the game scene stays tidy.

import { Client, Callbacks } from "@colyseus/sdk";

// Where the game server lives. On your laptop it is port 2567.
// When the server is hosted online, we set NEXT_PUBLIC_SERVER_URL to its address instead.
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:2567";

// The information the server shares about each player.
// It must match the Player definition in the server's CityState.ts.
export type NetPlayer = {
  name: string;
  x: number;
  y: number;
  facing: string;
  moving: boolean;
};

// Connects to the server and joins the "city" room.
// Returns the room (to send messages) and callbacks (to hear about changes).
export async function joinCity(name: string) {
  const client = new Client(SERVER_URL);
  const room = await client.joinOrCreate("city", { name });
  const callbacks = Callbacks.get(room);
  return { room, callbacks };
}

// The type of the room object, so other files can store it.
export type CityRoom = Awaited<ReturnType<typeof joinCity>>["room"];