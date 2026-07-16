# Creative Knowledge Engine
## Project Astra Fixture Contract v1.0

- **Status:** Fixed adjunct contract
- **Parent:** `PROJECT_ASTRA_v1.0.md`
- **Purpose:** post-freeze R-2を解消し、Fixture・golden JSON・Demo Mode・統合テストの最終値を固定する
- **Non-goal:** シナリオ、Candidate、Review操作、期待件数、上位仕様を変更しない

---

## 1. 固定期待値

- Entity: 7
- Relationship: 5
- Character: 2
- Scene: 1
- Location: 1
- Item: 2
- Organization: 1
- Duplicate: 1組
- 未解決Conflict: 1件
- Orphan: 1件
- 最終Knowledge revision: 4
- Imported Document: 4
- Review Session: 4
- Review Application: 4

Royal KeyとOuter Gateは登録しない。Quiet Prism → Outer Gateは`unresolved_to`でblocked後にRejectする。

---

## 2. Fixture構成

```text
src/data/demo/project-astra/
  sources/
    01-astra-foundation.md
    02-nova-archive-revision.md
    03-unknown-nova-log.md
    04-quiet-prism-card.md
  candidates/
    01-astra-foundation.candidates.json
    02-nova-archive-revision.candidates.json
    03-unknown-nova-log.candidates.json
    04-quiet-prism-card.candidates.json
  expected/
    final-knowledge.json
    expected-insights.json
  fixture-manifest.json
```

sourceはUTF-8、BOMなし、LF、末尾改行1個。SHA-256は実ファイルのraw contentから計算し、manifestへ保存する。

---

## 3. 固定Import順とrevision

| order | documentId | reviewSessionId | baseRevision | applied revision |
|---:|---|---|---:|---|
| 1 | `astra-doc-001` | `review-astra-001` | 0 | 0→1 |
| 2 | `astra-doc-002` | `review-astra-002` | 1 | 1→2 |
| 3 | `astra-doc-003` | `review-astra-003` | 2 | 2→3 |
| 4 | `astra-doc-004` | `review-astra-004` | 3 | 3→4 |

各文書はImport、Entity Review、Relationship Review、complete、applyまで終えてから次をImportする。

---

## 4. 固定ID発行順

```text
astra-doc-001
review-astra-001
ent-astra-001
ent-astra-002
ent-astra-003
ent-astra-004
ent-astra-005
rel-astra-001
rel-astra-002
rel-astra-003
rel-astra-004
astra-doc-002
review-astra-002
astra-doc-003
review-astra-003
ent-astra-006
rel-astra-005
astra-doc-004
review-astra-004
ent-astra-007
```

Merge、Reject、blocked、Relationship重複統合ではIDを発行しない。

---

## 5. 固定Clock順

```text
2026-07-16T00:00:00.000Z Document 01 import
2026-07-16T00:01:00.000Z Nova Arclight Accept
2026-07-16T00:02:00.000Z Astra Survey Corps Accept
2026-07-16T00:03:00.000Z Northstar Observatory Accept
2026-07-16T00:04:00.000Z First Light Briefing Accept
2026-07-16T00:05:00.000Z Aster Compass Accept
2026-07-16T00:06:00.000Z member_of Accept
2026-07-16T00:07:00.000Z carries Accept
2026-07-16T00:08:00.000Z Nova appears_in Accept
2026-07-16T00:09:00.000Z located_at Accept
2026-07-16T00:10:00.000Z Session 01 apply
2026-07-16T00:11:00.000Z Document 02 import
2026-07-16T00:12:00.000Z Nova Merge
2026-07-16T00:13:00.000Z Observatory Merge
2026-07-16T00:14:00.000Z member_of merge
2026-07-16T00:15:00.000Z Session 02 apply
2026-07-16T00:16:00.000Z Document 03 import
2026-07-16T00:17:00.000Z ＮＯＶＡ Accept
2026-07-16T00:18:00.000Z ＮＯＶＡ appears_in Accept
2026-07-16T00:19:00.000Z Session 03 apply
2026-07-16T00:20:00.000Z Document 04 import
2026-07-16T00:21:00.000Z Quiet Prism Accept
2026-07-16T00:22:00.000Z Session 04 apply
```

Edit、Reject、phase移行、complete、blocked判定はClockを呼ばない。

---

## 6. 配列順

