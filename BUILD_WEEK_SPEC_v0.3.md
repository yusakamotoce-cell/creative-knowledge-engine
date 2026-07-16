# Creative Knowledge Engine
## Build Week仕様 v0.3
### Fableレビュー反映版

---

## 1. 今回の中心機能

Build Week版で証明する製品価値は、次の一連の処理とする。

```text
Import
↓
AI Extraction
↓
Candidate Review
↓
Register / Merge
↓
Knowledge Insights
↓
Graph / Search
```

中心はCandidate Reviewである。

Knowledge Graphは結果を確認する表示手段、Knowledge Insightsは登録された知識の状態を確認する補助機能として扱う。

---

## 2. Build Weekで実装する範囲

### 残す機能

- plain text、Markdown、JSON、貼り付けテキストの取り込み
- 保存済み抽出結果を使うDemo Mode
- GPT-5.6を使ったLive AI抽出
- Candidate Review
  - Accept
  - Reject
  - Edit
  - Merge
- 登録済みKnowledgeの保存
- Knowledge Insights
  - Duplicate
  - Conflict
  - Orphan
  - Statistics
- 読み取り専用Knowledge Graph
- 名前・エイリアス・タグ検索
- Knowledge Base全体の単一JSON Export

### Build Weekでは実装しない機能

- AIによる既存Entity直接更新
- ソース全文検索
- uncertain状態
- Tagの独立Entity化
- Graph上での編集
- 高度なGraphフィルター
- 複数形式Export
- PDF、Word、画像、音声解析
- CreativeOS本体との直接同期
- 曖昧一致・意味的類似・AI判定によるEntity照合

---

## 3. AIとアプリケーションの責務分離

### AIの責務

AIは資料から新規候補を抽出する。

AIが返すもの：

- Entity Candidate
- Relationship Candidate
- 属性候補
- タグ候補
- Source Reference

AIが判断しないもの：

- 新規登録か既存mergeか
- 登録済みEntityの正式ID
- 正典として採用する値
- 既存Entityの更新
- Duplicateの最終判定

### アプリケーションの責務

アプリケーション側が次を行う。

- Candidate BundleのJSON Schema検証
- 正式ID発行
- 名前・エイリアス正規化
- 既存Entityとの照合
- merge候補提示
- 属性Conflict検出
- Relationship参照解決
- Insight生成
- 保存
- 検索
- Export

---

## 4. Candidate Bundle

AIはaction、正式ID、merge先IDを返さない。

```json
{
  "schemaVersion": 1,
  "documentId": "doc-local-key",
  "entities": [
    {
      "candidateId": "candidate-local-key",
      "entityType": "character",
      "name": "Nova",
      "aliases": ["The Architect"],
      "description": "A planner at Astra Academy.",
      "attributes": {
        "age": 17,
        "role": "architect"
      },
      "tags": ["planner"],
      "sourceRefs": [
        {
          "documentId": "doc-local-key",
          "fileName": "nova.md",
          "excerpt": "Nova is a 17-year-old planner..."
        }
      ]
    }
  ],
  "relationships": [
    {
      "candidateId": "relationship-local-key",
      "fromRef": {
        "candidateId": "candidate-local-key"
      },
      "toRef": {
        "name": "Astra Academy",
        "entityType": "organization"
      },
      "relationType": "member_of",
      "description": "",
      "sourceRefs": []
    }
  ]
}
```

`candidateId`はCandidate Bundle内だけで使う一時識別子である。

正式IDは登録時にアプリケーションが発行する。

---

## 5. 登録済みEntity

### EntityType

Build Week版のEntityは次の5種類のみ。

- Character
- Scene
- Location
- Item
- Organization

TagはEntityではなく、各Entityが `string[]` として保持する。

### Entity

```ts
interface Entity {
  id: string;
  entityType:
    | "character"
    | "scene"
    | "location"
    | "item"
    | "organization";
  name: string;
  aliases: string[];
  description: string;
  attributes: Record<string, AttributeRecord>;
  tags: string[];
  sourceRefs: SourceRef[];
  createdAt: string;
  updatedAt: string;
}
```

### SourceRef

```ts
interface SourceRef {
  documentId: string;
  fileName: string;
  excerpt: string;
}
```

### ScalarValue

