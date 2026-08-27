import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import type { TableBlockV2, TableCell, TableGraphic, TableGraphicKind } from "../../book/types";
import {
  addTableColumn,
  addTableRow,
  applyTableMatrix,
  BUILT_IN_TABLE_PRESETS,
  mergeCells,
  moveTableColumn,
  moveTableRow,
  normalizeTableBlock,
  parseTabularText,
  removeTableColumn,
  removeTableRow,
  resizeTableColumns,
  setCellsAlign,
  setCellsStyle,
  setCellsVerticalAlign,
  tableGrid,
  tableToTsv,
  unmergeCell,
} from "../../book/tableModel";
import { useEditor } from "../state/store";

type CellBox = { id: string; left: number; top: number; width: number; height: number };

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

function cellIdsInRange(
  table: TableBlockV2,
  from: { rowIndex: number; columnIndex: number },
  to: { rowIndex: number; columnIndex: number },
) {
  const grid = tableGrid(table);
  const minRow = Math.min(from.rowIndex, to.rowIndex);
  const maxRow = Math.max(from.rowIndex, to.rowIndex);
  const minCol = Math.min(from.columnIndex, to.columnIndex);
  const maxCol = Math.max(from.columnIndex, to.columnIndex);
  return uniqueIds(
    grid.slice(minRow, maxRow + 1).flatMap((row) =>
      row
        .slice(minCol, maxCol + 1)
        .filter(Boolean)
        .map((entry) => entry!.cell.id),
    ),
  );
}

function cellPosition(table: TableBlockV2, id: string) {
  const entry = tableGrid(table)
    .flat()
    .find((item) => item.cell.id === id);
  return entry ? { rowIndex: entry.rowIndex, columnIndex: entry.columnIndex } : null;
}

