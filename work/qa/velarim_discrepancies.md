# Relatório Definitivo de Resolução de Cardinalidade de Veth e Vethari — Velarim v2.0

## 1. Síntese Executiva da Resolução de Veth e Vethari
A auditoria minuciosa dos 223 verbetes humanos em relação ao **Núcleo 1.0 (48 Registros)** e à **Expansão Executável v2.0 (202 Registros)** comprovou empiricamente que **`veth`** e **`vethari`** pertencem exclusivamente ao Núcleo 1.0 e **não possuem `executable_id` na camada de expansão** (`executable_id = null`).

---

## 2. Registros Detalhados de `veth` e `vethari`

### 2.1. `veth`
- **`core_id`:** `779` (Núcleo 1.0 imutável)
- **`executable_id`:** `null` (0 ocorrências nos 202 registros executáveis de expansão)
- **`human_entry_id`:** `87` (Tabela da Seção 17 do Dicionário Conversacional 2.0)
- **`forma`:** `veth`
- **`classe_humana` / `classe_núcleo`:** `REL` (no dicionário humano) / `substantivo relacional` (no núcleo)
- **`significado_humano` / `significado_núcleo`:** `vincular-se, cuidar, amar sem posse` (no dicionário humano) / `vínculo ou união de alma` (no núcleo)
- **`valência`:** `relacional`
- **`source_status`:** `V2-OP` (no dicionário humano) / `CAN` (no núcleo)
- **`final_canonical_status`:** **`CANONICAL`**
- **`classificação`:** **`maps_to_core_only`**
- **`texto_fonte_humano`:** `| veth | REL | vincular-se, cuidar, amar sem posse | V2-OP |`
- **`source_sha256`:** `0f455325ff3265ebce1c56ad4cba4adab0d52ef1e0d37e69d76c7b3967aaef28`

### 2.2. `vethari`
- **`core_id`:** `783` (Núcleo 1.0 imutável)
- **`executable_id`:** `null` (0 ocorrências nos 202 registros executáveis de expansão)
- **`human_entry_id`:** `102` (Tabela da Seção 17 do Dicionário Conversacional 2.0)
- **`forma`:** `vethari`
- **`classe_humana` / `classe_núcleo`:** `REL` (no dicionário humano) / `substantivo/verbo relacional` (no núcleo)
- **`significado_humano` / `significado_núcleo`:** `realizar Merge legítimo` (no dicionário humano) / `Merge legítimo` (no núcleo)
- **`valência`:** `relacional / verbal`
- **`source_status`:** `V1-CAN` (no dicionário humano) / `CAN` (no núcleo)
- **`final_canonical_status`:** **`CANONICAL`**
- **`classificação`:** **`maps_to_core_only`**
- **`texto_fonte_humano`:** `| vethari | REL | realizar Merge legítimo | V1-CAN |`
- **`source_sha256`:** `ef6eef00c7e2b7e190ee0a2a1a8cbe5dcfba7ee3111f18579975b9fa4ed0d087`

---

## 3. Partição Mutuamente Exclusiva dos 223 Verbetes Humanos

| Categoria Mutuamente Exclusiva | Quantidade | Descrição / Integrantes |
|--------------------------------|------------|-------------------------|
| **`maps_to_expansion_only`** | **200** | Verbetes humanos da Seção 17 que mapeiam exclusivamente para os 202 registros executáveis de expansão. |
| **`maps_to_core_only`** | **23** | Verbetes humanos da Seção 17 que mapeiam exclusivamente para o Núcleo 1.0 (incluindo `veth` e `vethari`). |
| **`maps_to_core_and_expansion`** | **0** | Nenhuma duplicidade ativa entre as partições. |
| **`expression_without_record`** | **0** | — |
| **`variant_without_record`** | **0** | — |
| **`additional_sense_without_record`** | **0** | — |
| **`unresolved`** | **0** | — |
| **SOMA TOTAL DAS CATEGORIAS** | **223** | $\mathbf{200 + 23 = 223 \text{ verbetes humanos}}$. |

---

## 4. Reconciliação Cardinal Final
- **Equação Cardinal:** $\mathbf{223 \text{ verbetes humanos}} = \mathbf{200 \text{ verbetes exclusivos da expansão}} + \mathbf{23 \text{ verbetes do núcleo}}$.
- **Explicação dos 202 Executáveis:** Os 202 registros executáveis de expansão correspondem aos 200 verbetes exclusivos da expansão mais os 2 registros de representação consolidada (formas novas v2.0 como `lesan` e `ravun`).

---

## 5. Métricas com Universo Explícito
- **`core_to_human`:** **23 verbetes** presentes na Seção 17 (do universo de 48 registros do Núcleo 1.0).
- **`core_to_appendix`:** **48 registros** presentes na Tabela #134 do DOCX (do universo de 48 registros do Núcleo 1.0).
- **`expansion_to_human`:** **202 registros** (do universo de 202 registros executáveis de expansão).
- **`expansion_to_appendix`:** **48 presentes na Tabela #135 / 154 omitidos por layout** (do universo de 202 registros executáveis de expansão).
