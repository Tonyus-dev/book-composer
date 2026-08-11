import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { TEMPLATE_LABELS, type Page } from "../../book/types";
import { folioFor } from "../../book/renderer/PageRenderer";
import { useEditor } from "../state/store";
import { PageThumbnail } from "../components/PageThumbnail";

function PageRow({ page, index }: { page: Page; index: number }) {
  const { book, selectedPageId, selectPage, duplicatePage, deletePage, addPage, issuesForPage } =
    useEditor();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  });
  const selected = page.id === selectedPageId;
  const issues = issuesForPage(page.id);
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-2 border-l-2 px-2 py-1.5 text-xs ${
        selected ? "border-l-primary bg-accent/60" : "border-l-transparent hover:bg-accent/30"
      } ${isDragging ? "opacity-60" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100"
        aria-label={`Mover página ${folioFor(book, index)}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={() => selectPage(page.id)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <PageThumbnail book={book} page={page} index={index} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-foreground">
            {page.fixed ? "🔒 " : ""}
            {page.title ?? TEMPLATE_LABELS[page.template]}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="border border-border px-1 py-px tracking-widest">
              {TEMPLATE_LABELS[page.template]}
            </span>
            <span className="tabular-nums">{folioFor(book, index)}</span>
            {errors > 0 ? <span className="text-destructive">✖ {errors}</span> : null}
            {warnings > 0 ? <span className="text-[#c08b2b]">⚠ {warnings}</span> : null}
          </span>
        </span>
      </button>

      <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => addPage(page.id)}
          aria-label="Adicionar página depois"
          className="p-1 text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => addPage(page.id, "blank")}
          aria-label="Adicionar Página em branco depois"
          title="Página em branco"
          className="p-1 text-muted-foreground hover:text-foreground"
        >
          BLANK
        </button>
        <button
          type="button"
          onClick={() => duplicatePage(page.id)}
          aria-label="Duplicar página"
          className="p-1 text-muted-foreground hover:text-foreground"
        >
          <Copy className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => deletePage(page.id)}
          aria-label="Excluir página"
          className="p-1 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </span>
    </div>
  );
}

/** Painel esquerdo: árvore do livro. Reorder por drag-and-drop na ordem física. */
export function StructurePanel() {
  const { book, movePage } = useEditor();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const toIndex = book.pages.findIndex((page) => page.id === over.id);
    movePage(String(active.id), toIndex);
  };

  const indexById = new Map(book.pages.map((page, index) => [page.id, index]));
  const grouped = book.nodes.map((node) => ({
    node,
    pages: node.pageIds
      .map((id) => book.pages.find((page) => page.id === id))
      .filter((page): page is Page => Boolean(page)),
  }));
  const orphans = book.pages.filter(
    (page) => !book.nodes.some((node) => node.pageIds.includes(page.id)),
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Livro
        </h2>
        <span className="text-[10px] text-muted-foreground">{book.pages.length} pág.</span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={book.pages.map((page) => page.id)}
            strategy={verticalListSortingStrategy}
          >
            {grouped.map(({ node, pages }) => {
              const isCollapsed = collapsed[node.id];
              return (
                <div key={node.id} className="mb-1">
                  <button
                    type="button"
                    onClick={() => setCollapsed((prev) => ({ ...prev, [node.id]: !prev[node.id] }))}
                    className="flex w-full items-center gap-1 px-2 py-1 text-[11px] tracking-wide text-muted-foreground hover:text-foreground"
                    aria-expanded={!isCollapsed}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )}
                    <span className="truncate">{node.label}</span>
                  </button>
                  {!isCollapsed
                    ? pages.map((page) => (
                        <PageRow key={page.id} page={page} index={indexById.get(page.id) ?? 0} />
                      ))
                    : null}
                </div>
              );
            })}

            {orphans.length > 0 ? (
              <div className="mb-1">
                <p className="px-2 py-1 text-[11px] text-muted-foreground">Sem seção</p>
                {orphans.map((page) => (
                  <PageRow key={page.id} page={page} index={indexById.get(page.id) ?? 0} />
                ))}
              </div>
            ) : null}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