```ts
type ScalarValue = string | number | boolean;
```

### AttributeClaim

```ts
interface AttributeClaim {
  value: ScalarValue;
  sourceRef: SourceRef;
}
```

### AttributeRecord

```ts
interface AttributeRecord {
  canonicalValue: ScalarValue | null;
  claims: AttributeClaim[];
  conflictResolvedAt: string | null;
}
```

### ID

IDはAIに生成させない。

登録時にアプリケーションのIdGeneratorが発行する。

テスト時には決定的な固定IdGeneratorへ差し替えられる構造にする。

---

## 6. 属性モデル

最初に受理したclaimの値を `canonicalValue` とする。

異なる値のclaimが追加された場合：

- claimsへ追加
- canonicalValueは自動変更しない
- `conflictResolvedAt` を `null` に戻す
- Conflict Insightを未解決として生成する

ユーザーが正典値を選んだ場合：

- canonicalValueを更新
- claimsは保持
- `conflictResolvedAt` に解決日時を記録する

解決後に新しい異なるclaimが追加された場合、Conflictを再び未解決へ戻す。

属性値の型は自動変換しない。

- numberの `17`
- stringの `"17"`

は異なる値として扱う。

---

## 7. Entity照合

### 正規化

照合前に次の処理を行う。

- Unicode NFKC正規化
- 前後空白除去
- 連続空白の単一化
- 英字小文字化

### Duplicate候補

Candidateのname・aliasesを、既存Entityのname・aliasesと比較する。

正規化後の完全一致が1件以上ある場合、merge候補として提示する。

### 行わない照合

- 編集距離
- 曖昧一致
- Embedding
- 意味的類似
- AIによる同一Entity判定

完全一致しないCandidateは新規作成候補として表示し、ユーザーが必要に応じて手動mergeする。

---

## 8. Candidate Review

### Stage 1: Entity Review

Entity Candidateを先に処理する。

各候補に対して次を提供する。

- Accept as new
- Merge into existing
- Edit
- Reject

Editでnameまたはaliasesを変更した場合は、既存Entityとの照合を再実行する。

### Accept時の登録

Accept時に正式IDを即時発行し、Knowledge Storeへ登録する。

登録後に名前インデックスを更新し、同一バッチの後続候補の照合対象へ含める。

### candidateId対応表

Entity Reviewの処理に応じて次を生成する。

```text
candidateId → registeredEntityId
```

RejectされたCandidateには正式IDを割り当てない。

### Stage 2: Relationship Review

Entity Review終了後にRelationship Candidateを処理する。

Relationshipの両端は次の順で解決する。

1. candidateId対応表
2. 正規化したname・aliasの完全一致
3. ユーザーによる手動選択

両端のどちらかが未解決の場合、Relationshipを `blocked` としAcceptできない。

RejectされたEntityだけを参照するRelationshipは、自動的にReject候補として表示する。

---

## 9. Merge

merge先の既存EntityのIDを維持する。

### 和集合として統合するもの

- aliases
- tags
- sourceRefs
- attribute claims

### 自動上書きしないもの

- name
- description
- canonicalValue

候補nameが既存nameと異なる場合はaliasへ追加する。

merge画面では既存値と候補値を並べ、ユーザーが最終値を編集して確定する。

merge後に異なる属性claimが存在する場合、Conflict Insightを未解決として生成する。

---

## 10. Relationship

Entity間の参照はRelationshipへ一本化する。

```ts
interface Relationship {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  relationType: string;
  description: string;
  sourceRefs: SourceRef[];
  createdAt: string;
  updatedAt: string;
}
```

Relationshipにはconfidenceを持たせない。

例：

```text
Nova --member_of--> Astra Academy
Nova --appears_in--> Library Meeting
Library Meeting --located_at--> Central Library
Nova --owns--> Silver Key
```

### 重複排除

以下が一致するRelationshipは同一とみなす。

- fromEntityId
- toEntityId
- 正規化済みrelationType

同一Relationshipが既に存在する場合、新規作成せず `sourceRefs` を和集合として統合する。

方向は維持する。A→BとB→Aは別Relationshipである。

---

## 11. Knowledge Insights

Insightsは登録済みKnowledgeを入力とする純関数として算出する。

### Duplicate Insight

