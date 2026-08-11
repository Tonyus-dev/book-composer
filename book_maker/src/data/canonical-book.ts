import project from "../../projects/kallistis-livro-basico.json";
import { normalizeBook } from "../lib/persistence/local";

/** Projeto editorial versionado usado como ponto de partida do Book Maker. */
export const canonicalBook = normalizeBook(project);
