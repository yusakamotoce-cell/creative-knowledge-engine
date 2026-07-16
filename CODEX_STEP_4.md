# Codex実装指示
## Creative Knowledge Engine Step 4
### Review結果の正本反映、永続化Schema、Local Storage Adapter、起動時読込
### v1.0

- **Status:** Ready for implementation
- **前提:** Step 3完了後のcommitが存在し、作業ツリーがclean
- **対象リポジトリ:** `C:\Users\tc120\projects\creative-knowledge-engine`
- **実装範囲:** Application service、Storage schema更新、Local Storage Adapter、自動テスト
- **実装対象外:** Candidate Review画面、Import画面、Project Astra Fixture、Search、Insights、Graph、Live AI、Context Bundle

---

## 0. 目的

Step 3では、Imported Document、Import Registry、Extraction Adapter、Review Session、Storage Adapterの境界を実装した。

Step 4では、完了したReview SessionのKnowledgeを正本Knowledgeへ反映し、その結果をブラウザーへ永続化できる状態にする。

```text
Review Session complete
↓
二重反映確認
↓
Knowledge revision確認
↓
Review Session内Knowledgeを正本Knowledgeへ反映
↓
Knowledge revision更新
↓
Application Record保存
↓
Storage Adapterで一括保存
```

さらに、Storage Snapshotをversion付きの永続化Envelopeへ格納し、Local Storage Adapterを通して保存・読込する。

Step 4終了時点ではUIを実装しない。Application serviceとAdapterの自動テストから、次を証明する。

1. 完了Sessionだけを正本Knowledgeへ反映できる
2. 同じSessionを二重反映しない
3. 古いKnowledgeを基にしたSessionによる上書きを防止できる
4. Memory AdapterとLocal Storage Adapterが同じ契約を満たす
5. 保存データをversion付きSchemaで検証できる
6. 起動時に永続状態を安全に読み込める
7. 壊れた保存データを自動修復・上書きしない

---

## 1. 参照資料と優先順位

次を確認する。

- `PROJECT_KICKOFF_v1.0.md`
- `BUILD_WEEK_SPEC_v0.3.md`
- `BUILD_WEEK_SPEC_v0.3_ADDENDUM.md`
- `CODEX_STEP_0-1.md`
- `CODEX_STEP_2.md`
- `CODEX_STEP_3.md`
- `PROJECT_ASTRA_v1.0.md`
- `PROJECT_ASTRA_POST_FREEZE_VERIFICATION.md`
- `notes/reviews/STEP_0-1_IMPLEMENTATION_DECISIONS.md`
- `notes/reviews/STEP_2_IMPLEMENTATION_DECISIONS.md`
- `notes/reviews/STEP_3_IMPLEMENTATION_DECISIONS.md`

競合時の優先順位：

1. `BUILD_WEEK_SPEC_v0.3_ADDENDUM.md`
2. `BUILD_WEEK_SPEC_v0.3.md`
3. `PROJECT_KICKOFF_v1.0.md`
4. `CODEX_STEP_0-1.md`
5. `CODEX_STEP_2.md`
6. `CODEX_STEP_3.md`
7. 本Step 4指示書

本指示書は上位仕様を変更しない。

---

## 2. 作業開始前の確認

コード変更前に次を実行する。

```powershell
git status
git log -3 --oneline
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

期待基準：

- 作業ツリーがclean
- HEADがStep 3完了commit
- Step 3完了時点の全テストが成功
- typecheck、lint、buildが成功

満たさない場合は実装を開始せず報告する。

---

## 3. 今回実装する範囲

### 3.1 正本Knowledge反映

- 完了Review Sessionの適用
- 同一Sessionの二重適用防止
- Knowledge revisionによる競合検出
- 反映履歴
- 一括保存
- 失敗時の非保存

### 3.2 Storage Snapshot更新

- `knowledgeRevision`
- `reviewApplications`
- Review Sessionの`baseKnowledgeRevision`
- strict Schema
- 既存Step 3のImport Serviceとの接続更新

### 3.3 永続化Envelope

- 永続化Schema version
- parse／validate境界
- migration pipelineの入口
- 未対応version拒否
- 保存形式の決定性

### 3.4 Local Storage Adapter

- Local Storage互換interfaceへの依存注入
- load／save
- 空Storage
- 不正JSON
- 不正Schema
- quota／security errorのtyped error化
- 参照共有防止

### 3.5 起動時読込

- Application state初期化service
- 永続化済みSnapshotの読込
- 空Storage時の初期Snapshot
- 壊れた保存データの明示的失敗

### 3.6 文書とテスト

- ADR
- README更新
- Step 4実装判断記録
- Memory／Local Storage共通契約テスト

---

## 4. 今回実装しない範囲

- Candidate Review UI
- Import UI
- React state接続
- Project Astra Fixture本データ
- Project Astra expected JSON
- Search
- Knowledge Insights
- Graph
- Demo Mode画面
- Live AI
- サーバーレス関数
- Context Bundle
- IndexedDB
- 複数tab間同期
- Storage event監視
- Undo／Redo
- Session rebase
- Knowledge merge
- Export／Import
- Step 5以降

Project Astra Fixtureはpost-freeze R-2解消前に生成しない。

---

## 5. 推奨ディレクトリ構成

```text
src/core/
  application/
    applyReviewSession.ts
    initializeApplication.ts
    errors.ts
    types.ts
    index.ts
  storage/
    persistedEnvelope.ts
    localStorageAdapter.ts
    migration.ts
    storageContractTests.ts
