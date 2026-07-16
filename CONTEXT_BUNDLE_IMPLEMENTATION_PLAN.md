# Context Bundle 実装計画

**Status:** 計画のみ  
**前提:** `CONTEXT_BUNDLE_REVIEW.md`のP0契約確定後に着手する  
**現状:** コード、`package.json`、`src/`、テスト環境は未存在。今回は実装しない。

## 1. 実装方針

Context Bundleは、登録済みKnowledge snapshotを入力し、外部状態を書き換えずにJSONと表示用Markdownを返す独立機能として実装する。Storage、React、Candidate Review、Knowledge Base Exportへ依存させない。

既存の`Entity`、`Relationship`、`AttributeRecord`、`SourceRef`、`ScalarValue`と正規化関数をimportして再利用する。Context用の派生型だけを新設し、既存ドメイン契約を変更しない。

## 2. 着手ゲート

次のすべてが満たされるまでコードを書かない。

1. `sourceMode: none`用のclaim Schemaが決定している。
2. Budgetで省略できるFull Entityフィールドとdiagnostics表現が決定している。
3. resolved/unresolved Conflictの原子性が決定している。
4. raw SourceRefからIDを作る順序が決定している。
5. `sourceSnapshotSha256`と`bundleSha256`の対象が決定している。
6. canonical JSONのkey比較、array順、number制約が決定している。
7. `actualCharacters`の最終長・固定点規則が決定している。
8. Budget reducerの完全な優先順位とRelationship原子性が決定している。
9. 現例示JSONをsynthetic exampleとして扱うことが決定している。
10. 実装コードが置かれた時点で、既存型、正規化関数、Storage境界、test scriptを実物確認している。

## 3. 提案ディレクトリ

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

`buildContextBundle.ts`、`errors.ts`、`index.ts`は全体の責務と公開面を明確にするための追加提案である。Context配下に既存ドメイン型や正規化処理を複製しない。

## 4. モジュール責務

### `types.ts`

- Context専用のRequest、Bundle、Full/Stub Entity、Attribute、Relationship、SourceRef、Warning、diagnostics型を定義する。
- 既存`EntityType`と`ScalarValue`を再利用する。
- inputは`Readonly`として扱い、Mutationを禁止する。
- `sourceMode`ごとのclaim/source表現を判別可能なunionにする。
- Budgetで省略可能と確定したfieldだけをoptionalにする。

### `requestSchema.ts`

- Zodのstrict Schemaで未知fieldを拒否する。
- Root 1件以上、depth 0〜2、既知preset/direction/sourceMode、正の整数上限を検証する。
- `rootEntityIds`は正確なIDで重複排除し、最初の出現順を保持する。
- 登録済みEntity IDの存在確認はSchema構文検証と分離し、build入口で行う。
- Candidate、Reject、Review中、blocked Relationshipを入力対象にしない。

### `traverseContextGraph.ts`

- 登録済みEntity/Relationshipの読み取り専用snapshotだけを入力にする。
- Root順を起点に決定的なBFSを行う。
- `incoming`、`outgoing`、`both`を探索時だけ適用し、出力方向は変更しない。
- depth 0では両端がRootのRelationshipだけを対象にする。
- cycleをvisited setで止め、各Entityの最小距離を保持する。
- Entity ID集合、Relationship ID集合、最小距離、到達元Rootの安定情報を返す。
- Budget、Context型への変換、SourceRef ID生成は行わない。

### `buildContextEntities.ts`

- 既存EntityをContext Full Entityへ投影する。
- AttributeRecordから`empty`、`none`、`resolved`、`unresolved`を決定する。
- `normalizeScalarValue`を使い、number `17`とstring `"17"`を分離する。
- `canonicalValue`を変更しない。
- resolved/unresolvedは全claimを原子的に保持する。
- attribute keyとclaimを決定順へ並べる。
- Stubは`id`、`entityType`、`name`、`detailLevel`だけから構築する。

### `buildSourceIndex.ts`

- raw SourceRef tripleからSHA-256 IDを作る。
- ID生成後に重複排除する。
- `none`、`reference`、`excerpt`を投影する。
- excerptはUnicode code point単位で切り、ellipsisを上限内に含める。
- 切り詰め後もraw IDを維持する。
- 最終出力で参照されるSourceRefだけを残し、dangling refと未参照sourceを許さない。

### `reduceContextToBudget.ts`

- 完全なBundle候補を決定的な段階で削減する。
- Rootを省略・Stub化しない。
- Conflict属性を原子的に扱う。
- Relationship coreを部分切り詰めしない。
- Neighbor Fullを必要に応じてStubへ変更する。
- Stubも入らないRelationshipは両端closureを保ったままRelationship単位で省略する。
- warnings、omitted IDs、`truncated`を固定テンプレートと固定順で生成する。
- `actualCharacters`が安定するまで再計測する。
- Root必須内容が入らない場合は部分Bundleではなくtyped errorを返す。

