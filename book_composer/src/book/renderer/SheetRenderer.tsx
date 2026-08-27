import type { CSSProperties, ChangeEvent } from "react";
import type { SheetDocument, SheetElement, SheetPage } from "../types";
import { evaluateSheetFormulas } from "../sheetFormula";
import { ResolvedImage } from "../components/BookComponents";
import { useBookRender } from "./context";

function styleFor(element: SheetElement): CSSProperties {
  const style = element.style ?? {};
  return {
    color: style.color,
    background: style.background,
    borderColor: style.borderColor,
    borderWidth: style.borderWidth ? `${style.borderWidth}mm` : undefined,
    borderStyle: style.borderStyle,
    borderRadius: style.borderRadius ? `${style.borderRadius}mm` : undefined,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize ? `${style.fontSize}mm` : undefined,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    textAlign: style.textAlign,
    lineHeight: style.lineHeight,
    padding: style.padding ? `${style.padding}mm` : undefined,
  };
}

function elementPosition(element: SheetElement, page: SheetPage): CSSProperties {
  const { x, y, width, height } = element.rect;
  return {
    left: `${(x / page.widthMm) * 100}%`,
    top: `${(y / page.heightMm) * 100}%`,
    width: `${(width / page.widthMm) * 100}%`,
    height: `${(height / page.heightMm) * 100}%`,
    zIndex: element.zIndex ?? 1,
  };
}

function fieldValue(
  sheet: SheetDocument,
  element: SheetElement,
  calculated: Record<string, string | number | boolean>,
) {
  if (element.type === "calculated" && element.key) return calculated[element.key] ?? "";
  return element.key ? (sheet.values[element.key] ?? element.value ?? "") : (element.value ?? "");
}

