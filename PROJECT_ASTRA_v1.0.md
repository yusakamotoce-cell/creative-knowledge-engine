# Creative Knowledge Engine
## Project Astra v1.0
### 公式デモ・テストデータセット凍結仕様

- **Status:** Frozen
- **Version:** 1.0
- **Freeze date:** 2026-07-16
- **Fable review result:** 軽微な修正後に凍結可能
- **Entity期待値:** 7
- **Relationship期待値:** 5
- **Orphan期待値:** 1
- **未解決Conflict期待値:** 1
- **Duplicate期待値:** 1組以上

---

## 1. 位置づけ

Project Astraは、Creative Knowledge Engineの公式デモ兼テストデータセットである。

単なる画面表示用サンプルではなく、実際のドメインロジックを通した結果として、次を必ず成立させる。

- Duplicate：1組以上
- Conflict：1件
- Orphan：1件
- Relationship：5件
- Organizationと所属者：1組以上

さらに、一つのデータセットで次のCandidate Review操作を確認する。

- Accept as new
- Merge into existing
- Edit後の再照合
- Reject
- Relationship重複統合
- blocked Relationship
- 同一文書再Importの冪等性

本v1.0はFixture内容、Review操作、最終Knowledge期待値、3分デモ順を凍結する。上位仕様で未確定の実装規則は、本書末尾の「凍結後の実装確認事項」へ分離し、本書で推測して確定しない。

## 2. シナリオ概要

Astra Survey Corpsは、星空に現れる異常信号を調査する組織である。

若い天体地図制作者Nova Arclightは、Northstar Observatoryで観測された信号について、First Light Briefingで報告する。

資料を統合すると、次の問題が見つかる。

- Novaの年齢が17歳と18歳で食い違う
- 正体不明の人物が全角表記の「ＮＯＶＡ」を名乗っている
- 所有者も所在地も不明なQuiet Prismが存在する
- 同じ所属Relationshipが別資料にも記録されている
- `North Star Observatory`という表記揺れがある
- Quiet Prismから未登録の場所へのRelationship候補がある

このシナリオによって、AIの候補を創作者が確認し、正典を自分で決定する製品体験を示す。

## 3. データセット構成

```text
project-astra/
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
```

全入力文書はUTF-8、改行LFとしてFixture化する。文書内容SHA-256は実ファイルのバイト列から生成する。

## 4. 固定インポート順

Knowledge Baseが空の状態から開始し、次の順序を変更しない。

```text
01-astra-foundation.md
↓
02-nova-archive-revision.md
↓
03-unknown-nova-log.md
↓
04-quiet-prism-card.md
```

## 5. Fixture 01：基礎設定

### 5.1 入力文書

#### `01-astra-foundation.md`

```markdown
# Astra Survey Corps Foundation Briefing

Nova Arclight, known as Nova, is a 17-year-old celestial cartographer and a member of the Astra Survey Corps.

Nova carries the silver Aster Compass.

At the First Light Briefing, Nova reports a repeating signal detected at Northstar Observatory.
```

### 5.2 Document ID

```text
astra-doc-001
```

### 5.3 Entity Candidates

#### `cand-astra-001-nova`

- entityType: `character`
- name: `Nova Arclight`
- aliases: `["Nova"]`
- description: `A celestial cartographer in the Astra Survey Corps.`
- attributes:
  - age: `17`
  - role: `"celestial cartographer"`
- tags: `["cartographer", "astra-survey"]`
- sourceRefs:

```json
[
  {
    "documentId": "astra-doc-001",
    "fileName": "01-astra-foundation.md",
    "excerpt": "Nova Arclight, known as Nova, is a 17-year-old celestial cartographer and a member of the Astra Survey Corps."
  }
]
```

#### `cand-astra-001-corps`

- entityType: `organization`
- name: `Astra Survey Corps`
- aliases: `["ASC"]`
- description: `An organization that investigates celestial anomalies.`
- attributes:
  - purpose: `"celestial survey"`
- tags: `["organization", "astronomy"]`
- sourceRefs:

