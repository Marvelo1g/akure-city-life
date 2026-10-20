"use client";

// components/Chat.tsx
// The chat box at the bottom of the game: a list of recent messages,
// a text box, a Send button and a Hail button.

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { incomingChat, outgoingChat, typingChannel, type ChatMessage } from "@/game/bridge";
import { hails } from "@/data/slang";

// How many recent messages to show.
const MAX_SHOWN = 6;
// The longest message allowed. The server enforces the same limit.
const MAX_LENGTH = 120;

export default function Chat() {
  // The recent messages, and what the player is typing right now.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");

  // Listen for messages arriving from the game. The returned function stops listening
  // when this component is removed from the page.
  useEffect(() => {
    return incomingChat.on((message) => {
      // Add the new message at the end and keep only the latest few.
      setMessages((previous) => [...previous, message].slice(-MAX_SHOWN));
    });
  }, []);

  // Runs when the player presses Enter or taps Send.
  function onSubmit(event: FormEvent) {
    event.preventDefault(); // stop the page from reloading
    const trimmed = text.trim().slice(0, MAX_LENGTH);
    if (!trimmed) return;
    outgoingChat.emit(trimmed); // the game sends it to the server
    setText("");
  }

  // Sends a random FUTA greeting from our slang list.
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
        {messages.map((message, index) => (
          <div
            key={index}
            className="w-fit max-w-full rounded bg-black/55 px-2 py-0.5 text-xs text-white"
          >
            <span className="font-bold text-yellow-300">{message.name}: </span>
            {message.text}
          </div>
        ))}
      </div>

      {/* The typing box and buttons. */}
      <form onSubmit={onSubmit} className="flex gap-1">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          // While typing, tell the game to ignore the keyboard so letters do not move the character.
          onFocus={() => typingChannel.emit(true)}
          onBlur={() => typingChannel.emit(false)}
          maxLength={MAX_LENGTH}
          placeholder="Say something..."
          className="min-w-0 flex-1 rounded bg-black/60 px-3 py-2 text-base text-white placeholder-white/50 outline-none"
        />
        <button type="submit" className="rounded bg-yellow-400 px-3 py-2 text-sm font-bold text-black">
          Send
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