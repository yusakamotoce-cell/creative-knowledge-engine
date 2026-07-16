# Creative Knowledge Engine
## Project Astra v0.1
### 公式デモ・テストデータセット設計

- **Status:** Draft for Fable Review
- **Purpose:** Build Week公式デモ、Fixture、回帰テスト、README、スクリーンショット、動画
- **Implementation status:** 未実装
- **Freeze status:** 未凍結
- **Next review:** FableによるFixture・シナリオ・デモ成立性レビュー

---

## 1. 位置づけ

Project Astraは、Creative Knowledge Engineの公式デモ兼テストデータセットである。

単なる画面表示用サンプルではなく、実際のドメインロジックを通した結果として、次を必ず成立させる。

- Duplicate：1組以上
- Conflict：1件以上
- Orphan：1件以上
- Relationship：複数件
- Organizationと所属者：1組以上

さらに、Candidate Reviewの主要操作を一つのデータセットで確認できるようにする。

- Accept as new
- Merge into existing
- Edit
- Reject
- Relationship重複統合
- blocked Relationship
- 同一文書再Importの冪等性

---

## 2. シナリオ概要

Astra Survey Corpsは、星空に現れる異常信号を調査する組織である。

若い天体地図制作者Nova Arclightは、Northstar Observatoryで観測された信号について、First Light Briefingで報告する。

資料を統合すると、次の問題が見つかる。

- Novaの年齢が17歳と18歳で食い違う
- 正体不明の人物が全角表記の「ＮＯＶＡ」を名乗っている
- 所有者も所在地も不明なQuiet Prismが存在する
- 同じ所属Relationshipが別資料にも記録されている
- “North Star Observatory”という表記揺れがある
- Quiet Prismから未登録の場所へのRelationship候補がある

このシナリオによって、創作者が候補を確認し、正典を決定する製品体験を示す。

---

## 3. データセット構成

入力文書は次の4ファイルとする。

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

本v0.1では構成を定義するだけとし、実ファイル生成はProject Astra凍結後の実装工程で行う。

---

## 4. 固定インポート順

```text
01-astra-foundation.md
↓
02-nova-archive-revision.md
↓
03-unknown-nova-log.md
↓
04-quiet-prism-card.md
```

Knowledge Baseが空の状態から開始する。

各文書はUTF-8、改行LFとしてFixture化する。SHA-256は実ファイルのバイト列から生成する。

---

# 5. Fixture 01：基礎設定

## 5.1 入力文書

### `01-astra-foundation.md`

```markdown
# Astra Survey Corps Foundation Briefing

Nova Arclight, known as Nova, is a 17-year-old celestial cartographer and a member of the Astra Survey Corps.

Nova carries the silver Aster Compass.

At the First Light Briefing, Nova reports a repeating signal detected at Northstar Observatory.
```

## 5.2 Document ID

```text
astra-doc-001
```

## 5.3 Entity Candidates

### `cand-astra-001-nova`

- entityType: `character`
- name: `Nova Arclight`
- aliases: `["Nova"]`
- description: `A celestial cartographer in the Astra Survey Corps.`
- attributes:
  - age: `17`
  - role: `"celestial cartographer"`
- tags: `["cartographer", "astra-survey"]`
- source excerpt: `Nova Arclight, known as Nova, is a 17-year-old celestial cartographer and a member of the Astra Survey Corps.`

### `cand-astra-001-corps`

- entityType: `organization`
- name: `Astra Survey Corps`
- aliases: `["ASC"]`
- description: `An organization that investigates celestial anomalies.`
- attributes:
  - purpose: `"celestial survey"`
- tags: `["organization", "astronomy"]`
- source excerpt: `a member of the Astra Survey Corps`

### `cand-astra-001-observatory`

- entityType: `location`
- name: `Northstar Observatory`
- aliases: `[]`
- description: `An observatory where a repeating signal was detected.`
- attributes:
  - function: `"observation"`
- tags: `["observatory"]`
- source excerpt: `a repeating signal detected at Northstar Observatory`

### `cand-astra-001-briefing`

- entityType: `scene`
- name: `First Light Briefing`
- aliases: `[]`
- description: `A briefing where Nova reports the repeating signal.`
- attributes:
  - status: `"recorded"`
