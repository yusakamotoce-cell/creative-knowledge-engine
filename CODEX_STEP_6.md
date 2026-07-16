# Codex実装指示
## Creative Knowledge Engine Step 6
### Demo Mode、Import、Candidate Review、InsightsのブラウザーUI接続
### v1.0

- **Status:** Ready for implementation
- **前提:** Step 5完了commit、作業ツリーclean
- **対象リポジトリ:** `C:\Users\tc120\projects\creative-knowledge-engine`
- **実装範囲:** React UI、Local Storage実配線、Project Astraの対話型Demo Mode、UIテスト
- **実装対象外:** Search、Knowledge Graph、Live AI、サーバーレス関数、Context Bundle、IndexedDB、Step 7以降

---

## 0. 目的

Step 0〜5で完成した次の機能を、ブラウザー上の一続きの操作として接続する。

```text
Application起動
↓
Local Storage読込
↓
Project Astra Demo開始
↓
文書Import
↓
Entity Candidate Review
↓
Relationship Candidate Review
↓
Session完了
↓
正本Knowledgeへ反映
↓
次の文書へ進む
↓
Duplicate / Conflict / Orphan / Statistics表示
```

Step 6終了時点で、利用者がAPI keyやnetworkを使わず、Project Astraの4文書をブラウザー上で順番に処理し、Candidate Reviewの主要操作とKnowledge Insightsを確認できることを完成条件とする。

---

## 1. 参照資料と優先順位

確認対象：

- `PROJECT_KICKOFF_v1.0.md`
- `BUILD_WEEK_SPEC_v0.3.md`
- `BUILD_WEEK_SPEC_v0.3_ADDENDUM.md`
- `CODEX_STEP_0-1.md`
- `CODEX_STEP_2.md`
- `CODEX_STEP_3.md`
- `CODEX_STEP_4.md`
- `CODEX_STEP_5.md`
- `PROJECT_ASTRA_v1.0.md`
- `PROJECT_ASTRA_FIXTURE_CONTRACT_v1.0.md`
- `notes/reviews/STEP_0-1_IMPLEMENTATION_DECISIONS.md`
- `notes/reviews/STEP_2_IMPLEMENTATION_DECISIONS.md`
- `notes/reviews/STEP_3_IMPLEMENTATION_DECISIONS.md`
- `notes/reviews/STEP_4_IMPLEMENTATION_DECISIONS.md`
- `notes/reviews/STEP_5_IMPLEMENTATION_DECISIONS.md`

競合時の優先順位：

1. Build Week仕様追補
2. Build Week仕様
3. Project Kickoff
4. Step 0〜5の確定済み実装契約
5. Project Astra v1.0
6. Fixture Contract v1.0
7. 本Step 6指示書

本指示書はドメイン契約を変更せず、既存Application serviceをUIへ接続する。

---

## 2. 作業開始前の確認

コード変更前に次を実行する。

```powershell
git status
git log -6 --oneline
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

期待基準：

- working tree clean
- HEADがStep 5完了commit
- 既存328テスト成功
- typecheck、lint、build成功
- 未追跡はユーザーが追加した`CODEX_STEP_6.md`だけ

満たさない場合は実装を開始せず、差分と失敗内容を報告する。

---

## 3. 今回実装する範囲

### 3.1 Application shell

- 起動時読込
- Loading
- Empty workspace
- Existing workspace
- Fatal storage error
- 画面内navigation
- Project Astra進捗表示

### 3.2 Demo Mode

- Project Astra Demo開始
- 次の未Import文書を特定
- 文書Import
- Review Sessionを開く
- 4文書を規定順で処理
- 全文書完了表示
- 保存済み状態から再開

### 3.3 Import UI

- Project Astra文書のImport
- plain text／Markdown／JSON／pasted text用の入力面
- file input
- paste textarea
- formatとmedia type
- Demo Modeと任意文書Importの区別
- Fixture未登録文書への説明

### 3.4 Entity Candidate Review UI

- Candidate一覧
- Candidate詳細
- Duplicate候補
- Accept as new
- Merge into existing
- Edit
- Reject
- Review進捗
- Entity phase完了後のRelationship phase移行

### 3.5 Relationship Candidate Review UI

- Candidate一覧
- from／to参照
- 解決済みEntity
- blocked reason
- manual resolution
- Accept
- Reject
- 重複Relationship統合結果
- Relationship phase完了
- Session complete
- 正本Knowledgeへの反映

### 3.6 Knowledge／Insights UI

- Entity総数
- EntityType別件数
- Relationship数
- Duplicate
- 未解決Conflict
- Orphan
- Entity一覧
- Relationship一覧
- Entity詳細
- SourceRef表示

### 3.7 Local Storage実配線

- `window.localStorage`を`KeyValueStorage`としてcomposition rootで注入
- 起動時load
- Review操作後のSession保存
- Session apply後の再読込
- refresh後の再開
- 保存失敗／破損データの表示

### 3.8 UIテストと文書

- React Testing Library
- ADR
- README
- Step 6実装判断記録
- 手動確認チェックリスト

---

## 4. 今回実装しない範囲

- name／alias／tag Search
- Knowledge Graph
- Cytoscape.js
- Graph filter
- Live AI
- serverless function
- OpenAI接続
- Context Bundle
- Knowledge Base Export
- IndexedDB
- 複数tab同期
- Undo／Redo
- Session rebase
- 自動Conflict解決
- Source全文検索
- PDF／Word／画像／音声
- Design system導入
- 外部UI component library
- Router library
- 状態管理library
- Step 7以降

---

## 5. UI構成

外部Routerを導入せず、App内の明示的なview stateで構成する。

```ts
type AppView =
  | "home"
  | "import"
  | "review"
  | "knowledge";
