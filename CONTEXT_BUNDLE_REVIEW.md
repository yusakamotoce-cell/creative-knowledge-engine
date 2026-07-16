# Context Bundle 契約レビュー

**Status:** 実装前レビュー完了 / 条件付き承認  
**Review date:** 2026-07-16（Asia/Tokyo）  
**対象:** `COS_CONTEXT_BUNDLE_SPEC_v0.1.md`  
**実装状態:** 現行コードなし。コード照合・コード変更は未実施。

## 1. 結論

Context Bundleの目的と安全原則は上位仕様に整合している。特に、登録済みKnowledgeから作る読み取り専用派生物であること、AIが正式ID・merge先・canonicalValueを決めないこと、AI返答をKnowledgeへ直接適用しないこと、Relationshipの方向と全Attribute claimを維持することは、そのまま採用できる。

ただし、現行v0.1はそのままではSchema、Budget、SourceRef、digestの各契約を同時に満たせない。後述するP0項目を文書上で確定するまでは実装へ進まない。Context Bundleは現行Build Weekの必須完成条件には追加せず、中核フロー完成後のstretch scopeとして純関数とテストだけを候補にする。

## 2. 確認した資料と優先順位

フォルダ内の全Markdown 9件とJSON例1件を確認した。

1. `PROJECT_KICKOFF_v1.0.md`
2. `BUILD_WEEK_SPEC_v0.3.md`
3. `BUILD_WEEK_SPEC_v0.3_ADDENDUM.md`
4. `CODEX_STEP_0-1.md`
5. `PROJECT_ASTRA_v0.1.md`
6. `WORK_HANDOFF_PROJECT_ASTRA.md`
7. `COS_CONTEXT_BUNDLE_SPEC_v0.1.md`
8. `CODEX_CONTEXT_BUNDLE_DESIGN_HANDOFF.md`
9. `HANDOFF_CURRENT_STATE.md`
10. `context-bundle-project-astra-example.json`

契約が競合する場合は、既存資料で明記された次の順を使用する。

1. `BUILD_WEEK_SPEC_v0.3_ADDENDUM.md`
2. `BUILD_WEEK_SPEC_v0.3.md`
3. `PROJECT_KICKOFF_v1.0.md`
4. `CODEX_STEP_0-1.md`

`PROJECT_ASTRA_v0.1.md`は上位契約に従うFixture設計、`COS_CONTEXT_BUNDLE_SPEC_v0.1.md`は今回のレビュー対象となるDraft、2件のhandoffは作業履歴と既知の論点として扱う。`HANDOFF_CURRENT_STATE.md`にある旧Downloadsパスと「現在のフォルダが正規リポジトリではない可能性」は、今回のユーザー指定によって失効する。現在の正規作業フォルダは本フォルダである。

## 3. 上位仕様との整合

### 3.1 整合している事項

| 上位契約 | Context Bundleでの扱い | 判定 |
|---|---|---|
| EntityTypeは5種類のみ | `character`、`scene`、`location`、`item`、`organization`のみ | 整合 |
| TagはEntityの`string[]` | Context Full Entityの`tags: string[]` | 整合 |
| Entity間リンクはRelationship | Entity内部へリンクを複製せず、方向付きRelationshipを出力 | 整合 |
| AttributeRecordはcanonicalValue、全claims、conflictResolvedAtを保持 | Context投影でもConflict状態とclaimを扱う | 方針は整合、Budget契約に矛盾あり |
| 型を含めて属性値を比較 | number `17`とstring `"17"`を区別 | 整合 |
| AIはcreate候補だけを返す | Context BundleはAIへの入力であり、返答はCandidate Reviewへ戻す | 整合 |
| AIは正式ID・merge先・canonicalValueを決めない | Context内の正式IDは読み取り専用参照 | 整合 |
| Human review required | AI返答をKnowledgeへ直接保存しない | 整合 |
| Entity照合は決定的な完全一致 | Context生成で新規照合・推測をしない | 整合 |
| Build Weekの中心はCandidate Review | Context Bundleを必須完成条件へ追加しない | 整合 |

### 3.2 上位仕様を変更してはならない境界

