# Creative Knowledge Engine
## Project Astra 作業引き継ぎ
### WORK_HANDOFF_PROJECT_ASTRA

- **作成基準日:** 2026-07-16
- **対象:** Project Astra v0.1
- **現在状態:** 設計完了、Fableレビュー前、未実装、未凍結
- **引き継ぎ元:** `my-knowledge-base` Workフォルダ

---

## 1. 作業の目的

Project Astraは、Creative Knowledge Engineの公式デモ兼テストデータセットである。

目的は、Build Weekの審査デモに使用できる一貫した創作世界とFixtureを設計し、実際のドメインロジックによって次の状態を再現できるようにすることである。

- Duplicate
- Conflict
- Orphan
- 複数のRelationship
- Organizationと所属者

同じデータセットを、次の用途で継続利用する。

- Demo Mode
- 自動テスト
- 回帰テスト
- README
- スクリーンショット
- 3分デモ動画
- 将来のチュートリアル

本作業では実装やFixtureファイルの生成を行わず、Project Astra v0.1のシナリオ、候補、レビュー操作、期待結果、回帰テスト契約を設計した。

---

## 2. 参照した4つの確定仕様書

次の4文書を確定済み仕様として参照した。

1. `PROJECT_KICKOFF_v1.0.md`
2. `BUILD_WEEK_SPEC_v0.3.md`
3. `BUILD_WEEK_SPEC_v0.3_ADDENDUM.md`
4. `CODEX_STEP_0-1.md`

文書間に差異がある場合の優先順位は次のとおり。

1. `BUILD_WEEK_SPEC_v0.3_ADDENDUM.md`
2. `BUILD_WEEK_SPEC_v0.3.md`
3. `PROJECT_KICKOFF_v1.0.md`
4. `CODEX_STEP_0-1.md`

### 現在のファイル状態

これら4文書は作業時に添付ファイルとして読み取ったが、現在は元のDownloadsパスに存在しない。

新しいフォルダへ引き継ぐ際は、4文書を再取得してProject Astra文書と一緒に保管すること。

Project Astraだけを移動しても、上位仕様を完全には復元できないため注意する。

---

## 3. Project Astraで確定した内容

### 状態

- バージョン：v0.1
- Status：Draft for Fable Review
- Implementation status：未実装
- Freeze status：未凍結
- 次のレビュー：FableによるFixture、シナリオ、デモ成立性レビュー

### シナリオ

Astra Survey Corpsは、星空に現れる異常信号を調査する組織である。

天体地図制作者Nova Arclightは、Northstar Observatoryで観測された信号についてFirst Light Briefingで報告する。

複数資料を統合すると、次の問題が見つかる。

- Novaの年齢が17歳と18歳で競合する
- 正体不明の人物が「ＮＯＶＡ」を名乗っている
- Quiet Prismには所有者、所在地、用途がない
- 同じ所属Relationshipが複数資料に存在する
- `North Star Observatory`という表記揺れがある
- Quiet Prismから未登録のOuter GateへのRelationship候補がある

### 固定入力文書

次の4文書を規定順にImportする。

1. `01-astra-foundation.md`
2. `02-nova-archive-revision.md`
3. `03-unknown-nova-log.md`
4. `04-quiet-prism-card.md`

### Candidate Review操作

データセット内で次の操作を確認する。

- Accept as new
- Merge into existing
- Edit後の再照合
- Reject
- Relationship重複統合
- blocked Relationship
- 同一文書再Importの冪等性

### 最終期待値

- Entity総数：7
- Character：2
- Scene：1
- Location：1
- Item：2
- Organization：1
- Relationship総数：5
- Orphan数：1
- 未解決Conflict数：1
- Duplicate：1組以上

最終登録Entityは次の7件。

1. Nova Arclight
2. Astra Survey Corps
3. Northstar Observatory
4. First Light Briefing
5. Aster Compass
6. ＮＯＶＡ
7. Quiet Prism

Royal KeyとOuter Gateは登録しない。

---

## 4. 各成立条件

### Duplicate

登録済みNova Arclightはaliasとして`Nova`を持つ。

別資料から、全角表記の`ＮＯＶＡ`をnameに持つCharacter Candidateを生成する。

正規化結果は次のとおり。

```text
normalizeEntityName("ＮＯＶＡ")
→ NFKC
→ "NOVA"
→ 英字小文字化
→ "nova"

normalizeEntityName("Nova")
→ "nova"
```

完全一致するため、`ＮＯＶＡ`はNova Arclightへのmerge候補として提示される。

ただし資料だけでは同一人物と断定できないため、ユーザーが`Accept as new`を選択する。

結果としてNova ArclightとＮＯＶＡが別Entityとして登録され、Duplicate Insightが成立する。

