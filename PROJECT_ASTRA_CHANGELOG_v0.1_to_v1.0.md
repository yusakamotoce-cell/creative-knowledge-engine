# Project Astra Changelog
## v0.1 → v1.0

- **From:** `PROJECT_ASTRA_v0.1.md`
- **To:** `PROJECT_ASTRA_v1.0.md`
- **Freeze date:** 2026-07-16
- **Result:** Frozen
- **Fable review result:** 軽微な修正後に凍結可能

## 1. 概要

Project Astra v0.1へ、Fableレビューで指定されたC-1、R-1、R-2、R-3を反映し、v1.0として凍結した。

最終期待値は変更していない。

| 項目 | v0.1 | v1.0 |
|---|---:|---:|
| Entity | 7 | 7 |
| Relationship | 5 | 5 |
| Orphan | 1 | 1 |
| 未解決Conflict | 1 | 1 |
| Duplicate | 1組以上 | 1組以上 |

## 2. C-1：Relationship CandidateのSourceRef明示

全Relationship Candidateへ、対応する入力文書の`documentId`、`fileName`、`excerpt`を持つSourceRefを明示した。

対象：

1. `relcand-astra-001-member`
2. `relcand-astra-001-carries`
3. `relcand-astra-001-appears`
4. `relcand-astra-001-located`
5. `relcand-astra-002-member`
6. `relcand-astra-003-appears`
7. `relcand-astra-004-points`

重複する`member_of`について、次を明記した。

- Fixture 01 Candidateは`astra-doc-001`のSourceRefを持つ。
- Fixture 02 Candidateは`astra-doc-002`のSourceRefを持つ。
- from/toとrelationTypeの正規化後に同一Relationshipとなる。
- 既存ID `rel-astra-001`を維持する。
- 統合後のsourceRefsは上記2件になる。

これにより、統合後のSourceRef件数を外部前提なしで文書から導出できるようになった。

## 3. R-1：Fixture 02 Nova Candidateのalias修正

変更前：

```text
aliases: ["Nova Arclight"]
```

変更後：

```text
aliases: []
```

入力本文に存在しないaliasをCandidateへ補わないようにした。merge候補はCandidate name `Nova`と、登録済みNova Arclightのalias `Nova`の完全一致によって引き続き成立する。

## 4. R-2：Merge後Nova Arclightの完全列挙

`PROJECT_ASTRA_v1.0.md`第11節へ、次の最終値を完全列挙した。

- id: `ent-astra-001`
- name: `Nova Arclight`
- aliases: `["Nova"]`
- description: `A celestial cartographer in the Astra Survey Corps.`
- attributes:
  - age
    - canonicalValue: number `17`
    - claims: number `17`とnumber `18`、各SourceRef
    - conflictResolvedAt: `null`
  - role
    - canonicalValue: `"celestial cartographer"`
    - 全claimとSourceRef
    - conflictResolvedAt: `null`
- tags: `["cartographer", "astra-survey", "archive-revision"]`
- sourceRefs: `astra-doc-001`と`astra-doc-002`の2件
- createdAt: Fixture 01 Accept時刻を維持
- updatedAt: Fixture 02 Merge確定時刻へ更新

実時刻文字列は固定せず、テストでは固定Clockを使うことを明記した。

## 5. R-3：3分デモ順の固定

Fixture 01は、Nova ArclightのAcceptを通常速度で見せ、残り4 Entityと4 Relationshipを早送りまたはジャンプカットする方式へ固定した。特別な一括Accept機能やデモ専用ドメイン処理は要求しない。

必須提示順を次に固定した。

```text
Accept
↓
Merge
↓
Edit
↓
Relationship重複統合
↓
Accept as new
↓
Reject
↓
blocked Relationship
↓
Duplicate
↓
Conflict
↓
Orphan
```

Graph、Search、Exportはこの後に短く提示する。

## 6. 凍結後の実装確認事項へ分離した項目

次の3点は上位仕様で未確定のため、v1.0で新しい規則を推測・確定していない。

1. Merge時の`candidateId → registeredEntityId`対応表への登録規則
2. Candidate属性をAttributeClaimへ変換するときのSourceRef規則
3. Search時の文字列正規化規則

v1.0第18節に、Fixtureとして必要な最終結果と、未確定の一般実装規則を分けて記載した。

## 7. 回帰テスト契約の追加

v0.1の期待値を維持したまま、次を明示的な回帰条件へ追加した。

- Fixture 02 Nova Candidateのaliasesが空配列である。
- Merge後Nova Arclightがv1.0第11節の最終値を持つ。
- 統合後`member_of`に指定されたSourceRefが2件存在する。
- 同じ入力、Review操作、固定Clock、固定IdGeneratorから同じ結果を得る。

## 8. 変更していない契約

- EntityTypeは5種類のみ。
- TagはEntityの`string[]`。
- AIはcreate候補だけを返す。
- AIは正式ID、merge先、canonicalValueを決定しない。
- Entity照合は定義済み正規化後のname/alias完全一致。
- Relationshipは方向を維持する。
- 同一Relationshipは既存IDを維持し、sourceRefsを統合する。
- AttributeRecordはcanonicalValue、全claims、conflictResolvedAtを保持する。
- number `17`とstring `"17"`を同値扱いしない。
- blocked RelationshipはKnowledgeへ登録しない。
- Demo Modeを審査時の主経路とする。

## 9. ファイル変更範囲

新規作成：

- `PROJECT_ASTRA_v1.0.md`
- `PROJECT_ASTRA_CHANGELOG_v0.1_to_v1.0.md`

変更なし：

- `PROJECT_ASTRA_v0.1.md`
- 上位仕様書
- Context Bundle資料
- JSON例
- 実装コードと設定

`PROJECT_ASTRA_FABLE_REVIEW_v0.1.md`は作業時点で正規作業フォルダおよび旧Downloadsに存在しなかったため、本changelogは依頼本文に明示されたC-1、R-1、R-2、R-3と未確定3点を反映対象としている。レビュー原本にのみ存在する追加指摘は推測していない。