```

推奨構成：

```text
src/app/
  App.tsx
  app.css
  compositionRoot.ts
  state/
    useApplicationController.ts
    types.ts
  components/
    AppHeader.tsx
    AppNavigation.tsx
    LoadingView.tsx
    ErrorView.tsx
    StatusMessage.tsx
  views/
    HomeView.tsx
    ImportView.tsx
    ReviewView.tsx
    KnowledgeView.tsx
  review/
    EntityCandidateList.tsx
    EntityCandidatePanel.tsx
    EntityEditForm.tsx
    MergeEntityPanel.tsx
    RelationshipCandidateList.tsx
    RelationshipCandidatePanel.tsx
    ManualResolutionForm.tsx
  knowledge/
    StatisticsPanel.tsx
    DuplicatePanel.tsx
    ConflictPanel.tsx
    OrphanPanel.tsx
    EntityList.tsx
    EntityDetail.tsx
    RelationshipList.tsx
  demo/
    ProjectAstraProgress.tsx
    ProjectAstraDocumentCard.tsx
```

既存構成との整合に応じて調整してよい。

---

## 6. Composition root

`src/app/compositionRoot.ts`でbrowser依存を一か所に限定する。

最低限：

```ts
interface ApplicationDependencies {
  storage: StorageAdapter;
  extractionAdapter: ExtractionAdapter;
  hasher: Sha256Hasher;
  idGenerator: IdGenerator;
  clock: Clock;
}
```

本番browser構成：

- `LocalStorageAdapter`
- `window.localStorage`
- Project Astra Fixture Extraction Adapter
- Web Crypto SHA-256
- production IdGenerator
- production Clock

### 規則

- coreドメインから`window`を参照しない。
- Componentから直接`window.localStorage`を呼ばない。
- ComponentからFixture JSONを直接読み込まない。
- 依存はAppまたはcontrollerへ注入する。
- testではMemory Storageと固定依存へ差し替える。

---

## 7. Application controller

React Component内へ処理順を散在させず、custom hookまたはcontrollerへ集約する。

推奨公開面：

```ts
interface ApplicationControllerState {
  status: "loading" | "ready" | "error";
  view: AppView;
  snapshot: StorageSnapshot | null;
  activeReviewSessionId: string | null;
  selectedEntityId: string | null;
  message: UiMessage | null;
  error: UiError | null;
  isBusy: boolean;
}

