# KALLISTIS Book Maker — reconciliação de deployment

## Resultado

O Git não perdeu os commits. O problema foi histórico de publicação: o Worker ficou em uma versão criada manualmente antes das mudanças modernas chegarem à produção.

## Evidência Cloudflare

| Campo | Valor |
|---|---|
| Worker | `kallistis-book-builder` |
| Versão stale observada antes da reconciliação | `c8be3f68-dc35-459d-a053-6c32ea77865b` |
| Criada em | `2026-08-11T06:50:27.593864Z` |
| Deployment stale | `f00be7c2-5785-4766-b8c8-18d40cc48ba6` |
| APP_VERSION stale | `book-maker-release-candidate` |
| Versão publicada do master | `0a84a2e7-1938-4954-bd75-e9b1502006b1` |
| Deployment publicado | `830fc9b0-5d55-4dab-af79-548f77cc7d1d` |

O metadata do Cloudflare não contém SHA Git. A data da versão stale coincide praticamente com o commit `2f4ff79` (`2026-08-11 03:50:11 -0300`), mas isso é correlação temporal, não prova direta.

**PRODUCTION_BASE_COMMIT_OR_RANGE:** `2f4ff79304b74124d3fcb0f5759ee62a6def08df` como limite provável; sem SHA explícito no Cloudflare.

**BOUNDARY_CONFIDENCE:** `MEDIUM`

## Commits funcionais que estavam no master e não estavam na produção stale

| SHA | Feature | Git master | Produção stale |
|---|---|---:|---:|
| `b73fbe7` | conversão de imagens, assets e preflight | YES | NO |
| `23e64a8` | preflight honesto de resolução | YES | NO |
| `c6c897c` | persistência local/cloud de assets | YES | NO |
| `d3dfe5d` | free canvas / página blank, depois substituída | YES | NO |
| `0129fee` | hidratação de impressão e renderização de imagens | YES | NO |
| `9380cab` | workspace, camadas e manipulação de objetos | YES | NO |
| `f07cf04` | polish operacional, PPI, feather e alinhamentos | YES | NO |
| `af22cc6` | favicon próprio KALLISTIS | YES | NO |

Commits documentais, testes isolados e merges não foram contados. Todos os itens acima continuam ancestrais do master; portanto:

```text
GIT_LOST_COMMITS = 0
NOT_DEPLOYED_COMMITS = 8
```

## Reconciliação

O master `40716546938c0c9212e734e14bb3783f345c8b89` foi publicado manualmente a partir do workspace canônico antes do merge desta correção. O HTML e os assets públicos atuais correspondem ao build do master, incluindo `/kallistis-favicon.svg` e os bundles da reorganização do workspace.

## PR #7 e comportamento esperado

**PR7_HEAD:** `2a0abb4f77620c4b008ae4875c3259129edb557f` antes deste relatório.

A PR endurece o deploy para aceitar apenas `workflow_run` originado de `push` no `master`, no mesmo repositório, com CI verde. O checkout usa o `head_sha` do workflow aprovado e o job verifica o SHA antes do build/deploy. `workflow_dispatch` permanece apenas como fallback manual no `master`; as permissões são `contents: read`.

Depois do merge, o fluxo esperado é:

```text
merge em master
  -> CI do push em master PASS
  -> Deploy workflow PASS
  -> checkout do merge SHA
  -> build
  -> wrangler deploy
  -> /api/health.gitSha == master SHA
```