```json
[
  {
    "documentId": "astra-doc-001",
    "fileName": "01-astra-foundation.md",
    "excerpt": "Nova Arclight, known as Nova, is a 17-year-old celestial cartographer and a member of the Astra Survey Corps."
  }
]
```

#### `cand-astra-001-observatory`

- entityType: `location`
- name: `Northstar Observatory`
- aliases: `[]`
- description: `An observatory where a repeating signal was detected.`
- attributes:
  - function: `"observation"`
- tags: `["observatory"]`
- sourceRefs:

```json
[
  {
    "documentId": "astra-doc-001",
    "fileName": "01-astra-foundation.md",
    "excerpt": "At the First Light Briefing, Nova reports a repeating signal detected at Northstar Observatory."
  }
]
```

#### `cand-astra-001-briefing`

- entityType: `scene`
- name: `First Light Briefing`
- aliases: `[]`
- description: `A briefing where Nova reports the repeating signal.`
- attributes:
  - status: `"recorded"`
- tags: `["briefing", "signal"]`
- sourceRefs:

```json
[
  {
    "documentId": "astra-doc-001",
    "fileName": "01-astra-foundation.md",
    "excerpt": "At the First Light Briefing, Nova reports a repeating signal detected at Northstar Observatory."
  }
]
```

#### `cand-astra-001-compass`

- entityType: `item`
- name: `Aster Compass`
- aliases: `[]`
- description: `A silver compass carried by Nova.`
- attributes:
  - material: `"silver"`
- tags: `["instrument"]`
- sourceRefs:

```json
[
  {
    "documentId": "astra-doc-001",
    "fileName": "01-astra-foundation.md",
    "excerpt": "Nova carries the silver Aster Compass."
  }
]
```

### 5.4 Relationship Candidates

#### `relcand-astra-001-member`

```json
{
  "candidateId": "relcand-astra-001-member",
  "fromRef": { "candidateId": "cand-astra-001-nova" },
  "toRef": { "candidateId": "cand-astra-001-corps" },
  "relationType": "member_of",
  "description": "",
  "sourceRefs": [
    {
      "documentId": "astra-doc-001",
      "fileName": "01-astra-foundation.md",
      "excerpt": "Nova Arclight, known as Nova, is a 17-year-old celestial cartographer and a member of the Astra Survey Corps."
    }
  ]
}
```

#### `relcand-astra-001-carries`

```json
{
  "candidateId": "relcand-astra-001-carries",
  "fromRef": { "candidateId": "cand-astra-001-nova" },
  "toRef": { "candidateId": "cand-astra-001-compass" },
  "relationType": "carries",
  "description": "",
  "sourceRefs": [
    {
      "documentId": "astra-doc-001",
      "fileName": "01-astra-foundation.md",
      "excerpt": "Nova carries the silver Aster Compass."
    }
  ]
}
```

#### `relcand-astra-001-appears`

```json
{
  "candidateId": "relcand-astra-001-appears",
  "fromRef": { "candidateId": "cand-astra-001-nova" },
  "toRef": { "candidateId": "cand-astra-001-briefing" },
  "relationType": "appears_in",
  "description": "",
  "sourceRefs": [
    {
      "documentId": "astra-doc-001",
      "fileName": "01-astra-foundation.md",
      "excerpt": "At the First Light Briefing, Nova reports a repeating signal detected at Northstar Observatory."
    }
  ]
}
```

#### `relcand-astra-001-located`

```json
{
  "candidateId": "relcand-astra-001-located",
  "fromRef": { "candidateId": "cand-astra-001-briefing" },
  "toRef": { "candidateId": "cand-astra-001-observatory" },
  "relationType": "located_at",
  "description": "",
  "sourceRefs": [
    {
      "documentId": "astra-doc-001",
      "fileName": "01-astra-foundation.md",
      "excerpt": "At the First Light Briefing, Nova reports a repeating signal detected at Northstar Observatory."
    }
  ]
}
```

### 5.5 Review操作と登録結果

