import type { CSSProperties, ReactNode } from "react";
import { CSS_VAR_BY_TOKEN, type BookFont, type BookTokens } from "../types";
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
  fonts,
  className,
  children,
}: {
  tokens: BookTokens;
  fonts?: BookFont[] | undefined;
  className?: string;
  children: ReactNode;
}) {
  const fontFaces = (fonts ?? [])
    .map((font) => {
      const family = font.family.replace(/["\\{};]/g, "");
      const mime = font.mime || "font/woff2";
      return `@font-face{font-family:"${family}";src:url("${font.data}") format("${mime.split("/").pop()}");font-display:swap;}`;
    })
    .join("\n");
  return (
    <div className={`k-book${className ? ` ${className}` : ""}`} style={tokensToStyle(tokens)}>
      {fontFaces ? <style>{fontFaces}</style> : null}
      {children}
    </div>
  );
}
