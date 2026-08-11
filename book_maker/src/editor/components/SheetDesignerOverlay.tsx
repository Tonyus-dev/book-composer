import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { SheetBlock, SheetElement, SheetElementType } from "../../book/types";
import { sheetElement } from "../../book/sheetModel";
import { useEditor } from "../state/store";

type Box = { left: number; top: number; width: number; height: number };

const ELEMENT_BUTTONS: Array<{ type: SheetElementType; label: string }> = [
  { type: "text", label: "Texto" },
  { type: "text-field", label: "Campo" },
  { type: "number-field", label: "Número" },
  { type: "checkbox", label: "Checkbox" },
  { type: "scale", label: "Escala" },
  { type: "line", label: "Linha" },
  { type: "divider", label: "Seção" },
  { type: "text-area", label: "Área" },
  { type: "calculated", label: "Calculado" },
  { type: "choice", label: "Escolha" },
  { type: "image", label: "Imagem" },
  { type: "table", label: "Tabela" },
  { type: "repeater", label: "Repeater" },
];

function sheetPages(block: SheetBlock, root: HTMLElement | null) {
  const pages = Array.from(root?.querySelectorAll<HTMLElement>("[data-sheet-page-id]") ?? []);
  return pages
    .map((node, index) => ({ node, page: block.sheet.pages[index]! }))
    .filter((item) => item.page);
}

function updateElements(
  block: SheetBlock,
  pageIndex: number,
  transform: (elements: SheetElement[]) => SheetElement[],
) {
  return {
    ...block.sheet,
    pages: block.sheet.pages.map((page, index) =>
      index === pageIndex ? { ...page, elements: transform(page.elements) } : page,
    ),
  };
}

function defaultElement(type: SheetElementType, id: string): SheetElement {
  const base = {
    x: 18,
    y: 18,
    width: type === "line" || type === "divider" ? 80 : 36,
    height: type === "line" || type === "divider" ? 0.5 : 10,
  };
  if (type === "text")
    return sheetElement(id, type, base, {
      text: "Novo texto",
      style: { fontSize: 4, fontWeight: 600 },
    });
  if (type === "divider" || type === "line")
    return sheetElement(id, type, base, {
      style: { background: "#59324f", borderColor: "#59324f" },
    });
  if (type === "checkbox")
    return sheetElement(
      id,
      type,
      { ...base, width: 7, height: 7 },
      {
        key: `field.${id}`,
        label: "Ativo",
        style: { borderColor: "#59324f", borderWidth: 0.3, borderStyle: "solid" },
      },
    );
  if (type === "scale")
    return sheetElement(
      id,
      type,
      { ...base, width: 42 },
      { key: `field.${id}`, min: 1, max: 4, label: "Nível" },
    );
  if (type === "text-area")
    return sheetElement(
      id,
      type,
      { ...base, width: 70, height: 24 },
      {
        key: `field.${id}`,
        label: "Notas",
        style: { borderColor: "#8b7785", borderWidth: 0.2, borderStyle: "solid" },
      },
    );
  if (type === "calculated")
    return sheetElement(id, type, base, {
      key: `calculated.${id}`,
      formula: "base + bonus",
      text: "0",
      style: { fontWeight: 600 },
    });
  if (type === "image")
    return sheetElement(id, type, base, {
      alt: "Imagem da ficha",
      style: { borderColor: "#8b7785", borderWidth: 0.2, borderStyle: "dashed" },
    });
  if (type === "table")
    return sheetElement(
      id,
      type,
      { ...base, width: 70, height: 25 },
      {
        text: "Tabela",
        style: { borderColor: "#8b7785", borderWidth: 0.2, borderStyle: "solid" },
      },
    );
  if (type === "repeater")
    return sheetElement(
      id,
      type,
      { ...base, width: 70, height: 30 },
      {
        label: "Itens",
        repeatCount: 4,
        style: { borderColor: "#8b7785", borderWidth: 0.2, borderStyle: "dashed" },
      },
    );
  return sheetElement(id, type, base, {
    key: `field.${id}`,
    label: type === "number-field" ? "Número" : "Campo",
    placeholder: "Preencher",
  });
}

