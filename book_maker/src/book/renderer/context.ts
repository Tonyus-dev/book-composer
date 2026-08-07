import { createContext, useContext } from "react";

/**
 * Ponte mínima entre EDITOR e LIVRO.
 * O renderer do livro não conhece o editor: recebe apenas callbacks opcionais.
 * Na print view esse contexto fica vazio e nenhum atributo de seleção é emitido.
 */
export interface BookRenderContextValue {
  interactive: boolean;
  selectedBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
}

export const BookRenderContext = createContext<BookRenderContextValue>({
  interactive: false,
});

export const useBookRender = () => useContext(BookRenderContext);