- 5件のEntityをすべてAccept as new
- 4件のRelationshipをすべてAccept
- 登録Entity：5件
- 登録Relationship：4件
- Organizationと所属者：成立

## 6. Fixture 02：年齢Conflictと表記修正

### 6.1 入力文書

#### `02-nova-archive-revision.md`

```markdown
# Nova Archive Revision

A later archive lists Nova as 18 years old and confirms that Nova remains a member of the Astra Survey Corps.

The archive spells the observation site as “North Star Observatory.” The creator's canon name is “Northstar Observatory.”
```

### 6.2 Document ID

```text
astra-doc-002
```

### 6.3 Entity Candidates

#### `cand-astra-002-nova`

- entityType: `character`
- name: `Nova`
- aliases: `[]`
- description: `A later archive entry for Nova.`
- attributes:
  - age: `18`
- tags: `["archive-revision"]`
- sourceRefs:

```json
[
  {
    "documentId": "astra-doc-002",
    "fileName": "02-nova-archive-revision.md",
    "excerpt": "A later archive lists Nova as 18 years old and confirms that Nova remains a member of the Astra Survey Corps."
  }
]
```

`aliases`は空配列である。入力本文に存在しない`Nova Arclight`をCandidate aliasとして補わない。Candidateのname `Nova`が、登録済みNova Arclightのalias `Nova`と正規化後に完全一致するため、merge候補は成立する。

#### `cand-astra-002-observatory`

- entityType: `location`
- name: `North Star Observatory`
- aliases: `[]`
- description: `An alternate spelling found in the archive.`
- attributes: `{}`
- tags: `["archive-revision"]`
- sourceRefs:

```json
[
  {
    "documentId": "astra-doc-002",
    "fileName": "02-nova-archive-revision.md",
    "excerpt": "The archive spells the observation site as “North Star Observatory.” The creator's canon name is “Northstar Observatory.”"
  }
]
```

`North Star Observatory`と`Northstar Observatory`は、Entity照合用の既定正規化だけでは完全一致しない。

### 6.4 Relationship Candidate

#### `relcand-astra-002-member`

```json
{
  "candidateId": "relcand-astra-002-member",
  "fromRef": { "candidateId": "cand-astra-002-nova" },
  "toRef": {
    "name": "Astra Survey Corps",
    "entityType": "organization"
  },
  "relationType": "ＭＥＭＢＥＲ＿ＯＦ",
  "description": "",
  "sourceRefs": [
    {
      "documentId": "astra-doc-002",
      "fileName": "02-nova-archive-revision.md",
      "excerpt": "A later archive lists Nova as 18 years old and confirms that Nova remains a member of the Astra Survey Corps."
    }
  ]
}
```

NFKCと英字小文字化によって、relationTypeは`member_of`になる。

### 6.5 Review操作

#### Nova

`cand-astra-002-nova`を登録済みNova ArclightへMergeする。

- 既存Entity IDを維持
- age claim `18`を追加
- canonicalValue `17`は自動変更しない
- `conflictResolvedAt`を`null`にする
- `archive-revision`をtagsへ追加
- CandidateのsourceRefsを既存EntityのsourceRefsへ統合
- 既存nameとdescriptionを自動上書きしない

#### North Star Observatory

1. Editでnameを`Northstar Observatory`へ変更
2. Entity照合を再実行
3. 登録済みNorthstar ObservatoryへMerge

#### member_of Relationship

RelationshipをAcceptする。最終的なfrom/toがNova ArclightとAstra Survey Corpsへ解決された時点で、Fixture 01のRelationshipと同じ重複キーになる。

```text
ent-astra-001
+
ent-astra-002
+
member_of
```

新規Relationshipは作成せず、既存Relationship ID `rel-astra-001`を維持し、sourceRefsを和集合として統合する。

### 6.6 統合後のmember_of Relationship

