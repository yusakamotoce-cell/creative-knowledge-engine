# Codex実装指示
## Creative Knowledge Engine Step 3
### Storage境界、Import文書管理、再Import冪等性、Extraction Adapter
### v1.0

- **Status:** Ready for implementation
- **前提:** Step 2完了、Git commit `040c651`
- **対象リポジトリ:** `C:\Users\tc120\projects\creative-knowledge-engine`
- **実装範囲:** ドメイン／アプリケーションサービス、Memory Adapter、自動テスト
- **実装対象外:** UI、localStorage本実装、IndexedDB、Project Astra Fixture本データ、Search、Insights、Graph、Live AI、Context Bundle

---

## 0. 目的

Step 2までに完成したCandidate Reviewドメインを、保存先や抽出手段へ直接依存させずに利用できるよう、次の境界を実装する。

```text
Import Source
↓
Imported Document
↓
Content SHA-256
↓
Import Registryによる再Import判定
↓
Extraction Adapter
↓
Candidate Bundle
↓
Review Session作成
↓
Knowledge / Review Session保存
```

Step 3終了時点で、UIやブラウザー永続化がなくても、次を自動テストから実行できることを完成条件とする。

1. plain text／Markdown／JSON／貼り付けテキストをImported Documentとして受理する
2. 文書内容からSecure Hash Algorithm 256-bit（SHA-256）を計算する
3. 同一内容の再Importを検出し、抽出を再実行しない
4. Extraction Adapterを差し替え可能にする
5. Candidate BundleをSchema検証後にReview Sessionへ渡す
6. Knowledge、Review Session、Import RegistryをStorage Adapter越しに保存・読込する
7. Memory Adapterだけで一連の流れを再現する

---

## 1. 参照資料と優先順位

次を確認する。

- `PROJECT_KICKOFF_v1.0.md`
- `BUILD_WEEK_SPEC_v0.3.md`
- `BUILD_WEEK_SPEC_v0.3_ADDENDUM.md`
- `CODEX_STEP_0-1.md`
- `CODEX_STEP_2.md`
- `PROJECT_ASTRA_v1.0.md`
- `PROJECT_ASTRA_POST_FREEZE_VERIFICATION.md`
- `notes/reviews/STEP_0-1_IMPLEMENTATION_DECISIONS.md`
- `notes/reviews/STEP_2_IMPLEMENTATION_DECISIONS.md`

競合時の優先順位：

1. `BUILD_WEEK_SPEC_v0.3_ADDENDUM.md`
2. `BUILD_WEEK_SPEC_v0.3.md`
3. `PROJECT_KICKOFF_v1.0.md`
4. `CODEX_STEP_0-1.md`
5. `CODEX_STEP_2.md`
6. 本Step 3指示書

本指示書は上位仕様を変更しない。

---

## 2. 作業開始前の確認

コード変更前に次を実行する。

```powershell
git status
git log -2 --oneline
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

期待基準：

- 作業ツリーclean
- HEADが`040c651 Complete Creative Knowledge Engine Step 2`
- 既存154テスト成功
- typecheck、lint、build成功

満たさない場合は実装を開始せず報告する。

---

## 3. 今回実装する範囲

### 3.1 Import文書モデル

- plain text
- Markdown
- JSON
- pasted text
- 文書内容
- fileName
- media type
- source kind
- document ID
- content SHA-256
- importedAt

### 3.2 Import Registry

- 文書hashの登録
- 同一内容の再Import検出
- 処理済み文書情報の取得
- 強制再解析は実装しない
- ファイル名が異なっても内容が同一なら同一文書として扱う

### 3.3 Extraction Adapter

- Adapter interface
- Fixture／Stub Adapter
- Candidate Bundle Schema検証
- Adapterが返した不正データの拒否
- Adapter errorのtyped error化
- Live AI Adapterは実装しない

### 3.4 Storage Adapter

- Knowledge State
- Review Session
- Import Registry
- Imported Document metadata
- Memory Adapter
- immutableな保存／読込
- 不正保存データの拒否
- browser storageは実装しない

### 3.5 Import Service

- Imported Document作成
- hash計算
- 再Import判定
- Extraction Adapter呼出
- Candidate Bundle検証
- Review Session作成
- 保存
- 一連のtyped result

### 3.6 文書とテスト

- Architecture Decision Record（設計判断記録、ADR）
- README更新
- 実装判断記録
- 自動テスト

---

## 4. 今回実装しない範囲

- Import UI
- Drag and Drop
- ファイル選択Dialog
- localStorage Adapter
- IndexedDB Adapter
- JSON Export
- Candidate Review UI
- Project Astraの4入力文書
- Project Astra Candidate Bundle
- Project Astra expected JSON
- Search
- Knowledge Insights
- Graph
- Live AI
- サーバーレス関数
- Context Bundle
- Step 4以降
- 強制再解析
- ソース全文検索
- PDF、Word、画像、音声

Project Astra Fixture本データは、post-freeze R-2が解消されるまで生成しない。

---

## 5. 推奨ディレクトリ構成

```text
src/core/
  import/
    importedDocument.ts
    importRegistry.ts
    importService.ts
    extractionAdapter.ts
    fixtureExtractionAdapter.ts
    errors.ts
    types.ts
    index.ts
  storage/
    storageAdapter.ts
    memoryStorageAdapter.ts
    storageSchemas.ts
    errors.ts
    index.ts
  shared/
    sha256.ts
