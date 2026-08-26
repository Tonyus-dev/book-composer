import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { EditorLayout } from "../editor/EditorLayout";

const title = "Book Maker — editor de livros";
const description = "Editor genérico de livros: monte, revise e exporte qualquer obra em PDF 1:1.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <h1 className="sr-only">Book Maker</h1>
      <ClientOnly
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-background text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Carregando editor…
          </div>
        }
      >
        <EditorLayout />
      </ClientOnly>
    </>
  );
}
