import type { CSSProperties, ReactNode } from "react";
import { CSS_VAR_BY_TOKEN, type BookTokens } from "../types";
import "../styles/index.css";

export function tokensToStyle(tokens: BookTokens): CSSProperties {
  const style: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(CSS_VAR_BY_TOKEN)) {
    style[cssVar] = tokens[key as keyof BookTokens];
  }
  return style as CSSProperties;
}

/**
 * Raiz do LIVRO. Aplica os design tokens como custom properties.
 * Trocar valores aqui altera o livro inteiro (editor e print).
 */
export function BookRoot({
  tokens,
  className,
  children,
}: {
  tokens: BookTokens;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`k-book${className ? ` ${className}` : ""}`} style={tokensToStyle(tokens)}>
      {children}
    </div>
  );
}