interface ApplicationControllerActions {
  initialize(): Promise<void>;
  navigate(view: AppView): void;
  importDocument(input: ImportDocumentInput): Promise<void>;
  importNextProjectAstraDocument(): Promise<void>;
  openReviewSession(id: string): void;
  editEntityCandidate(...): Promise<void>;
  acceptEntityCandidate(...): Promise<void>;
  mergeEntityCandidate(...): Promise<void>;
  rejectEntityCandidate(...): Promise<void>;
  advanceToRelationships(): Promise<void>;
  setManualRelationshipResolution(...): Promise<void>;
  acceptRelationshipCandidate(...): Promise<void>;
  rejectRelationshipCandidate(...): Promise<void>;
  completeAndApplyReviewSession(): Promise<void>;
  selectEntity(id: string | null): void;
  resetWorkspace(): Promise<void>;
}
```

名前や分割は調整してよい。

### 規則

- Controllerがpure domain functionを呼び、`saveReviewSession`で保存する。
- 保存後はStorageから最新Snapshotを再loadするか、save済みSnapshotを信頼する一貫した方式を選ぶ。
- 同一操作の二重送信を`isBusy`で防止する。
- error後も再試行可能にする。
- Domain error codeをUI表示用に変換する。
- ComponentはDomain objectを直接Mutationしない。

---

## 8. 起動時状態

### Loading

`initializeApplication`完了までLoading表示。

### Empty workspace

次を表示する。

- 製品名
- 一文説明
- `Project Astra Demoを開始`
- `文書をImport`
- Demo ModeはAPI key不要であること
- Search／Graph／Live AIは未実装であることを前面に出しすぎない

### Existing workspace

Snapshotから次を表示する。

- Knowledge revision
- Imported Document数
- 未完了Review Session数
- 完了・未適用Session数
- Entity数
- `作業を再開`
- `Knowledgeを見る`
- Project Astra進捗

### Fatal storage error

- error code
- 利用者向け説明
- 保存データを自動削除していないこと
- `再試行`
- `新しい空Workspaceへ置換`は自動では提供しない
- resetは別の明示操作として扱う

---

## 9. Project Astra進捗の導出

新しいDemo専用状態を保存しない。Snapshotから導出する。

manifest順に各documentIdを確認する。

```ts
type ProjectAstraDocumentStatus =
  | "not_imported"
  | "entity_review"
  | "relationship_review"
  | "complete_not_applied"
  | "applied";
