import type { SheetDocument, SheetElement, SheetPage, SheetRect, SheetElementStyle } from "./types";

export const SHEET_COLORS = {
  ink: "#59324f",
  paper: "#f8f5ef",
  muted: "#8b7785",
};

export function sheetElement(
  id: string,
  type: SheetElement["type"],
  rect: SheetRect,
  values: Partial<SheetElement> = {},
): SheetElement {
  return {
    id,
    type,
    rect,
    style: { color: SHEET_COLORS.ink, fontSize: 3.2, ...values.style },
    ...values,
  };
}

export function blankSheet(
  id = `sheet-${Date.now().toString(36)}`,
  name = "Nova ficha",
): SheetDocument {
  return {
    id,
    name,
    version: 1,
    widthMm: 140,
    heightMm: 210,
    pages: [blankSheetPage(`${id}-page-1`, 140, 210)],
    values: {},
    formulas: {},
    mode: "design",
  };
}

function blankSheetPage(id: string, widthMm: number, heightMm: number): SheetPage {
  return { id, widthMm, heightMm, elements: [], background: SHEET_COLORS.paper };
}

function section(elements: SheetElement[], id: string, y: number, label: string) {
  elements.push(
    sheetElement(
      `${id}-label`,
      "label",
      { x: 8, y, width: 39, height: 5 },
      { text: `◆  ${label}`, style: { fontSize: 3.5, fontWeight: 600 } },
    ),
    sheetElement(
      `${id}-rule`,
      "divider",
      { x: 47, y: y + 2.4, width: 85, height: 0.3 },
      { style: { background: SHEET_COLORS.ink } },
    ),
  );
}

function lineField(
  elements: SheetElement[],
  id: string,
  label: string,
  key: string,
  x: number,
  y: number,
  width: number,
) {
  elements.push(
    sheetElement(
      `${id}-label`,
      "label",
      { x, y, width, height: 4 },
      { text: label, style: { fontSize: 2.5 } },
    ),
    sheetElement(
      id,
      "text-field",
      { x, y: y + 4.5, width, height: 6 },
      {
        key,
        placeholder: "",
        style: {
          borderColor: SHEET_COLORS.muted,
          borderWidth: 0.2,
          borderStyle: "solid",
          fontSize: 3,
        },
      },
    ),
  );
}

function diamond(
  elements: SheetElement[],
  id: string,
  label: string,
  key: string,
  x: number,
  y: number,
  size = 12,
) {
  elements.push(
    sheetElement(
      `${id}-box`,
      "symbol",
      { x, y, width: size, height: size },
      {
        text: "◆",
        key,
        style: { fontSize: size * 0.72, textAlign: "center", color: SHEET_COLORS.ink },
      },
    ),
    sheetElement(
      `${id}-value`,
      "number-field",
      { x: x + 1.5, y: y + 1.5, width: Math.max(1, size - 3), height: Math.max(1, size - 3) },
      {
        key,
        min: 0,
        max: 10,
        style: {
          borderColor: SHEET_COLORS.ink,
          borderWidth: 0.25,
          borderStyle: "solid",
          borderRadius: size,
          background: SHEET_COLORS.paper,
          fontSize: 3,
          textAlign: "center",
        },
      },
    ),
    sheetElement(
      `${id}-label`,
      "label",
      { x: x - 2, y: y + size + 1, width: size + 4, height: 4 },
      { text: label, style: { fontSize: 2.5, textAlign: "center" } },
    ),
  );
}