- tags: `["briefing", "signal"]`
- source excerpt: `At the First Light Briefing, Nova reports a repeating signal`

### `cand-astra-001-compass`

- entityType: `item`
- name: `Aster Compass`
- aliases: `[]`
- description: `A silver compass carried by Nova.`
- attributes:
  - material: `"silver"`
- tags: `["instrument"]`
- source excerpt: `Nova carries the silver Aster Compass.`

## 5.4 Relationship Candidates

1. Nova Arclight → Astra Survey Corps
   - candidateId: `relcand-astra-001-member`
   - relationType: `member_of`
   - fromRef: `cand-astra-001-nova`
   - toRef: `cand-astra-001-corps`

2. Nova Arclight → Aster Compass
   - candidateId: `relcand-astra-001-carries`
   - relationType: `carries`
   - fromRef: `cand-astra-001-nova`
   - toRef: `cand-astra-001-compass`

3. Nova Arclight → First Light Briefing
   - candidateId: `relcand-astra-001-appears`
   - relationType: `appears_in`
   - fromRef: `cand-astra-001-nova`
   - toRef: `cand-astra-001-briefing`

4. First Light Briefing → Northstar Observatory
   - candidateId: `relcand-astra-001-located`
   - relationType: `located_at`
   - fromRef: `cand-astra-001-briefing`
   - toRef: `cand-astra-001-observatory`

## 5.5 Review操作

- 5件のEntityをすべてAccept as new
- 4件のRelationshipをすべてAccept

## 5.6 登録結果

- Entity：5件
- Relationship：4件
- Organizationと所属者：成立

---

# 6. Fixture 02：年齢Conflictと表記修正

## 6.1 入力文書

### `02-nova-archive-revision.md`

```markdown
# Nova Archive Revision

A later archive lists Nova as 18 years old and confirms that Nova remains a member of the Astra Survey Corps.

The archive spells the observation site as “North Star Observatory.” The creator's canon name is “Northstar Observatory.”
```

## 6.2 Document ID

```text
astra-doc-002
```

## 6.3 Entity Candidates

### `cand-astra-002-nova`

- entityType: `character`
- name: `Nova`
- aliases: `["Nova Arclight"]`
- description: `A later archive entry for Nova.`
- attributes:
  - age: `18`
- tags: `["archive-revision"]`
- source excerpt: `A later archive lists Nova as 18 years old`

正規化後の `Nova` が、登録済みNova Arclightのalias `Nova` と完全一致する。

### `cand-astra-002-observatory`

- entityType: `location`
- name: `North Star Observatory`
- aliases: `[]`
- description: `An alternate spelling found in the archive.`
- attributes: `{}`
- tags: `["archive-revision"]`
- source excerpt: `The archive spells the observation site as “North Star Observatory.”`

`North Star Observatory` と `Northstar Observatory` は、通常の正規化だけでは完全一致しない。

## 6.4 Relationship Candidate

Nova → Astra Survey Corps

- candidateId: `relcand-astra-002-member`
- relationType: `ＭＥＭＢＥＲ＿ＯＦ`
- fromRef: `cand-astra-002-nova`
- toRef:
  - name: `Astra Survey Corps`
  - entityType: `organization`

NFKCと英字小文字化によって、relationTypeは `member_of` になる。

## 6.5 Review操作

### Nova

`cand-astra-002-nova`を、登録済みNova ArclightへMergeする。

結果：

- 既存Entity IDを維持
- age claim `18`を追加
- canonicalValue `17`は自動変更しない
- `conflictResolvedAt`を `null` にする
- `archive-revision`をtagsへ追加
- sourceRefsを統合

### North Star Observatory

1. Editでnameを `Northstar Observatory` へ変更
2. Entity照合を再実行
3. 登録済みNorthstar ObservatoryへMerge

これにより、Edit後の再照合を確認する。

### member_of Relationship

RelationshipをAcceptする。

既存の次のRelationshipと同一キーになる。

```text
Nova Arclight
+
Astra Survey Corps
+
member_of
```

新規Relationshipは作らず、既存RelationshipのsourceRefsへ本資料のSourceRefを追加する。

