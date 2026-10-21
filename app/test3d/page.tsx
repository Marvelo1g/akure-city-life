// app/test3d/page.tsx
// The address /test3d. It shows the 3D test world, separate from the main 2D game.

import Scene3D from "@/components/Scene3D";

export default function Test3DPage() {
  return (
    <main className="h-dvh w-full">
      <Scene3D />
    </main>
  );
}