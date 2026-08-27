export type SheetValue = string | number | boolean;

export interface FormulaResult {
  value: number;
  error?: "invalid" | "unknown-reference" | "cycle";
}

type Token =
  | { kind: "number"; value: number }
  | { kind: "identifier"; value: string }
  | { kind: "operator"; value: "+" | "-" | "*" | "/" }
  | { kind: "paren"; value: "(" | ")" };

function tokenize(source: string): Token[] | null {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index]!;
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      const match = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!match) return null;
      tokens.push({ kind: "number", value: Number(match[0]) });
      index += match[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      const match = source.slice(index).match(/^[A-Za-z_][A-Za-z0-9_.-]*/);
      if (!match) return null;
      tokens.push({ kind: "identifier", value: match[0] });
      index += match[0].length;
      continue;
    }
    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ kind: "operator", value: char });
      index += 1;
      continue;
    }
    if (char === "(" || char === ")") {
      tokens.push({ kind: "paren", value: char });
      index += 1;
      continue;
    }
    return null;
  }
  return tokens;
}

function numeric(value: SheetValue | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

/** Parser recursivo pequeno e deliberadamente sem eval/new Function. */
export function evaluateSheetFormula(
  source: string,
  values: Record<string, SheetValue>,
): FormulaResult {
  const tokens = tokenize(source.replace(/^=/, ""));
  if (!tokens || tokens.length === 0) return { value: 0, error: "invalid" };
  let cursor = 0;
  let failed: FormulaResult["error"];

  const parseExpression = (): number => {
    let value = parseTerm();
    while (
      tokens[cursor]?.kind === "operator" &&
      (tokens[cursor]?.value === "+" || tokens[cursor]?.value === "-")
    ) {
      const operator = tokens[cursor++]!.value;
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };
  const parseTerm = (): number => {
    let value = parseFactor();
    while (
      tokens[cursor]?.kind === "operator" &&
      (tokens[cursor]?.value === "*" || tokens[cursor]?.value === "/")
    ) {
      const operator = tokens[cursor++]!.value;
      const right = parseFactor();
      if (operator === "/" && right === 0) {
        failed = "invalid";
        return 0;
      }
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };
  const parseFactor = (): number => {
    const token = tokens[cursor++];
    if (!token) {
      failed = "invalid";
      return 0;
    }
    if (token.kind === "operator" && token.value === "-") return -parseFactor();
    if (token.kind === "number") return token.value;
    if (token.kind === "identifier") {
      const value = numeric(values[token.value]);
      if (value === null) failed = "unknown-reference";
      return value ?? 0;
    }
    if (token.kind === "paren" && token.value === "(") {
      const value = parseExpression();
      const close = tokens[cursor++];
      if (!close || close.kind !== "paren" || close.value !== ")") failed = "invalid";
      return value;
    }
    failed = "invalid";
    return 0;
  };

  const value = parseExpression();
  if (cursor !== tokens.length) failed = "invalid";
  return failed ? { value: 0, error: failed } : { value: Number.isFinite(value) ? value : 0 };
}

export interface FormulaEvaluation {
  values: Record<string, SheetValue>;
  errors: Record<string, "invalid" | "unknown-reference" | "cycle">;
}

/** Calcula fórmulas em ordem de dependência e marca ciclos sem travar o editor. */
export function evaluateSheetFormulas(
  formulas: Record<string, string>,
  input: Record<string, SheetValue>,
): FormulaEvaluation {
  const values: Record<string, SheetValue> = { ...input };
  const errors: FormulaEvaluation["errors"] = {};
  const state = new Map<string, "visiting" | "done">();
  const referencePattern = /[A-Za-z_][A-Za-z0-9_.-]*/g;

  const visit = (key: string): SheetValue => {
    if (state.get(key) === "done") return values[key] ?? 0;
    if (state.get(key) === "visiting") {
      errors[key] = "cycle";
      return 0;
    }
    state.set(key, "visiting");
    const source = formulas[key];
    if (!source) {
      state.set(key, "done");
      return values[key] ?? 0;
    }
    const refs = source.match(referencePattern) ?? [];
    for (const ref of refs) {
      if (ref === "min" || ref === "max" || ref === "floor" || ref === "ceil") continue;
      if (ref in formulas) visit(ref);
    }
    const result = evaluateSheetFormula(source, values);
    if (result.error) errors[key] = result.error;
    values[key] = result.value;
    state.set(key, "done");
    return result.value;
  };

  Object.keys(formulas).forEach(visit);
  return { values, errors };
}