/** Referência reconstruída com os mesmos elementos genéricos usados pelo editor. */
export function createKallistisCharacterSheet(
  id = `kallistis-sheet-${Date.now().toString(36)}`,
): SheetDocument {
  const page1: SheetPage = blankSheetPage(`${id}-page-1`, 140, 210);
  const page2: SheetPage = blankSheetPage(`${id}-page-2`, 140, 210);
  const p1 = page1.elements;
  const p2 = page2.elements;
  const headingStyle: SheetElementStyle = {
    color: SHEET_COLORS.ink,
    fontSize: 5.4,
    fontWeight: 700,
  };
  p1.push(
    sheetElement(
      "p1-brand",
      "text",
      { x: 10, y: 8, width: 70, height: 10 },
      { text: "", style: headingStyle },
    ),
    sheetElement(
      "p1-subtitle",
      "text",
      { x: 10, y: 17, width: 100, height: 5 },
      {
        text: "Modelo de ficha — personalize o título do projeto",
        style: { fontSize: 2.8, fontStyle: "italic" },
      },
    ),
    sheetElement(
      "p1-title",
      "label",
      { x: 99, y: 10, width: 31, height: 5 },
      { text: "FICHA DE PERSONAGEM", style: { fontSize: 2.6, textAlign: "right" } },
    ),
    sheetElement(
      "p1-top-rule",
      "divider",
      { x: 10, y: 25, width: 120, height: 0.3 },
      { style: { background: SHEET_COLORS.ink } },
    ),
  );
  lineField(p1, "name", "NOME", "name", 10, 28, 57);
  lineField(p1, "origin", "POVO / ORIGEM", "origin", 73, 28, 57);
  lineField(p1, "player", "JOGADOR(A)", "player", 10, 42, 57);
  lineField(p1, "concept", "CONCEITO / TRAÇO MARCANTE", "concept", 73, 42, 57);
  section(p1, "attributes", 57, "ATRIBUTOS");
  ["VIG", "MEN", "DES", "AGI", "PRE", "POD"].forEach((label, index) =>
    diamond(p1, `attr-${label.toLowerCase()}`, label, label.toLowerCase(), 10 + index * 22, 66),
  );
  section(p1, "actions", 91, "ECONOMIA DE AÇÕES");
  p1.push(
    sheetElement(
      "actions-hint",
      "text",
      { x: 10, y: 97, width: 90, height: 4 },
      {
        text: "AP ação principal · AM menor · AR reação · AL livre",
        style: { fontSize: 2.2, fontStyle: "italic", color: SHEET_COLORS.muted },
      },
    ),
  );
  ["AP", "AM", "AR", "AL"].forEach((label, index) =>
    diamond(
      p1,
      `action-${label.toLowerCase()}`,
      label,
      `action.${label.toLowerCase()}`,
      10 + index * 14,
      103,
      9,
    ),
  );
  lineField(p1, "rank", "RANK", "rank", 82, 101, 48);
  lineField(p1, "pd", "PD", "pd", 82, 115, 48);
  section(p1, "offices", 126, "OFÍCIOS");
  p1.push(
    sheetElement(
      "offices-hint",
      "text",
      { x: 10, y: 132, width: 70, height: 4 },
      {
        text: "máx. 1 Principal + 1 Secundário",
        style: { fontSize: 2.2, fontStyle: "italic", color: SHEET_COLORS.muted },
      },
    ),
  );
  ["Principal", "Secundário"].forEach((office, officeIndex) => {
    const base = 137 + officeIndex * 31;
    p1.push(
      sheetElement(
        `office-${officeIndex}`,
        "label",
        { x: 10, y: base, width: 20, height: 4 },
        { text: office, style: { fontSize: 2.9 } },
      ),
    );
    ["Técnica 1", "Técnica 2", "Técnica 3", "Passiva"].forEach((label, fieldIndex) =>
      lineField(
        p1,
        `office-${officeIndex}-${fieldIndex}`,
        label,
        `office.${officeIndex}.${fieldIndex}`,
        25,
        base + fieldIndex * 6,
        105,
      ),
    );
  });
  p1.push(
    sheetElement(
      "p1-footer",
      "text",
      { x: 54, y: 201, width: 32, height: 4 },
      {
        text: "Ficha de Personagem · 1/2",
        style: { fontSize: 2.3, fontStyle: "italic", textAlign: "center" },
      },
    ),
  );

  p2.push(
    sheetElement(
      "p2-title",
      "text",
      { x: 10, y: 8, width: 120, height: 8 },
      { text: "PERÍCIAS E COMBATE", style: headingStyle },
    ),
    sheetElement(
      "p2-subtitle",
      "text",
      { x: 10, y: 16, width: 100, height: 5 },
      {
        text: "Memória, Fratura e Escolha entre Dois Mundos",
        style: { fontSize: 2.8, fontStyle: "italic" },
      },
    ),
  );
  section(p2, "skills", 26, "PERÍCIAS");
  p2.push(
    sheetElement(
      "skills-hint",
      "text",
      { x: 10, y: 32, width: 90, height: 4 },
      {
        text: "não treinado    treinado    especializado    dominado",
        style: { fontSize: 2.2, fontStyle: "italic", color: SHEET_COLORS.muted },
      },
    ),
  );
  for (let index = 0; index < 8; index += 1) {
    const y = 40 + index * 7;
    lineField(p2, `skill-${index}`, "", `skill.${index}.name`, 10, y, 43);
    [0, 1, 2].forEach((level) =>
      diamond(p2, `skill-${index}-${level}`, "", `skill.${index}.level`, 57 + level * 10, y - 1, 6),
    );
    p2.push(
      sheetElement(
        `skill-rule-${index}`,
        "divider",
        { x: 10, y: y + 6.4, width: 120, height: 0.25 },
        { style: { background: SHEET_COLORS.muted } },
      ),
    );
  }
  section(p2, "combat", 99, "COMBATE");
  lineField(p2, "hp", "HP ATUAL / MÁX.", "combat.hp", 10, 105, 38);
  lineField(p2, "def", "DEF", "combat.def", 54, 105, 38);
  lineField(p2, "movement", "DESLOC.", "combat.movement", 98, 105, 32);
  p2.push(
    sheetElement(
      "damage-formula",
      "calculated",
      { x: 10, y: 121, width: 120, height: 6 },
      {
        text: "Dano = Base + Atributo + (Perícia × 2) + Arma − DEF do alvo",
        formula: "base + attribute + (skill * 2) + weapon - targetDef",
        key: "damage",
        style: { fontSize: 2.4, fontStyle: "italic" },
      },
    ),
  );
  section(p2, "conditions", 132, "ESTADOS E CONDIÇÕES");
  ["Sangramento", "Queimadura", "Congelamento", "Outra condição"].forEach((label, index) => {
    const x = index % 2 === 0 ? 10 : 70;
    const y = 139 + Math.floor(index / 2) * 9;
    p2.push(
      sheetElement(
        `condition-${index}`,
        "checkbox",
        { x, y, width: 5, height: 5 },
        {
          key: `condition.${index}`,
          label,
          style: { borderColor: SHEET_COLORS.ink, borderWidth: 0.3, borderStyle: "solid" },
        },
      ),
      sheetElement(
        `condition-${index}-label`,
        "label",
        { x: x + 7, y, width: 48, height: 5 },
        { text: label, style: { fontSize: 2.6 } },
      ),
    );
  });
  section(p2, "equipment", 162, "EQUIPAMENTO");
  p2.push(
    sheetElement(
      "equipment",
      "text-area",
      { x: 10, y: 169, width: 120, height: 25 },
      {
        key: "equipment",
        style: { borderColor: SHEET_COLORS.muted, borderWidth: 0.2, borderStyle: "solid" },
      },
    ),
  );
  section(p2, "notes", 197, "ANOTAÇÕES");
  p2.push(
    sheetElement(
      "notes",
      "text-area",
      { x: 10, y: 203, width: 120, height: 5 },
      {
        key: "notes",
        style: { borderColor: SHEET_COLORS.muted, borderWidth: 0.2, borderStyle: "solid" },
      },
    ),
  );

  return {
    id,
    name: "Ficha de Personagem",
    version: 1,
    widthMm: 140,
    heightMm: 210,
    pages: [page1, page2],
    values: { base: 0, attribute: 0, skill: 0, weapon: 0, targetDef: 0 },
    formulas: { damage: "base + attribute + (skill * 2) + weapon - targetDef" },
    templateId: "character-sheet",
    mode: "design",
  };
}

