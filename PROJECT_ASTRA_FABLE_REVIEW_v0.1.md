# Creative Knowledge Engine
## Project Astra v0.1 Fableレビュー
### PROJECT_ASTRA_FABLE_REVIEW_v0.1

- **レビュー基準日:** 2026-07-16
- **レビュー対象:** `PROJECT_ASTRA_v0.1.md`(SHA-256: 5206772C…E7、831行)
- **判断基準とした仕様:** `BUILD_WEEK_SPEC_v0.3_ADDENDUM.md` > `BUILD_WEEK_SPEC_v0.3.md` > `PROJECT_KICKOFF_v1.0.md` > `CODEX_STEP_0-1.md`
- **レビュー範囲:** 設計レビューのみ。実装・上位仕様・Fixture本文の書き換えは行わない

---

## 1. 結論

Project Astra v0.1は、Duplicate・Conflict・Orphan・Relationship重複統合・blocked Relationship・再Import冪等性のすべてが、説明上ではなく確定済みの決定的判定規則(NFKC正規化+完全一致、型込みclaim比較、Relationshipキー、登録済みRelationshipのみによるOrphan判定)によって成立することを確認した。最終期待値(Entity 7、Relationship 5、Character 2、Orphan 1、未解決Conflict 1、Duplicate 1組)も再計算の結果すべて一致した。

ただし1点、**Relationship CandidateのsourceRefsが全Fixtureで未定義**であり、回帰テスト契約15番「統合後の`member_of`に2件のsourceRefsが存在する」が本書だけからは導出できない。これは凍結条件7「Fixture生成時に追加判断が不要な状態」に反するため、凍結前に必ず補完する必要がある。修正内容は各Relationship Candidateへ出典1件を書き足すだけの局所的・機械的なデータ補完であり、シナリオ・操作順・期待値のいずれにも波及しない。

そのほかに、Fixture 02のNova候補が原文に存在しない`Nova Arclight`をaliasに持つ問題(merge後にEntity自身のnameと同一のaliasが混入する副作用あり)など、修正を推奨する問題が3件、軽微な改善が4件ある。

## 2. 凍結可否

**判定: 軽微な修正後に凍結可能**

- 「重大な問題」1件(C-1)は凍結ブロッカーだが、修正規模は小さく設計へ波及しないため、修正後の全体再レビューは不要。修正差分の確認のみでよい。
- C-1と推奨修正R-1〜R-3を反映し、第11章の再確認項目を通過した時点でv1.0として凍結してよい。

---

## 3. 重大な問題

### C-1: Relationship CandidateのsourceRefsが未定義で、回帰契約15番の期待値が導出不能

- **該当箇所:** 5.4節(Fixture 01 Relationship Candidates)、6.4節(relcand-astra-002-member)、7.4節、8.4節、13章、15章の契約15番
- **問題の内容:** 全Relationship CandidateにcandidateId・relationType・fromRef・toRefのみが定義され、sourceRefsが一切記載されていない。一方、13章と回帰契約15番は「統合後の`member_of`にsourceRefsが2件(2文書分)存在する」ことを期待している。仕様書のCandidate Bundle例ではRelationshipの`sourceRefs: []`が合法なので、Fixture生成者が空配列で生成すると統合結果は0件となり、契約15番が恒常的に失敗する。
- **発生条件:** Fixture実ファイル(candidates JSON)と期待結果JSONを生成する時点で必ず発生する。生成者がsourceRefsの内容を独自判断で埋めた場合、期待値が生成のたびに揺れる可能性もある。
- **具体的な修正案:** 各Relationship Candidateに、所属文書のdocumentId・fileName・原文excerptを持つSourceRefをちょうど1件ずつ定義する。最低限、`relcand-astra-001-member`(excerpt: `a member of the Astra Survey Corps`)と`relcand-astra-002-member`(excerpt: `Nova remains a member of the Astra Survey Corps`)の2件は必須。SourceRef同一性は`documentId + fileName + excerpt`の完全一致なので、この2件は必ず別物と判定され、和集合が決定的に2件になる。残りのRelationship Candidate(carries、appears_in×2、located_at、points_to)にも同様に1件ずつ定義し、期待結果JSONのsourceRefs件数をすべて固定する。
- **修正しない場合の影響:** 回帰契約15番が検証不能または恒常的に失敗し、Relationship重複統合(sourceRefs和集合)というBuild Week仕様v0.3追補7章の中核挙動をProject Astraで実証できない。凍結条件7を満たさない。

