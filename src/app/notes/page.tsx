import { Suspense } from "react";
import { NotesRoute } from "@/components/notes/NotesRoute";

export default function NotesPage() {
  return (
    <Suspense fallback={null}>
      <NotesRoute />
    </Suspense>
  );
}