```json
{
  "id": "rel-astra-001",
  "fromEntityId": "ent-astra-001",
  "toEntityId": "ent-astra-002",
  "relationType": "member_of",
  "description": "",
  "sourceRefs": [
    {
      "documentId": "astra-doc-001",
      "fileName": "01-astra-foundation.md",
      "excerpt": "Nova Arclight, known as Nova, is a 17-year-old celestial cartographer and a member of the Astra Survey Corps."
    },
    {
      "documentId": "astra-doc-002",
      "fileName": "02-nova-archive-revision.md",
      "excerpt": "A later archive lists Nova as 18 years old and confirms that Nova remains a member of the Astra Survey Corps."
    }
  ]
}
```

2件のRelationship Candidateがそれぞれ異なる入力文書のSourceRefを1件ずつ持つため、統合後のsourceRefsが2件になることを本書だけから導出できる。

## 7. Fixture 03：完全一致Duplicate

### 7.1 入力文書

#### `03-unknown-nova-log.md`

```markdown
# Unknown NOVA Field Log

A masked operator signed the field log as “ＮＯＶＡ.”

The operator was present at the First Light Briefing.

The archive cannot confirm that this operator is Nova Arclight.
```

### 7.2 Document ID

```text
astra-doc-003
```

### 7.3 Entity Candidate

#### `cand-astra-003-unknown-nova`

- entityType: `character`
- name: `ＮＯＶＡ`
- aliases: `[]`
- description: `An unidentified masked operator using the name NOVA.`
- attributes:
  - identityStatus: `"unverified"`
- tags: `["masked-operator", "unverified"]`
- sourceRefs:

```json
[
  {
    "documentId": "astra-doc-003",
    "fileName": "03-unknown-nova-log.md",
    "excerpt": "A masked operator signed the field log as “ＮＯＶＡ.”"
  }
]
```

### 7.4 Relationship Candidate

#### `relcand-astra-003-appears`

```json
{
  "candidateId": "relcand-astra-003-appears",
  "fromRef": { "candidateId": "cand-astra-003-unknown-nova" },
  "toRef": {
    "name": "First Light Briefing",
    "entityType": "scene"
  },
  "relationType": "appears_in",
  "description": "",
  "sourceRefs": [
    {
      "documentId": "astra-doc-003",
      "fileName": "03-unknown-nova-log.md",
      "excerpt": "The operator was present at the First Light Briefing."
    }
  ]
}
```

### 7.5 Duplicate成立根拠

```text
normalizeEntityName("ＮＯＶＡ")
→ NFKC
→ "NOVA"
→ 英字小文字化
→ "nova"

normalizeEntityName("Nova")
→ "nova"
```

登録済みNova Arclightのalias `Nova`と完全一致するため、merge候補として提示される。類似、意味的推測、AI判定は使用しない。

### 7.6 Review操作と結果

- Candidateはmerge可能として表示する。
- 資料だけでは同一人物と断定できないため、ユーザーはAccept as newを選択する。
- `ＮＯＶＡ`を`ent-astra-006`として登録する。
- `ＮＯＶＡ → First Light Briefing / appears_in`をAcceptする。
- Nova ArclightとＮＯＶＡを別Entityとして保持するため、Duplicate Insightが成立する。

## 8. Fixture 04：Orphan、Reject、blocked

### 8.1 入力文書

#### `04-quiet-prism-card.md`

```markdown
# Quiet Prism Inventory Card

The inventory lists an item named Quiet Prism.

No owner, location, or known use is recorded.

A penciled margin says “Royal Key?”, but this is only a guess.

A second note claims that the Quiet Prism points toward an Outer Gate, but no such location has been established in the archive.
```

### 8.2 Document ID

```text
astra-doc-004
```

### 8.3 Entity Candidates

#### `cand-astra-004-prism`

- entityType: `item`
- name: `Quiet Prism`
- aliases: `[]`
- description: `An item with no recorded owner, location, or known use.`
- attributes:
  - status: `"unassigned"`
- tags: `["inventory", "unassigned"]`
- sourceRefs:

```json
[
  {
    "documentId": "astra-doc-004",
    "fileName": "04-quiet-prism-card.md",
    "excerpt": "The inventory lists an item named Quiet Prism."
  }
]
```