```

判定：

- Imported Documentなし：`not_imported`
- Session phase `entities`：`entity_review`
- Session phase `relationships`：`relationship_review`
- Session phase `complete`でApplication Recordなし：`complete_not_applied`
- Application Recordあり：`applied`

### 次の操作

- 未完了Sessionがあれば、そのSessionを開く。
- 未完了Sessionがなく、未Import文書があれば次の文書をImportできる。
- 全4文書appliedならDemo完了。
- 規定順を飛ばしたImportはDemo UIから行わない。

---

## 10. Project Astra Demo開始

Homeの`Project Astra Demoを開始`で次を行う。

### 空Workspace

Document 01をImportしてReviewへ移動する。

### 途中状態

現在の未完了Sessionまたは次の文書へ進む。

### 完了状態

Knowledge viewを開き、完成状態を表示する。

### 他データが存在するWorkspace

Project Astra Demoは既存Knowledgeを前提にしたgolden期待値と一致しないため、次を行う。

- 既存データが空でない場合は、そのままDemo開始しない。
- `現在のWorkspaceを維持`
- `Demo用にWorkspaceを初期化`
の選択を表示する。

初期化は明示確認後のみ行う。

---

## 11. Workspace reset

Demo再現性のため最小serviceを追加してよい。

```ts
async function resetWorkspace(
  dependencies: { storage: StorageAdapter }
): Promise<StorageSnapshot>
```

### 規則

- 明示的な利用者操作のみ。
- 確認画面または二段階操作を必須とする。
- 空StorageSnapshotを1回saveする。
- Local Storage key自体を直接removeしない。
- 保存失敗時は現在状態を維持する。
- reset前の自動backupは本Step対象外。
- Domain errorを明示表示する。
- 自動resetは行わない。

---

## 12. Import UI

### Demo Mode

Project Astraの次文書をcard表示する。

- order
- fileName
- 短い説明
- status
- `ImportしてReview`
- Import済みなら再Importしない
- 規定順のみ操作可能

### 任意文書

最低限次の入力を設ける。

- source kind
- format
- fileName
- mediaType
- file input
- paste textarea
- Import button

### file input

対応拡張子：

- `.txt`
- `.md`
- `.markdown`
- `.json`

fileのtext contentをそのまま使用する。

### pasted text

- fileNameを利用者が入力
- format選択
- content textarea

### 現時点のExtraction制約

本番composition rootはFixture Extraction Adapterだけを持つため、Project Astra以外の任意文書は通常`FIXTURE_NOT_FOUND`となる。

UIでは次を明示する。

- 現在はDemo Mode用の保存済み抽出結果だけを利用できる
- Live AI抽出は後続Step
- 文書自体を保存して失敗状態を作らない
- Import失敗時に部分保存しない

任意Import面を隠さず、現在の制約を正確に表示する。

---

## 13. Entity Candidate Review UI

### Layout

- 左：Candidate一覧
- 右：選択Candidate詳細と操作
- 上：文書名、phase、進捗
- 下または上：次phaseへの操作

responsive時は縦並びでよい。

### Candidate一覧

各項目に表示：

- name
- entityType
- status
- Duplicate候補数
- 未処理／Accept／Merge／Reject
- 現在選択状態

### 詳細

- name
- entityType
- aliases
- description
- attributes
- tags
- SourceRefs
- Duplicate候補

### Accept as new

- Duplicate候補があっても操作可能
- Duplicateありの場合は注意文を表示
- 実行後に一覧と進捗更新
- 同じCandidateを再操作できない

### Merge

- merge先Entity選択
- Duplicate候補を上位に表示
- 同EntityTypeだけ選択可能
- name／descriptionの任意resolution field
- 未入力なら既存値維持
- 実行後にregistered IDを表示してよい

### Edit

編集可能：

- entityType
- name
- aliases
- description
- attributes
- tags

編集不可：

- candidateId
- sourceRefs

attributesはkey／valueの行編集でよい。ScalarValue型はstring／number／booleanを明示選択する。

### Reject

- 確認を表示
- 実行後は再編集不可
- Knowledgeへ追加されない

### phase移行

全Entity Candidateがreview済みになった場合だけ、`Relationship Reviewへ進む`を有効化する。

---

## 14. Relationship Candidate Review UI

### Candidate一覧

- relationType
- from表示
- to表示
- status
- blocked indicator
- recommendation
- selected state

### 詳細

- fromRef／toRef原文
- resolved Entity
- relationType
- description
- SourceRefs
- blocked reason
- reject recommendation

### blocked reason表示

利用者向け表示例：

- `始点を解決できません`
- `終点を解決できません`
- `両端を解決できません`
- `始点に複数候補があります`
- `終点に複数候補があります`
- `RejectされたEntityだけを参照しています`

内部error codeだけを表示しない。

### manual resolution

from／toそれぞれに登録済みEntityを選べる。

- entityType指定がある場合は一致するEntityだけ
- manual選択後にstatus再評価
- 両端解決でpending
- 片端未解決ならblocked維持

### Accept

- pendingのみ可能
- blockedではdisabled
- 重複Relationshipの場合は`既存RelationshipへSourceRefを統合`と事前表示してよい

### Reject

- pending／blockedで可能
- blocked recommendationがあっても自動Rejectしない

### complete

全Relationship Candidateがaccepted／merged／rejectedの場合だけ`Reviewを完了`可能。

---

## 15. Review完了とKnowledge反映

一つの利用者操作として表示してよいが、内部では次の順を守る。

1. `completeReviewSession`
2. `saveReviewSession`
3. `applyCompletedReviewSession`
4. 最新Snapshot読込
5. Knowledge viewまたは次文書案内

### 失敗

- complete保存に成功しapplyが失敗した場合、Sessionは`complete_not_applied`として再開可能。
- 再試行で二重適用しない。
- revision conflictは明示する。
- 利用者に自動mergeを約束しない。

### Project Astra

apply後に次の未Import文書があれば、次文書cardを表示する。

---

## 16. Knowledge／Insights UI

### Statistics

- Entity総数
- Relationship総数
- Orphan数
- 未解決Conflict数
- EntityType別件数

### Duplicate

- normalized key
- 対象Entity名
- Entity ID
- 1組もなければ空状態

### Conflict

- Entity名
- attribute key
- canonicalValue
- claim values
- SourceRefs
- resolvedAt
- 未解決だけを表示

### Orphan

- Entity名
- entityType
- ID

### Entity一覧

- 登録順
- name
- entityType
- tags
- 関連Relationship数

### Entity詳細

- name
- aliases
- description
- attributes
- canonicalValue
- claims
- SourceRefs
- incoming／outgoing Relationship

### Relationship一覧

- from name
- relationType
- to name
- SourceRefs
- directionを維持

SearchやGraphは追加しない。

---

## 17. Status messageとerror表示

```ts
type UiMessage =
  | { kind: "success"; text: string }
  | { kind: "info"; text: string }
  | { kind: "warning"; text: string };

