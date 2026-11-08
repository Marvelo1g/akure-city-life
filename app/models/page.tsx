// app/models/page.tsx
// The address /models. It shows every building model so you can choose which to use.

import ModelGallery from "@/components/ModelGallery";

export default function ModelsPage() {
  return (
    <main className="h-dvh w-full">
      <ModelGallery />
    </main>
  );
}