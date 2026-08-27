import project from "../../projects/kallistis-manual-do-mundo-reconstrucao.json";
import { normalizeBook } from "../lib/persistence/local";

/** Projeto editorial versionado usado como ponto de partida do BOOK-COMPOSER. */
export const canonicalBook = normalizeBook(project);