- Context Bundleのために既存`Entity`、`Relationship`、`AttributeRecord`、`SourceRef`へフィールドを追加しない。
- Context用のSourceRef IDは派生表現上のIDであり、Knowledge Storeの`SourceRef`契約を変更しない。
- Candidate Bundleへ正式ID、action、merge先IDを追加しない。
- Knowledge Base Exportを選択・削減・AI入力用の形式へ変更しない。
- Context BundleをImport経路へ接続しない。
- Context Bundleのテスト追加によって既存Build Week完成条件を置換しない。

## 4. 3契約の責務分離

| 契約 | データ方向 | 入力 | 内容 | ID | 書き込み権限 |
|---|---|---|---|---|---|
| Knowledge Base Export | Application → 保存先 | Knowledge Store全体 | バックアップ・復元・移行用の完全データ | 正式IDを含む | 明示的Import時だけ復元 |
| Context Bundle | Application → AI | 登録済みKnowledgeとユーザー選択 | 選択・探索・Budget削減した読み取り専用派生データ | 既存の正式IDを参照 | なし。KnowledgeへImportしない |
| Candidate Bundle | AI → Application | ソース文書 | 新規Entity・Relationship・属性・Tagのcreate候補 | Bundle内だけの`candidateId` | Candidate Review後だけ登録可能 |

既存Entityへの変更提案をAIが返した場合も、Context Bundleを更新用payloadとして扱わない。必要ならAI返答を新しいソース文書として取り込み、既存の抽出、Duplicate候補提示、Candidate Review、Merge Reviewを通す。文章出力はDraftであり、Context BundleやKnowledge Base Exportの一部ではない。

## 5. 実装前に解決するP0契約

### P0-01: `sourceMode: "none"`とclaimのSourceRefが両立しない

- **該当箇所:** Context仕様 5、9、10
- **問題:** `none`では全`sourceRefIds`と`canonicalSourceRefIds`を空にする一方、`ContextAttributeClaim.sourceRefId`は必須である。未解決Conflictは全claim保持も必須であり、現Schemaでは有効な`none`出力を作れない。
- **修正案:** `sourceMode`ごとの条件付きSchemaを定義する。`none`ではclaimの`sourceRefId`を省略し、`reference`と`excerpt`では必須にする。値、型、claim件数は全モードで保持する。
- **未修正時の影響:** Schema違反、または`none`なのに出典IDが漏れる。実装ごとに挙動が分かれ、digestも一致しない。

### P0-02: Budget削減後のFull Entityが出力Schemaに適合しない

- **該当箇所:** Context仕様 8、12.2、12.3
- **問題:** `aliases`、`tags`、`updatedAt`はFull Entityで必須だが、Budget優先順位では削除可能である。空配列への置換は「元から空」と「Budgetで省略」を区別できない。
- **修正案:** Budgetで省略可能なFull Entityフィールドをoptionalにし、省略したfield pathをdiagnosticsへ決定的に記録する。`id`、`entityType`、`name`、`detailLevel`、`description`、`attributes`はFull表現の必須部分として維持する。
- **未修正時の影響:** reducerがSchema違反を生成するか、情報欠落を空値として偽装する。

### P0-03: Conflict保持規則とBudget優先順位が競合する

- **該当箇所:** Context仕様 0.6、9、12.2
- **問題:** `resolved`と`unresolved`は全claimを保持すると定義される一方、解決済みclaimが削減対象にも置かれている。Conflict状態だけ残して根拠claimを削ると意味が変わる。
- **修正案:** 1属性の`canonicalValue`、`conflictState`、`conflictResolvedAt`、全claims、claimから参照される最小SourceRefを原子的に扱う。RootのConflictが収まらなければ`ROOT_CONTENT_EXCEEDS_BUDGET`、NeighborならEntity全体をStubへ落とす。`conflictState: none`のclaimだけは仕様どおり省略可能とする。
- **未修正時の影響:** AIがConflictを確定値と誤認する、解決根拠を追跡できない、同じ入力で異なる削減結果になる。

### P0-04: SourceRef IDの計算時点が未固定

