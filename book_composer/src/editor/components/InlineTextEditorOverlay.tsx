import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Block } from "../../book/types";

type EditableBlock = Extract<Block, { type: "text" | "heading" | "quote" | "caption" | "box" }>;
type Box = { left: number; top: number; width: number; height: number };

function isEditable(block: Block): block is EditableBlock {
  return ["text", "heading", "quote", "caption", "box"].includes(block.type);
}

function readText(block: EditableBlock) {
  if (block.type === "text" || block.type === "box") return block.content;
  return block.text;
}

function patchFor(block: EditableBlock, value: string) {
  if (block.type === "text" || block.type === "box") return { content: value };
  return { text: value };
}

export function InlineTextEditorOverlay({
  pageRef,
  pageId,
  block,
  updateBlock,
  onClose,
}: {
  pageRef: RefObject<HTMLDivElement | null>;
  pageId: string;
  block: Block;
  updateBlock: (pageId: string, blockId: string, patch: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [box, setBox] = useState<Box | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editable = isEditable(block) ? block : null;
  const editableId = editable?.id;

  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page || !editableId) return;
    const target = Array.from(page.querySelectorAll<HTMLElement>("[data-block-id]")).find(
      (element) => element.dataset["blockId"] === editableId,
    );
    if (!target) return;
    const pageRect = page.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const scale = page.offsetWidth > 0 ? pageRect.width / page.offsetWidth : 1;
    setBox({
      left: (targetRect.left - pageRect.left) / scale,
      top: (targetRect.top - pageRect.top) / scale,
      width: targetRect.width / scale,
      height: Math.max(targetRect.height / scale, 18),
    });
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [editableId, pageRef]);

  if (!editable || !box) return null;
  return (
    <div className="k-editor-inline-text" style={box} onClick={(event) => event.stopPropagation()}>
      <textarea
        ref={textareaRef}
        className="k-editor-inline-text__input"
        value={readText(editable)}
        onChange={(event) =>
          updateBlock(pageId, editable.id, patchFor(editable, event.target.value))
        }
        onBlur={onClose}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            editable.type !== "text" &&
            editable.type !== "box"
          ) {
            event.preventDefault();
            onClose();
          }
        }}
        aria-label="Editar texto diretamente na página"
      />
    </div>
  );
}