- Entity／Relationship: 登録順
- aliases、tags、sourceRefs: 既存値→incoming値の先出現順
- sourceRefsの同一性: `documentId + fileName + excerpt`
- claims: 既存claim→incoming claim
- Merge時のname／description: 明示変更しない限り既存値維持
- Relationship重複統合時のdescription: 既存値維持

---

## 7. SourceRef

Entity用：

- **SR-001** `astra-doc-001` / `01-astra-foundation.md` / `Nova Arclight, known as Nova, is a 17-year-old celestial cartographer and a member of the Astra Survey Corps.`
- **SR-002** `astra-doc-001` / `01-astra-foundation.md` / `a member of the Astra Survey Corps`
- **SR-003** `astra-doc-001` / `01-astra-foundation.md` / `a repeating signal detected at Northstar Observatory`
- **SR-004** `astra-doc-001` / `01-astra-foundation.md` / `At the First Light Briefing, Nova reports a repeating signal`
- **SR-005** `astra-doc-001` / `01-astra-foundation.md` / `Nova carries the silver Aster Compass.`
- **SR-006** `astra-doc-002` / `02-nova-archive-revision.md` / `A later archive lists Nova as 18 years old`
- **SR-007** `astra-doc-002` / `02-nova-archive-revision.md` / `The archive spells the observation site as “North Star Observatory.”`
- **SR-008** `astra-doc-003` / `03-unknown-nova-log.md` / `A masked operator signed the field log as “ＮＯＶＡ.”`
- **SR-009** `astra-doc-004` / `04-quiet-prism-card.md` / `The inventory lists an item named Quiet Prism.`
- **SR-010** `astra-doc-004` / `04-quiet-prism-card.md` / `A penciled margin says “Royal Key?”, but this is only a guess.`

Relationship用：

- member_of foundation: SR-002と同一
- carries: SR-005と同一
- Nova appears_in: SR-004と同一
- located_at: SR-003と同一
- member_of revision: `astra-doc-002` / `02-nova-archive-revision.md` / `Nova remains a member of the Astra Survey Corps`
- Unknown NOVA appears_in: `astra-doc-003` / `03-unknown-nova-log.md` / `The operator was present at the First Light Briefing.`
- points_to candidate only: `astra-doc-004` / `04-quiet-prism-card.md` / `A second note claims that the Quiet Prism points toward an Outer Gate, but no such location has been established in the archive.`

---

## 8. 最終Entity

Fixtureの最終Knowledgeに保存する属性キーは、Candidate上のraw keyではなく、確定済みの`normalizeAttributeKey`を適用した後のkeyとする。

### `ent-astra-001` Nova Arclight

- type: `character`
- aliases: `["Nova"]`
- description: `A celestial cartographer in the Astra Survey Corps.`
- tags: `["cartographer", "astra-survey", "archive-revision"]`
- sourceRefs: `[SR-001, SR-006]`
- createdAt: `2026-07-16T00:01:00.000Z`
- updatedAt: `2026-07-16T00:12:00.000Z`
- age: canonical 17、claims 17/SR-001と18/SR-006、resolvedAt null
- role: canonical `"celestial cartographer"`、claim SR-001

### `ent-astra-002` Astra Survey Corps

- type: `organization`
- aliases: `["ASC"]`
- description: `An organization that investigates celestial anomalies.`
- tags: `["organization", "astronomy"]`
- sourceRefs: `[SR-002]`
- createdAt = updatedAt: `2026-07-16T00:02:00.000Z`
- purpose: `"celestial survey"` / SR-002

### `ent-astra-003` Northstar Observatory

- type: `location`
- aliases: `[]`
- description: `An observatory where a repeating signal was detected.`
- tags: `["observatory", "archive-revision"]`
- sourceRefs: `[SR-003, SR-007]`
- createdAt: `2026-07-16T00:03:00.000Z`
- updatedAt: `2026-07-16T00:13:00.000Z`
- function: `"observation"` / SR-003

### `ent-astra-004` First Light Briefing

- type: `scene`
- aliases: `[]`
- description: `A briefing where Nova reports the repeating signal.`
- tags: `["briefing", "signal"]`
- sourceRefs: `[SR-004]`
- createdAt = updatedAt: `2026-07-16T00:04:00.000Z`
- status: `"recorded"` / SR-004

### `ent-astra-005` Aster Compass

- type: `item`
- aliases: `[]`
- description: `A silver compass carried by Nova.`
- tags: `["instrument"]`
- sourceRefs: `[SR-005]`
- createdAt = updatedAt: `2026-07-16T00:05:00.000Z`
- material: `"silver"` / SR-005

### `ent-astra-006` ＮＯＶＡ