```

現行構成との整合に応じて調整してよい。ただし以下を守る。

- Reactへ依存しない
- browser APIへ直接依存しない
- Storage AdapterとImport Serviceを分離する
- Step 0–1／Step 2の型とSchemaを再利用する
- 同じSchemaや正規化を複製しない
- 公開面は各`index.ts`に限定する

---

## 6. Imported Document

次に相当する型とstrict Schemaを実装する。

```ts
type ImportSourceKind =
  | "file"
  | "pasted_text";

type ImportFormat =
  | "plain_text"
  | "markdown"
  | "json";

interface ImportedDocument {
  id: string;
  sourceKind: ImportSourceKind;
  format: ImportFormat;
  fileName: string;
  mediaType: string;
  content: string;
  contentSha256: string;
  importedAt: string;
}
```

### 規則

- `id`はアプリケーション側で発行する。
- `content`は原文を変更せず保存する。
- `content`は空文字を拒否する。
- `fileName`はtrim後に非空。
- pasted textの場合もfileNameを必須とし、呼出側が明示する。
- `contentSha256`は小文字64桁hex。
- `importedAt`はISO 8601形式。
- unknown fieldを拒否する。
- Import時にNFKC、trim、改行変換、JSON整形などを行わない。
- hash対象はJavaScript stringをUTF-8へ符号化した**contentそのもの**。
- BOM（Byte Order Mark、バイト順マーク）や改行コード差も内容差として扱う。

---

## 7. formatとmediaType

最低限、次を受理する。

| format | mediaType例 |
|---|---|
| `plain_text` | `text/plain` |
| `markdown` | `text/markdown` |
| `json` | `application/json` |

### 検証

- `json`はcontentが有効なJSONであることをImport前に確認する。
- JSONの意味的正規化は行わない。
- key順や空白が異なればcontent hashも異なる。
- plain text／Markdownでは構文検証を行わない。
- file extensionだけからformatを自動推測する関数は作ってよいが、Import Serviceの正規契約は明示formatを受け取る。

---

## 8. SHA-256

次に相当するinterfaceを定義する。

```ts
interface Sha256Hasher {
  hashUtf8(value: string): Promise<string>;
}
```

### 実装

- browser／test双方で利用可能な実装を用意する。
- Web Cryptoを利用する場合も依存注入可能にする。
- test用Known Vector Hasherまたは固定Hasherを用意してよい。
- 出力は小文字64桁hex。
- 同じ入力は同じhash。
- content以外のfileName、format、mediaType、日時をhashへ含めない。
- Node専用APIをドメインコードへ直接埋め込まない。

### known vector

最低限次をテストする。

```text
SHA-256("")
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

SHA-256("abc")
ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
```

Imported Documentは空contentを拒否するが、Hasher自体は空文字を計算できる。

---

## 9. Import Registry

次に相当する型を定義する。

```ts
interface ImportRegistryEntry {
  contentSha256: string;
  documentId: string;
  firstImportedAt: string;
}