- **該当箇所:** Context仕様 10、12
- **問題:** IDにexcerptを含めるが、`reference`ではexcerptを出さず、`excerpt`では切り詰める。投影後の文字列からIDを作るとsourceModeやBudgetで同一SourceRefのIDが変わる。
- **修正案:** Knowledge Storeの未加工`documentId + NUL + fileName + NUL + excerpt`から最初にIDを作り、重複排除する。その後にsourceMode投影とexcerpt切り詰めを行い、IDは維持する。
- **未修正時の影響:** 参照切れ、重複排除失敗、modeごとのdigest不整合が発生する。

### P0-05: 2種類のdigestの対象と「同一digest」の意味が曖昧

- **該当箇所:** Context仕様 0.9、7、17
- **問題:** `sourceSnapshotSha256`の正確な入力が定義されず、`bundleSha256`は`bundleId`と`generatedAt`を含むため、同じKnowledgeと設定でも生成ごとに変わり得る。
- **修正案:** 次の役割に固定する。
  - `sourceSnapshotSha256`: 正規化済みrequestと、Budget・sourceMode投影前の選択済みKnowledge snapshotをcanonical化したdigest。`bundleId`、`generatedAt`を含めない。
  - `bundleSha256`: 最終Bundleインスタンスの`integrity.bundleSha256`だけを空文字にしたcanonical JSONのdigest。`bundleId`、`generatedAt`を含み、生成インスタンスの同一性を表す。
  - 「同じKnowledge・選択・設定から同じdigest」は`sourceSnapshotSha256`を指すと明記する。テストではClockとBundle ID生成器を注入し、固定可能にする。
- **未修正時の影響:** キャッシュ、比較、再現性テストがどちらのdigestを期待すべきか決められない。

### P0-06: canonical JSONのアルゴリズムが仕様化されていない

- **該当箇所:** Context仕様 12.1、17
- **問題:** 「JSON key順を固定」だけでは、再帰的key順、文字列比較、配列順、number表現が未定である。保存時の挿入順や`localeCompare`は使用環境に依存し得る。
- **修正案:** 全object keyを再帰的に決定順へ並べ、配列は各ドメイン契約で事前に並べ、JSON直列化は空白なしとする。文字列比較方法とnumber制約を明記し、localeを参照しない。
- **未修正時の影響:** 内容が同じでも環境や構築順によってdigestが変わる。

### P0-07: `actualCharacters`が自己参照し、最終JSON長とも一致しない

- **該当箇所:** Context仕様 12.1
- **問題:** `actualCharacters`自身の桁数とdiagnostics追加が測定長へ影響するため固定点計算が必要である。また、現定義はhashを空文字にして測るため、最終JSONは表示値より64 code point長い。
- **修正案:** `bundleSha256`を64文字のplaceholderにした最終canonical JSONのUnicode code point数を`actualCharacters`とし、値が安定するまで再計算する。digest計算時だけhashを空文字にする。`maxCharacters`は最終JSONに対する上限とする。現行定義を維持する場合は、64文字を除外する値だと名称とUIへ明記する必要がある。
- **未修正時の影響:** 上限超過、境界値での非決定的な成否、Preview値と実送信サイズの不一致が起きる。

### P0-08: Budget reducerの原子単位と安定した選択順が不足

- **該当箇所:** Context仕様 6、12、13
- **問題:** Relationship core、NeighborのFull→Stub、複数Root、深さ2、Purpose Presetの優先度が同時に競合した場合の完全な順序がない。
- **修正案:** 次を固定する。
  1. Rootは常にFullで、選別・Stub化しない。
  2. Relationshipの`id`、両端、方向、`relationType`、`description`は原子的に保持し、文字列の部分切り詰めをしない。
  3. Neighbor Fullは、低優先フィールド削減後も収まらなければEntity単位でStub化する。
  4. Stubも収まらない場合はRelationship全体を省略し、不要になった非Root端点も除外する。
  5. 複数Rootの必須内容が収まらなければ、一部Rootを選ばず失敗する。
  6. 距離、Root順、Relationshipの契約順、Entityの契約順を使うlocale非依存のtie-breakを固定する。
- **未修正時の影響:** Endpoint Closure違反、片端Relationship、relationTypeやdescriptionの意味欠落、入力配列順による結果変動が起きる。

