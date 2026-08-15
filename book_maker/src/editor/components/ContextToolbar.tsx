import { useEditor } from "../state/store";

/** Ações frequentes do objeto selecionado; detalhes permanecem no inspector. */
export function ContextToolbar() {
  const {
    selectedPage,
    selectedBlock,
    selectedBlockIds,
    duplicateBlock,
    removeBlock,
    toggleBlockHidden,
    toggleBlockLocked,
    toggleBlocksLocked,
    groupBlocks,
    ungroupBlocks,
    alignBlocks,
    centerBlocksOnPage,
    distributeBlocks,
    tidyBlocks,
  } = useEditor();
  if (!selectedBlock) return null;
  const multiple = selectedBlockIds.length > 1;
  const hasGroup = selectedBlockIds.some((id) =>
    selectedPage.blocks.some((block) => block.id === id && block.groupId),
  );
  const selectedName = (() => {
    const record = selectedBlock as unknown as Record<string, unknown>;
    for (const key of ["title", "text", "content", "label"]) {
      if (typeof record[key] === "string" && record[key].trim()) return record[key] as string;
    }
    return selectedBlock.type;
  })();
  return (
    <div
      className="k-editor-context-toolbar"
      data-testid="context-toolbar"
      role="toolbar"
      aria-label="Ações do objeto"
    >
      <span className="k-editor-selection-chip font-medium" title={selectedName}>
        {multiple ? `${selectedBlockIds.length} elementos` : selectedBlock.type}
      </span>
      {!multiple ? <span className="max-w-[180px] truncate text-muted-foreground">· {selectedName}</span> : null}
      <span className="opacity-50">·</span>
      <details className="relative">
        <summary className="cursor-pointer list-none border px-2 py-1">Centralizar ▾</summary>
        <div className="absolute left-0 top-full z-50 grid min-w-[190px] gap-1 border border-border bg-card p-1 shadow-xl">
          <button
            type="button"
            data-testid="center-on-page"
            className="border border-border px-2 py-1 text-left"
            onClick={() => centerBlocksOnPage(selectedPage.id, selectedBlockIds, "both")}
          >
            Nos dois eixos da página
          </button>
          <button
            type="button"
            className="border border-border px-2 py-1 text-left"
            onClick={() => centerBlocksOnPage(selectedPage.id, selectedBlockIds, "horizontal")}
          >
            Centro horizontal
          </button>
          <button
            type="button"
            className="border border-border px-2 py-1 text-left"
            onClick={() => centerBlocksOnPage(selectedPage.id, selectedBlockIds, "vertical")}
          >
            Centro vertical
          </button>
        </div>
      </details>
      {multiple ? (
        <>
          <button type="button" onClick={() => groupBlocks(selectedPage.id, selectedBlockIds)}>
            Agrupar
          </button>
          {hasGroup ? (
            <button type="button" onClick={() => ungroupBlocks(selectedPage.id, selectedBlockIds)}>
              Desagrupar
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => toggleBlocksLocked(selectedPage.id, selectedBlockIds)}
          >
            {selectedBlockIds.every((id) => selectedPage.blocks.find((block) => block.id === id)?.locked)
              ? "Desbloquear"
              : "Bloquear"}
          </button>
          <details className="relative">
            <summary className="cursor-pointer list-none border px-2 py-1">Alinhar ▾</summary>
            <div className="absolute left-0 top-full z-50 grid min-w-[150px] gap-1 border border-border bg-card p-1 shadow-xl">
              {(
                [
                  ["left", "À esquerda"],
                  ["center-x", "Centro horizontal"],
                  ["right", "À direita"],
                  ["top", "Ao topo"],
                  ["center-y", "Centro vertical"],
                  ["bottom", "À base"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="border border-border px-2 py-1 text-left"
                  onClick={() => alignBlocks(selectedPage.id, selectedBlockIds, value)}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className="border border-border px-2 py-1 text-left"
                onClick={() => distributeBlocks(selectedPage.id, selectedBlockIds, "horizontal")}
              >
                Distribuir horizontal
              </button>
              <button
                type="button"
                className="border border-border px-2 py-1 text-left"
                onClick={() => distributeBlocks(selectedPage.id, selectedBlockIds, "vertical")}
              >
                Distribuir vertical
              </button>
            </div>
          </details>
          <details className="relative">
            <summary className="cursor-pointer list-none border px-2 py-1">Organizar ▾</summary>
            <div className="absolute left-0 top-full z-50 grid min-w-[180px] gap-1 border border-border bg-card p-1 shadow-xl">
              <button
                type="button"
                className="border border-border px-2 py-1 text-left"
                onClick={() => distributeBlocks(selectedPage.id, selectedBlockIds, "horizontal")}
              >
                Espaçar igualmente horizontal
              </button>
              <button
                type="button"
                className="border border-border px-2 py-1 text-left"
                onClick={() => distributeBlocks(selectedPage.id, selectedBlockIds, "vertical")}
              >
                Espaçar igualmente vertical
              </button>
              <button
                type="button"
                className="border border-border px-2 py-1 text-left"
                onClick={() => tidyBlocks(selectedPage.id, selectedBlockIds)}
              >
                Arrumar automaticamente
              </button>
            </div>
          </details>
        </>
      ) : (
        <>
          <button type="button" onClick={() => duplicateBlock(selectedPage.id, selectedBlock.id)}>
            Duplicar
          </button>
          <button type="button" onClick={() => toggleBlockLocked(selectedPage.id, selectedBlock.id)}>
            {selectedBlock.locked ? "Desbloquear" : "Bloquear"}
          </button>
        </>
      )}
      <button type="button" onClick={() => toggleBlockHidden(selectedPage.id, selectedBlock.id)}>
        {selectedBlock.hidden ? "Mostrar" : "Ocultar"}
      </button>
      <button
        type="button"
        className="text-destructive"
        onClick={() => removeBlock(selectedPage.id, selectedBlock.id)}
      >
        Excluir
      </button>
    </div>
  );
}