## 6.6 Conflict結果

Nova Arclightのageは次の状態になる。

```ts
{
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
        excerpt: "A later archive lists Nova as 18 years old"
      }
    }
  ],
  conflictResolvedAt: null
}
```

これにより未解決Conflictが1件成立する。

---

# 7. Fixture 03：完全一致Duplicate

## 7.1 入力文書

### `03-unknown-nova-log.md`

```markdown
# Unknown NOVA Field Log

A masked operator signed the field log as “ＮＯＶＡ.”

The operator was present at the First Light Briefing.

The archive cannot confirm that this operator is Nova Arclight.
```

## 7.2 Document ID

```text
astra-doc-003
```

## 7.3 Entity Candidate

### `cand-astra-003-unknown-nova`

- entityType: `character`
- name: `ＮＯＶＡ`
- aliases: `[]`
- description: `An unidentified masked operator using the name NOVA.`
- attributes:
  - identityStatus: `"unverified"`
- tags: `["masked-operator", "unverified"]`
- source excerpt: `A masked operator signed the field log as “ＮＯＶＡ.”`

## 7.4 Relationship Candidate

ＮＯＶＡ → First Light Briefing

- candidateId: `relcand-astra-003-appears`
- relationType: `appears_in`
- fromRef: `cand-astra-003-unknown-nova`
- toRef:
  - name: `First Light Briefing`
  - entityType: `scene`

## 7.5 Duplicate成立根拠

```text
normalizeEntityName("ＮＯＶＡ")
→ NFKC
→ "NOVA"
→ 英字小文字化
→ "nova"

normalizeEntityName("Nova")
→ "nova"
```

登録済みNova Arclightのalias `Nova` と完全一致するため、merge候補として提示される。

名前が似ているからではなく、定義済みの正規化後に完全一致するため成立する。

## 7.6 Review操作

候補はmerge可能として表示するが、資料だけでは同一人物と断定できない。

ユーザーは創作者として、`Accept as new`を選択する。

この判断により、次の2つのCharacterが別Entityとして登録される。

- Nova Arclight
- ＮＯＶＡ

その後、RelationshipをAcceptする。

## 7.7 Duplicate結果

登録後、Nova ArclightとＮＯＶＡの間にDuplicate Insightが成立する。

Duplicate Insightの内部表現が一致キー単位かEntityペア単位かは実装側で決められるが、回帰テストでは最低限、両Entityが同じDuplicate候補集合に含まれることを確認する。

---

# 8. Fixture 04：Orphan、Reject、blocked

## 8.1 入力文書

### `04-quiet-prism-card.md`

```markdown
# Quiet Prism Inventory Card

The inventory lists an item named Quiet Prism.

No owner, location, or known use is recorded.

A penciled margin says “Royal Key?”, but this is only a guess.

A second note claims that the Quiet Prism points toward an Outer Gate, but no such location has been established in the archive.
```

## 8.2 Document ID

```text
astra-doc-004
```

## 8.3 Entity Candidates

### `cand-astra-004-prism`

- entityType: `item`
- name: `Quiet Prism`
- aliases: `[]`
- description: `An item with no recorded owner, location, or known use.`
- attributes:
  - status: `"unassigned"`
- tags: `["inventory", "unassigned"]`
- source excerpt: `The inventory lists an item named Quiet Prism.`

### `cand-astra-004-royal-key`

- entityType: `item`
- name: `Royal Key`
- aliases: `[]`
- description: `A speculative interpretation written in the margin.`
- attributes: `{}`
- tags: `["speculative"]`
- source excerpt: `A penciled margin says “Royal Key?”, but this is only a guess.`

## 8.4 Relationship Candidate

Quiet Prism → Outer Gate

- candidateId: `relcand-astra-004-points`
- relationType: `points_to`
- fromRef: `cand-astra-004-prism`
- toRef:
  - name: `Outer Gate`
  - entityType: `location`

Outer Gateに対応するCandidateまたは登録済みEntityは存在しない。

## 8.5 Review操作

- Quiet Prism：Accept as new
- Royal Key：Reject
- Quiet Prism → Outer Gate：両端を解決できないため `blocked`