## 4. 修正を推奨する問題

### R-1: Fixture 02のNova候補のalias `Nova Arclight` に原文の根拠がなく、merge後に自己aliasが混入する

- **該当箇所:** 6.3節 `cand-astra-002-nova`(aliases: `["Nova Arclight"]`)
- **問題の内容:** 入力文書`02-nova-archive-revision.md`の本文には`Nova Arclight`という文字列が一度も登場しない。AI抽出結果として原文に根拠のないaliasを持つのは、Fixtureの模範データとして不適切。さらにmerge規則(aliasesは和集合、候補nameが既存nameと異なる場合はaliasへ追加)を機械的に適用すると、merge後のNova Arclightのaliasesは`["Nova", "Nova Arclight"]`となり、Entity自身のnameと同一のaliasが混入する。これはREADMEやスクリーンショットで恒久的に露出する。
- **発生条件:** Fixture 02のmerge操作を仕様どおりに実行した場合、常に発生する。
- **具体的な修正案:** `cand-astra-002-nova`のaliasesを`[]`へ変更する。name `Nova`だけで既存alias `nova`との完全一致が成立するため、merge候補提示・Duplicate導線には一切影響しない。あわせて、merge後のNova Arclightの期待aliasesを`["Nova"]`と明記する。
- **修正しない場合の影響:** 公式サンプルとして「AIが原文にない情報を捏造してよい」という誤ったシグナルになる。また期待結果JSONに自己aliasが固定され、将来「nameと同一のaliasを禁止/除去する」改善を入れた瞬間に回帰テストが壊れる(将来の機能追加で壊れやすい設定に該当)。

### R-2: merge後の各Entityの最終状態(aliases・tags・sourceRefs・description)が完全には列挙されていない

- **該当箇所:** 6.5節(Nova/Observatoryのmerge結果)、11章(最終Knowledge Store)
- **問題の内容:** 11章はEntity件数と名前一覧のみを確定しており、merge対象2件(Nova Arclight、Northstar Observatory)の最終フィールド値が箇条書きの差分記述(「tagsへ追加」「sourceRefsを統合」)にとどまる。descriptionとnameをmerge時に変更しないこと、配列の並び順(和集合の並びは先出現順で固定、`unionStrings`のテストで固定する前提)も明文化されていないため、`final-knowledge.json`生成時に判断の余地が残る。
- **発生条件:** 期待結果JSON生成時。特に配列順は実装の和集合規則に依存するため、明記しないと生成者ごとに揺れる。
- **具体的な修正案:** 11章に、7 Entityすべての最終name・aliases・tags・sourceRefs件数(可能ならdescriptionも)を確定値として列挙する。あわせて「merge時にname・descriptionはユーザー編集しない(既存値維持)」「和集合の並び順は先出現順」をFixtureの前提として明記する。
- **修正しない場合の影響:** 凍結条件7(生成時に追加判断が不要)を完全には満たさず、期待結果JSONの再現性が生成者依存になる。

### R-3: 3分デモに対してレビュー操作数が多く、0:45–1:30の区間が破綻しやすい

- **該当箇所:** 16章(3分デモの推奨経路)、特に0:20–1:30
- **問題の内容:** データセット全体のレビュー操作はEntity 10件(Accept 7、Merge 1、Edit+Merge 1、Reject 1)+Relationship 6件+blocked確認で合計16回前後ある。デモ台本はうち6操作を「代表例」とするが、Knowledge Baseは空から開始するため、Fixture 01の5 Entity+4 Relationshipの全Acceptを飛ばすことはできず、実時間では0:45–1:30に収まらない可能性が高い。
- **発生条件:** 実機をリアルタイムで通しで見せる場合。録画編集を前提にすれば回避可能。
- **具体的な修正案:** データセット側は変更しない(候補の削除はEntityType 5種の網羅・Item 2件・Graphの接続密度を壊すため非推奨)。台本側で次を明記する: (1) Fixture 01は「基礎資料は全件Acceptで一括登録」とナレーションし、録画では2件目以降を早送り編集する、(2) 見せ場をFixture 02以降のMerge・Edit再照合・Accept as new・Reject・blockedの5操作に絞る。実演デモの場合はFixture 01処理済み状態のスナップショットから開始する選択肢を、Demo Modeの許容範囲として検討事項に挙げる。
- **修正しない場合の影響:** デモ前半が単調なAccept連打で時間を消費し、製品の中心価値であるCandidate Reviewの判断体験(Merge/Edit/Reject/blocked)の説明時間が不足する。

