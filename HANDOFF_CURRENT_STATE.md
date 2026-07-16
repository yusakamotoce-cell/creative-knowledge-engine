# Current State Handoff

**更新日:** 2026-07-16（Asia/Tokyo）  
**対象作業:** Creative Knowledge Engine / Context Bundle 設計レビュー  
**現在の作業パス:** `C:\Users\tc120\Downloads\my-knowledge-base\my-knowledge-base`

## 1. プロジェクトの目的

Creative Knowledge Engineに登録されたKnowledgeから、特定のAI作業に必要な範囲だけを決定的に抽出する読み取り専用の派生データ、`Context Bundle`を設計する。

Context Bundleは次の契約と分離する。

- Knowledge Base Export：Knowledge全体のバックアップ、復元、移行
- Context Bundle：登録済みKnowledgeからAIへ渡す選択済み・削減済みの入力
- Candidate Bundle：AIからアプリケーションへ返すcreate候補

Context Bundle生成によって、既存のEntity、Relationship、AttributeRecord、SourceRef、Candidate Review、Knowledge Base Exportの契約やBuild Week完成条件を変更しない。

注意：現在開かれているフォルダ自体は、`AGENTS.md`上では個人ナレッジベースである。Creative Knowledge EngineのTypeScript実装リポジトリは、このフォルダ内では確認できていない。

## 2. 現在までに完了した実装

Context Bundleのコード実装は開始していない。今回の依頼範囲も設計資料の作成までであり、コード変更は禁止されていた。

完了しているのは次の調査・設計作業である。

- Context Bundle仕様とBuild Week契約の照合
- Entity、Relationship、AttributeRecord、SourceRefの文書上の型契約確認
- Candidate BundleおよびKnowledge Base Exportとの責務境界整理
- 決定的生成、文字数削減、Conflict保持、Endpoint Closureの問題点抽出
- Project Astra Fixtureと例示Context Bundleの差分確認
- SourceRef ID、文字数、bundle digestの検算
- 次の3資料の完成稿作成（会話上のみ。ファイルとしては未保存）
  - `CONTEXT_BUNDLE_REVIEW.md`
  - `CONTEXT_BUNDLE_IMPLEMENTATION_PLAN.md`
  - `CONTEXT_BUNDLE_TEST_MATRIX.md`

検算結果：

- 例示JSONに含まれる3件のSourceRef IDは、仕様記載の連結値をUTF-8でSHA-256化した結果と一致した。
- `actualCharacters: 4076` は、`integrity.bundleSha256`を空文字にした圧縮JSONのUnicode code point数と一致した。
- 例示の`bundleSha256`は通常の入力順による`JSON.stringify`とは一致せず、全object keyを再帰的に昇順化したcanonical JSONのSHA-256と一致した。

## 3. 未完了の作業

- `CONTEXT_BUNDLE_REVIEW.md`のリポジトリ保存
- `CONTEXT_BUNDLE_IMPLEMENTATION_PLAN.md`のリポジトリ保存
- `CONTEXT_BUNDLE_TEST_MATRIX.md`のリポジトリ保存
- 実際のCreative Knowledge Engineソースコードとの再照合
- Context Bundle仕様のP0矛盾修正
- 公式Project Astra最終Knowledgeに基づくContext Bundle Fixture作成
- number `17`とstring `"17"`を扱うsynthetic fixtureの分離
- Context Bundle純関数と自動テストの実装

コード実装へ進む場合の想定ディレクトリは次のとおり。

```text
src/core/context/
  buildContextBundle.ts
  requestSchema.ts
  traverseContextGraph.ts
  buildContextEntities.ts
  buildSourceIndex.ts
  reduceContextToBudget.ts
  canonicalizeContextBundle.ts
  hashContextBundle.ts
  renderContextMarkdown.ts
  types.ts
  errors.ts
  index.ts
```

ただし、現在のフォルダには`src/`も`package.json`も存在しないため、ここへ実装を追加してはならない。先に正しい実装リポジトリを特定する必要がある。

## 4. 重要な仕様判断

### 維持する既存契約