interface ImportRegistry {
  entries: ImportRegistryEntry[];
}
```

### 規則

- `contentSha256`を一意keyとする。
- 同一hashに複数documentIdを登録しない。
- 最初のdocumentIdとfirstImportedAtを維持する。
- 配列順は初回登録順を維持する。
- 同一内容を別fileNameでImportしても既存entryを返す。
- hash collisionをアプリケーション側で推測・解決しない。
- 強制再解析は実装しない。

次に相当する純関数を実装する。

```ts
findImportRegistryEntry(
  registry: ImportRegistry,
  contentSha256: string
): ImportRegistryEntry | null

registerImportedDocument(
  registry: ImportRegistry,
  document: ImportedDocument
): ImportRegistry
```

重複登録時は既存Registryを内容同一で返してよいが、入力objectは変更しない。

---

## 10. Extraction Adapter

次に相当するinterfaceを実装する。

```ts
interface ExtractionAdapter {
  extract(document: ImportedDocument): Promise<unknown>;
}
```

Adapter戻り値を`unknown`とするのは、外部境界でZod検証を必須にするためである。

### Import Service側の責務

- `CandidateBundleSchema.parse()`を必ず通す。
- `schemaVersion`、documentId、Candidate型、unknown fieldを検証する。
- Bundleの`documentId`はImported Documentの`id`と一致必須。
- 不一致は`EXTRACTION_DOCUMENT_ID_MISMATCH`。
- 不正Bundleは`INVALID_CANDIDATE_BUNDLE`。
- Adapter例外は`EXTRACTION_FAILED`へ変換し、元errorをcauseとして保持してよい。
- Adapterの出力を自動修復しない。
- confidence、action、正式ID、merge先IDを補完・除去しない。

---

## 11. Fixture Extraction Adapter

本StepではProject Astra本データを作らず、汎用Fixture Adapterだけを実装する。

```ts
interface FixtureExtractionEntry {
  contentSha256: string;
  candidateBundle: CandidateBundle;
}

class FixtureExtractionAdapter implements ExtractionAdapter {
  // contentSha256で固定Bundleを返す
}
```

### 規則

- constructorでentry配列を受け取る。
- 同一hashの重複entryを拒否する。
- 未登録hashは`FIXTURE_NOT_FOUND`。
- 返却時に内部objectを共有しない。
- Import ServiceのSchema検証を省略しない。
- Project Astra Fixtureは登録しない。
- テストでは最小のsynthetic Candidate Bundleを使用する。

---

## 12. Storage Adapter

次に相当するinterfaceを実装する。

```ts
interface StorageSnapshot {
  knowledge: KnowledgeState;
  reviewSessions: ReviewSession[];
  importedDocuments: ImportedDocument[];
  importRegistry: ImportRegistry;
}