## 5. 軽微な改善

### M-1: 入力文書02内のメタ記述「The creator's canon name is “Northstar Observatory.”」

- **該当箇所:** 6.1節の入力文書本文
- **問題の内容:** 作中資料の中に「創作者の正典名」という資料外視点の一文が混入しており、Fixture文書の作り物感が強まる。Edit操作の動機づけとしては機能している。
- **発生条件:** README・スクリーンショット等で原文が露出したとき。
- **具体的な修正案:** 資料内視点へ書き換える。例: `An editorial note marks “Northstar Observatory” as the registered spelling.`
- **修正しない場合の影響:** 実害なし。見栄えの問題のみ。

### M-2: 見出しレベルの不統一

- **該当箇所:** 1〜4章は`##`、5章以降(Fixture・決定的ID以降)は`#`
- **問題の内容:** 章の階層が途中で変わっており、目次生成やレビュー時の参照が紛らわしい。
- **発生条件:** 常時(表示上のみ)。
- **具体的な修正案:** 全章を`#`または`##`のどちらかへ統一する。
- **修正しない場合の影響:** 実害なし。

### M-3: 回帰テスト契約にUI確認が混在

- **該当箇所:** 14章「処理済みであることがUIに表示される」
- **問題の内容:** ドメイン純関数で検証できる項目の中に、UI表示の確認が1件混在している。自動回帰テストの粒度と手動/コンポーネントテストの粒度が同じリストに並んでいる。
- **発生条件:** 回帰テスト実装時に対象レイヤーの判断が必要になる。
- **具体的な修正案:** 当該項目に「UIテストまたは手動確認で担保」と注記し、ドメイン回帰契約(15章)とは区別する。
- **修正しない場合の影響:** 軽微。テスト実装時に一度迷うだけ。

### M-4: 型差・境界値の検証をAstraに含めない方針の明文化

- **該当箇所:** 15章末尾(Conflict解決・再開は単体テストで別途確認、との記述)
- **問題の内容:** number `17`とstring `"17"`の型差、boolean、Relationshipキーの区切り文字衝突などの境界値検証がAstraに含まれないこと自体は正しい設計だが、「意図的に含めない」ことの宣言がConflict解決・再開の1点にしかない。
- **発生条件:** 将来、誰かが「Astraに型差ケースも足そう」と判断したとき。
- **具体的な修正案:** 15章に「型差・境界値・区切り文字衝突などはsynthetic fixtureおよびドメイン単体テストの責務とし、Project Astraには追加しない」と1文追加する。
- **修正しない場合の影響:** 将来Astraへ検証目的が混入し、デモの分かりやすさと期待値の安定性が劣化するリスク。

---

## 6. 各成立条件の検証結果

### 6.1 `ＮＯＶＡ`とalias `Nova` のDuplicate候補成立 — **確認済み**

`ＮＯＶＡ`(全角、U+FF2E U+FF2F U+FF36 U+FF21)はNFKCで`NOVA`へ互換分解され、trim・連続空白統合(該当なし)・小文字化で`nova`。登録済みNova Arclightのalias `Nova`も`nova`。`findDuplicateEntityIds`の「candidateのnameと既存aliasの正規化後完全一致」に該当し、merge候補として提示される。曖昧一致・編集距離・意味的類似は不使用。

### 6.2 別EntityとしてAccept後のDuplicate Insight成立 — **確認済み**

Duplicate Insightは「正規化後のnameまたはaliasが一致する複数Entity」の検出。登録後、ent-astra-001(alias→`nova`)とent-astra-006(name→`nova`)がキー`nova`を共有する2 Entityとなり成立する。他に正規化名を共有するEntityペアは存在しないため、Duplicateはちょうど1組(R-1修正後。修正前でも`nova arclight`は単一Entity内のname/alias重複にとどまり、Entityペアを構成しないため結果は同じ)。

### 6.3 age claim 17/18の未解決Conflict成立 — **確認済み**