曖昧一致、編集距離、意味的類似、AIによる同一人物判定は使用しない。

### Conflict

最初の資料で、Nova Arclightのage claimとしてnumber型の`17`を登録する。

後続資料から、Novaのage claimとしてnumber型の`18`を抽出し、既存Nova ArclightへMergeする。

期待状態：

```ts
{
  canonicalValue: 17,
  claims: [
    { value: 17, sourceRef: /* 基礎設定 */ },
    { value: 18, sourceRef: /* 改訂資料 */ }
  ],
  conflictResolvedAt: null
}
```

最初のclaimである17をcanonicalValueとして維持し、自動上書きしない。

型を含めて異なるclaimが複数存在し、`conflictResolvedAt === null`であるため、未解決Conflictが1件成立する。

### Orphan

Quiet PrismをItemとしてAcceptする。

Quiet PrismからOuter GateへのRelationship Candidateも存在するが、Outer Gateに対応するCandidateまたは登録済みEntityは存在しない。

Relationshipの片端を解決できないため`blocked`となり、Knowledge Storeには登録しない。

その結果、Quiet Prismは登録済みRelationshipの始点にも終点にも含まれず、唯一のOrphanになる。

### Relationship

基礎設定から次の4件を登録する。

1. Nova Arclight → Astra Survey Corps / `member_of`
2. Nova Arclight → Aster Compass / `carries`
3. Nova Arclight → First Light Briefing / `appears_in`
4. First Light Briefing → Northstar Observatory / `located_at`

正体不明のＮＯＶＡから次の1件を追加する。

5. ＮＯＶＡ → First Light Briefing / `appears_in`

最終Relationship総数は5件。

後続資料には、全角表記の`ＭＥＭＢＥＲ＿ＯＦ`も含める。

NFKC、trim、連続空白統合、英字小文字化によって`member_of`となり、既存Relationshipと同一キーになる。

```text
fromEntityId
+
toEntityId
+
normalized relationType
```

新規Relationshipは作成せず、既存IDを維持してsourceRefsを和集合として統合する。

### Organization

Astra Survey CorpsをOrganization Entityとして登録する。

Nova ArclightからAstra Survey Corpsへの`member_of` Relationshipを登録することで、Organizationと所属者の組を成立させる。

---

## 5. 作成・変更したファイル

### 作成

- `PROJECT_ASTRA_v0.1.md`
  - Project Astraのシナリオ
  - 4つの入力文書
  - Entity／Relationship Candidate
  - Review操作
  - 決定的テストID
  - 最終Knowledge Store
  - Insight期待値
  - 回帰テスト契約
  - 3分デモ案
  - Fableレビュー項目
  - 未確定事項
  - 凍結条件

- `WORK_HANDOFF_PROJECT_ASTRA.md`
  - 新しい作業フォルダへ移行するための本引き継ぎ資料

### 変更

- `wiki/log.md`
  - `PROJECT_ASTRA_v0.1.md`保存時の作業記録を追加

### 変更していないもの

- 実装コード
- Codex Step 0–1のコード
- 4つの確定仕様書
- Fixture用Markdownファイル
- Candidate Bundle JSON
- 期待結果JSON
- README
- Graph、UI、Live AI関連ファイル

### Project Astraファイル検証値

```text
File: PROJECT_ASTRA_v0.1.md
Size: 21,465 bytes
Lines: 831
SHA-256: 5206772C3D7A48AF93BACFAA46C768609544D61088132B830642D3EA2AC229E7
```

---

## 6. 現在の完成状態

企画・設計レベルでは、Project Astra v0.1が完成している。

次の内容は定義済み。

- 世界観の最小構成
- 4つの入力文書
- Entity Candidate
- Relationship Candidate
- Review時の操作
- Candidateから正式Entityへの対応
- 最終EntityとRelationship
- Duplicate成立条件
- Conflict成立条件
- Orphan成立条件
- Relationship重複統合
- blocked Relationship
- 再Import冪等性
- 回帰テスト期待値
- 3分デモの推奨経路
- Fableレビュー項目
- 凍結条件

一方、次は未完了。

- Fableレビュー
- Project Astraの凍結
- Fixture実ファイルの生成
- Candidate Bundle JSONの生成
- expected JSONの生成
- 自動テストへの組み込み
- Codex Step 0–1実装
- Step 2以降の実装
- UI
- Graph
- Live AI
- Grokレビュー
- README
- デモ録画
- Build Week提出

---

## 7. 未決定事項

Project Astra v0.1では、次を確定していない。