interface UiError {
  code: string;
  title: string;
  detail: string;
}
```

### 規則

- success／errorを色だけで区別しない。
- `aria-live`を使う。
- Domain error codeを利用者向け説明へ変換する。
- unknown errorは一般化して表示し、consoleへ内部情報を漏らしすぎない。
- API keyや秘密情報は存在しない。

最低限のerror mapping：

- `FIXTURE_NOT_FOUND`
- `CANDIDATE_ALREADY_REVIEWED`
- `ENTITY_REVIEW_INCOMPLETE`
- `RELATIONSHIP_BLOCKED`
- `RELATIONSHIP_REVIEW_INCOMPLETE`
- `KNOWLEDGE_REVISION_CONFLICT`
- `INVALID_PERSISTED_JSON`
- `UNSUPPORTED_STORAGE_SCHEMA_VERSION`
- `LOCAL_STORAGE_READ_FAILED`
- `LOCAL_STORAGE_WRITE_FAILED`
- `STORAGE_LOAD_FAILED`
- `STORAGE_SAVE_FAILED`

---

## 18. Accessibility

最低限：

- 全inputにlabel
- buttonに明確な名前
- Candidate listはkeyboardで選択可能
- focus indicatorを消さない
- dialog相当の確認はfocus管理
- status／errorは`aria-live`
- blocked／statusはtextを併記
- tableを使う場合はheaderを付ける
- heading階層を維持
- form errorをinputと関連付ける
- decorative iconだけに意味を持たせない
- keyboardだけでProject Astra Demoを完走できる

外部icon libraryは不要。

---

## 19. Visual方針

- 業務用Knowledge Review toolとして落ち着いた外観
- Candidate Reviewを中心にする
- Graph風装飾を先行実装しない
- 極端に暗い背景や低contrastを避ける
- status chipを使ってよい
- mobile最適化よりdesktop browserを優先するが、狭い画面で横overflowを抑える
- CSS変数を使用してよい
- 外部CSS frameworkを追加しない

---

## 20. 保存とrefresh

最低限次を実証する。

- Import後refreshしてSessionが残る
- Entity Review途中でrefreshして状態が残る
- Relationship Review途中でrefreshして状態が残る
- complete_not_appliedから再適用できる
- apply後refreshしてKnowledgeが残る
- Project Astra進捗がSnapshotから復元される
- Insightsが保存Knowledgeから再計算される

Review操作ごとに`saveReviewSession`を実行する。

---

## 21. UIテスト

既存328件を維持し、最低限次を追加する。

### App初期化

- loading
- empty workspace
- existing workspace
- storage error
- retry
- Local Storage composition
- initialize 1回

### Home

- Demo開始
- 任意Importへ移動
- Knowledgeへ移動
- 途中Session再開
- Project Astra完了表示

### Project Astra progress

- 4文書status
- 次文書
- 未完了Session優先
- complete_not_applied
- 全件applied
- 順序を飛ばさない

### Import UI

- file text import
- pasted text import
- format
- fileName
- JSON
- unsupported extension
- empty content
- Fixture未登録error
- Import失敗時Snapshot不変
- busy中二重送信防止

### Entity Review

- Candidate一覧
- 詳細
- Accept
- DuplicateありAccept
- Edit
- attributes型編集
- Merge
- Reject
- reviewed Candidate再操作不可
- 進捗
- pendingありphase移行不可
- 全件完了でphase移行

### Relationship Review

- resolved endpoints
- blocked reason
- manual resolution
- blocked Accept不可
- Accept
- Relationship merge表示
- Reject
- pendingありcomplete不可
- 全件完了

### complete／apply

- complete保存
- apply
- next document
- already applied
- apply failure
- revision conflict
- complete_not_applied再開

### Insights

- statistics
- Duplicate
- Conflict
- Orphan
- Entity detail
- Relationship direction
- empty states

### refresh相当

Memoryまたはfake Local Storageを共有し、Appをunmount／remountして状態復元を確認する。

### Accessibility

- label
- heading
- button name
- aria-live
- keyboard操作の主要経路
- focus移動の最低限

---

## 22. Project Astraブラウザー統合テスト

UIから次の主要経路を実行する。

1. 空Workspace
2. Demo開始
3. Document 01の代表操作
4. 残りCandidateを規定操作
5. Session apply
6. Document 02 Merge／Edit後Merge／Relationship merge
7. Document 03 DuplicateでもAccept
8. Document 04 Reject／blocked Reject
9. 最終Knowledge
10. Insights
11. refresh後も同じ状態

全328既存testに加え、UI統合testで最終：

- Entity 7
- Relationship 5
- revision 4
- Duplicate 1
- Conflict 1
- Orphan 1

を確認する。

ただし全Candidate操作を一つの巨大testだけへ集約せず、機能別testと代表end-to-endへ分ける。

---

## 23. 手動確認チェックリスト

作成：

```text
notes/reviews/STEP_6_MANUAL_CHECKLIST.md
```

最低限：

- 初回起動
- Demo開始
- Import
- Entity Accept
- Entity Edit
- Entity Merge
- Entity Reject
- Relationship Accept
- blocked表示
- manual resolution
- Relationship Reject
- Session complete／apply
- 次文書
- 最終Insights
- refresh復元
- Local Storage破損時error
- reset確認
- keyboard操作
- 1280px幅
- 768px幅
- console errorなし

---

## 24. ADR

最低限追加：

- ADR-029: The React UI calls domain operations through an application controller
- ADR-030: Review progress is persisted after every user decision
- ADR-031: Project Astra demo progress is derived from stored domain records
- ADR-032: The browser composition root is the only place that accesses window.localStorage
- ADR-033: Search and graph are deferred until the review workflow is usable
- ADR-034: Workspace reset is explicit and destructive

各ADRにStatus、Context、Decision、Consequences。

---

## 25. READMEと判断記録

READMEへ追記：

- ブラウザーUI実装済み
- Project Astra Demoの開始方法
- 4文書を対話的に処理できる
- refreshで再開可能
- Local Storage使用
- Candidate ReviewとInsights
- Search／Graph／Live AI未実装
- 開発server起動方法
- manual checklist

作成：

```text
notes/reviews/STEP_6_IMPLEMENTATION_DECISIONS.md
```

最低限記録：

- 開始commit
- App view構成
- controller責務
- composition root
- Local Storage key
- Demo進捗導出
- Review操作ごとの保存
- completeとapplyの分離
- complete_not_appliedの回復
- reset契約
- arbitrary ImportのDemo制約
- error mapping
- accessibility
- Search／Graph延期
- Context Bundle未実装

---

## 26. 品質条件

- 既存328件を含む全テスト成功
- typecheck成功
- lint警告なし
- production build成功
- `npm audit --offline`で0 vulnerabilities
- 新規依存は原則追加しない
- ComponentからLocal Storage直接参照なし
- ComponentからFixture直接参照なし
- Domain objectのMutationなし
- refreshで状態復元
- Project Astra Demoをkeyboardだけで完走可能
- console error／React warningなし
- 上位仕様、凍結資料、golden JSONを変更しない

---

## 27. 完了報告

完了後、次を報告する。

1. 開始commitと事前検証
2. 作成／変更ファイル
3. Application shell
4. composition root
5. controller
6. Home
7. Demo Mode
8. Import UI
9. Entity Review UI
10. Relationship Review UI
11. complete／apply
12. Knowledge／Insights UI
13. Local Storage接続
14. refresh復元
15. workspace reset
16. error mapping
17. accessibility
18. visual／responsive
19. Project Astra UI統合結果
20. ADR
21. manual checklist
22. 追加／総テスト数
23. typecheck／lint／build／audit
24. 判断事項
25. Step 7持ち越し
26. git status
27. 凍結資料／golden非変更

Step 7以降には着手しない。

---

## 28. 完了条件

1. ブラウザーでProject Astra Demoを開始できる。
2. 4文書を規定順でImportできる。
3. Entity CandidateをAccept／Edit／Merge／Rejectできる。
4. Relationship CandidateをAccept／manual resolution／Rejectできる。
5. blocked RelationshipをAcceptできない。
6. Review進捗をrefresh後に復元できる。
7. Session complete後に正本Knowledgeへapplyできる。
8. complete_not_appliedから再試行できる。
9. 最終Knowledgeが7 Entity／5 Relationship／revision 4になる。
10. Duplicate／Conflict／Orphan／Statisticsを表示できる。
11. Local Storageへ保存される。
12. 壊れた保存値を自動resetしない。
13. 明示resetで空Workspaceへ戻せる。
14. Project Astra進捗をSnapshotから導出する。
15. 任意Importの現行制約を正確に表示する。
16. keyboardだけで主要経路を操作できる。
17. 既存328件を含む全テストが成功する。
18. typecheck、lint、buildが成功する。
19. Search、Graph、Live AI、Context Bundleへ着手しない。
20. 上位仕様、Project Astra凍結資料、golden JSONを変更しない。