export function SheetDesignerOverlay({
  pageRef,
  pageId,
  block,
  updateBlock,
}: {
  pageRef: RefObject<HTMLDivElement | null>;
  pageId: string;
  block: SheetBlock;
  updateBlock: (pageId: string, blockId: string, patch: Record<string, unknown>) => void;
}) {
  const { saveSheetTemplate, createSheetInstance } = useEditor();
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [box, setBox] = useState<Box | null>(null);
  const [moving, setMoving] = useState<{
    id: string;
    resize: boolean;
    startX: number;
    startY: number;
    start: SheetElement;
  } | null>(null);
  const currentPage = block.sheet.pages[pageIndex] ?? block.sheet.pages[0];

  const sync = useCallback(() => {
    const current = sheetPages(block, pageRef.current)[pageIndex];
    const pageElement = pageRef.current;
    if (!current || !pageElement) {
      setBox(null);
      return;
    }
    const pageRect = pageElement.getBoundingClientRect();
    const targetRect = current.node.getBoundingClientRect();
    setBox({
      left: targetRect.left - pageRect.left,
      top: targetRect.top - pageRect.top,
      width: targetRect.width,
      height: targetRect.height,
    });
  }, [block, pageIndex, pageRef]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(sync);
    return () => window.cancelAnimationFrame(frame);
  }, [sync]);
  useEffect(() => {
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [sync]);

  if (!box || !currentPage) return null;
  const selected = currentPage.elements.filter((element) => selectedIds.includes(element.id));
  const patchSheet = (sheet: SheetBlock["sheet"]) => updateBlock(pageId, block.id, { sheet });

  const add = (type: SheetElementType) => {
    const id = `${block.sheet.id}-element-${Date.now().toString(36)}`;
    const offset = (currentPage.elements.length % 8) * 6;
    const baseElement = defaultElement(type, id);
    const element = {
      ...baseElement,
      rect: { ...baseElement.rect, x: baseElement.rect.x + offset, y: baseElement.rect.y + offset },
    };
    patchSheet(updateElements(block, pageIndex, (elements) => [...elements, element]));
    setSelectedIds([id]);
  };

  const changeMode = (mode: "design" | "fill") => patchSheet({ ...block.sheet, mode });
  const saveTemplate = () => {
    const templateId = block.sheet.templateId ?? `sheet-template-${Date.now().toString(36)}`;
    const sheet = { ...block.sheet, templateId, mode: "design" as const };
    patchSheet(sheet);
    saveSheetTemplate(sheet);
  };
  const createInstance = () => {
    if (!block.sheet.templateId) return;
    createSheetInstance(block.sheet.templateId, block.sheet.values);
  };
  const duplicate = () => {
    if (!selected.length) return;
    const copies = selected.map((element, index) => ({
      ...element,
      id: `${block.sheet.id}-copy-${Date.now().toString(36)}-${index}`,
      rect: { ...element.rect, x: element.rect.x + 4, y: element.rect.y + 4 },
    }));
    patchSheet(updateElements(block, pageIndex, (elements) => [...elements, ...copies]));
    setSelectedIds(copies.map((element) => element.id));
  };
  const alignLeft = () => {
    if (selected.length < 2) return;
    const x = Math.min(...selected.map((element) => element.rect.x));
    patchSheet(
      updateElements(block, pageIndex, (elements) =>
        elements.map((element) =>
          selectedIds.includes(element.id) ? { ...element, rect: { ...element.rect, x } } : element,
        ),
      ),
    );
  };
  const group = () => {
    if (selected.length < 2) return;
    const id = `${block.sheet.id}-group-${Date.now().toString(36)}`;
    const x = Math.min(...selected.map((element) => element.rect.x));
    const y = Math.min(...selected.map((element) => element.rect.y));
    const right = Math.max(...selected.map((element) => element.rect.x + element.rect.width));
    const bottom = Math.max(...selected.map((element) => element.rect.y + element.rect.height));
    const groupElement = sheetElement(
      id,
      "group",
      { x, y, width: right - x, height: bottom - y },
      { childIds: selectedIds, text: "Grupo" },
    );
    patchSheet(updateElements(block, pageIndex, (elements) => [...elements, groupElement]));
    setSelectedIds([id]);
  };
  const ungroup = () => {
    const selectedGroup = selected.find((element) => element.type === "group");
    if (!selectedGroup) return;
    patchSheet(
      updateElements(block, pageIndex, (elements) =>
        elements.filter((element) => element.id !== selectedGroup.id),
      ),
    );
    setSelectedIds(selectedGroup.childIds ?? []);
  };

  const onPointerDown = (
    event: ReactPointerEvent<HTMLElement>,
    element: SheetElement,
    resize: boolean,
  ) => {
    if (block.sheet.mode === "fill" || element.locked) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedIds((ids) =>
      event.shiftKey || event.metaKey || event.ctrlKey
        ? ids.includes(element.id)
          ? ids.filter((id) => id !== element.id)
          : [...ids, element.id]
        : [element.id],
    );
    event.currentTarget.setPointerCapture(event.pointerId);
    setMoving({
      id: element.id,
      resize,
      startX: event.clientX,
      startY: event.clientY,
      start: element,
    });
    const startX = event.clientX;
    const startY = event.clientY;
    const onWindowMove = (moveEvent: PointerEvent) => {
      const mmX = (moveEvent.clientX - startX) / (box.width / currentPage.widthMm);
      const mmY = (moveEvent.clientY - startY) / (box.height / currentPage.heightMm);
      const rect = resize
        ? {
            ...element.rect,
            width: Math.max(3, element.rect.width + mmX),
            height: Math.max(0.5, element.rect.height + mmY),
          }
        : {
            ...element.rect,
            x: Math.max(
              0,
              Math.min(currentPage.widthMm - element.rect.width, element.rect.x + mmX),
            ),
            y: Math.max(
              0,
              Math.min(currentPage.heightMm - element.rect.height, element.rect.y + mmY),
            ),
          };
      const groupChildren =
        !resize && element.type === "group"
          ? new Set(element.childIds ?? [])
          : new Set([element.id]);
      patchSheet(
        updateElements(block, pageIndex, (elements) =>
          elements.map((candidate) => {
            if (resize) return candidate.id === element.id ? { ...candidate, rect } : candidate;
            if (candidate.id === element.id) return { ...candidate, rect };
            if (groupChildren.has(candidate.id))
              return {
                ...candidate,
                rect: { ...candidate.rect, x: candidate.rect.x + mmX, y: candidate.rect.y + mmY },
              };
            return candidate;
          }),
        ),
      );
    };
    const onWindowUp = () => {
      window.removeEventListener("pointermove", onWindowMove);
      setMoving(null);
    };
    window.addEventListener("pointermove", onWindowMove);
    window.addEventListener("pointerup", onWindowUp, { once: true });
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!moving || !box) return;
    const mmX = (event.clientX - moving.startX) / (box.width / currentPage.widthMm);
    const mmY = (event.clientY - moving.startY) / (box.height / currentPage.heightMm);
    const start = moving.start;
    const rect = moving.resize
      ? {
          ...start.rect,
          width: Math.max(3, start.rect.width + mmX),
          height: Math.max(0.5, start.rect.height + mmY),
        }
      : {
          ...start.rect,
          x: Math.max(0, Math.min(currentPage.widthMm - start.rect.width, start.rect.x + mmX)),
          y: Math.max(0, Math.min(currentPage.heightMm - start.rect.height, start.rect.y + mmY)),
        };
    patchSheet(
      updateElements(block, pageIndex, (elements) =>
        elements.map((element) => (element.id === moving.id ? { ...element, rect } : element)),
      ),
    );
  };

  return (
    <div
      className="k-sheet-designer"
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      data-testid="sheet-designer"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="k-sheet-designer__toolbar" onPointerDown={(event) => event.stopPropagation()}>
        <strong>Sheet · {block.sheet.name}</strong>
        <span className="k-sheet-designer__pages">
          {block.sheet.pages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              className={index === pageIndex ? "is-active" : ""}
              onClick={() => {
                setPageIndex(index);
                setSelectedIds([]);
              }}
            >
              {index + 1}
            </button>
          ))}
        </span>
        <button
          type="button"
          className={block.sheet.mode !== "fill" ? "is-active" : ""}
          onClick={() => changeMode("design")}
        >
          Design
        </button>
        <button
          type="button"
          className={block.sheet.mode === "fill" ? "is-active" : ""}
          onClick={() => changeMode("fill")}
        >
          Preencher
        </button>
        <button type="button" onClick={saveTemplate}>
          Salvar modelo
        </button>
        <button type="button" onClick={createInstance} disabled={!block.sheet.templateId}>
          Nova instância
        </button>
        {ELEMENT_BUTTONS.map((entry) => (
          <button key={entry.type} type="button" onClick={() => add(entry.type)}>
            {entry.label}
          </button>
        ))}
        <button type="button" onClick={duplicate} disabled={!selected.length}>
          Duplicar
        </button>
        <button type="button" onClick={alignLeft} disabled={selected.length < 2}>
          Alinhar
        </button>
        <button type="button" onClick={group} disabled={selected.length < 2}>
          Agrupar
        </button>
        <button
          type="button"
          onClick={ungroup}
          disabled={selected.length !== 1 || selected[0]?.type !== "group"}
        >
          Desagrupar
        </button>
      </div>
      {currentPage.elements.map((element) => (
        <div
          key={element.id}
          className={`k-sheet-designer__handle${selectedIds.includes(element.id) ? " is-selected" : ""}`}
          style={{
            left: `${(element.rect.x / currentPage.widthMm) * 100}%`,
            top: `${(element.rect.y / currentPage.heightMm) * 100}%`,
            width: `${(element.rect.width / currentPage.widthMm) * 100}%`,
            height: `${(element.rect.height / currentPage.heightMm) * 100}%`,
          }}
          onPointerDown={(event) => onPointerDown(event, element, false)}
          onPointerMove={onPointerMove}
          onPointerUp={() => setMoving(null)}
          data-sheet-design-element-id={element.id}
        >
          {selectedIds.includes(element.id) ? (
            <button
              type="button"
              className="k-sheet-designer__resize"
              aria-label={`Redimensionar ${element.label ?? element.type}`}
              onPointerDown={(event) => {
                event.stopPropagation();
                onPointerDown(event, element, true);
              }}
              onPointerMove={onPointerMove}
              onPointerUp={() => setMoving(null)}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