```

既存構成との整合に応じて調整してよい。ただし次を守る。

- Reactへ依存しない
- `window`をドメイン／Application serviceへ直接参照させない
- Local Storage APIは注入interface越しに扱う
- Step 0〜3の型・Schemaを再利用する
- 保存形式とドメイン型を無制限に混在させない
- 公開面は`index.ts`に限定する

---

## 6. Knowledge revision

Storage Snapshotへ次を追加する。

```ts
interface StorageSnapshot {
  knowledge: KnowledgeState;
  knowledgeRevision: number;
  reviewSessions: ReviewSession[];
  reviewApplications: ReviewApplicationRecord[];
  importedDocuments: ImportedDocument[];
  importRegistry: ImportRegistry;
}
```

### 規則

- `knowledgeRevision`は0以上の整数。
- 空Snapshotは`knowledgeRevision: 0`。
- Import時点ではKnowledgeを変更しないためrevisionを増やさない。
- 完了Review Sessionを正本Knowledgeへ初回反映したときだけ1増やす。
- 失敗、already applied、読込だけでは増やさない。
- revisionを時刻やIDで代用しない。

---

## 7. Review Sessionのbase revision

Review Sessionへ次を追加する。

```ts
interface ReviewSession {
  id: string;
  schemaVersion: 1;
  documentId: string;
  baseKnowledgeRevision: number;
  // 既存field
}
```

### 作成規則

- Import ServiceがSessionを作る時点の`StorageSnapshot.knowledgeRevision`を設定する。
- 0以上の整数。
- Review操作中に変更しない。
- Complete時にも変更しない。
- Storage Schemaで必須。
- 既存Step 2／3テストは必要なrevisionを明示する。

### 目的

Review Sessionは作成時点の正本Knowledgeを基礎としている。別Sessionが先に適用され正本Knowledgeが更新された場合、古いSessionをそのまま適用すると既存変更を上書きする可能性がある。

Step 4では自動rebaseや3-way mergeを行わず、revision不一致として拒否する。

---

## 8. Review Application Record

次を追加する。

```ts
interface ReviewApplicationRecord {
  reviewSessionId: string;
  appliedAt: string;
  fromKnowledgeRevision: number;
  toKnowledgeRevision: number;
}
```

### 規則

- `reviewSessionId`を一意keyとする。
- `appliedAt`はISO 8601形式。
- `toKnowledgeRevision === fromKnowledgeRevision + 1`。
- 配列順は反映順。
- 同一SessionのRecordを複数許可しない。
- RecordのSession IDは必ずStorage内Review Sessionを参照する。
- Record作成後にSessionやKnowledgeを削除する処理は本Stepでは実装しない。

---

## 9. 正本Knowledge反映service

次に相当するserviceを実装する。

```ts
type ApplyReviewSessionResult =
  | {
      status: "applied";
      reviewSessionId: string;
      knowledge: KnowledgeState;
      knowledgeRevision: number;
      application: ReviewApplicationRecord;
      snapshot: StorageSnapshot;
    }
  | {
      status: "already_applied";
      reviewSessionId: string;
      application: ReviewApplicationRecord;
      snapshot: StorageSnapshot;
    };