推奨する削減段階は次のとおり。P0決定時に最終固定する。

1. excerptを`maxExcerptCharacters`へ制限
2. Source excerptを除去またはreferenceへ縮退
3. `conflictState: none`のclaim詳細を省略
4. 省略可能と決定したaliases、tags、updatedAt、安定属性の出典参照を除去
5. 遠いNeighborからFull→Stubへ変更
6. 低優先Relationshipと、そのためだけに必要な非Root端点を省略
7. Root必須情報が収まらなければ`ROOT_CONTENT_EXCEEDS_BUDGET`

各段階内では、Rootからの距離、Root入力順、契約上のRelationship順、Entity順、IDをtie-breakに使う。

### `canonicalizeContextBundle.ts`

- 全object keyを再帰的に決定順へ並べる。
- domain arrayは呼び出し前に契約順へ並べ、canonicalizerは配列順を変更しない。
- 空白なしJSONを生成する。
- locale、object挿入順、Storage配列順へ依存しない。
- `undefined`、非有限number、循環参照を受け付けない。

### `hashContextBundle.ts`

- raw source snapshotとnormalized requestから`sourceSnapshotSha256`を計算する。
- 最終Bundleの`bundleSha256`だけを空文字にして`bundleSha256`を計算する。
- browserとtestで同じUTF-8入力を使う。
- Clock、Bundle ID生成器、必要ならHasherを境界から注入する。
- 同じ論理入力に対するsource snapshot digestと、同じBundleインスタンスに対するbundle digestを固定する。

### `renderContextMarkdown.ts`

- 完成済みContext Bundleだけを入力にする。
- JSONにないKnowledgeを追加・要約・推測しない。
- instructionとKnowledge本文を別見出しにする。
- 未解決Conflict、Root、Neighbor、Relationship、Source、warningsの順を固定する。
- Markdownは表示形式であり、正規データやdigest入力にしない。
- Build WeekではPhase A/B完了後に余裕がある場合だけ実装する。

### `buildContextBundle.ts`

- public orchestrationを担当する。
- 検証、探索、投影、Source index、snapshot digest、Budget、最終文字数、bundle digestの順を制御する。
- 下位関数の責務を重複実装しない。
- Knowledge StoreやUIを直接参照せず、snapshotを引数で受け取る。

### `errors.ts` / `index.ts`

- `ROOT_CONTENT_EXCEEDS_BUDGET`等のtyped errorを公開する。
- 公開APIを`index.ts`に限定し、内部helperを外部依存させない。

## 5. データ処理順

```text
ContextBundleRequest
↓ strict schema validation
↓ registered Root existence validation
↓ deterministic Root de-duplication
Knowledge snapshot
↓ graph traversal (depth / direction / min distance)
↓ Context Entity / Relationship projection
↓ raw SourceRef ID and index construction
↓ normalized request + selected raw Knowledge snapshot digest
↓ deterministic domain sorting
↓ Bundle metadata assembly with injected Clock / Bundle ID
↓ budget reduction and endpoint/source closure
↓ diagnostics finalization
↓ actualCharacters fixed-point calculation
↓ canonical JSON
↓ bundleSha256 calculation
↓ canonical JSON output
└ optional Markdown rendering
```

## 6. 実装フェーズ

### Phase 0: 契約固定

- `CONTEXT_BUNDLE_REVIEW.md`のP0を仕様へ反映する。
- 例示JSONをsynthetic exampleとして明記する。
- official Astra Context Fixtureの作成時期をProject Astra凍結後に置く。
- Contract decisionごとにテスト期待値を先に確定する。

**完了条件:** P0項目に「実装者判断」が残っていない。

### Phase 1: 型、Schema、エラー

- 既存型と正規化関数のimport先を確認する。
- Context型、strict Request Schema、typed errorを作る。
- Root重複排除と登録済みID検証を作る。
- Schema単体テストを通す。

**完了条件:** 無効requestがKnowledge traversalへ到達しない。

### Phase 2: 探索、投影、SourceRef

- depth/direction対応BFSを作る。
- Attribute/Conflict投影を作る。
- raw SourceRef ID、3 sourceMode、dedup、closureを作る。
- official Astra graphとsynthetic fixtureで単体テストを通す。

**完了条件:** Budget前の完全Bundle候補が決定的で、入力を変更しない。

### Phase 3: Budget reducer

- 削減単位と完全な優先順を実装する。
- Full→Stub、Relationship省略、Root失敗を実装する。
- warnings、omitted IDs、`truncated`、Source closureを確定する。
- `actualCharacters`固定点を実装する。