- EntityTypeは`character`、`scene`、`location`、`item`、`organization`の5種類のみ。
- TagはEntityの`string[]`であり、独立Entityにしない。
- Relationshipは方向を維持する。A→BとB→Aは別Relationship。
- AttributeRecordは`canonicalValue`、全`claims`、`conflictResolvedAt`を保持する。
- numberの`17`とstringの`"17"`を同値扱いしない。
- AIは正式ID、merge先ID、canonicalValueの最終判断を行わない。
- AI返答をKnowledgeへ直接適用しない。構造化して戻す場合もCandidate Reviewを通す。
- Context BundleはKnowledge StoreへImportしない。

### 実装前に解決すべきP0項目

1. `sourceMode: "none"`では参照IDを出さない一方、`ContextAttributeClaim.sourceRefId`が必須になっている。`none`ではoptionalにする条件付きSchemaが必要。
2. aliases、tags、updatedAtをBudgetで削除できる一方、`ContextFullEntity`では必須である。省略可能フィールドをoptionalにし、省略理由をdiagnosticsへ記録する必要がある。
3. resolved/unresolved Conflictは全claim保持とされる一方、解決済みclaimが削減対象にもなっている。Conflict属性は原子的に保持する。
4. SourceRef IDは、切り詰め前のraw `documentId + NUL + fileName + NUL + excerpt`から生成し、その後にsourceMode適用とexcerpt切り詰めを行う。
5. `sourceSnapshotSha256`は日時とBundle IDを除く選択済みraw Knowledgeとrequestのdigest、`bundleSha256`は最終Bundleインスタンスのdigestとして役割を分ける。
6. canonical JSONは全object keyを再帰的に決定順へ並べ、arrayは契約順を維持する。`localeCompare`や保存時の挿入順へ依存しない。
7. 例示JSONは公式Project AstraとEntity名、正式ID、Conflict値が一致しないため、公式Fixtureとして使用しない。

### Budgetで意味を欠落させないための判断

- Root Entityは省略またはStub化しない。
- Rootのdescription、canonicalValue、conflictState、resolved/unresolvedの全claimを部分削除しない。
- Neighbor Full Entityが収まらなければEntity全体をStub化する。
- Relationshipの端点、方向、relationType、descriptionは意味的な原子単位とし、部分削除しない。
- Stubも収まらない場合はRelationship全体を省略し、diagnosticsへ記録する。
- 複数Rootの必須情報が収まらない場合、Rootを選別せず`ROOT_CONTENT_EXCEEDS_BUDGET`とする。

### Build Weekの範囲

Context Bundleは現行Build Weekの必須完成条件へ追加しない。Candidate Review、Project Astra、Demo Mode、Knowledge Base Exportが完成した後のstretch scopeとして、純関数とテストだけを追加できる。

UI、AI送信、Draft保存、Candidate再投入、tokenizer、Project自動選択、深さ3以上の探索はBuild Week後へ延期する。

## 5. 変更した主要ファイル

今回の作業でコードファイルは変更していない。

作成したファイル：

- `HANDOFF_CURRENT_STATE.md` — 本引き継ぎ資料

確認した既存ファイル：

- `PROJECT_ASTRA_v0.1.md`
- `AGENTS.md`
- `CLAUDE.md`

次の3資料は会話上の完成稿のみで、現在のリポジトリには存在しない。

- `CONTEXT_BUNDLE_REVIEW.md`
- `CONTEXT_BUNDLE_IMPLEMENTATION_PLAN.md`
- `CONTEXT_BUNDLE_TEST_MATRIX.md`

## 6. テストの実行方法と直近の結果

### 現在のリポジトリ

`package.json`、`src/`、Vitest設定、テストスクリプトが存在しないため、実行可能なアプリケーションテストはない。

したがって、現時点で有効な`npm test`等のコマンドは定義されていない。

### 実施済みの静的検算

Node.jsで例示JSONを読み、次を確認した。

```text
SourceRef hash 3件: すべて一致
actualCharacters: claimed 4076 / computed 4076
bundleSha256: recursive canonical key sort時に一致
```

通常の入力順`JSON.stringify`で計算したdigestは例示値と一致しなかった。この結果は、canonical serializerのkey順を仕様として固定する必要があることを示す。