async function applyCompletedReviewSession(
  input: {
    reviewSessionId: string;
  },
  dependencies: {
    storage: StorageAdapter;
    clock: Clock;
  }
): Promise<ApplyReviewSessionResult>
```

### 正常処理順

1. Storage load
2. Review Session検索
3. 既存Review Application Record検索
4. 既に適用済みなら`already_applied`
5. Session phaseが`complete`であることを確認
6. `session.baseKnowledgeRevision === snapshot.knowledgeRevision`を確認
7. `clock.now()`を1回取得
8. `session.knowledge`を新しい正本Knowledgeとして採用
9. `knowledgeRevision`を1増やす
10. Review Application Recordを末尾追加
11. Storage saveを1回実行
12. `applied`を返す

### 反映規則

- Session内KnowledgeのEntity／Relationship配列順をそのまま維持する。
- 新しいIDを発行しない。
- canonicalValueを変更しない。
- SessionのReview Record、phase、documentId等は変更しない。
- Session自体を削除しない。
- Imported Document、Registry、他Sessionを変更しない。
- 正本KnowledgeだけをSession内Knowledgeで置換する。
- 入力やload結果を直接変更しない。

---

## 10. 二重適用

同じReview Session IDのApplication Recordが存在する場合：

- `already_applied`を返す
- Clockを呼ばない
- saveを呼ばない
- revisionを増やさない
- Knowledgeを変更しない
- 既存Application Recordを返す

Sessionが削除・不整合になっている場合は自動修復せずStorage Snapshot検証で拒否する。

---

## 11. Knowledge revision競合

Sessionの`baseKnowledgeRevision`と現在の`knowledgeRevision`が異なる場合：

- `KNOWLEDGE_REVISION_CONFLICT`
- Knowledgeを変更しない
- Application Recordを追加しない
- Clockを呼ばない
- saveを呼ばない

errorには最低限次を保持してよい。

```ts
{
  reviewSessionId: string;
  expectedRevision: number;
  actualRevision: number;
}
```

自動rebase、自動merge、後勝ち上書きは行わない。

---

## 12. 完了前Session

phaseが`complete`でないSessionは適用できない。

- `REVIEW_SESSION_NOT_COMPLETE`
- entities phase、relationships phaseの双方を拒否
- pending／blocked Candidateの再検査をApplication serviceで重複実装しない
- Step 2の`completeReviewSession`を正規の完了判定とする

---

## 13. Atomicity

次の場合はStorage saveを呼ばない。

- Storage load失敗
- Session未発見
- Session未完了
- revision競合
- Snapshot不整合
- Clock不正
- Application Record生成失敗

Storage saveが失敗した場合：

- `STORAGE_SAVE_FAILED`
- 呼出側へ部分成功を返さない
- Memory上で組み立てた新Snapshotを正本として扱わない

Storage Adapterはtransaction APIを持たないため、「一つのSnapshotを一回saveする」ことを本Stepのatomicity境界とする。

---

## 14. Storage Snapshot Schema更新

strict Schemaで最低限次を検証する。

- `knowledgeRevision`が0以上の整数
- Review Session `baseKnowledgeRevision`
- Review Application Record
- duplicate application session ID拒否
- Application Recordのdangling session ID拒否
- `toRevision = fromRevision + 1`
- application配列のrevision連鎖
- 最終Application Recordの`toKnowledgeRevision`が現在の`knowledgeRevision`以下
- 同一reviewSessionId重複拒否
- unknown field拒否

### revision連鎖

Application Recordが存在する場合：

- 最初の`fromKnowledgeRevision`は0であることを要求しない。将来migrationや外部導入を妨げるため。
- 各隣接Recordで、前Recordの`toKnowledgeRevision`と次Recordの`fromKnowledgeRevision`が一致する。
- 最後の`toKnowledgeRevision`とSnapshotの`knowledgeRevision`が一致する。

Application Recordが空の場合、knowledgeRevisionは0であることを本Stepでは要求する。永続化開始時点の契約を単純化するためである。

---

## 15. Persisted Storage Envelope

永続化用の正規形式を次に固定する。

```ts
interface PersistedStorageEnvelopeV1 {
  schemaVersion: 1;
  snapshot: StorageSnapshot;
}
```

### 規則

- top-level unknown fieldを拒否。
- `schemaVersion`は整数1。
- `snapshot`はStorage Snapshot Schema適合。
- 保存時は空白なしJSONでよい。
- object key順をdigest用途には使わない。Context Bundleのcanonical JSON契約とは別。
- Local Storageの値はこのEnvelope全体のJSON文字列。
- Storage keyはconstructor引数で受け取り、既定値を持ってよい。

推奨既定key：

```text
creative-knowledge-engine:storage:v1
```

---

## 16. Migration boundary

次に相当する関数を実装する。

```ts
function decodePersistedStorage(
  raw: string
): StorageSnapshot
```

内部処理：

1. JSON parse
2. top-level schemaVersion確認
3. 対応versionのmigration選択
4. 現行Storage Snapshot Schema検証
5. Snapshotを返す

### v1

- 現行version。
- migrationなしでSchema検証。

### 未対応version

- `UNSUPPORTED_STORAGE_SCHEMA_VERSION`
- 推測して変換しない
- raw dataを上書きしない

### migration pipeline

本Stepでは実在する旧version migrationを作らなくてよい。ただし、versionごとの関数を追加できる構造にする。

例：

```ts
const migrations = {
  1: decodeV1
};
```

`schemaVersion`欠落を暗黙にv1とみなさない。

---

## 17. Local Storage互換interface

browser globalへ直接依存しないため、次に相当するinterfaceを定義する。

```ts
interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
```

`window.localStorage`はこのinterfaceを満たすが、core testではfakeを注入する。

---

## 18. Local Storage Adapter

```ts
class LocalStorageAdapter implements StorageAdapter
```

constructor例：

```ts
constructor(input: {
  storage: KeyValueStorage;
  key?: string;
})
```

### load

- `getItem(key)`がnullなら空Snapshotを返す。
- 値があれば`decodePersistedStorage`を通す。
- parse／Schema／version errorを自動修復しない。
- 読込失敗時にremoveItem／setItemを呼ばない。
- deep clone相当の分離を保証する。
- 同じload結果を呼出側が変更しても次回loadへ影響しない。

### save

- 入力Snapshotをstrict Schemaで検証。
- Envelope V1へ包む。
- JSON文字列化。
- `setItem`を1回呼ぶ。
- 保存後に入力Snapshotを変更しても保存値は変わらない。
- 不正SnapshotではsetItemを呼ばない。
- quota／security等の任意例外を`STORAGE_SAVE_FAILED`へ変換する。

### remove

Storage Adapter interfaceへclearを追加しない。本Stepではデータ削除操作を公開しない。

---

## 19. Local Storage error

最低限次を扱う。

```text
INVALID_PERSISTED_JSON
INVALID_PERSISTED_ENVELOPE
UNSUPPORTED_STORAGE_SCHEMA_VERSION
LOCAL_STORAGE_READ_FAILED
LOCAL_STORAGE_WRITE_FAILED
```

既存`INVALID_STORAGE_SNAPSHOT`、`STORAGE_LOAD_FAILED`、`STORAGE_SAVE_FAILED`との関係を判断記録へ明記する。

推奨：

- Adapter内部の具体errorはLocal Storage固有code
- Application service境界で既存`STORAGE_LOAD_FAILED`／`STORAGE_SAVE_FAILED`へwrapしてよい
- causeを保持してよい
- messageで判定しない

---

## 20. Application初期化service

次に相当するserviceを実装する。

```ts
interface ApplicationState {
  snapshot: StorageSnapshot;
}

