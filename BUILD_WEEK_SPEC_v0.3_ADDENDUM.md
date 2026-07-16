# Creative Knowledge Engine
## Build Week仕様 v0.3 追補
### 実装着手前の追加確定事項

本書は `BUILD_WEEK_SPEC_v0.3.md` への追補である。矛盾する場合は本追補を優先する。

---

## 1. Conflictの解決状態

### AttributeRecord

```ts
interface AttributeRecord {
  canonicalValue: ScalarValue | null;
  claims: AttributeClaim[];
  conflictResolvedAt: string | null;
}
```

### 初期化

最初に受理したclaimの値を `canonicalValue` とする。

- `canonicalValue`: 最初のclaim.value
- `claims`: 最初のclaimを含む
- `conflictResolvedAt`: `null`

### 未解決Conflict

次を両方満たす場合に未解決Conflictとする。

1. claims内に、型を含めて異なる正規化値が2種類以上ある
2. `conflictResolvedAt === null`

### Conflict解決

ユーザーが正典値を選択した場合：

- canonicalValueを選択値へ更新
- claimsは削除しない
- conflictResolvedAtへISO 8601形式の解決日時を設定

### Conflict再開

解決後に新しい異なるclaimが追加された場合：

- canonicalValueは自動変更しない
- claimsへ追加
- conflictResolvedAtを `null` に戻す
- 未解決Conflictとして再表示する

---

## 2. Live AI接続

Live AIはブラウザーからOpenAIへ直接接続しない。

### 構成

```text
React application
↓
POST /api/extract
↓
Serverless function
↓
OpenAI Responses API
```

### サーバーレス関数の責務

- APIキーを環境変数から読み込む
- モデルをサーバー側で固定する
- 出力形式をCandidate Bundleへ固定する
- 入力文字数を制限する
- OpenAIへリクエストする
- 応答をCandidate Bundleとして返す
- キーや内部エラー詳細をクライアントへ返さない

### 実装時期

AI Adapterのインターフェースは初日に定義する。

実際のLive AI実装とサーバーレス関数は、Fixtureによる中核フロー完成後に追加する。

Demo Modeが主経路であり、Live AIが失敗しても提出デモは完走できなければならない。

---

## 3. Project Astraの検出成立条件

Project AstraのFixtureは、実際の決定的判定規則で次を発生させる。

- Duplicate：1件以上
- Conflict：1件以上
- Orphan：1件以上
- Relationship：複数件
- Organizationと所属者：1組以上

### Duplicateの例

登録済みEntity：

```text
name: Nova Arclight
aliases: ["Nova"]
```

新規Candidate：

```text
name: Nova
```

正規化後のnameとaliasが完全一致するため、Duplicate候補になる。

`Nova` と `Nova Arclight` の類似だけではDuplicateと判定しない。

### 自動テスト

Project Astraを入力したとき、上記Insightが最低件数を満たすことを回帰テストで固定する。

---

## 4. Accept時の即時登録

Entity CandidateをAcceptした時点で、次を行う。

1. 正式IDを発行
2. EntityをKnowledge Storeへ登録
3. `candidateId → registeredEntityId` を更新
4. name / aliasesインデックスを更新
5. 同一バッチの後続Candidateの照合対象へ含める

バッチ末尾での一括登録は行わない。

---

## 5. canonicalValueの初期化

新規属性を登録する場合、最初のclaim値をcanonicalValueとする。

mergeによって既存Entityに新規属性が追加される場合も同じ規則を使う。

既存属性へ異なるclaimが追加された場合、canonicalValueは自動変更しない。

---

## 6. 属性値の型比較

属性値は `string | number | boolean` の型を保持する。

自動型変換は行わない。

- `17` と `"17"` は異なる値
- `true` と `"true"` は異なる値

型を含めた安定した比較表現を使用する。

理由は、型番、コード、先頭ゼロを持つ値などの誤変換を避けるためである。

---

## 7. Relationship重複排除

Relationshipの同一性は次で判定する。

```text
fromEntityId
+
toEntityId
+
normalized relationType
```

relationTypeは以下を正規化する。

- Unicode NFKC
- trim
- 連続空白を単一化
- 英字小文字化

同一RelationshipをAcceptした場合：

- 新規Relationshipを作成しない
- sourceRefsを和集合として統合する
- 既存RelationshipのIDを維持する

方向は維持する。A→BとB→Aは別Relationshipである。

---

## 8. Edit後の再照合

Entity CandidateのnameまたはaliasesをEditした場合、既存Entityとの照合を再実行する。

Edit後に完全一致するEntityが見つかった場合、UIはmerge候補へ切り替える。

---

## 9. 完成条件として必須の自動テスト

次を必須とする。

1. Candidate Bundle Schema検証
2. Accept / Reject / Edit / Mergeの状態遷移
3. merge時の既存ID維持
4. aliases / tags / sourceRefs / claimsの和集合
5. canonicalValueの非自動上書き
6. Edit後の再照合
7. 同一バッチ内の即時Duplicate検出
8. candidateIdからregisteredEntityIdへの参照解決
9. blocked RelationshipのAccept禁止
10. Relationship重複時のsourceRefs統合
11. Duplicate Insight
12. Conflict Insight
13. Orphan Insight
14. Statistics
15. Conflict解決後に未解決として表示されない
16. 解決後に異なるclaimが追加されるとConflictが再開する
17. 同一文書再Importの冪等性
18. Project AstraのFixtureで必要なInsightが必ず成立する

---

## 10. 本追補の位置づけ

本追補の反映後、追加の設計レビューを待たずに実装へ進んでよい。

Project Astraについては、v0.1作成後にFableへ次をレビューさせる。

- Fixtureが実際の判定ロジックで成立するか
- 3分デモの流れが分かりやすいか
- Candidate Review、Insights、Graphの各機能を十分に示せるか
- テストデータとして長期利用できるか
