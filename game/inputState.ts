// game/inputState.ts
// A tiny shared object that lets the React joystick talk to the Phaser game.
// The joystick writes the stick position here, and the game reads it every frame.
// x and y go from -1 to 1. Both are 0 when the stick is not being touched.
export const joystick = { x: 0, y: 0 };