interface StorageAdapter {
  load(): Promise<StorageSnapshot>;
  save(snapshot: StorageSnapshot): Promise<void>;
}
```

### 初期状態

```ts
{
  knowledge: {
    entities: [],
    relationships: []
  },
  reviewSessions: [],
  importedDocuments: [],
  importRegistry: {
    entries: []
  }
}
```

### 規則

- loadは呼出側が変更しても内部状態が変わらない複製を返す。
- saveは入力snapshotを内部参照として保持しない。
- save前にstrict Schemaで全体を検証する。
- 不正snapshotを自動修復しない。
- Entity／Relationship／Candidate Reviewの既存Schemaを再利用する。
- importedDocumentsのID重複を拒否する。
- reviewSessionsの識別規則を固定する必要があるため、第13章のsession ID契約を採用する。
- RegistryのdocumentIdは必ずimportedDocuments内に存在する。
- Review SessionのdocumentIdは必ずimportedDocuments内に存在する。
- Knowledge内Relationshipのdangling endpointを拒否する。
- Storage schemaVersionは本Stepでは追加しない。将来のExport schemaとは別扱いとする。

---

## 13. Review Session ID

Step 2のReview Sessionには独立IDがないため、永続化用に次を追加する。

```ts
interface ReviewSession {
  id: string;
  schemaVersion: 1;
  documentId: string;
  // 既存field
}
```

### 規則

- `createReviewSession`の引数へ`idGenerator`を追加するか、永続化用wrapperで発行する。
- 推奨は`createReviewSession`へdependencyを追加し、`idGenerator.nextId("review-session")`で発行すること。
- 既存Step 2の公開API変更になるため、すべての既存テストを更新する。
- Review Session IDは正式アプリケーションIDでありCandidate IDではない。
- Storage内で一意。
- documentIdは同一でも複数Sessionを将来保持可能とする。ただし本StepのImport Serviceは同一文書につき最初の1 Sessionだけを作る。

### 互換性

この変更はStep 2の責務を拡張するが、状態遷移規則は変更しない。ADRへ記録する。

---

## 14. Memory Storage Adapter

```ts
class MemoryStorageAdapter implements StorageAdapter
```

### 規則

- constructorで初期snapshotを任意指定可能。
- 未指定時は空snapshot。
- load／saveともdeep clone相当の分離を保証する。
- JSON stringify／parseだけに依存してもよいが、`undefined`等を黙って消す前にSchema検証する。
- 参照共有によるMutationを許さない。
- save回数や最新snapshotをテスト補助として公開しない。必要ならtest専用spy wrapperを使う。

---

## 15. Import Service

次に相当するserviceを実装する。

```ts
interface ImportDocumentInput {
  sourceKind: ImportSourceKind;
  format: ImportFormat;
  fileName: string;
  mediaType: string;
  content: string;
}

type ImportDocumentResult =
  | {
      status: "imported";
      document: ImportedDocument;
      candidateBundle: CandidateBundle;
      reviewSession: ReviewSession;
      snapshot: StorageSnapshot;
    }
  | {
      status: "already_imported";
      existingDocument: ImportedDocument;
      existingReviewSession: ReviewSession | null;
      snapshot: StorageSnapshot;
    };