### P0-09: 例示JSONは公式Project Astra Fixtureではない

- **該当箇所:** `context-bundle-project-astra-example.json`、`PROJECT_ASTRA_v0.1.md`
- **問題:** 例示はNova、Astra Academy、Library Meeting、Silver Key、`17`と`"17"`のConflictを使う。公式AstraはNova Arclight、Astra Survey Corps、First Light Briefing、Aster Compass、number `17`とnumber `18`のConflictであり、正式テストIDも異なる。
- **修正案:** 現JSONをsynthetic contract exampleへ改名・位置づけ変更する。Project Astra凍結後、最終Knowledge Storeから公式Context Fixtureを別に生成する。number/string型差とresolved Conflictは小さいsynthetic fixtureで検証する。
- **未修正時の影響:** 「Project Astra回帰テスト」と称しながら公式期待値を再現できず、Fixtureの二重化と誤更新が起きる。

## 6. P1として固定する事項

| ID | 該当箇所 | 問題 | 推奨決定 | 未決定時の影響 |
|---|---|---|---|---|
| P1-01 | 5、8 | `rootEntityIds`の「正規化済み入力順」にID正規化規則がない | trim等を暗黙適用せず、Schema受理後の正確なIDで重複排除し、最初の出現順を保持 | Root順とdigestが実装依存 |
| P1-02 | 6 | cycle、複数Root、同一Entityへの複数経路の探索規則がない | Root順を起点にBFSし、最小距離を採用。visitedでcycleを止める | depthとBudget優先度が不安定 |
| P1-03 | 13 | Presetの「推奨」「優先」が実行規則か説明文か不明 | v0.1純関数では明示requestを優先し、Presetがreducerへ影響するなら完全な優先表を定義 | `scene_drafting`等で実装差が出る |
| P1-04 | 17 | claim、SourceRef、参照ID、warning、omitted IDのsortが未定 | claimは型付き正規化値・raw値・source ID、SourceRefと参照IDはID、warningはcodeと対象IDで固定 | digestが配列挿入順に依存 |
| P1-05 | 5、10 | `maxExcerptCharacters`の範囲とellipsis算入が不明 | `excerpt`時は正の整数、ellipsisを上限内に含める。他modeでは値を検証後無視するかoptional化 | 0、1、絵文字境界で不一致 |
| P1-06 | 7、12 | `truncated`の意味が不明 | Budgetまたはexcerpt上限で内容を省略・Stub化・切り詰めた場合のみtrue | 警告とフラグが不一致 |
| P1-07 | 7 | `unresolvedConflictCount`が削減前か出力後か不明 | 出力中のFull Entityに実際に含まれる未解決Conflict数とし、Stub化で非表示になったものはwarningで通知 | Previewが内容と一致しない |
| P1-08 | 10 | 出力`source`のclosureが未定 | 出力内の全非空SourceRef IDはちょうど1件へ解決し、未参照SourceRefは最終段階で除去 | dangling ref、不要な文字消費 |
| P1-09 | 12 | JSONのBudgetがMarkdownにも適用されるか不明 | v0.1の`maxCharacters`は正規JSONだけに適用。Markdownは表示形式として別計測 | AI送信時のサイズ誤認 |
| P1-10 | 12.4 | warning messageがhash対象だが文面テンプレートが未固定 | code、対象ID、固定英語テンプレート、並び順を固定 | 文言変更だけでdigestが変動 |
| P1-11 | 7 | Bundle生成失敗の戻り型がない | `ROOT_CONTENT_EXCEEDS_BUDGET`等のtyped error契約を定義し、部分Bundleを返さない | 呼び出し側が失敗を判定できない |
| P1-12 | 9 | 不整合な既存AttributeRecordへの対応がない | Context生成で修復せず、入力不変条件違反として失敗またはdiagnostic化する | 無言のデータ修正が起きる |

## 7. Project Astraとの整合性

### 利用できる公式データ

Project Astraの最終Knowledge設計は、Context Bundleの次の検証に適する。