number型17(doc-001)とnumber型18(doc-002)は`normalizeScalarValue`でそれぞれ`number:17`・`number:18`となり、型込みで異なる正規化値2種類。`conflictResolvedAt === null`(初期化以降、解決操作なし)。追補1章の未解決Conflict条件を両方満たす。canonicalValueは最初のclaim値17を維持し自動上書きされない。他のEntity・属性はすべてclaim 1件のため、未解決Conflictは全体でちょうど1件。

### 6.4 Quiet Prism → Outer Gateのblocked成立と非登録 — **確認済み**

toRefは`name: Outer Gate`のみ。解決順序(candidateId対応表→正規化名完全一致→手動選択)のうち、対応表に該当なし、名前インデックスに`outer gate`なし、手動選択はシナリオ上行わない。よって片端未解決で`blocked`、Accept禁止、Knowledge Store非登録。仕様v0.3の8章Stage 2に完全準拠。

### 6.5 Quiet Prismが唯一のOrphanになること — **確認済み**

Orphan Insightの入力は登録済みKnowledgeのみ(Insightは登録済みKnowledgeを入力とする純関数)であり、blocked Relationshipは登録されないため判定に混入しない。登録済み5 Relationshipの端点を列挙すると、Nova Arclight(rel-001/002/003のfrom)、Astra Survey Corps(rel-001のto)、Aster Compass(rel-002のto)、First Light Briefing(rel-003/005のto、rel-004のfrom)、Northstar Observatory(rel-004のto)、ＮＯＶＡ(rel-005のfrom)。Quiet Prismのみどこにも現れず、Orphanはちょうど1件。

### 6.6 `ＭＥＭＢＥＲ＿ＯＦ`の正規化とsourceRefs統合 — **成立するが、C-1の補完が必要**

`ＭＥＭＢＥＲ＿ＯＦ`は全角英字と全角ロー・ライン(U+FF3F)で構成され、NFKCで`MEMBER_OF`、小文字化で`member_of`。fromRefのcandidateId `cand-astra-002-nova`は対応表経由でent-astra-001へ、toRefのname `Astra Survey Corps`は名前一致でent-astra-002へ解決され、キー`(ent-astra-001, ent-astra-002, member_of)`が既存rel-astra-001と一致。追補7章により新規作成せずID維持でsourceRefsを和集合統合する。**ただし統合対象のsourceRefsが未定義(C-1)のため、「2件になる」という期待値はデータ補完後に初めて確定する。**

なお、merge処理されたcandidateが対応表へ登録される挙動は、仕様v0.3の8章「Entity Reviewの処理に応じて生成する」の読みとしては自然で、本書10章の対応表とも一貫しているが、追補4章がAccept時の手順しか明記していないため、第11章の再確認項目に含めた。

### 6.7 `North Star Observatory`のEdit後再照合 — **確認済み**

`north star observatory`と`northstar observatory`は空白1個の有無が残るため正規化後も不一致(連続空白の単一化は空白の削除ではない)、という本書の前提は正しい。Editでnameを`Northstar Observatory`へ変更→再照合(追補8章)→完全一致→merge候補へ切り替え→Merge、の流れは仕様どおり。原表記はsourceRefのexcerptに残るため出典追跡も維持される。

### 6.8 その他の必須成立条件

- Duplicate 1組以上: 成立(6.2) — **確認済み**
- 未解決Conflict 1件以上: 成立(6.3、ちょうど1件) — **確認済み**
- Orphan 1件以上: 成立(6.5、ちょうど1件) — **確認済み**
- Relationship複数件: 5件 — **確認済み**
- Organizationと所属Character: Nova Arclight →member_of→ Astra Survey Corps — **確認済み**
- 同一文書再Importの冪等性: SHA-256一致で処理スキップ。Entity/Relationship/claims/sourceRefs/Insight件数はいずれも変化しない — **確認済み**

---

## 7. 最終期待値の再計算