export function TableEditorOverlay({
  pageRef,
  pageId,
  block,
  updateTable,
}: {
  pageRef: RefObject<HTMLDivElement | null>;
  pageId: string;
  block: TableBlockV2;
  updateTable: (
    pageId: string,
    blockId: string,
    transform: (table: TableBlockV2) => TableBlockV2,
  ) => void;
}) {
  const [tableBox, setTableBox] = useState<CellBox | null>(null);
  const [cells, setCells] = useState<CellBox[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [selectedGraphicId, setSelectedGraphicId] = useState<string | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const graphicCleanupRef = useRef<(() => void) | null>(null);
  const { book, duplicateTable, saveTablePreset, splitTable } = useEditor();
  const normalized = normalizeTableBlock(block);
  const firstCellId = normalized.rows[0]?.cells[0]?.id;
  const selectedSet = new Set(selectedIds);

  const syncGeometry = useCallback(() => {
    const pageElement = pageRef.current;
    if (!pageElement) return;
    const target = Array.from(pageElement.querySelectorAll<HTMLElement>("[data-block-id]")).find(
      (element) => element.dataset["blockId"] === normalized.id,
    );
    if (!target) return;
    const pageRect = pageElement.getBoundingClientRect();
    const tableElement = target.querySelector<HTMLElement>("[data-table-id]") ?? target;
    const tableRect = tableElement.getBoundingClientRect();
    const scale = pageElement.offsetWidth > 0 ? pageRect.width / pageElement.offsetWidth : 1;
    setTableBox({
      id: normalized.id,
      left: (tableRect.left - pageRect.left) / scale,
      top: (tableRect.top - pageRect.top) / scale,
      width: tableRect.width / scale,
      height: tableRect.height / scale,
    });
    setCells(
      Array.from(tableElement.querySelectorAll<HTMLTableCellElement>("[data-table-cell-id]")).map(
        (cell) => {
          const rect = cell.getBoundingClientRect();
          return {
            id: cell.dataset["tableCellId"] ?? "",
            left: (rect.left - tableRect.left) / scale,
            top: (rect.top - tableRect.top) / scale,
            width: rect.width / scale,
            height: rect.height / scale,
          };
        },
      ),
    );
  }, [normalized.id, pageRef]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(syncGeometry);
    return () => window.cancelAnimationFrame(frame);
  }, [syncGeometry, normalized.rows, normalized.columns]);

  useEffect(() => {
    window.addEventListener("resize", syncGeometry);
    window.addEventListener("scroll", syncGeometry, true);
    return () => {
      window.removeEventListener("resize", syncGeometry);
      window.removeEventListener("scroll", syncGeometry, true);
    };
  }, [syncGeometry]);

  useEffect(() => {
    setSelectedIds(firstCellId ? [firstCellId] : []);
    setAnchorId(firstCellId ?? null);
    setEditingId(null);
  }, [firstCellId, normalized.id]);

  useEffect(() => () => graphicCleanupRef.current?.(), []);

  const apply = (transform: (table: TableBlockV2) => TableBlockV2) =>
    updateTable(pageId, normalized.id, transform);

  const selectedCell = normalized.rows
    .flatMap((row) => row.cells)
    .find((cell) => cell.id === selectedIds[0]);

  const selectCell = (id: string, extend = false) => {
    const position = cellPosition(normalized, id);
    if (!position) return;
    if (extend && anchorId) {
      const anchor = cellPosition(normalized, anchorId);
      if (anchor) {
        setSelectedIds(cellIdsInRange(normalized, anchor, position));
        return;
      }
    }
    setSelectedIds([id]);
    setAnchorId(id);
  };

  const beginEdit = (cell: TableCell) => {
    setSelectedIds([cell.id]);
    setAnchorId(cell.id);
    setEditingId(cell.id);
    setDraft(cell.content);
  };

  const commitEdit = () => {
    if (!editingId) return;
    apply((table) => ({
      ...table,
      rows: table.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) =>
          cell.id === editingId ? { ...cell, content: draft } : cell,
        ),
      })),
    }));
    setEditingId(null);
  };

  const moveSelection = (direction: "left" | "right" | "up" | "down") => {
    const current = cellPosition(normalized, selectedIds[0] ?? "");
    if (!current) return;
    const row =
      direction === "up"
        ? current.rowIndex - 1
        : direction === "down"
          ? current.rowIndex + 1
          : current.rowIndex;
    const column =
      direction === "left"
        ? current.columnIndex - 1
        : direction === "right"
          ? current.columnIndex + 1
          : current.columnIndex;
    const next = tableGrid(normalized)[row]?.[column]?.cell.id;
    if (next) {
      selectCell(next);
      window.requestAnimationFrame(() => cellRefs.current.get(next)?.focus());
    }
  };

  const handleCellKeyDown = (event: KeyboardEvent<HTMLButtonElement>, cell: TableCell) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
      event.preventDefault();
      duplicateTable(pageId, normalized.id);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      event.preventDefault();
      const text = tableToTsv(normalized, selectedSet);
      void navigator.clipboard?.writeText(text);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      beginEdit(cell);
    } else if (event.key === "Tab") {
      event.preventDefault();
      const flat = tableGrid(normalized)
        .flat()
        .filter(Boolean)
        .map((entry) => entry!.cell.id);
      const index = flat.indexOf(cell.id);
      const nextId = flat[index + (event.shiftKey ? -1 : 1)];
      if (nextId) selectCell(nextId);
      else if (!event.shiftKey) apply((table) => addTableRow(table));
    } else if (event.key === "Escape") {
      event.preventDefault();
      setSelectedIds([]);
      setAnchorId(null);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      apply((table) => ({
        ...table,
        rows: table.rows.map((row) => ({
          ...row,
          cells: row.cells.map((current) =>
            selectedSet.has(current.id) ? { ...current, content: "" } : current,
          ),
        })),
      }));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelection("left");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveSelection("right");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection("up");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection("down");
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLElement>) => {
    const text = event.clipboardData.getData("text/plain");
    const matrix = parseTabularText(text);
    if (
      matrix.length === 1 &&
      matrix[0]?.length === 1 &&
      event.currentTarget.tagName === "TEXTAREA"
    )
      return;
    event.preventDefault();
    const start = cellPosition(normalized, editingId ?? selectedIds[0] ?? "");
    if (start) apply((table) => applyTableMatrix(table, start.rowIndex, start.columnIndex, matrix));
    setEditingId(null);
  };

  const startColumnResize = (columnIndex: number, event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const width = tableBox?.width ?? 1;
    const leftId = normalized.columns[columnIndex]?.id;
    if (!leftId) return;
    const onMove = (move: globalThis.PointerEvent) => {
      apply((table) => resizeTableColumns(table, leftId, (move.clientX - startX) / width));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      syncGeometry();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const startRowResize = (rowIndex: number, event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rowEntry = tableGrid(normalized)[rowIndex]?.find((entry) => entry.rowIndex === rowIndex);
    const row = normalized.rows[rowIndex];
    const rowCell = rowEntry ? cells.find((cell) => cell.id === rowEntry.cell.id) : null;
    if (!row || !rowCell) return;
    graphicCleanupRef.current?.();
    const pointerTarget = event.currentTarget;
    const pointerId = event.pointerId;
    pointerTarget.setPointerCapture(pointerId);
    const startY = event.clientY;
    const startHeightPx = rowCell.height;
    const pageElement = pageRef.current;
    const pageRect = pageElement?.getBoundingClientRect();
    const scale =
      pageElement && pageElement.offsetWidth > 0 && pageRect
        ? pageRect.width / pageElement.offsetWidth
        : 1;
    const onMove = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.buttons === 0) {
        stop();
        return;
      }
      const nextHeight = Math.max(
        4,
        (startHeightPx + (moveEvent.clientY - startY) / scale) / (96 / 25.4),
      );
      apply((table) => ({
        ...table,
        rows: table.rows.map((current, index) =>
          index === rowIndex ? { ...current, minHeight: nextHeight } : current,
        ),
      }));
    };
    const stop = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      pointerTarget.removeEventListener("lostpointercapture", stop);
      try {
        if (pointerTarget.hasPointerCapture(pointerId))
          pointerTarget.releasePointerCapture(pointerId);
      } catch {
        /* o ponteiro pode já ter sido liberado pelo navegador */
      }
      if (graphicCleanupRef.current === stop) graphicCleanupRef.current = null;
      syncGeometry();
    };
    graphicCleanupRef.current = stop;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
    pointerTarget.addEventListener("lostpointercapture", stop);
  };

  const addGraphic = (kind: TableGraphicKind) => {
    const graphic: TableGraphic = {
      id: `table-graphic-${Date.now().toString(36)}`,
      kind,
      x: kind === "line" ? 12 : 24,
      y: kind === "line" ? 50 : 28,
      width: kind === "line" ? 76 : 52,
      height: kind === "line" ? 1 : kind === "label" ? 12 : 28,
      stroke: "#542869",
      fill: kind === "label" ? "#eee7f0" : "transparent",
      strokeWidth: "0.4mm",
      ...(kind === "label" ? { text: "Elemento" } : {}),
    };
    apply((table) => ({ ...table, graphics: [...(table.graphics ?? []), graphic] }));
    setSelectedGraphicId(graphic.id);
  };

  const removeSelectedGraphic = () => {
    if (!selectedGraphicId) return;
    apply((table) => ({
      ...table,
      graphics: (table.graphics ?? []).filter((graphic) => graphic.id !== selectedGraphicId),
    }));
    setSelectedGraphicId(null);
  };

  const startGraphicTransform = (
    graphicId: string,
    resize: boolean,
    event: PointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const graphic = (normalized.graphics ?? []).find((item) => item.id === graphicId);
    if (!graphic || !tableBox) return;
    setSelectedGraphicId(graphicId);
    graphicCleanupRef.current?.();
    const pointerTarget = event.currentTarget;
    const pointerId = event.pointerId;
    pointerTarget.setPointerCapture(pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const onMove = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.buttons === 0) {
        stop();
        return;
      }
      const dx = ((moveEvent.clientX - startX) / tableBox.width) * 100;
      const dy = ((moveEvent.clientY - startY) / tableBox.height) * 100;
      apply((table) => ({
        ...table,
        graphics: (table.graphics ?? []).map((current) => {
          if (current.id !== graphicId) return current;
          if (resize) {
            return {
              ...current,
              width: Math.max(4, Math.min(96 - current.x, graphic.width + dx)),
              height: Math.max(1, Math.min(96 - current.y, graphic.height + dy)),
            };
          }
          return {
            ...current,
            x: Math.max(0, Math.min(96 - current.width, graphic.x + dx)),
            y: Math.max(0, Math.min(96 - current.height, graphic.y + dy)),
          };
        }),
      }));
    };
    const stop = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      pointerTarget.removeEventListener("lostpointercapture", stop);
      try {
        if (pointerTarget.hasPointerCapture(pointerId))
          pointerTarget.releasePointerCapture(pointerId);
      } catch {
        /* o ponteiro pode já ter sido liberado pelo navegador */
      }
      if (graphicCleanupRef.current === stop) graphicCleanupRef.current = null;
    };
    graphicCleanupRef.current = stop;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
    pointerTarget.addEventListener("lostpointercapture", stop);
  };

  if (!tableBox) return null;
  const presets = [...BUILT_IN_TABLE_PRESETS, ...(book.tableStyles ?? [])];

  return (
    <div
      className="k-editor-table-overlay"
      style={{
        left: tableBox.left,
        top: tableBox.top,
        width: tableBox.width,
        height: tableBox.height,
      }}
      data-testid="table-editor-overlay"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="k-editor-table-toolbar" role="toolbar" aria-label="Ferramentas da tabela">
        <button
          type="button"
          onClick={() =>
            apply((table) =>
              addTableRow(
                table,
                (cellPosition(table, selectedIds[0] ?? "")?.rowIndex ?? table.rows.length - 1) + 1,
              ),
            )
          }
        >
          + linha
        </button>
        <button
          type="button"
          onClick={() =>
            apply((table) =>
              addTableColumn(
                table,
                (cellPosition(table, selectedIds[0] ?? "")?.columnIndex ??
                  table.columns.length - 1) + 1,
              ),
            )
          }
        >
          + coluna
        </button>
        <button
          type="button"
          onClick={() =>
            apply((table) =>
              removeTableRow(
                table,
                table.rows[cellPosition(table, selectedIds[0] ?? "")?.rowIndex ?? 0]?.id ?? "",
              ),
            )
          }
        >
          − linha
        </button>
        <button
          type="button"
          onClick={() =>
            apply((table) =>
              removeTableColumn(
                table,
                table.columns[cellPosition(table, selectedIds[0] ?? "")?.columnIndex ?? 0]?.id ??
                  "",
              ),
            )
          }
        >
          − coluna
        </button>
        <button
          type="button"
          onClick={() => {
            const position = cellPosition(normalized, selectedIds[0] ?? "");
            if (position && position.rowIndex > 0)
              apply((table) =>
                moveTableRow(table, table.rows[position.rowIndex]!.id, position.rowIndex - 1),
              );
          }}
        >
          ↑ linha
        </button>
        <button
          type="button"
          onClick={() => {
            const position = cellPosition(normalized, selectedIds[0] ?? "");
            if (position && position.rowIndex < normalized.rows.length - 1)
              apply((table) =>
                moveTableRow(table, table.rows[position.rowIndex]!.id, position.rowIndex + 1),
              );
          }}
        >
          ↓ linha
        </button>
        <button
          type="button"
          onClick={() => {
            const position = cellPosition(normalized, selectedIds[0] ?? "");
            if (position && position.columnIndex > 0)
              apply((table) =>
                moveTableColumn(
                  table,
                  table.columns[position.columnIndex]!.id,
                  position.columnIndex - 1,
                ),
              );
          }}
        >
          ← coluna
        </button>
        <button
          type="button"
          onClick={() => {
            const position = cellPosition(normalized, selectedIds[0] ?? "");
            if (position && position.columnIndex < normalized.columns.length - 1)
              apply((table) =>
                moveTableColumn(
                  table,
                  table.columns[position.columnIndex]!.id,
                  position.columnIndex + 1,
                ),
              );
          }}
        >
          → coluna
        </button>
        <button
          type="button"
          onClick={() => apply((table) => mergeCells(table, selectedSet))}
          disabled={selectedIds.length < 2}
        >
          mesclar
        </button>
        <button
          type="button"
          onClick={() => apply((table) => unmergeCell(table, selectedIds[0] ?? ""))}
        >
          desmesclar
        </button>
        <button
          type="button"
          onClick={() => apply((table) => setCellsAlign(table, selectedSet, "left"))}
          aria-label="Alinhar texto à esquerda"
        >
          esquerda
        </button>
        <button
          type="button"
          onClick={() => apply((table) => setCellsAlign(table, selectedSet, "center"))}
          aria-label="Centralizar texto"
        >
          centro
        </button>
        <button
          type="button"
          onClick={() => apply((table) => setCellsAlign(table, selectedSet, "right"))}
          aria-label="Alinhar texto à direita"
        >
          direita
        </button>
        <button
          type="button"
          onClick={() => apply((table) => setCellsStyle(table, selectedSet, { fontWeight: 700 }))}
        >
          negrito
        </button>
        <button
          type="button"
          onClick={() => apply((table) => setCellsVerticalAlign(table, selectedSet, "top"))}
        >
          ↑ vertical
        </button>
        <button
          type="button"
          onClick={() => apply((table) => setCellsVerticalAlign(table, selectedSet, "middle"))}
        >
          ↕ vertical
        </button>
        <button
          type="button"
          onClick={() => apply((table) => setCellsVerticalAlign(table, selectedSet, "bottom"))}
        >
          ↓ vertical
        </button>
        <button
          type="button"
          onClick={() =>
            apply((table) => setCellsStyle(table, selectedSet, { background: "#eeeae2" }))
          }
        >
          preenchimento
        </button>
        <button
          type="button"
          onClick={() =>
            apply((table) => ({
              ...table,
              style: {
                ...table.style,
                borderMode: table.style?.borderMode === "grid" ? "horizontal" : "grid",
              },
            }))
          }
        >
          bordas
        </button>
        <button
          type="button"
          onClick={() =>
            apply((table) => ({ ...table, style: { ...table.style, zebra: !table.style?.zebra } }))
          }
        >
          zebra
        </button>
        <span className="k-editor-table-toolbar__group-label">elementos</span>
        <button type="button" data-testid="table-add-line" onClick={() => addGraphic("line")}>
          + linha gráfica
        </button>
        <button
          type="button"
          data-testid="table-add-rectangle"
          onClick={() => addGraphic("rectangle")}
        >
          + retângulo
        </button>
        <button type="button" data-testid="table-add-circle" onClick={() => addGraphic("circle")}>
          + círculo
        </button>
        <button type="button" data-testid="table-add-label" onClick={() => addGraphic("label")}>
          + rótulo
        </button>
        <button
          type="button"
          data-testid="table-remove-graphic"
          onClick={removeSelectedGraphic}
          disabled={!selectedGraphicId}
        >
          apagar elemento
        </button>
        <button
          type="button"
          onClick={() => {
            const name = window.prompt("Nome do preset", "Tabela personalizada");
            if (name?.trim()) saveTablePreset(name.trim(), normalized.style ?? {});
          }}
        >
          salvar preset
        </button>
        <button
          type="button"
          onClick={() => {
            const position = cellPosition(normalized, selectedIds[0] ?? "");
            if (position) splitTable(pageId, normalized.id, position.rowIndex);
          }}
        >
          continuar
        </button>
        <select
          aria-label="Preset da tabela"
          value={normalized.stylePresetId ?? ""}
          onChange={(event) => {
            const preset = presets.find((item) => item.id === event.target.value);
            if (preset)
              apply((table) => ({
                ...table,
                stylePresetId: preset.id,
                style: { ...table.style, ...preset.style },
              }));
          }}
        >
          <option value="">preset…</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      {normalized.rows.slice(0, -1).map((row, rowIndex) => {
        const entry = tableGrid(normalized)[rowIndex]?.find((item) => item.rowIndex === rowIndex);
        const rowCell = entry ? cells.find((cell) => cell.id === entry.cell.id) : null;
        if (!rowCell) return null;
        return (
          <div
            key={`row-handle-${row.id}`}
            className="k-editor-table-row-handle"
            style={{ top: rowCell.top + rowCell.height }}
            role="separator"
            aria-label={`Redimensionar linha ${rowIndex + 1}`}
            onPointerDown={(event) => startRowResize(rowIndex, event)}
          />
        );
      })}

      {(normalized.graphics ?? []).map((graphic) => (
        <div
          key={graphic.id}
          className={`k-editor-table-graphic k-editor-table-graphic--${graphic.kind}${selectedGraphicId === graphic.id ? " is-selected" : ""}`}
          style={{
            left: `${graphic.x}%`,
            top: `${graphic.y}%`,
            width: `${graphic.width}%`,
            height: `${graphic.height}%`,
            borderColor: graphic.stroke,
            borderWidth: graphic.strokeWidth,
            background: graphic.fill,
          }}
          role="button"
          tabIndex={0}
          aria-label={`Elemento gráfico ${graphic.kind}`}
          onClick={(event) => {
            event.stopPropagation();
            setSelectedGraphicId(graphic.id);
          }}
          onDoubleClick={() => {
            if (graphic.kind !== "label") return;
            const text = window.prompt("Texto do rótulo", graphic.text ?? "Elemento");
            if (text === null) return;
            apply((table) => ({
              ...table,
              graphics: (table.graphics ?? []).map((current) =>
                current.id === graphic.id ? { ...current, text } : current,
              ),
            }));
          }}
          onPointerDown={(event) => startGraphicTransform(graphic.id, false, event)}
          onKeyDown={(event) => {
            if (event.key === "Delete" || event.key === "Backspace") removeSelectedGraphic();
          }}
        >
          {graphic.kind === "label" ? graphic.text : null}
          <div
            className="k-editor-table-graphic-handle"
            data-testid="table-graphic-resize-handle"
            onPointerDown={(event) => startGraphicTransform(graphic.id, true, event)}
          />
        </div>
      ))}

      {normalized.columns.slice(0, -1).map((column, index) => {
        const next = normalized.columns[index + 1]!;
        const left = normalized.columns
          .slice(0, index + 1)
          .reduce((sum, item) => sum + (item.width ?? 0), 0);
        return (
          <div
            key={`${column.id}-${next.id}`}
            className="k-editor-table-column-handle"
            style={{ left: `${left * 100}%` }}
            role="separator"
            aria-label={`Redimensionar coluna ${index + 1}`}
            onPointerDown={(event) => startColumnResize(index, event)}
          />
        );
      })}

      {cells.map((box) => {
        const cell = normalized.rows
          .flatMap((row) => row.cells)
          .find((current) => current.id === box.id);
        if (!cell) return null;
        const editing = editingId === cell.id;
        return editing ? (
          <textarea
            key={cell.id}
            autoFocus
            className="k-editor-table-cell-editor"
            style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitEdit}
            onPaste={handlePaste}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setEditingId(null);
              } else if (event.key === "Tab") {
                event.preventDefault();
                commitEdit();
                handleCellKeyDown(event as unknown as KeyboardEvent<HTMLButtonElement>, cell);
              }
            }}
          />
        ) : (
          <button
            key={cell.id}
            ref={(element) => {
              if (element) cellRefs.current.set(cell.id, element);
              else cellRefs.current.delete(cell.id);
            }}
            type="button"
            className={`k-editor-table-cell${selectedSet.has(cell.id) ? " is-selected" : ""}`}
            style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            aria-label={`Célula ${cell.id}`}
            onClick={(event) => selectCell(cell.id, event.shiftKey)}
            onDoubleClick={() => beginEdit(cell)}
            onKeyDown={(event) => handleCellKeyDown(event, cell)}
            onPaste={handlePaste}
            onCopy={(event) => {
              event.preventDefault();
              event.clipboardData.setData("text/plain", tableToTsv(normalized, selectedSet));
            }}
          />
        );
      })}
    </div>
  );
}