#### `cand-astra-004-royal-key`

- entityType: `item`
- name: `Royal Key`
- aliases: `[]`
- description: `A speculative interpretation written in the margin.`
- attributes: `{}`
- tags: `["speculative"]`
- sourceRefs:

```json
[
  {
    "documentId": "astra-doc-004",
    "fileName": "04-quiet-prism-card.md",
    "excerpt": "A penciled margin says “Royal Key?”, but this is only a guess."
  }
]
```

### 8.4 Relationship Candidate

#### `relcand-astra-004-points`

```json
{
  "candidateId": "relcand-astra-004-points",
  "fromRef": { "candidateId": "cand-astra-004-prism" },
  "toRef": {
    "name": "Outer Gate",
    "entityType": "location"
  },
  "relationType": "points_to",
  "description": "",
  "sourceRefs": [
    {
      "documentId": "astra-doc-004",
      "fileName": "04-quiet-prism-card.md",
      "excerpt": "A second note claims that the Quiet Prism points toward an Outer Gate, but no such location has been established in the archive."
    }
  ]
}
```

Outer Gateに対応するCandidateまたは登録済みEntityは存在しない。

### 8.5 Review操作と結果

- Quiet Prism：Accept as new
- Royal Key：Reject
- Quiet Prism → Outer Gate：片端を解決できないため`blocked`
- blocked RelationshipはAcceptできず、Knowledge Storeへ登録しない
- Quiet Prismは登録済みRelationshipの始点にも終点にも含まれないため、唯一のOrphanになる

## 9. 決定的テストID

これらはテスト用IdGeneratorが返すIDであり、本番ID形式を固定しない。

### Entity IDs

| ID | Entity |
|---|---|
| `ent-astra-001` | Nova Arclight |
| `ent-astra-002` | Astra Survey Corps |
| `ent-astra-003` | Northstar Observatory |
| `ent-astra-004` | First Light Briefing |
| `ent-astra-005` | Aster Compass |
| `ent-astra-006` | ＮＯＶＡ |
| `ent-astra-007` | Quiet Prism |

### Relationship IDs

| ID | Relationship |
|---|---|
| `rel-astra-001` | Nova Arclight → Astra Survey Corps / member_of |
| `rel-astra-002` | Nova Arclight → Aster Compass / carries |
| `rel-astra-003` | Nova Arclight → First Light Briefing / appears_in |
| `rel-astra-004` | First Light Briefing → Northstar Observatory / located_at |
| `rel-astra-005` | ＮＯＶＡ → First Light Briefing / appears_in |

## 10. Candidate Reviewの最終結果

次の表はFixture上のReview結果と最終Entityを示す。Merge時に`candidateId → registeredEntityId`対応表へ何を登録するかという一般規則は示さず、第18節の実装確認事項へ分離する。

| candidateId | Review結果 | 最終Entity |
|---|---|---|
| `cand-astra-001-nova` | Accept as new | `ent-astra-001` Nova Arclight |
| `cand-astra-001-corps` | Accept as new | `ent-astra-002` Astra Survey Corps |
| `cand-astra-001-observatory` | Accept as new | `ent-astra-003` Northstar Observatory |
| `cand-astra-001-briefing` | Accept as new | `ent-astra-004` First Light Briefing |
| `cand-astra-001-compass` | Accept as new | `ent-astra-005` Aster Compass |
| `cand-astra-002-nova` | Merge | `ent-astra-001`へ統合 |
| `cand-astra-002-observatory` | Edit後にMerge | `ent-astra-003`へ統合 |
| `cand-astra-003-unknown-nova` | Accept as new | `ent-astra-006` ＮＯＶＡ |
| `cand-astra-004-prism` | Accept as new | `ent-astra-007` Quiet Prism |
| `cand-astra-004-royal-key` | Reject | 登録なし |

RejectされたRoyal Keyには正式IDを発行しない。

## 11. Merge完了後のNova Arclight

### 11.1 最終値

