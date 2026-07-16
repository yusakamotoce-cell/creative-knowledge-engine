# Codex実装指示
## Creative Knowledge Engine Step 7
### Search・Knowledge Graph・JSON Export
### v1.0

- Status: Ready for implementation
- 前提: Step 6完了commit、working tree clean
- 対象: C:\Users\tc120\projects\creative-knowledge-engine
- 対象外: Live AI、serverless、Context Bundle、IndexedDB、Step 8以降

## 0. 目的

登録済みKnowledgeを利用する3機能を追加する。

1. name／aliases／tags Search
2. 決定的なSVG Knowledge Graph
3. version付きKnowledge JSON Export

Project Astra完成状態で、Search、Graph、Exportをブラウザーから確認できることを完了条件とする。

## 1. 作業前確認

```powershell
git status
git log -7 --oneline
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

条件:

- working tree clean
- HEADがStep 6完了commit
- 既存367テスト成功
- typecheck、lint、build成功
- 未追跡はCODEX_STEP_7.mdだけ

条件を満たさなければ実装を開始しない。

## 2. 参照資料

Build Week仕様・追補、Project Kickoff、CODEX_STEP_0-1〜6、Project Astra v1.0、Fixture Contract、Step 0〜6 Implementation Decisionsを確認する。

優先順位:

1. Build Week追補
2. Build Week仕様
3. Project Kickoff
4. Step 0〜6の確定済み契約
5. Project Astra
6. Fixture Contract
7. 本指示書

既存のEntity照合、Duplicate判定、Relationship参照解決、attribute key正規化、Import hashは変更しない。

# Part A: Search

## 3. Search専用正規化

```ts
function normalizeSearchText(value: string): string
```

処理順:

1. Unicode NFKC
2. trim
3. 連続Unicode空白を半角space 1個へ縮約
4. lowercase

例:

- `  Nova   Arclight ` → `nova arclight`
- `ＮＯＶＡ` → `nova`
- `North　Star` → `north star`

この関数はSearch専用。canonical entity matchingへ流用しない。

## 4. Search対象

対象:

- Entity.name
- Entity.aliases
- Entity.tags

対象外:

- description
- attributes
- claims
- SourceRef excerpt
- Relationship
- Imported Document
- Review Session

## 5. Search result型

```ts
type SearchMatchedField = "name" | "alias" | "tag";
type SearchMatchKind = "exact" | "prefix" | "substring";

interface EntitySearchMatch {
  field: SearchMatchedField;
  kind: SearchMatchKind;
  value: string;
  normalizedValue: string;
}

interface EntitySearchResult {
  entity: Entity;
  score: number;
  matches: EntitySearchMatch[];
}