正規化後のnameまたはaliasが一致する複数Entityを検出する。

### Conflict Insight

同一Entity・同一属性に型を含めて異なるclaim値が複数存在し、かつ `conflictResolvedAt === null` の場合に未解決Conflictとして検出する。

### Orphan Insight

Relationshipの始点にも終点にも登場しないEntityを検出する。

### Statistics

- Entity総数
- タイプ別件数
- Relationship総数
- Orphan数
- 未解決Conflict数

---

## 12. 再インポートの冪等性

入力文書の内容からSHA-256ハッシュを生成する。

同じハッシュの文書が処理済みの場合、再登録を行わない。

画面には処理済みであることを表示する。

Build Week版では強制再解析機能は実装しない。

---

## 13. Demo Mode

Demo Modeを審査時の主経路とする。

### Demo Mode

- Project Astraの固定入力ファイル
- 保存済みCandidate Bundle
- 毎回同じ候補
- 毎回同じDuplicate、Conflict、Orphan
- APIキー不要
- オフラインで完走可能

### Live AI Mode

- 補助的な技術実証
- 1ファイル程度を対象
- Candidate BundleをZodで検証
- 不正出力は登録処理へ渡さない
- 失敗してもDemo Modeへ戻れる
- サーバーレス関数を経由
- ブラウザーへAPIキーを置かない

---

## 14. Search

Build Week版では次のみ対応する。

- name部分一致
- aliases部分一致
- tags部分一致

結果をEntityType別に表示する。

Entity詳細には関連Relationshipを表示する。

ソース全文検索は行わない。

---

## 15. Graph

Graphは読み取り専用とする。

### 実装するもの

- Entityノード
- Relationshipエッジ
- 最低限のEntityType識別
- ノードクリック
- Entity詳細表示

### 実装しないもの

- Graph上の追加・編集
- エッジ編集
- 複雑なレイアウト切替
- 高度なフィルター

---

## 16. 保存とExport

Build Week版ではStorage Adapterの背後にlocalStorageを使用する。

将来CreativeOS、IndexedDB、別ストレージへ差し替えられるようにする。

ExportはKnowledge Base全体を単一JSONとしてダウンロードする。

---

## 17. 推奨技術構成

- Vite
- React
- TypeScript
- Zod
- Vitest
- React Testing Library
- Cytoscape.js
- localStorage Storage Adapter
- Fixture Extraction Adapter
- Live AI Extraction Adapter
- サーバーレス関数1本

追加の状態管理ライブラリは初期段階では導入しない。

---

## 18. Project Astraの契約

Project AstraのFixtureは、実際の判定ロジックによって必ず次を発生させる。

- Duplicate：1件以上
- Conflict：1件以上
- Orphan：1件以上
- Relationship：複数件
- Organizationと所属者：1組以上

Duplicateは完全一致規則に合うaliasを含めて成立させる。

この成立条件を自動テストで固定する。

---

## 19. 完成条件

1. Project Astraの複数ファイルを取り込める
2. 固定Candidate BundleがCandidate Reviewに表示される
3. Accept、Reject、Edit、Mergeが動く
4. Accept時に正式IDが即時発行される
5. 同一バッチの後続候補に即時登録結果が反映される
6. Relationship参照が正式IDへ解決される
7. 未解決Relationshipがblockedになる
8. 同一RelationshipのsourceRefsが統合される
9. Duplicate、Conflict、Orphan、Statisticsが表示される
10. Conflict解決後は未解決として再表示されない
11. 解決後に異なるclaimが追加された場合はConflictが再開する
12. 読み取り専用Graphが表示される
13. name・aliases・tagsで検索できる
14. Knowledge BaseをJSONでExportできる
15. 同一文書の再Importで重複登録されない
16. APIキーなしでDemo Modeを完走できる
17. Live AI失敗時にDemo Modeへ戻れる
18. 以下の自動テストが通る
   - Candidate BundleのSchema検証
   - Review状態遷移
   - merge規則
   - Edit後の再照合
   - 同一バッチ内の即時重複検出
   - Entity Reference解決
   - blocked RelationshipのAccept禁止
   - Relationship重複統合
   - Duplicate / Conflict / Orphan / Statistics
   - Conflict解決と再開
   - 再Import冪等性
   - Project AstraのInsight成立