blocked RelationshipはAcceptできず、Knowledge Storeへ登録しない。

## 8.6 Orphan結果

Quiet Prismは登録済みRelationshipの始点にも終点にも含まれないため、Orphan Insightとして検出される。

blocked Relationshipは登録済みRelationshipではないため、Orphan判定には使用しない。

---

# 9. 決定的ID

ドキュメント内では、期待結果を示すため次の固定IDを使用する。

これはテスト用IdGeneratorが返すIDであり、本番ID形式を固定するものではない。

## Entity IDs

| ID | Entity |
|---|---|
| `ent-astra-001` | Nova Arclight |
| `ent-astra-002` | Astra Survey Corps |
| `ent-astra-003` | Northstar Observatory |
| `ent-astra-004` | First Light Briefing |
| `ent-astra-005` | Aster Compass |
| `ent-astra-006` | ＮＯＶＡ |
| `ent-astra-007` | Quiet Prism |

## Relationship IDs

| ID | Relationship |
|---|---|
| `rel-astra-001` | Nova Arclight → Astra Survey Corps / member_of |
| `rel-astra-002` | Nova Arclight → Aster Compass / carries |
| `rel-astra-003` | Nova Arclight → First Light Briefing / appears_in |
| `rel-astra-004` | First Light Briefing → Northstar Observatory / located_at |
| `rel-astra-005` | ＮＯＶＡ → First Light Briefing / appears_in |

---

# 10. candidateId対応表

Review完了後の対応は次のとおり。

| candidateId | registeredEntityId | 結果 |
|---|---|---|
| `cand-astra-001-nova` | `ent-astra-001` | Accept as new |
| `cand-astra-001-corps` | `ent-astra-002` | Accept as new |
| `cand-astra-001-observatory` | `ent-astra-003` | Accept as new |
| `cand-astra-001-briefing` | `ent-astra-004` | Accept as new |
| `cand-astra-001-compass` | `ent-astra-005` | Accept as new |
| `cand-astra-002-nova` | `ent-astra-001` | Merge |
| `cand-astra-002-observatory` | `ent-astra-003` | Edit後にMerge |
| `cand-astra-003-unknown-nova` | `ent-astra-006` | Accept as new |
| `cand-astra-004-prism` | `ent-astra-007` | Accept as new |
| `cand-astra-004-royal-key` | なし | Reject |

RejectされたRoyal Keyには正式IDを発行しない。

---

# 11. 最終Knowledge Store

## 11.1 Entity総数

```text
7
```

## 11.2 タイプ別件数

| EntityType | 件数 |
|---|---:|
| Character | 2 |
| Scene | 1 |
| Location | 1 |
| Item | 2 |
| Organization | 1 |

## 11.3 Relationship総数

```text
5
```

Fixture 02の`member_of`候補は既存Relationshipへ統合されるため、Relationship総数を増やさない。

## 11.4 最終登録Entity

1. Nova Arclight
2. Astra Survey Corps
3. Northstar Observatory
4. First Light Briefing
5. Aster Compass
6. ＮＯＶＡ
7. Quiet Prism

Royal KeyとOuter Gateは登録しない。

---

# 12. 必須Insightの期待結果

## Duplicate

最低1組。

```text
Nova Arclight
↔
ＮＯＶＡ
```

成立キー：

```text
nova
```

Nova Arclightのalias `Nova`と、ＮＯＶＡのnameが正規化後に完全一致する。

## Conflict

正確に1件。

```text
Entity: Nova Arclight
Attribute: age
Claims: 17, 18
canonicalValue: 17
conflictResolvedAt: null
```

## Orphan

正確に1件。

```text
Quiet Prism
```

## Statistics

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

---

# 13. Relationship重複統合の期待結果

Fixture 01とFixture 02には、同じ所属Relationshipが含まれる。

Fixture 01：

```text
ent-astra-001
+
ent-astra-002
+
member_of
```

Fixture 02：

```text
ent-astra-001
+
ent-astra-002
+
ＭＥＭＢＥＲ＿ＯＦ
```

relationTypeを正規化すると同じキーになる。

期待結果：

