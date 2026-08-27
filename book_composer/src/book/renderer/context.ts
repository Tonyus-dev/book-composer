import { createContext, useContext } from "react";

/**
 * Ponte mínima entre EDITOR e LIVRO.
 * O renderer do livro não conhece o editor: recebe apenas callbacks opcionais.
 * Na print view esse contexto fica vazio e nenhum atributo de seleção é emitido.
 */
export interface BookRenderContextValue {
  interactive: boolean;
  selectedBlockId?: string | null;
  selectedBlockIds?: string[];
  onSelectBlock?: (blockId: string, modifiers?: { additive?: boolean }) => void;
  onSheetValueChange?: (blockId: string, key: string, value: string | number | boolean) => void;
}

export const BookRenderContext = createContext<BookRenderContextValue>({
  interactive: false,
});

export const useBookRender = () => useContext(BookRenderContext);