| 項目 | 期待値 | 再計算 | 判定 |
|---|---:|---:|---|
| Entity総数 | 7 | 5(F01)+0(F02は両方merge)+1(F03)+1(F04、Royal KeyはReject) = 7 | 一致 |
| Character | 2 | Nova Arclight、ＮＯＶＡ | 一致 |
| Scene | 1 | First Light Briefing | 一致 |
| Location | 1 | Northstar Observatory | 一致 |
| Item | 2 | Aster Compass、Quiet Prism | 一致 |
| Organization | 1 | Astra Survey Corps | 一致 |
| Relationship総数 | 5 | 4(F01)+0(F02は統合)+1(F03)+0(F04はblocked) = 5 | 一致 |
| Orphan数 | 1 | Quiet Prismのみ | 一致 |
| 未解決Conflict数 | 1 | Nova Arclightのageのみ | 一致 |
| Duplicate | 1組以上 | キー`nova`の1組(ちょうど1組) | 一致 |

最終登録Entity 7件、Royal KeyとOuter Gateの非登録、candidateId対応表(10章)もすべてReview操作と矛盾しない。**確認済み。**

---

## 8. 3分デモの成立性

9つの説明対象(Accept as new / Merge / Edit / Reject / blocked / Relationship重複統合 / Conflict / Duplicate / Orphan)は、それぞれ独立した候補と明確な瞬間を持ち、1データセット内で重複なく提示できる。構成として成立している。

懸念は操作量のみ(R-3)。Fixture 01の9操作を実時間で見せると前半が消費されるため、録画編集または「基礎登録は早送り」の演出を台本へ明記することを推奨する。候補の削除は不要かつ非推奨: どのEntityを削ってもEntityType網羅・Graph接続・期待値のいずれかが壊れ、削って得られる時間より失うものが大きい。

1点、台本2:35の検索デモで`Nova`を検索した際に全角名の`ＮＯＶＡ`がヒットするかは、Search仕様(name部分一致)が正規化前後どちらの文字列を対象とするか未規定のため確定できない。台本は`ＮＯＶＡ`のヒットに依存しない構成にするか、凍結前確認事項(第11章)として実装挙動を確認すること。

---

## 9. 回帰テストデータとしての評価

- 入力順: 4文書の固定順が規定されている — **確認済み**
- 決定性: candidateId、テスト用Entity/Relationship ID、Review操作列がすべて固定 — **確認済み**。ただしC-1(Relationship sourceRefs)とR-2(merge後最終状態)の補完までは期待結果JSONを機械生成できない
- 人間の曖昧判断への依存: なし。「ＮＯＶＡをAccept as newする」等の判断はすべてシナリオ側で固定済み — **確認済み**
- 将来の機能追加への耐性: おおむね良好。唯一、R-1の自己alias(`Nova Arclight`が自身のaliasに入る)は将来のalias正規化機能で壊れやすいため修正推奨。Conflictを未解決のまま標準完了状態とする設計は、解決/再開を単体テストへ分離しており適切
- 目的間の干渉: なし。Duplicate担当のＮＯＶＡはrel-005で接続を持ちOrphanにならず、Orphan担当のQuiet PrismはConflict・Duplicateに関与しない。Conflict担当のageはNova Arclightのみ — **確認済み**
- synthetic fixtureとの分離: 型差(17 vs "17")、boolean、Relationshipキーの区切り文字衝突、ID枯渇挙動などはAstraに含まれておらず、CODEX_STEP_0-1の単体テスト側でカバーされる設計。分離は適切(M-4の明文化のみ推奨) — **確認済み**

---

## 10. 上位仕様との整合性

- EntityTypeは5種類のみ使用(character/scene/location/item/organization) — **確認済み**
- Tagは各Entityの`string[]` — **確認済み**
- Entity間接続はRelationshipのみ(Entity内部に接続を持たない) — **確認済み**
- AIはcreate候補のみ返す(全candidateにaction・正式ID・merge先・canonicalValueなし) — **確認済み**
- Entity照合は正規化後のname/alias完全一致のみ(曖昧一致・意味的類似・AI判定の追加なし) — **確認済み**
- Accept時の正式ID即時発行と後続候補への反映(F03のＮＯＶＡ Accept→直後のrel-005解決が該当) — **確認済み**
- Entity Review→Relationship Reviewの2段階順序 — **確認済み**
- 両端未解決Relationshipのblocked化とAccept禁止 — **確認済み**
- Conflict解決後のclaims保持・再開規則: Astraでは解決操作自体を行わない設計のため非演習。単体テストへ委譲する旨が15章に明記済み — **確認済み(意図的に非演習)**
- Relationshipの方向維持: A→BとB→Aが衝突するケースはAstraに存在せず、方向規則に反する箇所なし — **確認済み**
- Demo Mode主経路(APIキー不要・保存済みBundle・オフライン完走) — **確認済み**
- 「RejectされたEntityだけを参照するRelationshipの自動Reject候補表示」は、Royal Keyを参照するRelationshipが存在しないため非演習。契約上Astraでの演習は必須でない — **確認済み(意図的に非演習)**