```ts
{
  id: "ent-astra-001",
  entityType: "character",
  name: "Nova Arclight",
  aliases: ["Nova"],
  description: "A celestial cartographer in the Astra Survey Corps.",
  attributes: {
    age: {
      canonicalValue: 17,
      claims: [
        {
          value: 17,
          sourceRef: {
            documentId: "astra-doc-001",
            fileName: "01-astra-foundation.md",
            excerpt: "Nova Arclight, known as Nova, is a 17-year-old celestial cartographer and a member of the Astra Survey Corps."
          }
        },
        {
          value: 18,
          sourceRef: {
            documentId: "astra-doc-002",
            fileName: "02-nova-archive-revision.md",
            excerpt: "A later archive lists Nova as 18 years old and confirms that Nova remains a member of the Astra Survey Corps."
          }
        }
      ],
      conflictResolvedAt: null
    },
    role: {
      canonicalValue: "celestial cartographer",
      claims: [
        {
          value: "celestial cartographer",
          sourceRef: {
            documentId: "astra-doc-001",
            fileName: "01-astra-foundation.md",
            excerpt: "Nova Arclight, known as Nova, is a 17-year-old celestial cartographer and a member of the Astra Survey Corps."
          }
        }
      ],
      conflictResolvedAt: null
    }
  },
  tags: ["cartographer", "astra-survey", "archive-revision"],
  sourceRefs: [
    {
      documentId: "astra-doc-001",
      fileName: "01-astra-foundation.md",
      excerpt: "Nova Arclight, known as Nova, is a 17-year-old celestial cartographer and a member of the Astra Survey Corps."
    },
    {
      documentId: "astra-doc-002",
      fileName: "02-nova-archive-revision.md",
      excerpt: "A later archive lists Nova as 18 years old and confirms that Nova remains a member of the Astra Survey Corps."
    }
  ],
  createdAt: "<Fixture 01でAccept as newした日時>",
  updatedAt: "<Fixture 02でMergeを確定した日時>"
}
```

### 11.2 時刻の扱い

- `createdAt`はFixture 01でNova ArclightをAccept as newした時刻を維持する。
- `updatedAt`はFixture 02でNova CandidateのMergeを確定した時刻へ更新する。
- 実日時の文字列はClockから供給されるためgolden Fixtureへ固定しない。テストでは固定Clockを使用する。

### 11.3 値の解釈

- Fixture 02 Candidateのname `Nova`は既にaliasとして存在するため、aliasesの最終値は`["Nova"]`のまま。
- Fixture 02 Candidateのdescriptionで既存descriptionを自動上書きしない。
- tagsとsourceRefsは和集合として上記の内容を持つ。
- ageのcanonicalValueは最初のclaim `17`を維持する。
- ageの全claims `17`と`18`を保持し、`conflictResolvedAt`は`null`である。
- roleは異なるclaimを追加されないため、未解決Conflictではない。

ここに列挙したSourceRefはProject Astra Fixtureの最終期待provenanceである。Candidate属性一般をどのSourceRefへ変換するかという実装規則は本節から一般化せず、第18節で上位契約確認を行う。

## 12. 最終Knowledge Store

### 12.1 Entity総数

```text
7
```

| EntityType | 件数 |
|---|---:|
| Character | 2 |
| Scene | 1 |
| Location | 1 |
| Item | 2 |
| Organization | 1 |

### 12.2 Relationship総数

```text
5
```

Fixture 02の`member_of`は既存Relationshipへ統合されるため、Relationship総数を増やさない。

### 12.3 最終登録Entity

1. Nova Arclight
2. Astra Survey Corps
3. Northstar Observatory
4. First Light Briefing
5. Aster Compass
6. ＮＯＶＡ
7. Quiet Prism

Royal KeyとOuter Gateは登録しない。

## 13. 必須Insightの期待結果

### Duplicate

最低1組。

```text
Nova Arclight
↔
ＮＯＶＡ
```

成立キーは`nova`。Nova Arclightのalias `Nova`とＮＯＶＡのnameがEntity照合用の既定正規化後に完全一致する。

### Conflict

正確に1件。