function FieldControl({
  sheet,
  element,
  calculated,
  mode,
  onChange,
}: {
  sheet: SheetDocument;
  element: SheetElement;
  calculated: Record<string, string | number | boolean>;
  mode: "design" | "fill" | "print";
  onChange?: (key: string, value: string | number | boolean) => void;
}) {
  const value = fieldValue(sheet, element, calculated);
  const editable = mode === "fill" && Boolean(element.key) && element.type !== "calculated";
  const change = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    if (!element.key || !onChange) return;
    if (element.type === "checkbox")
      onChange(element.key, (event.target as HTMLInputElement).checked);
    else if (element.type === "number-field") onChange(element.key, Number(event.target.value));
    else onChange(element.key, event.target.value);
  };

  if (element.type === "checkbox") {
    return editable ? (
      <input
        className="k-sheet-checkbox-input"
        type="checkbox"
        checked={Boolean(value)}
        onChange={change}
        aria-label={element.label ?? element.key}
      />
    ) : (
      <span
        className={`k-sheet-checkbox${value ? " is-checked" : ""}`}
        aria-label={element.label ?? element.key}
      >
        {value ? "✓" : ""}
      </span>
    );
  }
  if (element.type === "choice") {
    if (editable)
      return (
        <select
          className="k-sheet-field-control"
          value={String(value)}
          onChange={change}
          aria-label={element.label ?? element.key}
        >
          {(element.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    return <span className="k-sheet-field-value">{String(value)}</span>;
  }
  if (element.type === "scale") {
    const min = element.min ?? 1;
    const max = element.max ?? 4;
    const count = Math.max(1, max - min + 1);
    return (
      <span className="k-sheet-scale" aria-label={element.label ?? element.key}>
        {Array.from({ length: count }, (_, index) => (
          <span key={index} className={Number(value) >= min + index ? "is-active" : ""}>
            ◇
          </span>
        ))}
      </span>
    );
  }
  if (element.type === "text-area") {
    return editable ? (
      <textarea
        className="k-sheet-field-control k-sheet-field-control--area"
        value={String(value)}
        placeholder={element.placeholder}
        onChange={change}
        aria-label={element.label ?? element.key}
      />
    ) : (
      <span className="k-sheet-field-value k-sheet-field-value--area">{String(value)}</span>
    );
  }
  if (editable)
    return (
      <input
        className="k-sheet-field-control"
        type={element.type === "number-field" ? "number" : "text"}
        value={String(value)}
        placeholder={element.placeholder}
        min={element.min}
        max={element.max}
        step={element.step}
        onChange={change}
        aria-label={element.label ?? element.key}
      />
    );
  return <span className="k-sheet-field-value">{String(value)}</span>;
}

export function SheetElementRenderer({
  sheet,
  page,
  element,
  mode,
  blockId,
}: {
  sheet: SheetDocument;
  page: SheetPage;
  element: SheetElement;
  mode: "design" | "fill" | "print";
  blockId: string;
}) {
  const { onSheetValueChange } = useBookRender();
  const formulaMap = { ...(sheet.formulas ?? {}) };
  if (element.key && element.formula) formulaMap[element.key] = element.formula;
  const calculated = evaluateSheetFormulas(formulaMap, sheet.values).values;
  const style = { ...elementPosition(element, page), ...styleFor(element) };
  if (element.hidden) return null;
  if (element.type === "line" || element.type === "divider")
    return (
      <div
        className={`k-sheet-element k-sheet-element--${element.type}`}
        style={style}
        data-sheet-element-id={element.id}
      />
    );
  if (element.type === "box")
    return (
      <div
        className="k-sheet-element k-sheet-element--box"
        style={style}
        data-sheet-element-id={element.id}
      >
        {element.text}
      </div>
    );
  if (element.type === "image")
    return (
      <div
        className="k-sheet-element k-sheet-element--image"
        style={style}
        data-sheet-element-id={element.id}
      >
        {element.source ? <ResolvedImage src={element.source} alt={element.alt ?? ""} /> : null}
      </div>
    );
  if (element.type === "group") return null;
  if (element.type === "repeater") {
    const count = Math.max(1, element.repeatCount ?? 3);
    return (
      <div
        className="k-sheet-element k-sheet-element--repeater"
        style={style}
        data-sheet-element-id={element.id}
      >
        {Array.from({ length: count }, (_, index) => (
          <span key={index}>{element.text ?? ""}</span>
        ))}
      </div>
    );
  }
  if (element.type === "table") {
    return (
      <div
        className="k-sheet-element k-sheet-element--table"
        style={style}
        data-sheet-element-id={element.id}
      >
        {element.text ?? "Tabela"}
      </div>
    );
  }
  if (element.type === "symbol")
    return (
      <div
        className="k-sheet-element k-sheet-element--symbol"
        style={style}
        data-sheet-element-id={element.id}
      >
        {element.text ?? "◇"}
      </div>
    );
  if (element.type === "label" || element.type === "text")
    return (
      <div
        className="k-sheet-element k-sheet-element--text"
        style={style}
        data-sheet-element-id={element.id}
      >
        {element.text}
      </div>
    );
  return (
    <div
      className={`k-sheet-element k-sheet-element--field k-sheet-element--${element.type}`}
      style={style}
      data-sheet-element-id={element.id}
    >
      {element.label && element.type !== "checkbox" ? (
        <span className="k-sheet-field-label">{element.label}</span>
      ) : null}
      <FieldControl
        sheet={sheet}
        element={element}
        calculated={calculated}
        mode={mode}
        onChange={(key, value) => onSheetValueChange?.(blockId, key, value)}
      />
    </div>
  );
}

function SheetPageRenderer({
  sheet,
  page,
  mode,
  blockId,
}: {
  sheet: SheetDocument;
  page: SheetPage;
  mode: "design" | "fill" | "print";
  blockId: string;
}) {
  return (
    <div
      className="k-sheet-page"
      style={{ aspectRatio: `${page.widthMm} / ${page.heightMm}`, background: page.background }}
      data-sheet-page-id={page.id}
    >
      {page.elements
        .filter((element) => !element.childIds?.length)
        .sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1))
        .map((element) => (
          <SheetElementRenderer
            key={element.id}
            sheet={sheet}
            page={page}
            element={element}
            mode={mode}
            blockId={blockId}
          />
        ))}
    </div>
  );
}

export function SheetRenderer({ sheet, blockId }: { sheet: SheetDocument; blockId: string }) {
  const { interactive } = useBookRender();
  const mode = interactive ? (sheet.mode ?? "design") : "print";
  return (
    <div
      className={`k-sheet-document k-sheet-document--${mode}`}
      data-sheet-id={sheet.id}
      data-sheet-mode={mode}
    >
      {sheet.pages.map((page) => (
        <SheetPageRenderer key={page.id} sheet={sheet} page={page} mode={mode} blockId={blockId} />
      ))}
    </div>
  );
}