- type: `character`
- aliases: `[]`
- description: `An unidentified masked operator using the name NOVA.`
- tags: `["masked-operator", "unverified"]`
- sourceRefs: `[SR-008]`
- createdAt = updatedAt: `2026-07-16T00:17:00.000Z`
- identitystatus: `"unverified"` / SR-008

### `ent-astra-007` Quiet Prism

- type: `item`
- aliases: `[]`
- description: `An item with no recorded owner, location, or known use.`
- tags: `["inventory", "unassigned"]`
- sourceRefs: `[SR-009]`
- createdAt = updatedAt: `2026-07-16T00:21:00.000Z`
- status: `"unassigned"` / SR-009

全AttributeRecordの`conflictResolvedAt`はnull。

---

## 9. 最終Relationship

| ID | from | to | type | sourceRefs | createdAt | updatedAt |
|---|---|---|---|---|---|---|
| `rel-astra-001` | ent-001 | ent-002 | member_of | foundation、revisionの2件 | 00:06Z | 00:14Z |
| `rel-astra-002` | ent-001 | ent-005 | carries | SR-005 | 00:07Z | 00:07Z |
| `rel-astra-003` | ent-001 | ent-004 | appears_in | SR-004 | 00:08Z | 00:08Z |
| `rel-astra-004` | ent-004 | ent-003 | located_at | SR-003 | 00:09Z | 00:09Z |
| `rel-astra-005` | ent-006 | ent-004 | appears_in | Unknown NOVA appears source | 00:18Z | 00:18Z |

時刻の日付はすべて`2026-07-16`、descriptionは全件空文字。

---

## 10. Review操作

- Doc 01: 5 Entity Accept、4 Relationship Accept、complete、apply
- Doc 02: Novaをent-001へMerge、Observatoryを`Northstar Observatory`へEdit後ent-003へMerge、member_ofを既存rel-001へ統合、complete、apply
- Doc 03: Duplicate候補があってもＮＯＶＡをAccept as new、Relationship Accept、complete、apply
- Doc 04: Quiet Prism Accept、Royal Key Reject、points_toはblocked後にReject、complete、apply

`cand-astra-002-nova.aliases`は`[]`。

---

## 11. Review Application

| session | appliedAt | from | to |
|---|---|---:|---:|
| review-astra-001 | 2026-07-16T00:10:00.000Z | 0 | 1 |
| review-astra-002 | 2026-07-16T00:15:00.000Z | 1 | 2 |
| review-astra-003 | 2026-07-16T00:19:00.000Z | 2 | 3 |
| review-astra-004 | 2026-07-16T00:22:00.000Z | 3 | 4 |

---

## 12. Insights期待値

```json
{
  "duplicateGroups": [
    {
      "normalizedKey": "nova",
      "entityIds": ["ent-astra-001", "ent-astra-006"]
    }
  ],
  "conflicts": [
    {
      "entityId": "ent-astra-001",
      "attributeKey": "age",
      "canonicalValue": 17,
      "claimValues": [17, 18],
      "conflictResolvedAt": null
    }
  ],
  "orphanEntityIds": ["ent-astra-007"],
  "statistics": {
    "entityCount": 7,
    "entityCountByType": {
      "character": 2,
      "scene": 1,
      "location": 1,
      "item": 2,
      "organization": 1
    },
    "relationshipCount": 5,
    "orphanCount": 1,
    "unresolvedConflictCount": 1
  }
}
```

---

## 13. Golden比較

- `final-knowledge.json`はKnowledgeStateだけを保存
- `expected-insights.json`はInsightsだけを保存
- object key順は不問、array順は完全一致
- timestamps、SourceRefs、claimsを含めて比較
- goldenはテスト実行中に自動更新しない
- Storage全体の巨大goldenは作らない

---

## 14. 再Import

最終状態でDocument 01を同一raw contentで再Importする。

- `already_imported`
- Extraction、ID、Clock、saveを呼ばない
- Knowledge 7／5、revision 4、Application 4件のまま
- claims、sourceRefs、Insights不変

---

## 15. synthetic fixtureとの分離

型差、cycle、区切り文字衝突、Context Bundle Budget、Storage migration旧version等はProject Astraへ追加しない。

---

## 16. R-2解消条件

本書から追加判断なしで次を生成できること。

1. 4 source Markdown
2. 4 Candidate Bundle JSON
3. final-knowledge.json
4. expected-insights.json
5. fixture-manifest.json
6. end-to-end test
7. reImport test
