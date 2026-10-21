// game3d/skins.ts
// The list of character skins we can choose from. A "skin" is the painted picture
// (face, clothes, shoes) that wraps around the same 3D character shape.
// Each name matches a picture in public/assets/3d/skins, for example skaterMaleA.png.
export const SKINS = ["skaterMaleA", "skaterFemaleA", "cyborgFemaleA"] as const;

// TypeScript type for "one of the names above".
export type SkinName = (typeof SKINS)[number];