interface EntitySearchResponse {
  normalizedQuery: string;
  results: EntitySearchResult[];
  availableTags: string[];
}
```

## 6. ranking

代表scoreは最も強い一致で決める。

| score | 条件 |
|---:|---|
| 900 | name exact |
| 850 | alias exact |
| 800 | name prefix |
| 750 | alias prefix |
| 700 | name substring |
| 650 | alias substring |
| 600 | tag exact |
| 550 | tag prefix |
| 500 | tag substring |

tie-break:

1. score降順
2. Knowledge内Entity順
3. Entity ID昇順

複数語queryは正規化後のquery全体を一つのsubstringとして扱う。token AND／OR、fuzzy search、typo correctionは実装しない。

空queryではfilter対象EntityをKnowledge順で返し、score 0、matches空。

## 7. filter

```ts
interface EntitySearchFilters {
  entityTypes?: EntityType[];
  tags?: string[];
}
```

- EntityType複数指定はOR
- tag複数指定はAND
- filter tagはSearch正規化後の完全一致
- query match AND filter
- availableTagsはKnowledge内の先出現順、表示値は最初の原文

```ts
function searchEntities(
  knowledge: KnowledgeState,
  query: string,
  filters?: EntitySearchFilters
): EntitySearchResponse
```

Mutation禁止。

## 8. Search UI

AppViewへ`search`を追加。

表示:

- query input
- clear
- EntityType filter
- tag filter
- result count
- result list
- matched field／match kind
- selected Entity detail
- no result state
- 検索対象はname／alias／tagだけである説明

interaction:

- 入力ごとに同期再計算
- debounce不要
- query最大200文字
- Enterで先頭結果選択可
- Escでclear
- keyboardだけで結果選択可能
- selectedEntityIdをKnowledge／Graphと共有

Project Astra期待:

| query | 結果 |
|---|---|
| Nova Arclight | ent-astra-001 first |
| nova | ent-astra-006, ent-astra-001 |
| ＮＯＶＡ | ent-astra-006, ent-astra-001 |
| ASC | ent-astra-002 |
| archive-revision | ent-astra-001, ent-astra-003 |
| Quiet | ent-astra-007 |
| unknown | 0件 |

`ent-astra-006`はname exactでscore 900、`ent-astra-001`はalias exactでscore 850となるため、正式なranking表を例示順より優先する。

`unknown`が0件であることによりdescription非検索を確認する。

# Part B: Knowledge Graph

## 9. Graph projection

```ts
interface KnowledgeGraphNode {
  id: string;
  entityId: string;
  label: string;
  entityType: EntityType;
  isOrphan: boolean;
  relationshipCount: number;
}

interface KnowledgeGraphEdge {
  id: string;
  relationshipId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: string;
  label: string;
}

interface KnowledgeGraphProjection {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  availableRelationTypes: string[];
}
```

```ts
function projectKnowledgeGraph(
  knowledge: KnowledgeState
): KnowledgeGraphProjection
```

順序:

- nodesはEntity順
- edgesはRelationship順
- relationType候補は先出現順

dangling relationshipをGraph側で修復しない。

## 10. Graph filter

```ts
interface KnowledgeGraphFilters {
  entityTypes: EntityType[];
  relationTypes: string[];
  includeOrphans: boolean;
}
```

- EntityType選択を通過したnodeだけ表示
- relationType選択を通過し、両端nodeが表示対象のedgeだけ表示
- includeOrphans falseで元Knowledge上のOrphanを除外
- filterによりedgeが消えて一時孤立した非Orphan nodeは残す

## 11. 決定的layout

外部Graph library、force simulation、Math.randomを使用しない。

EntityType lane方式:

1. character
2. organization
3. location
4. scene
5. item

lane内はKnowledge順。固定PADDING、LANE_GAP、ROW_GAPで座標を算出する。node数に応じてcanvas heightを拡張する。

```ts
interface PositionedGraphNode extends KnowledgeGraphNode {
  x: number;
  y: number;
}

interface PositionedKnowledgeGraph {
  width: number;
  height: number;
  nodes: PositionedGraphNode[];
  edges: KnowledgeGraphEdge[];
}
```

同じKnowledgeとfilterから常に同じ座標を返す。座標をStorageへ保存しない。

## 12. Graph UI

AppViewへ`graph`を追加。

- SVG viewport
- EntityType filter
- relationType filter
- orphan toggle
- zoom in／out
- reset view
- fit view
- legend
- node選択
- Relationship一覧
- edge／Relationship選択
- selected Entity／Relationship detail
- empty state

要件:

- 有向edgeを矢印で表示
- relationType label
- nodeにname、entityType、relationship count
- 色だけでEntityTypeを区別しない
- zoom 50〜200%
- Graph内部のscrollは可
- nodeをkeyboard focus可能にする
- edgeだけを唯一の操作入口にせず、keyboard用Relationship一覧を併設
- Search／Knowledge／GraphでselectedEntityIdを共有
- Entity detailは共通component化し、重複実装しない

Project Astra期待:

- 7 nodes
- 5 edges
- Quiet PrismがOrphan
- Nova Arclight outgoing 3
- First Light Briefing incoming 2／outgoing 1
- direction維持

# Part C: Knowledge Export

## 13. Export契約

```ts
interface KnowledgeExportV1 {
  schemaVersion: 1;
  knowledgeRevision: number;
  knowledge: KnowledgeState;
}
```

含む:

- revision
- Entity
- Relationship
- attributes／claims
- SourceRefs
- timestamps

含まない:

- Imported Document raw content
- Import Registry
- Review Session
- Review Record
- Candidate Bundle
- Review Application history
- Local Storage Envelope
- UI state
- Insights

InsightsはKnowledgeから再計算可能なので含めない。

strict Schemaを実装する。

```ts
function createKnowledgeExport(
  snapshot: StorageSnapshot
): KnowledgeExportV1