### 正しい実装リポジトリで最初に行うこと

1. `package.json`のscriptsを確認する。
2. 既存のtypecheck、test、lintを変更前に実行する。
3. 実行コマンドと件数を本資料へ追記する。
4. Context Bundle追加後に同じ全テストを再実行する。

`CODEX_STEP_0-1.md`上はTypeScript、Zod、Vitest、React Testing Libraryを使用する想定だが、実際のscript名は未確認である。

## 7. 既知の問題

1. 現在開かれているフォルダがCreative Knowledge Engineの実装リポジトリではない可能性が高い。
2. `.git`ディレクトリは存在するが中身が空で、Gitリポジトリとして認識されない。
3. Context Bundleレビュー成果物3件がまだファイル保存されていない。
4. 主要仕様書がリポジトリ外の`C:\Users\tc120\Downloads\`に置かれている。フォルダ移動後も参照できるか確認が必要。
5. 例示Context Bundleは公式Project Astra Fixtureと一致しない。
6. `sourceMode: none`とConflict claimの型が矛盾している。
7. Budget削減後のFull EntityがSchemaに適合しない可能性がある。
8. Conflict claimおよびRelationship descriptionを削減すると意味が欠落する条件が未固定だった。
9. source snapshot digestとfinal bundle digestの決定性が混同されている。
10. `actualCharacters`は自身の桁数とdiagnostics追加による文字数変化を考慮した固定点計算が必要。
11. 現仕様の`actualCharacters`は空にした64文字のbundle hashを測定対象外とするため、最終JSONは表示値より最大64文字長くなる。

## 8. 次に行うべき作業

優先順：

1. 移動後のCodexプロジェクトで、現在地が実際のCreative Knowledge Engineリポジトリか確認する。
2. `package.json`、`src/core`、既存型、Zod Schema、テストを特定する。
3. この引き継ぎと外部仕様書を読み、現行コードと文書契約のどちらが新しいか確認する。
4. 会話上で作成済みの3資料をファイル化する。
5. P0項目7件を仕様へ反映する。コード変更はその後に行う。
6. official Project Astra Context Fixtureとsynthetic fixtureを分離する。
7. Candidate Reviewと既存Project Astraのテストが成功することを確認する。
8. Build Weekに余裕がある場合だけ、Context Bundleの型、Schema、探索、投影、Budget、canonical JSON、hashの順で純関数を実装する。
9. Context Bundle追加後もCandidate BundleとKnowledge Base Exportのsnapshotが変化しないことを回帰テストする。

## 9. 参照すべき仕様書

リポジトリ内：

- `PROJECT_ASTRA_v0.1.md`
- `AGENTS.md`
- `CLAUDE.md`

リポジトリ外：

- `C:\Users\tc120\Downloads\CODEX_CONTEXT_BUNDLE_DESIGN_HANDOFF.md`
- `C:\Users\tc120\Downloads\COS_CONTEXT_BUNDLE_SPEC_v0.1.md`
- `C:\Users\tc120\Downloads\context-bundle-project-astra-example.json`
- `C:\Users\tc120\Downloads\CODEX_STEP_0-1.md`
- `C:\Users\tc120\Downloads\BUILD_WEEK_SPEC_v0.3.md`
- `C:\Users\tc120\Downloads\BUILD_WEEK_SPEC_v0.3_ADDENDUM.md`
- `C:\Users\tc120\Downloads\PROJECT_KICKOFF_v1.0.md`

別フォルダや別環境へ移す場合、外部仕様書も新しいプロジェクトから参照可能な場所へコピーすることを推奨する。コピーする場合も元資料を変更しない。

## 10. 現在のgit status

現在のパスで次を実行した。

```text
git rev-parse --show-toplevel
git status --short
```

結果：

```text
fatal: not a git repository (or any of the parent directories): .git
```

ルート直下には`.git`という空ディレクトリが存在するが、`HEAD`、`config`、objects等のGit管理情報が存在しない。このため、現在の変更差分、branch、commit hashは取得できない。

本ファイル作成後も、Gitリポジトリが正常化されるまでは`git status`で変更を追跡できない。