- Relationship IDは`rel-astra-001`を維持
- 新規Relationshipを作成しない
- sourceRefsは2文書分の和集合
- Relationship総数は増えない

---

# 14. 再Import冪等性

4文書それぞれについて、同一内容を再Importした場合は処理済みとして扱う。

最低限、`01-astra-foundation.md`を同じバイト列で再Importし、次を確認する。

- Entity総数が7から増えない
- Relationship総数が5から増えない
- claimsが重複しない
- sourceRefsが重複しない
- Duplicate件数が増えない
- Conflict件数が増えない
- 処理済みであることがUIに表示される

Build Week版では強制再解析を提供しない。

---

# 15. 回帰テスト契約

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
15. 統合後の`member_of`に2件のsourceRefsが存在する
16. North Star ObservatoryはEdit後に既存Northstar Observatoryと照合される
17. 同一文書の再ImportでKnowledge Storeが変化しない
18. 同じ入力とReview操作から毎回同じ期待結果が得られる

Conflictの解決と再開はドメイン単体テストで別途確認する。Project Astraの標準完了状態では、デモ表示のためage Conflictを未解決のまま残す。

---

# 16. 3分デモの推奨経路

## 0:00–0:20 — 問題提示

複数の創作資料で、名前、年齢、所属、アイテム、場面の情報が散らばっていることを示す。

## 0:20–0:45 — Import

Project Astraの4文書をDemo Modeで読み込む。

保存済みCandidate Bundleを使用し、APIキーなしで進行する。

## 0:45–1:30 — Candidate Review

代表例として次を見せる。

- Nova ArclightをAccept
- Novaの年齢改訂をMerge
- North Star ObservatoryをEditして再照合
- 不確かなＮＯＶＡを別EntityとしてAccept
- Royal KeyをReject
- Outer Gate未解決Relationshipがblockedになることを確認

## 1:30–2:05 — Insights

- Duplicate：Nova ArclightとＮＯＶＡ
- Conflict：age 17と18
- Orphan：Quiet Prism
- Statistics

## 2:05–2:35 — Graph

Nova、組織、場面、場所、アイテムの接続を表示する。

Quiet Prismが接続を持たないことも確認する。

## 2:35–2:50 — Search

`Nova`または`signal`関連タグで検索し、Entity詳細とRelationshipを表示する。

## 2:50–3:00 — Exportと結論

Knowledge Base全体をJSON Exportできることを示す。

> AIが正典を決めるのではなく、創作者が確認した知識だけが蓄積される。

---

# 17. Fableレビュー項目

Fableには次を確認させる。

1. ＮＯＶＡを別EntityとしてAcceptする判断が不自然でないか
2. Duplicateが完全一致規則で確実に成立しているか
3. age Conflictが属性モデルどおり成立しているか
4. Quiet Prismが登録済みRelationshipを持たず、確実にOrphanになるか
5. blocked RelationshipがOrphan判定へ影響しないか
6. Relationship重複統合が実際のキー規則で成立するか
7. Candidate数と操作数が3分デモに対して多すぎないか
8. Accept、Merge、Edit、Rejectの違いを観客が理解できるか
9. Graphが製品価値を説明するのに十分な接続を持つか
10. 回帰テスト用Fixtureとして長期利用できるか

---

# 18. 未確定事項

以下はProject Astra v0.1では凍結しない。

- キャラクターの外見
- UI上の色、アイコン、ノード形状
- Graphレイアウト
- スクリーンショット構図
- 3分デモの最終ナレーション
- Duplicate Insightの表示単位
- Conflictをデモ中に解決するか
- 本番用IDの文字列形式
- Live AI用プロンプト
- README用の短縮ストーリー

---

# 19. 凍結条件

Project Astra v0.1は、次を満たした時点で凍結する。

1. Fableレビューが完了している
2. Duplicate、Conflict、Orphanの成立が論理的に確認されている
3. Organizationと所属Relationshipが確認されている
4. 期待Entity数とRelationship数が確定している
5. Review操作の順序が確定している
6. 3分以内に主要フローを説明できる
7. Fixture生成時に追加判断が不要な状態になっている

凍結後は`Project Astra v1.0`とし、Fixture、テスト、README、スクリーンショット、動画で同じデータを使用する。