function serializeKnowledgeExport(
  value: KnowledgeExportV1
): string
```

serialize:

- JSON
- 2-space indent
- UTF-8
- 末尾改行1個
- deterministic
- Mutation禁止
- export本文へ現在時刻を入れない

## 14. Browser download adapter

```ts
interface FileDownloadAdapter {
  downloadText(input: {
    fileName: string;
    mediaType: string;
    content: string;
  }): void;
}
```

Browser実装はBlob、URL.createObjectURL、一時anchor、click、revokeObjectURLを使う。

ComponentからBlob／document／URLを直接操作しない。

filename:

```text
creative-knowledge-YYYYMMDD.json
```

filename用日付は注入可能にしてテストする。media typeは`application/json`。

## 15. Export UI

Knowledge viewへ追加:

- revision
- Entity／Relationship件数
- export対象説明
- raw DocumentやReview状態を含まない説明
- JSON preview toggle
- download button
- success／error表示

previewは初期状態で閉じる。

# Part D: UI統合

## 16. Controller更新

追加例:

```ts
setSearchQuery(query: string): void;
setSearchFilters(filters: EntitySearchFilters): void;
setGraphFilters(filters: KnowledgeGraphFilters): void;
selectRelationship(id: string | null): void;
exportKnowledge(): Promise<void>;
```

- Search／GraphはSnapshotから導出
- 結果、filter、zoom、座標をStorage保存しない
- exportは現在Snapshotのみ使用
- reset後はselected Entity／Relationshipを解除
- refresh後は保存KnowledgeからSearch／Graphを再構築

browser依存はcomposition rootまたはadapterへ限定する。

## 17. Error mapping

最低限:

- `INVALID_KNOWLEDGE_EXPORT`
- `FILE_DOWNLOAD_FAILED`
- `GRAPH_PROJECTION_FAILED`

queryは通常のstringを受理し、200文字超だけUI validation errorとする。内部例外messageをそのままUIへ出さない。

## 18. Accessibility

Search:

- input label
- fieldset／legend
- result count aria-live
- keyboard result selection

Graph:

- SVG accessible name
- node focus
- zoom button名
- legend text
- keyboard用Relationship一覧
- selected detail heading

Export:

- preview toggle
- download button名
- status aria-live

既存Step 6のfocus indicator、heading階層、contrastを維持する。

## 19. 必須テスト

既存367件を維持し、最低限次を追加する。

### Search core

- NFKC
- trim
- whitespace collapse
- lowercase
- full-width NOVA
- exact／prefix／substring全ranking
- tieはKnowledge順
- empty query
- no result
- duplicate match除外
- EntityType OR
- tags AND
- query AND filter
- availableTags先出現順
- Mutationなし
- Project Astra期待表

### Search UI

- input／clear
- result count
- matched field
- filter
- selection
- Entity detail
- keyboard
- no result
- max length
- remount後再計算

### Graph core

- node／edge数
- 順序
- relationType候補
- orphan
- relationshipCount
- filter
- deterministic layout
- lane順
- canvas拡張
- Mutationなし
- Project Astra 7／5

### Graph UI

- node focus／selection
- Relationship一覧
- zoom
- reset
- filter
- orphan toggle
- legend
- detail
- empty state
- Search／KnowledgeとのEntity選択共有

### Export core

- schemaVersion 1
- revision
- Knowledge deep equality
- excluded fields不存在
- strict Schema
- 2-space JSON
- trailing newline
- deterministic
- Mutationなし

### Download

- filename
- media type
- Blob content
- object URL revoke
- error

### UI統合

Project Astra完成状態でSearch、Graph、Exportを実行し、remount後も再構築できること。

## 20. 手動確認

作成:

```text
notes/reviews/STEP_7_MANUAL_CHECKLIST.md
```

項目:

- name／alias／tag検索
- full-width query
- EntityType／tag filter
- no result
- Search detail
- Graph全体
- type／relation filter
- orphan toggle
- node／Relationship選択
- zoom／reset
- keyboard
- JSON preview
- JSON download
- downloaded JSON parse
- raw Document非包含
- refresh
- 1280px／768px
- console warning／errorなし

## 21. ADR

追加:

- ADR-035: Search normalization is separate from canonical entity matching
- ADR-036: Entity search uses deterministic field-weighted ranking
- ADR-037: Knowledge graph layout is deterministic and dependency-free
- ADR-038: Graph projection is derived and not persisted
- ADR-039: Knowledge export excludes review and imported-document state
- ADR-040: Browser downloads are isolated behind an adapter

各ADRにStatus、Context、Decision、Consequences。

## 22. READMEと判断記録

READMEへ追加:

- Search対象と正規化
- Graphとfilter
- JSON Export
- Exportに含む／含まないデータ
- Project Astra確認方法
- API key不要
- Live AI／Context Bundle未実装

作成:

```text
notes/reviews/STEP_7_IMPLEMENTATION_DECISIONS.md
```

記録:

- 開始commit
- Search専用正規化
- ranking／filter
- description非検索
- deterministic graph layout
- Graph state非永続
- selected Entity共有
- Export Schema
- excluded state
- download adapter
- dependency追加有無
- Step 8持ち越し

## 23. 品質条件

- 既存367件を含む全テスト成功
- typecheck、lint、build成功
- offline audit 0 vulnerabilities
- 新規依存は原則追加しない
- Search／Graph coreはReact非依存
- force simulationなし
- Math.randomなし
- Componentからdownload API直接参照なし
- Search／Graph導出状態をStorage保存しない
- Review workflowを壊さない
- Project Astra凍結資料、Candidate Bundle、golden JSONを変更しない

## 24. 完了報告

1. 開始commitと事前検証
2. 作成／変更ファイル
3. Search正規化
4. ranking
5. filter
6. Search UI
7. Project Astra Search
8. Graph projection
9. Graph filter
10. layout
11. Graph UI
12. Entity／Relationship連動
13. Export契約
14. serialize
15. download adapter
16. Export UI
17. accessibility
18. responsive
19. Project Astra統合
20. ADR
21. manual checklist
22. 追加／総テスト数
23. typecheck／lint／build／audit
24. 判断事項
25. Step 8持ち越し
26. git status
27. 凍結資料／golden非変更

Step 8以降には着手しない。

## 25. 完了条件

1. name／alias／tag Searchが動作する。
2. Search専用NFKC正規化と決定的rankingが動作する。
3. EntityType／tag filterが動作する。
4. description／SourceRef本文を検索しない。
5. Project Astra Search結果順が契約どおり。
6. 7 Entity／5 RelationshipをGraph表示できる。
7. Graph layoutとfilterが決定的に動作する。
8. node／Relationship選択で詳細を確認できる。
9. Search／Knowledge／GraphでEntity選択を共有できる。
10. KnowledgeExportV1を生成・downloadできる。
11. ExportへReview Sessionやraw Documentを含めない。
12. refresh後にSearch／Graphを再構築できる。
13. 既存367件を含む全テスト成功。
14. typecheck、lint、build成功。
15. Live AI、Context Bundle、IndexedDBへ着手しない。
16. 凍結資料、Candidate Bundle、golden JSONを変更しない。
