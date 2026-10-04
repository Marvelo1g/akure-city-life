"use client";

// components/Joystick.tsx
// An on-screen joystick for phones. It only shows on touch screens.
// It writes its position into the shared "joystick" object, which the game reads.

import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import { joystick } from "@/game/inputState";

// How far the knob can move from the center, in pixels.
const RADIUS = 48;
// Pushes smaller than this (out of 1) are ignored, so a resting thumb does not move the player.
const DEADZONE = 0.2;

export default function Joystick() {
  // The round base, used to find the center of the joystick.
  const baseRef = useRef<HTMLDivElement>(null);
  // Where the knob is drawn, relative to the center.
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  // Which finger is controlling the joystick (phones can have many fingers).
  const activeId = useRef<number | null>(null);

  // Works out the knob position and the stick value from a touch position.
  function update(e: PointerEvent<HTMLDivElement>) {
    const base = baseRef.current;
    if (!base) return;

    // Distance from the center of the base to the finger.
    const rect = base.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);

    // If the finger goes past the edge, pull the knob back to the edge.
    const dist = Math.hypot(dx, dy);
    const scale = dist > RADIUS ? RADIUS / dist : 1;
    const kx = dx * scale;
    const ky = dy * scale;
    setKnob({ x: kx, y: ky });

    // Turn the knob position into a value between -1 and 1.
    const nx = kx / RADIUS;
    const ny = ky / RADIUS;
    if (Math.hypot(nx, ny) < DEADZONE) {
      joystick.x = 0;
      joystick.y = 0;
    } else {
      joystick.x = nx;
      joystick.y = ny;
    }
  }

  // Finger touches the joystick.
  function onDown(e: PointerEvent<HTMLDivElement>) {
    activeId.current = e.pointerId;
    // Keep receiving this finger's moves even if it slides outside the base.
    e.currentTarget.setPointerCapture(e.pointerId);
    update(e);
  }

  // Finger moves. Ignore other fingers.
  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerId === activeId.current) update(e);
  }

  // Finger lifts: put the knob back in the middle and stop the player.
  function onUp(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerId !== activeId.current) return;
    activeId.current = null;
    setKnob({ x: 0, y: 0 });
    joystick.x = 0;
    joystick.y = 0;
  }

  return (
    // "hidden" plus the pointer:coarse rule means: only show on touch screens.
    <div
      ref={baseRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="fixed left-6 hidden h-32 w-32 touch-none select-none rounded-full border border-white/30 bg-white/10 [@media(pointer:coarse)]:block"
      // Keep it above the phone's bottom bar.
      style={{ bottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* The knob that follows the thumb. */}
      <div
        className="absolute left-1/2 top-1/2 -ml-6 -mt-6 h-12 w-12 rounded-full bg-white/50"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}