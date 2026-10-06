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

// The key we use to remember the name for this browser tab.
const NAME_KEY = "acl-name";

// Finds out what name this player wants to use.
// This is temporary. Real names come with the character creator in Week 4.
function pickName(): string {
  // 1. A name in the address, like localhost:3000/?name=Tolu. Handy for testing with two tabs.
  const fromUrl = new URLSearchParams(window.location.search).get("name");
  if (fromUrl) return fromUrl;

  // 2. A name we already asked for in this tab.
  try {
    const saved = window.sessionStorage.getItem(NAME_KEY);
    if (saved) return saved;
  } catch {
    // Some browsers block storage. That is fine, we just ask again.
  }

  // 3. Ask the player. If they leave it empty, the server gives them a Guest name.
  const typed = window.prompt("What should we call you in Akure?") ?? "";
  const name = typed.trim().slice(0, 16);
  try {
    window.sessionStorage.setItem(NAME_KEY, name);
  } catch {
    // Ignore: the name still works for this visit.
  }
  return name;
}

// How many times we try to join, and how long we wait between tries.
// A free hosted server falls asleep when nobody plays, and can take up to a minute to wake.
const MAX_TRIES = 8;
// How many times we check that a sleeping server has woken up before joining.
const MAX_WAKE_TRIES = 15;
const WAIT_MS = 5000;

// Waits for a number of milliseconds.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Keeps asking the server's /health page until it answers "ok".
// A sleeping free server answers with a "waking up" page instead, which this check
// treats as "not ready yet". That way we only try to join once the server is really awake.
async function waitForServer(url: string): Promise<void> {
  for (let attempt = 1; attempt <= MAX_WAKE_TRIES; attempt++) {
    try {
      const response = await fetch(`${url}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000), // give up on one check after 10 seconds
      });
      if ((await response.text()).trim() === "ok") return; // the server is awake
    } catch {
      // No answer yet, or the sleeping server's page. Wait and ask again.
    }
    console.warn(`Waiting for the city server to wake up (check ${attempt} of ${MAX_WAKE_TRIES})...`);
    await sleep(WAIT_MS);
  }
}

// Connects to the server and joins the "city" room.
// Returns the room (to send messages) and callbacks (to hear about changes).
export async function joinCity(onStatus?: (text: string) => void) {
  // Check for a server first, so we never ask for a name when there is nowhere to join.
  const url = serverUrl();
  if (!url) throw new Error("No game server configured");

  // Ask for the name once, before the tries, so we do not ask again each time.
  const name = pickName();
  // Make sure the server is awake first.
  console.info("Connecting to the city server at", url);
  onStatus?.("Waking the city server. This can take a minute...");
  await waitForServer(url);

  onStatus?.("Joining the city...");

  const client = new Client(url);

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      const room = await client.joinOrCreate("city", { name });
      console.info("Joined the city as", room.sessionId);
      const callbacks = Callbacks.get(room);
      return { room, callbacks };
    } catch (error) {
      // The server may still be waking up. Wait a little and try again.
      lastError = error;
      console.warn(`Could not join the city (try ${attempt} of ${MAX_TRIES}). Trying again...`);
      await sleep(WAIT_MS);
    }
  }
  // We tried everything. The game carries on alone.
  throw lastError;
}

// The type of the room object, so other files can store it.
export type CityRoom = Awaited<ReturnType<typeof joinCity>>["room"];