- 5 EntityType
- 複数の方向付きRelationship
- Nova ArclightをRootにしたdepth 0、1、2
- First Light BriefingをRootにしたincoming、outgoing、both
- Organizationと所属者
- 未解決age Conflict（number `17`とnumber `18`）
- Quiet PrismのOrphan
- 同一Relationshipの重複統合後状態
- blocked Relationshipが登録済みKnowledgeに含まれないこと

### 公式Astraだけでは再現できない項目

- number `17`とstring `"17"`の型差
- resolved Conflict
- Root必須情報がBudgetを超える失敗
- Neighbor Stubも収まらずRelationshipを省略する境界
- cycle、複数Root、同距離tie-break
- sourceMode 3種類の完全な組合せ
- Unicode補助平面文字を含むexcerpt切り詰め

これらは公式Astraを改変せず、用途別のsynthetic fixtureで補う。

### 現例示JSONの静的検算

- 3件のSourceRef IDは、記載されたraw tripleのUTF-8 SHA-256と一致した。
- `bundleSha256`を空文字にした圧縮JSONは4076 Unicode code pointで、`actualCharacters: 4076`と一致した。
- 例示`bundleSha256`は通常の挿入順JSONでは一致せず、全object keyを再帰的に昇順化したcanonical JSONで一致した。
- hashを含む最終canonical JSONは4140 Unicode code pointであり、現`actualCharacters`より64長い。

これらは例示の内部計算が部分的に一貫していることを示すが、BudgetによるStub化を再現する元Knowledge snapshotがないため、`truncated: true`とStub化の妥当性は検証できない。

## 8. Build Weekの範囲判断

### Build Weekの必須範囲

Context Bundleに関する新しい必須項目は追加しない。既存のImport、Candidate Review、Register/Merge、Insights、Graph/Search、単一Knowledge Base Export、Demo Modeを優先する。

### 中核フロー完成後に許容するstretch scope

- P0契約の文書上の確定
- `src/core/context/`内だけのContext型とstrict Request Schema
- 登録済みKnowledge snapshotを入力にするdepth 0〜2の探索
- Endpoint Closure
- Attribute/Conflictの読み取り専用投影
- SourceRef index
- 決定的sortとBudget reducer
- canonical JSON、SHA-256、typed error
- 公式Astraとsynthetic fixtureによる純関数テスト
- 余裕がある場合のみ、同一BundleからのMarkdown renderer

既存UI、Storage Adapter、Candidate Review、Knowledge Base Exportの変更はstretch scopeにも含めない。

### Build Week後へ延期する範囲

- Context Builder画面、Preview、Export/Send UI
- AI送信Adapter
- Draft保存とBundle metadata関連付け
- AI返答のCandidate抽出への再投入
- model別tokenizer
- Project単位の自動Root選択
- depth 3以上、無制限探索
- 曖昧一致、意味検索、Embedding
- AI要約、Source全文添付
- Context BundleのKnowledge Base Import
- 新しいProject EntityType

## 9. コード実装時に照合する事項

現在のフォルダには`src/`、`package.json`、テスト設定がなく、現行コードは存在しない。そのため、次は設計上の前提であり、実装開始時に実物と照合する。

- 既存`Entity`、`Relationship`、`AttributeRecord`、`SourceRef`、`ScalarValue`の実際のexport場所とSchema
- `normalizeEntityName`、`normalizeAttributeKey`、`normalizeScalarValue`、`normalizeRelationType`の実装と比較表現
- SourceRef同一性とunion規則
- Knowledge Store snapshotの取得APIと不変条件
- blocked、Candidate、Reject済みデータがStoreへ混入しない保証
- Zodのversionとstrict Schemaの共通方針
- browser/test双方で使えるSHA-256実装
- ClockとBundle ID生成器の注入方法
- TypeScript、test、lintの実行script
- Knowledge Base ExportとCandidate Bundleの既存snapshot test

これらを確認するまで、同名型や正規化処理をContext配下へ複製しない。

## 10. レビュー判定

**判定: 条件付き承認。**

P0-01〜P0-09を契約として確定し、Project Astra公式Fixtureとsynthetic fixtureを分離すれば、Context Bundleは上位仕様を壊さずに独立した読み取り専用機能として実装できる。確定前の実装、Build Week必須範囲への追加、既存3契約の兼用は承認しない。