export function cloneSheetForInsert(sheet: SheetDocument, seed: string): SheetDocument {
  return {
    ...JSON.parse(JSON.stringify(sheet)),
    id: `${seed}-sheet`,
    pages: sheet.pages.map((page, pageIndex) => ({
      ...page,
      id: `${seed}-page-${pageIndex + 1}`,
      elements: page.elements.map((element, elementIndex) => ({
        ...element,
        id: `${seed}-element-${pageIndex + 1}-${elementIndex + 1}`,
        childIds: element.childIds?.map(
          (_, childIndex) => `${seed}-element-${pageIndex + 1}-${childIndex + 1}`,
        ),
      })),
    })),
  };
}

export function normalizeSheet(sheet: SheetDocument): SheetDocument {
  const widthMm = Number.isFinite(sheet.widthMm) && sheet.widthMm > 0 ? sheet.widthMm : 140;
  const heightMm = Number.isFinite(sheet.heightMm) && sheet.heightMm > 0 ? sheet.heightMm : 210;
  return {
    ...sheet,
    version: 1,
    widthMm,
    heightMm,
    pages: (sheet.pages?.length
      ? sheet.pages
      : [{ id: `${sheet.id}-page-1`, widthMm, heightMm, elements: [] }]
    ).map((page, pageIndex) => ({
      ...page,
      id: page.id || `${sheet.id}-page-${pageIndex + 1}`,
      widthMm: page.widthMm > 0 ? page.widthMm : widthMm,
      heightMm: page.heightMm > 0 ? page.heightMm : heightMm,
      elements: (page.elements ?? []).map((element, elementIndex) => ({
        ...element,
        id: element.id || `${sheet.id}-element-${pageIndex + 1}-${elementIndex + 1}`,
        rect: {
          x: Number.isFinite(element.rect?.x) ? element.rect.x : 0,
          y: Number.isFinite(element.rect?.y) ? element.rect.y : 0,
          width: Math.max(0.3, Number.isFinite(element.rect?.width) ? element.rect.width : 20),
          height: Math.max(0.3, Number.isFinite(element.rect?.height) ? element.rect.height : 8),
        },
      })),
    })),
    values: { ...(sheet.values ?? {}) },
    formulas: { ...(sheet.formulas ?? {}) },
  };
}