- キャラクターの外見
- UIの色
- アイコン
- Graphノード形状
- Graphレイアウト
- スクリーンショット構図
- 3分デモの最終ナレーション
- Duplicate Insightの表示単位
- Conflictをデモ中に解決するか
- 本番用IDの文字列形式
- Live AI用プロンプト
- README用の短縮ストーリー

Fableレビューでは、特に次を確認する。

- ＮＯＶＡを別EntityとしてAcceptする判断が自然か
- Duplicate、Conflict、Orphanが実際の規則で成立するか
- blocked RelationshipがOrphan判定へ影響しないか
- Candidate数が3分デモに対して多すぎないか
- Accept、Merge、Edit、Rejectの違いが伝わるか
- Graphに十分な接続があるか
- 長期的な回帰テストデータとして利用できるか

---

## 8. 次に行うべき作業

1. 4つの確定仕様書を再取得する
2. 4仕様書、`PROJECT_ASTRA_v0.1.md`、本引き継ぎ資料を新しいフォルダへコピーする
3. 新しいフォルダで仕様書の優先順位を明記する
4. FableにProject Astra v0.1をレビューさせる
5. レビュー結果をProject Astraへ反映する
6. Duplicate、Conflict、Orphan、Relationship、Organizationの成立条件を再検証する
7. Project Astraを凍結してv1.0とする
8. Codex Step 0–1を確定仕様に従って実装する
9. Step 0–1完了後、後続StepでProject AstraのFixtureファイルを生成する
10. Fixtureを回帰テストへ組み込む

Codex Step 0–1では、Project Astraの本データ、Candidate Review画面、AI接続、Graph、Search、Import画面、Storage Adapter本実装には着手しない。

---

## 9. 再開時に注意する仕様上の制約

### 仕様の優先順位

差異がある場合は必ず次の順で解釈する。

1. Build Week仕様 v0.3追補
2. Build Week仕様 v0.3
3. Project Kickoff v1.0
4. Codex Step 0–1実装指示

Project Astraはこれらの上位仕様を変更しない。

### Entity

Build Week版のEntityは次の5種類のみ。

- Character
- Scene
- Location
- Item
- Organization

RelationshipはEntityではなく接続データ。

Tagは独立Entityではなく、各Entityの`string[]`。

### AIの責務

AIはcreate候補だけを返す。

AIは次を決定しない。

- 正式ID
- action
- merge先
- canonicalValue
- 既存Entityの直接更新
- Duplicateの最終判断

### Entity照合

nameとaliasesに対し、次を順に適用する。

- Unicode NFKC
- 前後空白除去
- 連続空白を単一化
- 英字小文字化

正規化後の完全一致だけを使用する。

次は実装しない。

- 曖昧一致
- 編集距離
- Embedding
- 意味的類似
- AIによる同一Entity判定

### Accept

Entity CandidateをAcceptした時点で正式IDを即時発行し、Knowledge Storeへ登録する。

同一バッチの後続Candidateは、先にAcceptされたEntityも照合対象に含める。

バッチ末尾での一括登録は行わない。

### 2段階レビュー

必ず次の順で処理する。

```text
Entity Candidate Review
↓
candidateId → registeredEntityId対応表
↓
Relationship Candidate Review
```

Relationshipの両端を解決できない場合は`blocked`とし、Acceptを禁止する。

### Conflict

最初のclaimをcanonicalValueにする。

異なるclaimを追加してもcanonicalValueを自動変更しない。

解決時はclaimsを削除せず、`conflictResolvedAt`へISO 8601日時を設定する。

解決後に新しい異なるclaimが追加された場合は、`conflictResolvedAt`を`null`へ戻し、Conflictを再開する。

属性値の型変換は行わない。

- number `17`
- string `"17"`

は異なる値。

### Relationship

同一性は次の組で判定する。

```text
fromEntityId
+
toEntityId
+
normalized relationType
```

同一Relationshipは新規作成せず、既存IDを維持してsourceRefsを統合する。

方向を維持し、A→BとB→Aは別Relationshipとして扱う。

### Import

文書内容のSHA-256を使用する。

同じ内容の文書が処理済みの場合、再登録しない。

Build Week版では強制再解析を実装しない。

### Demo Mode

FixtureによるオフラインDemo Modeが審査時の主経路。

Live AIは補助的な技術実証であり、失敗してもデモ全体が停止してはいけない。

Live AIはブラウザーからOpenAIへ直接接続せず、サーバーレス関数を経由する。

### 作業範囲

Project Astra v0.1はまだ未凍結である。

Fableレビュー前にFixture実装やCodex Step 0–1の範囲拡張を行わない。

Codex Step 0–1では、指示書に明記されたドメイン契約、Schema、正規化、ID発行、Duplicate判定、AttributeRecord純関数、Relationship key、テスト、ADRだけを実装する。