---

## 11. 推奨修正一覧

| ID | 区分 | 修正内容 | 必須/推奨 |
|---|---|---|---|
| C-1 | 重大 | 全Relationship CandidateへSourceRef(documentId/fileName/excerpt)を各1件定義し、統合後member_ofのsourceRefs=2件を含む期待値を確定する | 凍結前必須 |
| R-1 | 推奨 | `cand-astra-002-nova`のaliasesを`[]`へ変更し、merge後のNova Arclightの期待aliasesを`["Nova"]`と明記 | 凍結前に強く推奨 |
| R-2 | 推奨 | 11章に7 Entityの最終フィールド値(aliases/tags/sourceRefs件数、name・description不変、和集合の並びは先出現順)を確定値として列挙 | 凍結前に強く推奨 |
| R-3 | 推奨 | 16章の台本にFixture 01の時間圧縮方針(早送り編集または一括Acceptナレーション)を明記 | 凍結前推奨 |
| M-1 | 軽微 | 入力文書02のメタ文を資料内視点へ書き換え | 任意 |
| M-2 | 軽微 | 見出しレベル統一 | 任意 |
| M-3 | 軽微 | 冪等性チェックのUI項目に担保レイヤーを注記 | 任意 |
| M-4 | 軽微 | 型差・境界値をsynthetic fixtureへ分離する方針を15章へ明文化 | 任意 |

## 12. 修正後に再確認すべき項目

1. **C-1反映後:** 統合後`member_of`のsourceRefsが、SourceRef同一性規則(documentId+fileName+excerpt完全一致)のもとで確実に2件となること。再Import時にsourceRefsが増えないこと。
2. **R-1反映後:** Duplicate候補提示(name `Nova`→alias一致)が引き続き成立すること。merge後aliasesが`["Nova"]`であること。
3. **R-2反映後:** `final-knowledge.json`と`expected-insights.json`が本書の記載のみから、追加判断なしで機械的に書き起こせること。
4. **仕様側確認(Astra文書の修正対象外、凍結前に実装/仕様オーナーへ確認):**
   - Merge処理されたcandidateIdが`candidateId → registeredEntityId`対応表へmerge先IDで登録されること(追補4章はAcceptのみ明記。F02のRelationship解決がこの挙動に依存する)。
   - Entity Candidateの属性値(ScalarValue)をAttributeClaimへ変換する際、claimのsourceRefに候補のどのSourceRefを用いるか。Astraは全candidateがSourceRefちょうど1件のため実質一意だが、規則として確認し、Astra側に「各candidateはsourceRefsを常に1件だけ持つ」制約を明記することを推奨。
   - Searchのname部分一致が正規化前後どちらの文字列を対象とするか(`Nova`検索で`ＮＯＶＡ`がヒットするか)。デモ台本の依存を排除するか、挙動確定後に台本へ反映。

## 13. Project Astra v1.0として凍結するための条件

1. C-1の反映(全Relationship CandidateのsourceRefs定義と、それに基づく期待値の確定)
2. R-1、R-2の反映(根拠のないaliasの除去と、7 Entityの最終状態の完全列挙)
3. 第12章1〜3の再確認の通過
4. 第12章4の3点を「凍結前確認事項」として仕様/実装側で確定させること(Astra文書自体の凍結は1〜3で可能だが、Fixture生成着手前に4の確定を必須とする)
5. R-3の台本方針の明記(データには影響しないため、凍結と並行して16章のみ更新でも可)

以上を満たした時点で、シナリオ・入力文書・候補・Review操作・期待値のすべてが決定的に固定され、Fixture生成時に追加判断が不要な状態(凍結条件7)に到達する。

---

**最終判定: 軽微な修正後に凍結可能**(C-1は凍結ブロッカーだが、修正は設計変更を伴わない局所的なデータ補完であり、修正後は差分確認のみで凍結してよい)
