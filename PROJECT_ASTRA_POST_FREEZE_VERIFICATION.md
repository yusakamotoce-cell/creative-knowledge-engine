# Project Astra Post-Freeze Verification

**Verification date:** 2026-07-16  
**Scope:** Fableレビュー原本と凍結済みProject Astra v1.0の差分確認  
**Change policy:** 本検証では凍結済み資料、Changelog、コード、上位仕様を変更しない

## 1. 確認対象

- `PROJECT_ASTRA_FABLE_REVIEW_v0.1.md`
- `PROJECT_ASTRA_v1.0.md`
- `PROJECT_ASTRA_CHANGELOG_v0.1_to_v1.0.md`

確認開始時のSHA-256：

| ファイル | SHA-256 |
|---|---|
| `PROJECT_ASTRA_FABLE_REVIEW_v0.1.md` | `6F21DC93718470FEB5C59831E52E312141AB95F7694A213DE74189C1831F664A` |
| `PROJECT_ASTRA_v1.0.md` | `19787188C36B738EE6566D4513BCBD9BFB230153799272B7070EE4F35F3876D4` |
| `PROJECT_ASTRA_CHANGELOG_v0.1_to_v1.0.md` | `4D3A0006A997DE182FDAD5C2F653CA933E97A64946D7987DBB593B666DBAFD9A` |

## 2. 結論

Fableレビュー原本を基準にすると、反映状態は次のとおりである。

| ID | 判定 | 要約 |
|---|---|---|
| C-1 | 反映済み | 全7件のRelationship Candidateに、対応文書のSourceRefが1件ずつある。重複`member_of`の統合後SourceRef 2件を決定的に導出できる |
| R-1 | 反映済み | Fixture 02のNova Candidateは`aliases: []`。merge後Nova Arclightは`aliases: ["Nova"]` |
| R-2 | **部分反映** | Nova Arclightの最終状態は完全列挙済み。ただしFable原本が求める7 Entityすべての最終フィールド、Northstar Observatoryのmerge後完全状態、和集合の先出現順は未列挙 |
| R-3 | 反映済み | Fixture 01の早送り／ジャンプカットと、3分デモの操作・Insight提示順が固定済み |

したがって、**C-1、R-1、R-2、R-3がFableレビュー原本どおりすべて完全反映済み、とは判定できない**。未完了はR-2の広い要求範囲である。

今回の指示に従い、`PROJECT_ASTRA_v1.0.md`と既存Changelogは変更しない。本書はpost-freezeの残差記録として扱う。

## 3. C-1確認結果

### 3.1 全Relationship Candidate

次の7件すべてに、所属入力文書の`documentId`、`fileName`、原文中に実在する`excerpt`を持つSourceRefがちょうど1件定義されている。

| Relationship Candidate | Source document | SourceRef件数 | 原文一致 |
|---|---|---:|---|
| `relcand-astra-001-member` | `01-astra-foundation.md` | 1 | 確認済み |
| `relcand-astra-001-carries` | `01-astra-foundation.md` | 1 | 確認済み |
| `relcand-astra-001-appears` | `01-astra-foundation.md` | 1 | 確認済み |
| `relcand-astra-001-located` | `01-astra-foundation.md` | 1 | 確認済み |
| `relcand-astra-002-member` | `02-nova-archive-revision.md` | 1 | 確認済み |
| `relcand-astra-003-appears` | `03-unknown-nova-log.md` | 1 | 確認済み |
| `relcand-astra-004-points` | `04-quiet-prism-card.md` | 1 | 確認済み |

Fableレビューの修正案は短いexcerpt例を示しているが、v1.0はそれらを含む入力文書の完全な一文をexcerptとして固定している。いずれも原文の連続部分であり、SourceRefを一意に再現できるため、C-1の目的を満たす。

### 3.2 重複member_of

Fixture 01とFixture 02の`member_of`は、それぞれ次の異なるSourceRefを持つ。

```text
astra-doc-001
+ 01-astra-foundation.md
+ Fixture 01のmember_of根拠excerpt
```

```text
astra-doc-002
+ 02-nova-archive-revision.md
+ Fixture 02のmember_of根拠excerpt
```

SourceRef同一性を`documentId + fileName + excerpt`の完全一致で判定した場合、この2件は異なる。v1.0第6.6節と第14節は、既存Relationship ID `rel-astra-001`を維持し、統合後のsourceRefsをこの2件とすることを明記している。

**C-1判定:** 反映済み。

## 4. R-1確認結果

v1.0第6.3節の`cand-astra-002-nova`は次の状態である。

```text
name: Nova
aliases: []
```

入力本文に存在しない`Nova Arclight`はCandidate aliasから削除されている。merge候補はCandidate name `Nova`と登録済みNova Arclightのalias `Nova`の正規化後完全一致で引き続き成立する。

v1.0第11節では、merge後Nova Arclightのaliasesが`["Nova"]`と明記されている。

**R-1判定:** 反映済み。

## 5. R-2確認結果

### 5.1 反映済みの部分

v1.0第11節には、merge後Nova Arclightについて次が列挙されている。

- idとEntityType
- name
- aliases
- description
- ageとroleのAttributeRecord
- 各AttributeRecordの`canonicalValue`、全`claims`、`conflictResolvedAt`
- tags
- SourceRef 2件
- `createdAt`維持と`updatedAt`更新の扱い
- name、description、canonicalValueを自動上書きしないこと