```text
Entity: Nova Arclight
Attribute: age
Claims: number 17, number 18
canonicalValue: 17
conflictResolvedAt: null
```

### Orphan

正確に1件。

```text
Quiet Prism
```

### Statistics

```text
Entity総数: 7
Character: 2
Scene: 1
Location: 1
Item: 2
Organization: 1
Relationship総数: 5
Orphan数: 1
未解決Conflict数: 1
```

## 14. Relationship重複統合の期待結果

Fixture 01とFixture 02の所属Relationshipは、最終的に同じfrom/toと正規化済みrelationTypeを持つ。

期待結果：

- Relationship IDは`rel-astra-001`を維持
- 新規Relationshipを作成しない
- sourceRefsは第6.6節に列挙した2件
- Relationship総数は5件のまま
- 方向はNova Arclight → Astra Survey Corpsを維持

## 15. 再Import冪等性

4文書それぞれについて、同一バイト列を再Importした場合は処理済みとして扱う。最低限、`01-astra-foundation.md`の再Importで次を確認する。

- Entity総数が7から増えない
- Relationship総数が5から増えない
- claimsが重複しない
- sourceRefsが重複しない
- Duplicate件数が増えない
- Conflict件数が増えない
- 処理済みであることがUIに表示される

Build Week版では強制再解析を提供しない。

## 16. 回帰テスト契約

Project Astraを規定順に処理した場合、次を固定する。

1. Entityが7件登録される
2. Relationshipが5件登録される
3. Characterが2件登録される
4. Organizationが1件登録される
5. Nova ArclightからAstra Survey Corpsへの`member_of`が存在する
6. Duplicate候補集合にNova ArclightとＮＯＶＡが含まれる
7. Nova Arclightのageに未解決Conflictが存在する
8. ageのcanonicalValueは17のまま
9. ageのclaimsにnumber型の17と18が残る
10. Quiet PrismだけがOrphanになる
11. Royal Keyは登録されない
12. Outer Gateは登録されない
13. Quiet Prism → Outer Gateはblockedになり、Acceptできない
14. Fixture 02の`member_of`は既存Relationshipへ統合される
15. 統合後の`member_of`に第6.6節のSourceRefが2件存在する
16. North Star ObservatoryはEdit後に既存Northstar Observatoryと照合される
17. Fixture 02のNova Candidateのaliasesは空配列である
18. Merge後のNova Arclightが第11節の最終値を持つ
19. 同一文書の再ImportでKnowledge Storeが変化しない
20. 同じ入力、Review操作、固定Clock、固定IdGeneratorから毎回同じ期待結果が得られる

Conflictの解決と再開はドメイン単体テストで別途確認する。Project Astraの標準完了状態では、デモ表示のためage Conflictを未解決のまま残す。

## 17. 3分デモの固定操作順

### Fixture 01を短縮して見せる方法

Fixture 01では、Nova ArclightのAccept as newを通常速度で1件だけ見せる。その後のEntity 4件とRelationship 4件は、同じ固定Candidate Bundleと規定Review操作を使った早送りまたはジャンプカットで短縮する。カット後に`Entity 5 / Relationship 4`を画面で確認する。

この短縮は動画編集上の省略であり、一括Accept機能、事前登録済みKnowledge、特別なデモ専用ドメイン処理を要求しない。実際のDemo Modeでは全9件のReview操作を規定どおり完了する。

### 固定タイムライン

