import { Eye, EyeOff, GripVertical, Lock, Unlock } from "lucide-react";
import type { Block } from "../../book/types";
import { useEditor } from "../state/store";

function labelFor(block: Block) {
  if (block.type === "image") return block.alt || "Imagem";
  if (block.type === "heading") return block.text || "Título";
  if (block.type === "text") return block.content.slice(0, 34) || "Texto";
  if (block.type === "shape") return block.label || "Shape";
  if (block.type === "box") return block.title || "Box";
  return block.type === "table" ? "Tabela" : block.type;
}

export function LayersPanel() {
  const {
    selectedPage,
    selectedBlockId,
    selectBlock,
    moveBlockToIndex,
    toggleBlockHidden,
    toggleBlockLocked,
  } = useEditor();
  const blocks = [...selectedPage.blocks].reverse();

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="layers-panel">
      <div className="k-editor-panel-title border-b border-border px-3 py-2">
        <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase">Camadas</h2>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Página atual · {blocks.length} objetos
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {blocks.length === 0 ? (
          <p className="p-2 text-[11px] text-muted-foreground">Nenhum objeto nesta página.</p>
        ) : (
          blocks.map((block, index) => (
            <div
              key={block.id}
              className={`group flex items-center gap-1 border px-1 py-1 text-[11px] ${
                selectedBlockId === block.id
                  ? "border-primary bg-primary/10"
                  : "border-transparent hover:bg-accent"
              }`}
            >
              <button
                type="button"
                aria-label={`Selecionar camada ${labelFor(block)}`}
                className="flex min-w-0 flex-1 items-center gap-1 text-left"
                onClick={() => selectBlock(block.id)}
              >
                <GripVertical className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{labelFor(block)}</span>
              </button>
              <button
                type="button"
                aria-label={`${block.hidden ? "Mostrar" : "Ocultar"} camada ${labelFor(block)}`}
                title={block.hidden ? "Mostrar" : "Ocultar"}
                onClick={() => toggleBlockHidden(selectedPage.id, block.id)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                {block.hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
              </button>
              <button
                type="button"
                aria-label={`${block.locked ? "Desbloquear" : "Bloquear"} camada ${labelFor(block)}`}
                title={block.locked ? "Desbloquear" : "Bloquear"}
                onClick={() => toggleBlockLocked(selectedPage.id, block.id)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                {block.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
              </button>
              <button
                type="button"
                aria-label={`Mover camada ${labelFor(block)} para cima`}
                onClick={() => moveBlockToIndex(selectedPage.id, block.id, blocks.length - index)}
                className="hidden p-1 text-muted-foreground hover:text-foreground group-hover:block"
              >
                ↑
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
