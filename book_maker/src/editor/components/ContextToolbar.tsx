import { useEditor } from "../state/store";

/** Ações frequentes do objeto selecionado; detalhes permanecem no inspector. */
export function ContextToolbar() {
  const {
    selectedPage,
    selectedBlock,
    duplicateBlock,
    removeBlock,
    toggleBlockHidden,
    toggleBlockLocked,
  } = useEditor();
  if (!selectedBlock) return null;
  return (
    <div
      className="k-editor-context-toolbar"
      data-testid="context-toolbar"
      role="toolbar"
      aria-label="Ações do objeto"
    >
      <span className="font-medium">{selectedBlock.type}</span>
      <span className="opacity-50">·</span>
      <button type="button" onClick={() => duplicateBlock(selectedPage.id, selectedBlock.id)}>
        Duplicar
      </button>
      <button type="button" onClick={() => toggleBlockLocked(selectedPage.id, selectedBlock.id)}>
        {selectedBlock.locked ? "Desbloquear" : "Bloquear"}
      </button>
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