**完了条件:** 成功時は常に上限内、失敗時は部分Bundleを返さず、ConflictとEndpoint Closureを壊さない。

### Phase 4: canonical JSONとdigest

- recursive canonicalizationを実装する。
- source snapshot digestとbundle instance digestを分離する。
- ClockとBundle IDを固定した決定性テストを通す。
- key挿入順、配列入力順、localeに依存しないことを確認する。

**完了条件:** 同一論理入力の期待digestが繰り返し一致する。

### Phase 5: Fixtureと回帰テスト

- Project Astra凍結済みfinal Knowledgeからofficial Context Fixtureを作る。
- number/string、resolved Conflict、cycle、極小Budget、Unicode用synthetic fixtureを作る。
- Candidate BundleとKnowledge Base Exportが変化しない回帰テストを追加する。
- 既存全テストを再実行する。

**完了条件:** `CONTEXT_BUNDLE_TEST_MATRIX.md`のBuild Week stretch対象がすべて成功し、既存中核フローに差分がない。

### Phase 6: Markdown renderer（任意stretch）

- 同じBundleからMarkdownを生成する。
- instructionとKnowledgeを分離する。
- renderer snapshotを固定する。

**完了条件:** JSONを正本とし、MarkdownからKnowledgeへ逆Importしない。

## 7. Fixture戦略

### Official Project Astra fixture

Project Astra凍結後のfinal Knowledgeを使用する。最低限、次を固定する。

- Entity 7件、Relationship 5件
- Nova Arclight、Astra Survey Corps、Northstar Observatory、First Light Briefing、Aster Compass、ＮＯＶＡ、Quiet Prism
- Nova Arclightのage Conflictはnumber `17`とnumber `18`
- `member_of`は統合済み1件
- Quiet PrismはOrphan
- blockedなOuter Gate RelationshipはKnowledge snapshotに含めない

### Synthetic fixtures

| Fixture | 用途 |
|---|---|
| `typed-scalar-conflict` | number `17`とstring `"17"` |
| `resolved-conflict` | 全claimと`conflictResolvedAt`保持 |
| `cyclic-graph` | cycle、depth、visited、最小距離 |
| `multi-root` | Root順、Root間Relationship、複数Root failure |
| `unicode-excerpt` | emoji、結合文字、ellipsis、code point境界 |
| `budget-boundaries` | Full→Stub、Relationship省略、Root failure、桁数固定点 |
| `source-ref-variants` | 3 mode、dedup、同一文書内の異なるexcerpt |

公式Astraへsynthetic要件を混入させない。

## 8. Build Week中の扱い

### 必須ではない

Context BundleはBuild Weekの完成条件を増やさない。Candidate Review、Project Astra、Demo Mode、Insights、Graph/Search、Knowledge Base Exportを先に完成させる。

### 条件付きstretchとして実施可能

Phase 0〜5のうち、`src/core/context/`の純関数と自動テストだけを実施できる。既存中核フローの変更が必要になった時点でBuild Week後へ送る。Phase 6はさらに余裕がある場合だけ行う。

### Build Week後

- Context Builder UI
- Preview
- JSON/Markdownのユーザー向け保存操作
- AI送信
- Draft履歴
- Candidate抽出への再投入
- tokenizer表示
- Project自動選択
- 高度な探索、検索、要約

## 9. 実装時の確認チェックリスト

コードが追加された作業フォルダで、最初に次を確認する。

- [ ] `package.json`のtypecheck/test/lint script
- [ ] 実際のTypeScript、Zod、Vitest version
- [ ] 既存型の単一export元
- [ ] 4つの既存正規化関数の挙動
- [ ] SourceRef equalityとunionの既存規則
- [ ] Knowledge Store snapshotの取得方法
- [ ] Entity/Relationshipの配列順に意味があるか
- [ ] Candidate/blockedデータとregistered Knowledgeの境界
- [ ] browser runtimeのWeb Crypto対応
- [ ] 既存Knowledge Base ExportのSchema/snapshot
- [ ] 既存Candidate BundleのSchema/snapshot
- [ ] Project Astraが凍結済みか

確認結果によりファイル名やimport pathは調整してよいが、責務境界とP0契約は変更しない。

## 10. 完了判定

実装を将来開始した場合も、次をすべて満たすまで完了としない。

1. Context入力が登録済みKnowledgeに限定される。
2. Root、Conflict、Endpoint ClosureがBudgetで壊れない。
3. 同じ論理入力のsortとsource snapshot digestが一致する。
4. JSONが正本で、Markdownは同じBundleからだけ生成される。
5. Candidate Bundle、Knowledge Base Export、既存Entity照合規則に変更がない。
6. AI返答がKnowledgeへ直接適用されない。
7. official Astraとsynthetic fixtureの役割が分離される。
8. 既存Build Week自動テストとContextテストがすべて成功する。