async function initializeApplication(
  dependencies: {
    storage: StorageAdapter;
  }
): Promise<ApplicationState>
```

### 規則

- Storage loadを1回実行。
- 正常ならSnapshotを返す。
- 空Storageなら空Snapshot。
- 不正保存データを空Snapshotへ置換しない。
- saveを呼ばない。
- load errorを`STORAGE_LOAD_FAILED`へ変換してよい。
- Reactへ接続しない。
- Singletonを作らない。

---

## 21. Import Service更新

Step 3のImport Serviceを更新する。

### Session作成

- `baseKnowledgeRevision`へ現在の`snapshot.knowledgeRevision`を設定。
- Import時にknowledgeRevisionは変更しない。
- reviewApplicationsは変更しない。
- 空Storageの初期値はrevision 0、applications空。

### 再Import

従来どおり：

- Extractionを呼ばない
- IDを発行しない
- Clockを呼ばない
- saveを呼ばない
- revisionを変更しない

### 既存テスト

Step 3の処理順、Atomicity、冪等性を維持する。

---

## 22. Memory Storage Adapter更新

Memory Adapterも新Storage Snapshot契約へ更新する。

- 空Snapshotに`knowledgeRevision: 0`
- 空`reviewApplications`
- strict Schema
- load／save参照分離
- Local Storage Adapterとの共通契約テストを通す

Memory Adapterだけ特別な入力を受理しない。

---

## 23. Storage Adapter共通契約テスト

Memory Storage AdapterとLocal Storage Adapterへ同じテスト群を適用する。

最低限：

- 空Storage load
- 正常Snapshot save／load
- 複数回saveで最新値
- 入力参照非共有
- load結果参照非共有
- 不正Snapshot拒否
- duplicate ID拒否
- dangling参照拒否
- knowledge revision検証
- application record検証

Local Storage固有テストは別に追加する。

---

## 24. typed error

最低限次を追加する。

```text
REVIEW_SESSION_NOT_FOUND
REVIEW_SESSION_NOT_COMPLETE
REVIEW_SESSION_ALREADY_APPLIED
KNOWLEDGE_REVISION_CONFLICT
DUPLICATE_REVIEW_APPLICATION
REVIEW_APPLICATION_DANGLING_SESSION
INVALID_REVIEW_APPLICATION_REVISION
INVALID_PERSISTED_JSON
INVALID_PERSISTED_ENVELOPE
UNSUPPORTED_STORAGE_SCHEMA_VERSION
LOCAL_STORAGE_READ_FAILED
LOCAL_STORAGE_WRITE_FAILED
```

`already_applied`は正常resultとして返すため、`REVIEW_SESSION_ALREADY_APPLIED`は内部検証や将来用途に限定してもよい。実際に公開しない場合は判断記録へ理由を書く。

既存error codeを再利用できる場合は重複定義しない。

---

## 25. 決定性とMutation禁止

### 決定性

- revisionは整数加算だけ。
- Application Record順は反映順。
- Clockは注入。
- Local Storage keyは明示。
- Envelope versionは固定。
- 同じSnapshotから同じJSON構造を生成する。文字列の完全一致を契約にしない場合はテストも構造比較とする。

### Mutation禁止

次をテストする。

- apply serviceがload結果を直接変更しない
- Session内Knowledgeを直接変更しない
- Memory Adapter参照分離
- Local Storage Adapter参照分離
- initializeApplicationの戻り値変更が保存値へ影響しない
- failed applyでSnapshot不変
- already appliedでSnapshot不変

---

## 26. 必須自動テスト

Step 3までの全テストを維持し、最低限次を追加する。

### Storage Schema更新

- 空Snapshot revision 0
- baseKnowledgeRevision必須
- reviewApplications空
- 負revision拒否
- 小数revision拒否
- duplicate application拒否
- dangling application session拒否
- revision差が1以外を拒否
- application revision連鎖不整合拒否
- 最終revision不一致拒否
- application空でrevision非0を拒否
- unknown field拒否

### Import Service回帰

- Sessionのbase revision設定
- Importでrevision不変
- Importでapplications不変
- 現在revisionが2ならSession baseも2
- 再Importでrevision不変
- 既存Step 3 Atomicity維持

### Apply正常系

- complete Session適用
- root Knowledge置換
- revision +1
- Application Record作成
- appliedAt
- from/to revision
- save 1回
- clock 1回
- Session保持
- Document／Registry保持
- 他Session保持
- ID未発行
- 配列順維持
- Mutationなし

### 二重適用

- 2回目はalready_applied
- save未呼出
- clock未呼出
- revision不変
- Application Record増加なし
- Knowledge不変

### Apply拒否

- Session未発見
- entities phase
- relationships phase
- revision競合
- load失敗
- save失敗
- Clock不正
- 失敗時部分保存なし

### 競合

- base 0／current 1で拒否
- base 1／current 1で成功
- 別Session先行適用後、古いSession拒否
- 自動rebaseしない
- 自動mergeしない

### Persisted Envelope

- v1正常decode
- 不正JSON
- top-level unknown field
- schemaVersion欠落
- unknown version
- 不正Snapshot
- decodeでrawを変更しない

### Local Storage Adapter

- 空Storageで空Snapshot
- save後load
- key既定値
- custom key
- getItem例外
- setItem例外
- 不正JSON
- unsupported version
- 不正Schema
- load失敗時に上書きしない
- 不正saveでsetItemしない
- 参照分離
- 最新saveを返す

### Application初期化

- Memory Adapter読込
- Local Storage Adapter読込
- 空Storage
- 既存Snapshot
- load 1回
- save未呼出
- 壊れた保存値を空へ置換しない

### 共通契約

- Memory／Local Storage両Adapterに同一テスト群
- Step 3までのStorage検証を維持

### 回帰

- Step 3までの全テスト成功
- Candidate Review状態遷移不変
- Import冪等性不変
- Candidate Bundle Schema不変
- Entity／Relationship Schema不変
- Project Astra凍結資料非変更
- Context Bundle資料非変更

---

## 27. ADR

最低限、次を追加する。

- ADR-018: Completed review sessions replace canonical knowledge only through an application service
- ADR-019: Knowledge revisions prevent stale review sessions from overwriting newer knowledge
- ADR-020: Review session application is idempotent by session ID
- ADR-021: Browser persistence uses a versioned storage envelope
- ADR-022: Local Storage is accessed through an injected key-value interface
- ADR-023: Corrupt persisted data is rejected rather than silently reset

各ADRに次を含める。

- Status
- Context
- Decision
- Consequences

---

## 28. READMEと判断記録

READMEへ次を追記する。

- Step 4で実装済みの範囲
- 完了Sessionだけが正本Knowledgeへ反映されること
- revision競合時は反映しないこと
- 同一Sessionの二重反映を行わないこと
- Local Storage Adapterが追加されたこと
- 保存形式がversion付きEnvelopeであること
- 壊れた保存値を自動初期化しないこと
- UIは未実装
- IndexedDBは未実装

次を作成する。

```text
notes/reviews/STEP_4_IMPLEMENTATION_DECISIONS.md
```

最低限記録する。

- 開始commit
- knowledgeRevision契約
- baseKnowledgeRevision契約
- Review Application Record
- replace方式を採用した理由
- revision不一致でrebaseしない理由
- 二重適用時にsave／Clockを呼ばないこと
- Local Storage key
- Envelope schemaVersion
- migration pipelineはあるが旧migrationは未実装であること
- 不正保存データを自動resetしないこと
- Local Storage固有errorとApplication errorの関係
- Project Astra post-freeze R-2未解消
- Search正規化未決定

---

## 29. 品質条件

- TypeScript型エラーなし
- 全テスト成功
- ESLint警告・エラーなし
- Production build成功
- 新規依存は原則追加しない
- `npm audit --offline`で既知脆弱性0件
- React非依存
- `window`直接依存なし
- 入力Mutationなし
- 二重適用なし
- 古いSessionによる上書きなし
- 壊れた保存値の自動上書きなし
- Step 0〜3の公開契約を必要以上に変更しない

---

## 30. 完了報告

完了後、次を報告する。

1. 開始commitと事前検証結果
2. 作成・変更ファイル一覧
3. Knowledge revision
4. Review Session base revision
5. Review Application Record
6. apply service処理順
7. 二重適用防止
8. revision競合
9. Atomicity
10. Storage Snapshot Schema更新
11. Persisted Envelope
12. migration boundary
13. Local Storage互換interface
14. Local Storage Adapter
15. Application初期化service
16. Import Service更新
17. Memory Adapter更新
18. typed error一覧
19. ADR一覧
20. 追加テスト件数と総テスト件数
21. typecheck／lint／build／audit結果
22. 仕様上判断した点
23. Step 5への持ち越し
24. `git status`
25. 凍結資料を変更していないこと

Step 5以降には着手しない。

---

## 31. 完了条件

次をすべて満たした場合にStep 4完了とする。

1. 完了Review Sessionを正本Knowledgeへ反映できる。
2. 未完了Sessionを拒否できる。
3. 同一Sessionを二重反映しない。
4. 二重反映時にsave、Clock、revision更新を行わない。
5. Knowledge revisionで古いSessionの上書きを防止できる。
6. Application Recordを保存できる。
7. Import時にbaseKnowledgeRevisionを記録できる。
8. Memory AdapterとLocal Storage Adapterが同じ契約を満たす。
9. version付きEnvelopeを保存・読込できる。
10. 未対応versionを拒否できる。
11. 壊れた保存値を自動初期化しない。
12. 起動時にStorage Snapshotを読み込める。
13. 失敗時に部分保存しない。
14. Step 3までの全テストを含む全テストが成功する。
15. typecheck、lint、buildが成功する。
16. Project Astra Fixtureを生成しない。
17. Project Astra、Context Bundle、上位仕様を変更しない。
