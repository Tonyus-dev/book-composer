import { useEffect, useMemo, useRef, useState } from "react";
import { ASSETS, ASSET_CATEGORIES } from "../../lib/assets/catalog";
import type { BookAsset, ImageBlock } from "../../book/types";
import { assetRef, formatBytes, resolveAssetSrc } from "../../lib/assets/registry";
import { ACCEPTED_ASSET_MIME, fileToBookAsset } from "../../lib/assets/upload";
import { useEditor, nextId } from "../state/store";
import { AssetEditor, type AssetEditorTarget } from "./AssetEditor";
import { applyRecipe, editedToAsset, type EditRecipe } from "../../lib/assets/edit";
import {
  importedGitHubAssetUrl,
  importGitHubSourceAsset,
  loadGitHubSourceAssets,
  type GitHubSourceAsset,
} from "../../lib/persistence/source";
import { cloudProjectId } from "../../lib/persistence/cloud";
import { externalizeAsset } from "../../lib/persistence/local";
import { findPrimaryImage } from "../../book/templates/types";
import {
  loadEditorialAssetManifest,
  type EditorialAssetManifest,
} from "../../lib/assets/editorial-manifest";

/** Item unificado: catálogo estático (public/assets) + assets enviados. */
interface BrowserItem {
  key: string;
  /** referência gravada no JSON: caminho público ou asset:<id> */
  src: string;
  label: string;
  category: string;
  note?: string | undefined;
  effectivePpi?: number | undefined;
  uploaded?: BookAsset | undefined;
  status?: string | undefined;
  alreadyUsedOccurrences?: number | undefined;
}

/**
 * Painel de assets: consome o catálogo de public/assets e aceita upload local.
 * Assets enviados ficam no IndexedDB; o projeto guarda metadados e referência por id.
 */