async function importDocument(
  input: ImportDocumentInput,
  dependencies: {
    storage: StorageAdapter;
    extractionAdapter: ExtractionAdapter;
    hasher: Sha256Hasher;
    idGenerator: IdGenerator;
    clock: Clock;
  }
): Promise<ImportDocumentResult>
```

### 正常Import処理順

1. inputをstrict Schemaで検証
2. JSON formatならcontent構文検証
3. content SHA-256計算
4. Storage load
5. Import Registry検索
6. 未登録ならdocument IDを`idGenerator.nextId("document")`で発行
7. `clock.now()`を1回取得してimportedAtへ使用
8. Imported Document作成
9. Extraction Adapter呼出
10. Candidate Bundle Schema検証
11. documentId一致検証
12. Review Session IDを発行
13. 空でない現行KnowledgeからReview Session作成
14. Imported Document追加
15. Registry登録
16. Review Session追加
17. Storage saveを1回だけ実行
18. `imported` resultを返す

### 再Import処理

Registryにhashが存在する場合：

- Extraction Adapterを呼ばない
- IDを発行しない
- Clockを呼ばない
- Storage saveを行わない
- 既存Imported Documentを返す
- 同じdocumentIdのReview Sessionがあれば返す
- `already_imported` result

同一hashに対応するdocumentがStorageから欠落している場合は自動修復せず`IMPORT_REGISTRY_DANGLING_DOCUMENT`。

### Atomicity

Extraction、Schema検証、Review Session作成のいずれかが失敗した場合：

- Imported Documentを保存しない
- Registryを更新しない
- Review Sessionを保存しない
- Storage saveを呼ばない

Memory Adapter上でこれをテストする。

---

## 16. Knowledgeの扱い

Import ServiceはStorage Snapshot内の現在KnowledgeをReview Session初期値として使う。

- Import時点ではKnowledgeを変更しない。
- Candidate Review完了後のKnowledge反映serviceは本Step対象外。
- Review Session内部のKnowledgeはStep 2契約に従う。
- 永続Storageの正本KnowledgeとReview Session内の作業中Knowledgeの関係はStep 4で接続する。
- 本StepではImport直後のReview SessionはEntity phase、未処理状態。

この境界をADRへ記録する。

---

## 17. Storage検証

最低限次を拒否する。

- unknown field
- duplicate Imported Document ID
- duplicate Review Session ID
- duplicate Registry hash
- Registryのdangling documentId
- Review Sessionのdangling documentId
- Knowledgeのduplicate Entity ID
- Knowledgeのduplicate Relationship ID
- Knowledge Relationshipのdangling endpoint
- 不正Imported Document hash
- 不正Review Session
- 不正Candidate Bundle由来のdata

Storage Adapterは修復処理を行わない。

---

## 18. typed error

最低限次を定義する。

```text
INVALID_IMPORT_INPUT
EMPTY_DOCUMENT_CONTENT
INVALID_JSON_DOCUMENT
INVALID_IMPORTED_DOCUMENT
INVALID_STORAGE_SNAPSHOT
DUPLICATE_IMPORTED_DOCUMENT_ID
DUPLICATE_REVIEW_SESSION_ID
DUPLICATE_IMPORT_HASH
IMPORT_REGISTRY_DANGLING_DOCUMENT
REVIEW_SESSION_DANGLING_DOCUMENT
EXTRACTION_FAILED
INVALID_CANDIDATE_BUNDLE
EXTRACTION_DOCUMENT_ID_MISMATCH
FIXTURE_NOT_FOUND
DUPLICATE_FIXTURE_HASH
STORAGE_LOAD_FAILED
STORAGE_SAVE_FAILED
```

既存error codeと重複させない。messageではなくcodeで判定する。

Storage Adapterの任意errorはImport Service境界で`STORAGE_LOAD_FAILED`／`STORAGE_SAVE_FAILED`に変換してよい。

---

## 19. 決定性とMutation禁止

### 決定性

- Imported Documentは注入したID、Clock、Hasherだけに依存。
- Registry順は初回Import順。
- Storage配列順は既存順を維持し、新規要素を末尾へ追加。
- Fixture Adapterはhash完全一致のみ。
- 同じ初期snapshotと依存列から同じ結果を得る。

### Mutation禁止

次をテストする。

- Import inputを変更しない
- Storage load resultを直接変更しない
- Candidate Bundle fixtureを変更しない
- Memory Adapterへ保存後に外部objectを変更しても内部状態が変わらない
- load結果を変更しても内部状態が変わらない
- Import Registry入力を変更しない
- 失敗時に部分保存しない

---

## 20. 必須自動テスト

既存154件を維持し、最低限次を追加する。

### Imported Document

- 正常なplain text
- 正常なMarkdown
- 正常なJSON
- pasted text
- 空content拒否
- 空fileName拒否
- unknown field拒否
- hash形式検証
- importedAt検証
- 原文を変更しない

### SHA-256

- empty known vector
- `abc` known vector
- 日本語UTF-8
- 改行差でhashが変わる
- fileName差はhashへ影響しない
- 同一入力の決定性

### Import Registry

- 新規登録
- hash検索
- 同一hashの再登録で増えない
- 最初のdocument ID維持
- 順序維持
- Mutationなし

### Extraction Adapter

- 正常Bundle
- unknown fieldを含むBundle拒否
- documentId不一致
- Adapter例外変換
- confidence/action/正式IDを含む不正Bundle拒否
- Fixture未登録hash
- Fixture hash重複拒否
- Fixture返却参照非共有

### Review Session ID

- 作成時ID発行
- ID不足error
- 既存Step 2状態遷移が不変
- Review Session SchemaでID必須
- Storage内重複拒否

### Storage Snapshot

- 空snapshot
- 正常保存／読込
- duplicate document ID拒否
- duplicate session ID拒否
- duplicate registry hash拒否
- registry dangling document拒否
- session dangling document拒否
- Knowledge dangling Relationship拒否
- unknown field拒否
- Mutation隔離

### Import Service正常系

- plain text Import
- Markdown Import
- JSON Import
- document ID即時発行
- review-session ID即時発行
- clock 1回
- extraction 1回
- Storage save 1回
- Registry登録
- Review Session保存
- 現在KnowledgeをSessionへ渡す
- Candidate Bundle documentId一致
- 入力Mutationなし

### 再Import

- 同一contentでalready_imported
- fileName違いでもalready_imported
- format違いでもcontent同一ならalready_imported
- extraction未呼出
- ID未発行
- clock未呼出
- save未呼出
- 既存documentを返す
- 既存Sessionを返す
- dangling registryをerror

### Atomicity

- extraction失敗で未保存
- invalid Bundleで未保存
- documentId不一致で未保存
- review session作成失敗で未保存
- save失敗をtyped error化
- load失敗をtyped error化

### 回帰

- 既存154テスト成功
- Step 2 Review Session phase規則不変
- Candidate Bundle Schema不変
- Entity／Relationship Schema不変
- Project Astra凍結資料非変更
- Context Bundle資料非変更

---

## 21. ADR

最低限、次を追加する。

- ADR-013: Import idempotency is keyed by raw content SHA-256
- ADR-014: Extraction adapters return untrusted unknown data
- ADR-015: Storage is accessed only through an adapter
- ADR-016: Imported documents and review sessions are stored before UI integration
- ADR-017: Review sessions receive first-class persistent IDs

各ADRに以下を含める。

- Status
- Context
- Decision
- Consequences

---

## 22. READMEと判断記録

READMEへ次を追記する。

- Step 3で実装済みの範囲
- Memory Storageのみであること
- localStorage／IndexedDBは未実装
- raw content SHA-256で再Importを防ぐこと
- Extraction Adapter出力を必ずSchema検証すること
- Import時点ではKnowledgeを変更しないこと
- Project Astra Fixtureは未生成

次を作成する。

```text
notes/reviews/STEP_3_IMPLEMENTATION_DECISIONS.md
```

最低限記録する。

- 開始commit
- hash対象がraw contentだけであること
- BOM／改行差の扱い
- Registryの一意key
- Review Session ID追加によるStep 2 API変更
- Extraction Adapterをunknown境界とした理由
- Import atomicity
- 再Import時にExtraction／save／ID／Clockを呼ばないこと
- KnowledgeとReview Session内Knowledgeの関係
- localStorageを後続へ延期したこと
- Search正規化未決定
- Project Astra post-freeze R-2未解消のためFixture生成を延期したこと

---

## 23. 品質条件

- TypeScript型エラーなし
- 全テスト成功
- ESLint警告・エラーなし
- Production build成功
- 新規依存は原則追加しない
- `npm audit --offline`で既知脆弱性0件
- React非依存
- browser storage非依存
- 入力Mutationなし
- 失敗時の部分保存なし
- 実行結果が依存注入以外で変動しない
- Step 0–1／Step 2公開契約を必要以上に変更しない

---

## 24. 完了報告

完了後、次を報告する。

1. 開始commitと事前検証結果
2. 作成・変更ファイル一覧
3. Imported Document契約
4. SHA-256実装
5. Import Registry
6. Extraction Adapter
7. Fixture Extraction Adapter
8. Storage Adapter
9. Memory Storage Adapter
10. Review Session ID追加
11. Import Service処理順
12. 再Import冪等性
13. Atomicity
14. typed error一覧
15. ADR一覧
16. 追加テスト件数と総テスト件数
17. typecheck／lint／build／audit結果
18. 仕様上判断した点
19. Step 4への持ち越し
20. `git status`
21. 凍結資料を変更していないこと

Step 4以降には着手しない。

---

## 25. 完了条件

次をすべて満たした場合にStep 3完了とする。

1. 4種類のImport入力をImported Documentへ変換できる。
2. raw contentのSHA-256を決定的に生成できる。
3. 同一内容の再Importを検出できる。
4. 再Import時にExtraction、ID、Clock、saveを呼ばない。
5. Extraction Adapterの出力をuntrusted dataとしてSchema検証する。
6. Candidate BundleのdocumentId不一致を拒否する。
7. ImportからReview Session作成まで一連で実行できる。
8. Knowledge、Review Session、Document、RegistryをStorage Adapter越しに保存できる。
9. Memory Adapterで参照共有が起きない。
10. 失敗時に部分保存しない。
11. Review Sessionへ永続IDが追加される。
12. 既存154テストを含む全テストが成功する。
13. typecheck、lint、buildが成功する。
14. Project Astra Fixtureを生成しない。
15. Project Astra、Context Bundle、上位仕様を変更しない。