これは、凍結作業時に明示された「Nova Arclightを完全列挙する」という狭いR-2要件を満たす。

### 5.2 Fableレビュー原本に対して不足する部分

Fableレビュー原本のR-2は、次まで要求している。

1. 7 Entityすべての最終name、aliases、tags、SourceRef件数
2. 可能なら全Entityのdescription
3. merge対象2件、Nova ArclightとNorthstar Observatoryの最終状態
4. merge時にnameとdescriptionを編集せず既存値を維持すること
5. 和集合の配列順を先出現順として固定すること
6. `final-knowledge.json`を追加判断なしで書き起こせること

v1.0はNova Arclightを完全列挙しているが、第12節の残り6 Entityは名前と件数の一覧にとどまる。Northstar ObservatoryについてもEdit・Merge操作は記載されているが、merge後のaliases、description、attributes、tags、SourceRefs、日時の最終値は完全列挙されていない。また、和集合の順序を「先出現順」とするFixture前提も明記されていない。

既存Changelog第4節はNova Arclightの完全列挙をR-2反映として記録しているが、Fableレビュー原本のR-2全体より範囲が狭い。

このため、Fableレビュー原本だけを基準にした場合、Fixture生成者は少なくともNorthstar Observatoryと残りEntityの`final-knowledge.json`表現について追加判断を必要とする。

**R-2判定:** 部分反映。完全反映ではない。

## 6. R-3確認結果

v1.0第17節は、Fixture 01について次を固定している。

- Nova ArclightのAccept as newだけを通常速度で見せる
- 残り4 Entityと4 Relationshipは早送りまたはジャンプカットする
- カット後にEntity 5件、Relationship 4件を確認する
- 特別な一括Accept機能やデモ専用ドメイン処理を要求しない

必須提示順も次のとおり固定されている。

```text
Accept
→ Merge
→ Edit
→ Relationship重複統合
→ Accept as new
→ Reject
→ blocked Relationship
→ Duplicate
→ Conflict
→ Orphan
```

3分間の各時間帯も表として定義されている。

**R-3判定:** 反映済み。

## 7. M-1〜M-4の扱い

M-1〜M-4は任意改善であり、未反映でも今回の検証を失敗とはしない。現在の状態は次のとおり。

| ID | 現在の状態 | 判定 |
|---|---|---|
| M-1 | 入力文書02は`The creator's canon name is ...`を維持 | 任意改善として未反映 |
| M-2 | v1.0の番号付き主要章は第1〜19節まで`##`で統一 | 任意改善だが反映済み |
| M-3 | 再Import節のUI表示項目に、UIテスト／手動確認という担保レイヤー注記はない | 任意改善として未反映 |
| M-4 | Conflict解決・再開を単体テストへ分ける記述はあるが、型差・boolean・区切り文字衝突をsynthetic fixtureへ分ける一般方針までは明記していない | 任意改善として部分反映 |

指示どおり、これらを理由に`PROJECT_ASTRA_v1.0.md`は変更しない。

## 8. Fixture生成前の実装確認事項

Fableレビュー第12章4項の3点は、v1.0第18節と既存Changelog第6節に、未確定のまま分離されている。

### 8.1 MergeしたcandidateIdの対応表登録規則

v1.0第18.1節は、MergeしたEntity Candidateについて、merge先の既存IDを`candidateId → registeredEntityId`対応表へ登録するか、登録時点と寿命をどうするかを未確定としている。

### 8.2 Candidate属性からAttributeClaimへのSourceRef選択規則

v1.0第18.2節は、Candidateが複数SourceRefを持つ場合、属性claimへどのSourceRefを割り当てるか、複数claimへ展開するかを未確定としている。

### 8.3 Search時の文字列正規化規則

v1.0第18.3節は、Searchのqueryとname・aliases・tagsへ適用する正規化規則を未確定とし、Entity照合用正規化を自動流用しないとしている。

これらはv1.0で最終規則へ昇格しておらず、**Fixture生成を含む該当機能の実装前に解決すべき確認事項として残っていることを確認した**。

## 9. 最終期待値の不変確認

レビュー反映によって最終件数は変わっていない。

| 項目 | 凍結期待値 |
|---|---:|
| Entity | 7 |
| Relationship | 5 |
| Character | 2 |
| Scene | 1 |
| Location | 1 |
| Item | 2 |
| Organization | 1 |
| Orphan | 1 |
| 未解決Conflict | 1 |
| Duplicate | 1組以上（設計上は1組） |

## 10. Changelogに関する注記

既存Changelog第9節には、作成時点でFableレビュー原本が存在しなかったという履歴が記録されている。現在は原本が追加されたため、その記述は「当時の作業状況」を表す履歴として読む。本検証ではChangelogを変更しない。

また、ChangelogのR-2記録はNova Arclightの完全列挙を指しており、Fable原本の7 Entity完全列挙要求をすべて満たしたことの証明にはならない。

## 11. Post-freeze判定

- C-1：合格
- R-1：合格
- R-2：部分合格。Fable原本の完全な要求には未到達
- R-3：合格
- M-1〜M-4：任意改善として現状維持
- Fixture生成前の実装確認事項3点：未確定事項として保持済み

**総合判定:** 凍結版は以前の明示必須範囲を満たしているが、追加されたFableレビュー原本との厳密な差分ではR-2が部分反映である。今回の方針に従い凍結版は変更せず、この差分を本検証資料に記録する。
