"use client";

// components/Chat.tsx
// The chat box at the bottom of the game: a list of recent messages,
// a text box, a Send button and a Hail button.
// Tap another player in the 3D world to whisper to them privately.

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  incomingChat,
  incomingWhisper,
  outgoingChat,
  outgoingWhisper,
  typingChannel,
  whisperTarget,
} from "@/game/bridge";
import { hails } from "@/data/slang";

// How many recent messages to show.
const MAX_SHOWN = 6;
// The longest message allowed. The server enforces the same limit.
const MAX_LENGTH = 120;

// One line in the message list: public chat or a private whisper.
type Entry = { name: string; text: string; whisper: boolean };

export default function Chat() {
  // The recent messages, and what the player is typing right now.
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  // Who we are whispering to, or nobody for public chat.
  const [whisperTo, setWhisperTo] = useState<{ id: string; name: string } | null>(null);

  // Adds one line and keeps only the latest few.
  function addEntry(entry: Entry) {
    setEntries((previous) => [...previous, entry].slice(-MAX_SHOWN));
  }

  // Public chat arriving from the game. The returned function stops listening
  // when this component is removed from the page.
  useEffect(() => {
    return incomingChat.on((message) => {
      addEntry({ name: message.name, text: message.text, whisper: false });
    });
  }, []);

  // Whispers arriving from the game, or ours being delivered.
  useEffect(() => {
    return incomingWhisper.on((whisper) => {
      addEntry({
        name: whisper.mine ? `To ${whisper.toName}` : `${whisper.name} whispers`,
        text: whisper.text,
        whisper: true,
      });
    });
  }, []);

  // The player tapped someone in the world (or that person left), so start or stop whispering.
  useEffect(() => {
    return whisperTarget.on((target) => setWhisperTo(target));
  }, []);

  // Runs when the player presses Enter or taps Send.
  function onSubmit(event: FormEvent) {
    event.preventDefault(); // stop the page from reloading
    const trimmed = text.trim().slice(0, MAX_LENGTH);
    if (!trimmed) return;

    if (whisperTo) {
      // Private: only that player gets it.
      outgoingWhisper.emit({ to: whisperTo.id, text: trimmed });
    } else {
      // Public: everyone in the room sees it.
      outgoingChat.emit(trimmed);
    }
    setText("");
  }

  // Sends a random FUTA greeting from our slang list, to everyone.
  function sendHail() {
    const general = hails.filter((hail) => hail.to === "anyone");
    const pick = general[Math.floor(Math.random() * general.length)];
    if (pick) outgoingChat.emit(pick.text);
  }

  return (
    // Sits at the bottom of the screen, above the phone's bottom bar.
    <div
      className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-2"
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Recent messages. pointer-events-none lets taps pass through to the game. */}
      <div className="pointer-events-none flex flex-col gap-0.5">
        {entries.map((entry, index) => (
          <div
            key={index}
            className={`w-fit max-w-full rounded px-2 py-0.5 text-xs text-white ${
              entry.whisper ? "bg-purple-700/85" : "bg-black/55"
            }`}
          >
            <span className={`font-bold ${entry.whisper ? "text-purple-200" : "text-yellow-300"}`}>
              {entry.name}:{" "}
            </span>
            {entry.text}
          </div>
        ))}
      </div>

      {/* Shows who we are whispering to, with a button to go back to public chat. */}
      {whisperTo && (
        <div className="flex w-fit items-center gap-2 rounded bg-purple-700/90 px-2 py-1 text-xs text-white">
          Whispering to {whisperTo.name}
          <button type="button" onClick={() => setWhisperTo(null)} className="font-bold">
            Cancel
          </button>
        </div>
      )}

      {/* The typing box and buttons. */}
      <form onSubmit={onSubmit} className="flex gap-1">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          // While typing, tell the game to ignore the keyboard so letters do not move the character.
          onFocus={() => typingChannel.emit(true)}
          onBlur={() => typingChannel.emit(false)}
          maxLength={MAX_LENGTH}
          placeholder={whisperTo ? `Whisper to ${whisperTo.name}...` : "Say something..."}
          className="min-w-0 flex-1 rounded bg-black/60 px-3 py-2 text-base text-white placeholder-white/50 outline-none"
        />
        <button
          type="submit"
          className={`rounded px-3 py-2 text-sm font-bold text-black ${whisperTo ? "bg-purple-300" : "bg-yellow-400"}`}
        >
          {whisperTo ? "Whisper" : "Send"}
        </button>
        <button
          type="button"
          onClick={sendHail}
          className="rounded bg-emerald-500 px-3 py-2 text-sm font-bold text-black"
        >
          Hail
        </button>
      </form>
    </div>
  );
}