export function AssetBrowser() {
  const {
    book,
    projectId,
    selectedPage,
    selectedBlock,
    updateBlock,
    addBlock,
    selectBlock,
    addAssets,
    updateAsset,
    removeAsset,
    assetUsage,
  } = useEditor();
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AssetEditorTarget | null>(null);
  const [sourceAssets, setSourceAssets] = useState<GitHubSourceAsset[]>([]);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceBusy, setSourceBusy] = useState(false);
  const [manifest, setManifest] = useState<EditorialAssetManifest | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadCategory = category === "all" ? "characters" : category;

  useEffect(() => {
    void loadEditorialAssetManifest().then(setManifest);
  }, []);

  const items = useMemo(() => {
    const uploaded = book.assets ?? [];
    const all: BrowserItem[] = [
      ...uploaded.map((asset) => ({
        key: asset.id,
        src: assetRef(asset.id),
        label: asset.label,
        category: asset.category,
        effectivePpi: asset.effectivePpi,
        uploaded: asset,
      })),
      ...ASSETS.map((asset) => ({
        key: asset.src,
        src: asset.src,
        label: asset.label,
        category: asset.category,
        note: asset.note,
        effectivePpi: asset.effectivePpi,
      })),
      // Manifesto: deduplicado por id (o manifesto canônico pode conter
      // entradas com mesmo id por origem composta; cada React key precisa
      // ser única entre irmãos). Preserva a primeira ocorrência.
      ...(() => {
        const seen = new Set<string>();
        const out: BrowserItem[] = [];
        for (const asset of manifest?.assets ?? []) {
          if (seen.has(asset.id)) continue;
          if (ASSETS.some((catalogAsset) => catalogAsset.src === asset.src)) continue;
          seen.add(asset.id);
          out.push({
            key: `manifest:${asset.id}`,
            src: asset.src,
            label: asset.label,
            category: asset.category,
            note: asset.reference ?? undefined,
            status: asset.status,
            alreadyUsedOccurrences: asset.alreadyUsedOccurrences,
          });
        }
        return out;
      })(),
    ];
    const term = query.trim().toLowerCase();
    return all
      .filter((item) => category === "all" || item.category === category)
      .filter((item) => item.label.toLowerCase().includes(term));
  }, [category, query, book.assets, manifest]);

  const apply = (item: BrowserItem) => {
    if (item.status && !["APPROVED", "USED", "COVERED_HIGH"].includes(item.status)) {
      setError("Este asset está pendente de revisão e não pode ser usado automaticamente.");
      return;
    }
    if (selectedBlock && selectedBlock.type === "image") {
      updateBlock(selectedPage.id, selectedBlock.id, {
        src: item.src,
        alt: item.label,
        effectivePpi: item.effectivePpi,
      });
      return;
    }
    if (selectedPage.template === "cover") {
      const primary = findPrimaryImage(selectedPage.blocks);
      if (primary) {
        updateBlock(selectedPage.id, primary.id, {
          src: item.src,
          alt: item.label,
          effectivePpi: item.effectivePpi,
        });
        selectBlock(primary.id);
        return;
      }
    }
    const block: ImageBlock = {
      id: nextId("b"),
      type: "image",
      src: item.src,
      alt: item.label,
      fit: "cover",
      position: selectedPage.template === "cover" ? "full" : "flow",
      span: "full",
      fullBleed: selectedPage.template === "cover",
      ...(item.effectivePpi ? { effectivePpi: item.effectivePpi } : {}),
    };
    addBlock(selectedPage.id, block);
    selectBlock(block.id);
  };

  const applyImported = (src: string, label: string) => {
    if (selectedBlock && selectedBlock.type === "image") {
      updateBlock(selectedPage.id, selectedBlock.id, { src, alt: label });
      return;
    }
    if (selectedPage.template === "cover") {
      const primary = findPrimaryImage(selectedPage.blocks);
      if (primary) {
        updateBlock(selectedPage.id, primary.id, { src, alt: label, effectivePpi: undefined });
        selectBlock(primary.id);
        return;
      }
    }
    const block: ImageBlock = {
      id: nextId("b"),
      type: "image",
      src,
      alt: label,
      fit: "cover",
      position: selectedPage.template === "cover" ? "full" : "flow",
      span: "full",
      fullBleed: selectedPage.template === "cover",
    };
    addBlock(selectedPage.id, block);
    selectBlock(block.id);
  };

  const openSource = async () => {
    setSourceOpen(true);
    setSourceBusy(true);
    setError(null);
    const assets = await loadGitHubSourceAssets();
    setSourceAssets(assets ?? []);
    if (!assets) setError("Fonte canônica indisponível nesta sessão.");
    setSourceBusy(false);
  };

  const importSource = async (asset: GitHubSourceAsset) => {
    if (!asset.sha) return;
    setSourceBusy(true);
    setError(null);
    const imported = await importGitHubSourceAsset(asset.path, cloudProjectId(book));
    if (!imported) {
      setError("Não foi possível importar o asset para o R2.");
    } else {
      applyImported(importedGitHubAssetUrl(imported.blobSha, imported.path), imported.path);
    }
    setSourceBusy(false);
  };

  const upload = async (files: FileList) => {
    setBusy(true);
    setError(null);
    const created: BookAsset[] = [];
    const failures: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        failures.push(`${file.name}: formato não suportado`);
        continue;
      }
      try {
        created.push(
          await fileToBookAsset(file, {
            id: nextId("asset"),
            category: uploadCategory,
            projectId,
          }),
        );
      } catch (cause) {
        failures.push(cause instanceof Error ? cause.message : String(cause));
      }
    }
    if (created.length > 0) addAssets(created);
    setError(failures.length > 0 ? failures.join(" · ") : null);
    setBusy(false);
  };

  /* Recorte/resize/remoção de fundo: bytes editados voltam para o próprio JSON. */
  const saveEdit = async (
    target: AssetEditorTarget,
    recipe: EditRecipe,
    mode: "replace" | "duplicate",
    label: string,
  ): Promise<string | null> => {
    try {
      const edited = await applyRecipe(target.source, recipe, { mime: target.mime });
      if (mode === "replace" && target.assetId) {
        const asset = await externalizeAsset(
          editedToAsset({ label, category: target.category }, edited, {
            id: target.assetId,
          }),
          projectId,
        );
        const { id: _id, createdAt: _createdAt, ...patch } = asset;
        updateAsset(target.assetId, patch);
        return null;
      }
      const created = await externalizeAsset(
        editedToAsset({ label, category: target.category }, edited, {
          id: nextId("asset"),
        }),
        projectId,
      );
      addAssets([created]);
      return null;
    } catch (cause) {
      return cause instanceof Error ? cause.message : String(cause);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {editing ? (
        <AssetEditor
          target={editing}
          onClose={() => setEditing(null)}
          onSave={(recipe, mode, label) => saveEdit(editing, recipe, mode, label)}
        />
      ) : null}
      <div className="k-editor-panel-title border-b border-border px-3 py-2">
        <h2 className="mb-2 text-[11px] font-semibold tracking-[0.18em] uppercase">Assets</h2>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar…"
          className="mb-2 w-full border border-border bg-input/40 px-2 py-1 text-xs outline-none focus-visible:border-primary"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="mb-2 w-full border border-border bg-input/40 px-2 py-1 text-xs outline-none"
        >
          <option value="all">Todas as categorias</option>
          {ASSET_CATEGORIES.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="k-editor-primary-action w-full border px-2 py-1 text-[11px] font-medium disabled:opacity-60"
        >
          {busy ? "importando…" : "Enviar imagens locais"}
        </button>
        <button
          type="button"
          disabled={sourceBusy}
          onClick={openSource}
          className="mt-1 w-full border border-border px-2 py-1 text-[11px] hover:bg-accent disabled:opacity-60"
        >
          {sourceBusy && sourceOpen ? "consultando fonte…" : "Fonte canônica KALLISTIS"}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPTED_ASSET_MIME.join(",")}
          className="hidden"
          onChange={async (event) => {
            const files = event.target.files;
            if (files && files.length > 0) await upload(files);
            event.target.value = "";
          }}
        />
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
          Vão para <span className="text-foreground">{uploadCategory}</span> e ficam gravados no
          IndexedDB local (o JSON cotidiano guarda somente id + metadados).
        </p>
        {manifest ? (
          <div className="mt-2 border border-border bg-muted/20 p-2 text-[10px] text-muted-foreground">
            <p className="font-medium text-foreground">Manifesto persistente</p>
            <p>
              {manifest.counts.approved} aprovados · {manifest.counts.pending} pendentes ·{" "}
              {manifest.counts.rejected} rejeitados
            </p>
            <p>
              {book.productionPlan?.unusedApprovedAssets?.length ?? 0} aprovados sem uso no plano
              atual.
            </p>
          </div>
        ) : null}
        {error ? <p className="mt-1 text-[10px] text-destructive">{error}</p> : null}
      </div>

      {sourceOpen ? (
        <div className="max-h-44 overflow-y-auto border-b border-border bg-muted/20 p-2">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Tonyus-dev/kallistis_producao · main · somente leitura</span>
            <button type="button" onClick={() => setSourceOpen(false)}>
              fechar
            </button>
          </div>
          {sourceAssets.length === 0 && !sourceBusy ? (
            <p className="text-[10px] text-muted-foreground">Nenhum asset consultável.</p>
          ) : null}
          {sourceAssets.map((asset) => (
            <button
              key={`${asset.sha}:${asset.path}`}
              type="button"
              disabled={sourceBusy || !asset.sha}
              onClick={() => void importSource(asset)}
              className="block w-full truncate border-b border-border/50 px-1 py-1 text-left text-[10px] hover:bg-accent disabled:opacity-60"
              title="Importar para R2 e inserir na página"
            >
              {asset.path}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-2">
        {items.map((item) => {
          const uses = item.uploaded ? assetUsage(item.uploaded.id) : 0;
          const previewSrc = resolveAssetSrc(item.src);
          return (
            <div key={item.key} className="border border-border">
              <button
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "copy";
                  event.dataTransfer.setData(
                    "application/x-kallistis-asset",
                    JSON.stringify({
                      src: item.src,
                      label: item.label,
                      effectivePpi: item.effectivePpi,
                    }),
                  );
                }}
                onClick={() => apply(item)}
                title={item.note ?? item.label}
                disabled={Boolean(
                  item.status && !["APPROVED", "USED", "COVERED_HIGH"].includes(item.status),
                )}
                className="group block w-full text-left hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {previewSrc ? (
                  <img
                    src={previewSrc}
                    alt={item.label}
                    loading="lazy"
                    className="aspect-4/5 w-full object-cover"
                  />
                ) : null}
                <span className="block px-1.5 pt-1 text-[10px] leading-tight text-muted-foreground group-hover:text-foreground">
                  {item.label}
                </span>
              </button>
              {item.status ? (
                <p className="px-1.5 pb-1 text-[9px] text-muted-foreground">
                  {item.status} · uso registrado: {item.alreadyUsedOccurrences ?? 0}
                </p>
              ) : null}
              {item.uploaded ? (
                <div className="px-1.5 pb-1">
                  <p className="text-[9px] text-muted-foreground">
                    {item.uploaded.pixelWidth}×{item.uploaded.pixelHeight} ·{" "}
                    {formatBytes(item.uploaded.bytes)}
                    {item.uploaded.effectivePpi ? ` · ${item.uploaded.effectivePpi} ppi` : ""}
                    {uses > 0 ? ` · ${uses} uso${uses > 1 ? "s" : ""}` : ""}
                  </p>
                  <div className="mt-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          source: resolveAssetSrc(item.src),
                          label: item.label,
                          category: item.category,
                          mime: item.uploaded!.mime,
                          assetId: item.uploaded!.id,
                        })
                      }
                      className="border border-border px-1 text-[9px] hover:bg-accent"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const label = window.prompt("Nome do asset", item.label);
                        if (label) updateAsset(item.uploaded!.id, { label });
                      }}
                      className="border border-border px-1 text-[9px] hover:bg-accent"
                    >
                      Renomear
                    </button>
                    <label className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <span className="sr-only">Organizar imagem em categoria</span>
                      <select
                        aria-label={`Categoria de ${item.label}`}
                        value={item.category}
                        onChange={(event) =>
                          updateAsset(item.uploaded!.id, { category: event.target.value })
                        }
                        className="border border-border bg-input/40 px-1 py-px text-[9px] text-foreground"
                      >
                        {ASSET_CATEGORIES.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const warn =
                          uses > 0
                            ? `Este asset está em ${uses} bloco(s). Remover deixará referências órfãs. Continuar?`
                            : "Remover este asset do projeto?";
                        if (window.confirm(warn)) removeAsset(item.uploaded!.id);
                      }}
                      className="border border-destructive px-1 text-[9px] text-destructive hover:bg-accent"
                    >
                      Excluir imagem
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-1.5 pb-1">
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        source: resolveAssetSrc(item.src),
                        label: item.label,
                        category: item.category,
                        mime: "image/png",
                      })
                    }
                    className="border border-border px-1 text-[9px] hover:bg-accent"
                  >
                    Recortar / editar
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 ? (
          <p className="col-span-2 p-2 text-[11px] text-muted-foreground">
            Nenhum asset registrado para este filtro.
          </p>
        ) : null}
      </div>

      <p className="border-t border-border px-3 py-2 text-[10px] leading-snug text-muted-foreground">
        {selectedBlock?.type === "image"
          ? "Clique para substituir a imagem do bloco selecionado."
          : "Clique para inserir um novo bloco de imagem na página atual."}
      </p>
    </div>
  );
}