| 時間 | 操作 | 見せる契約 |
|---|---|---|
| 0:00–0:15 | 4つの入力資料と問題を提示 | 散在資料、作者が最終決定する方針 |
| 0:15–0:35 | Fixture 01でNova ArclightをAccept as new。残りを早送りし、Entity 5 / Relationship 4を確認 | **Accept**、正式Knowledgeの基礎状態 |
| 0:35–0:55 | Fixture 02のNovaを既存Nova ArclightへMerge | **Merge**、age 18 claim追加、canonicalValue 17維持 |
| 0:55–1:10 | North Star ObservatoryをNorthstar ObservatoryへEditし、再照合後にMerge | **Edit**、完全一致による再照合 |
| 1:10–1:20 | Fixture 02のmember_ofをAcceptし、Relationship総数4のままSourceRefが2件になることを表示 | Relationship重複統合 |
| 1:20–1:35 | Fixture 03のＮＯＶＡをmergeせずAccept as newし、appears_inをAccept | 別Entityとしての**Accept**、後のDuplicate成立 |
| 1:35–1:45 | Fixture 04のQuiet PrismをAcceptし、Royal KeyをReject | Orphanの準備、**Reject** |
| 1:45–1:55 | Quiet Prism → Outer GateがblockedでAcceptできないことを表示 | **blocked Relationship** |
| 1:55–2:08 | InsightsでNova Arclight ↔ ＮＯＶＡを表示 | **Duplicate** |
| 2:08–2:21 | Nova Arclightのage 17 / 18を表示 | **Conflict** |
| 2:21–2:32 | Quiet Prismを表示 | **Orphan** |
| 2:32–2:47 | GraphでOrganization、Scene、Location、Itemの接続とQuiet Prismの非接続を表示 | Knowledgeは主、Graphはview |
| 2:47–2:55 | Searchを短く見せる | 実装済みSearch。文字列正規化規則は本書で追加確定しない |
| 2:55–3:00 | Knowledge Base JSON Exportと結論 | AIではなく創作者が正典を決める |

必須提示順は、`Accept → Merge → Edit → Relationship重複統合 → Accept as new → Reject → blocked → Duplicate → Conflict → Orphan`とする。

## 18. 凍結後の実装確認事項

次の3点は上位仕様で未確定であり、Project Astra v1.0では推測して確定しない。実装着手時に上位契約または実コードを確認し、必要なら別の設計判断として確定する。

### 18.1 Merge時のcandidateId対応表

MergeしたEntity Candidateについて、`candidateId → registeredEntityId`対応表へmerge先の既存IDを登録するか、その登録時点と寿命をどうするかは未確定である。

Fixture 02のRelationship Reviewでは、最終的にNova ArclightとAstra Survey Corpsへ端点を解決し、`member_of`を既存Relationshipへ統合する必要がある。本書はその最終結果だけを凍結し、端点解決がmerge mapping、name/alias解決、またはユーザーの手動選択のどれによるかを固定しない。

### 18.2 Candidate属性からAttributeClaimへのSourceRef規則

Candidateの属性値をAttributeClaimへ変換するとき、Candidateが複数SourceRefを持つ場合にどのSourceRefをclaimへ割り当てるか、複数claimへ展開するかは未確定である。

第11節はProject Astraの最終期待provenanceを列挙したものであり、一般的な変換規則ではない。実装はこのFixture期待値を再現できるか確認し、再現に新しい一般規則が必要なら上位仕様で決定する。

### 18.3 Search時の文字列正規化規則

Build WeekのSearch対象はname、aliases、tagsだが、検索queryと対象文字列へ適用する正規化規則は未確定である。

3分デモでは実装済みのSearchを短く見せるが、本書はNFKC、英字小文字化、空白処理等をSearch契約へ追加しない。Entity照合の正規化規則をSearchへ自動流用しない。

## 19. Frozen範囲と変更管理

### Frozen

- 4つの入力文書と固定Import順
- Entity/Relationship Candidateの内容
- 全Relationship CandidateのSourceRef
- Fixture 02 Nova Candidateの`aliases: []`
- Review操作
- 決定的テストID
- Merge後Nova Arclightの最終期待値
- Entity 7件、Relationship 5件
- Duplicate、Conflict、Orphanの期待値
- 統合後`member_of`のSourceRef 2件
- 回帰テスト契約
- 3分デモの操作順

### 本書で固定しない

- 第18節の3つの実装規則
- 本番ID形式
- UIの色、アイコン、Graphレイアウト
- キャラクター外見
- Live AI用prompt
- Search正規化
- 実時刻文字列

Frozen範囲を変更する場合はv1.0を直接上書きせず、新しいversionとchangelogを作成する。
