# Codex実装指示
## Creative Knowledge Engine Step 0–1
### リポジトリ初期化・ドメイン契約の固定
### 追補統合版

---

## 0. 目的

OpenAI Build Week向けの新規プロジェクトとして、Creative Knowledge Engineを実装する。

このStepでは、後続実装の基礎となる以下を完成させる。

- リポジトリ初期化
- TypeScriptのドメイン型
- Zod Schema
- 名前・属性値正規化
- ID発行
- Duplicate判定用インデックス
- Attribute claim / Conflictの純関数
- Relationship重複キー
- 自動テスト
- Architecture Decision Record（設計判断記録、ADR）

このStepでは次に着手しない。

- Candidate Review画面
- AI接続
- サーバーレス関数
- Graph
- Search
- Import画面
- Storage Adapter本実装
- Project Astra本データ

---

## 1. 技術構成

以下を使用する。

- Vite
- React
- TypeScript
- Zod
- Vitest
- React Testing Library

追加の状態管理ライブラリは導入しない。

Graphライブラリ、OpenAI Software Development Kit（ソフトウェア開発キット、SDK）、バックエンドサーバーはまだ導入しない。

---

## 2. ディレクトリ構成

最低限、次の構成を作る。

```text
creative-knowledge-engine/
  README.md
  package.json
  src/
    app/
    core/
      candidates/
      entities/
      relationships/
      insights/
      import/
      storage/
      shared/
    data/
      demo/
  tests/
  notes/
    adr/
    devlog/
    reviews/
    submission/
```

テストファイルは対象コードの近く、または `tests/` 配下のいずれでもよい。ただし配置規則を統一する。

---

## 3. 初期ADR

次のADRを作成する。

- ADR-001: AI proposes; creators decide
- ADR-002: Knowledge is primary; graph is a view
- ADR-003: Candidate Review is required before registration
- ADR-004: Build Week project is standalone but integration-ready
- ADR-005: Demo mode must work without live AI access
- ADR-006: AI returns create-only candidates
- ADR-007: Entity resolution is deterministic and local
- ADR-008: All cross-entity links are Relationships

各ADRには最低限、次を含める。

- Status
- Context
- Decision
- Consequences

---

## 4. 共通型

### ScalarValue

```ts
type ScalarValue = string | number | boolean;
```

### EntityType

```ts
type EntityType =
  | "character"
  | "scene"
  | "location"
  | "item"
  | "organization";
```

EntityTypeは上記5種類のみとする。

### SourceRef

```ts
interface SourceRef {
  documentId: string;
  fileName: string;
  excerpt: string;
}
```

規則：

- documentId：trim後に非空
- fileName：trim後に非空
- excerpt：空文字を許可
- 未知フィールドは拒否する

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

`conflictResolvedAt` はISO 8601形式の日時文字列または `null` とする。

### Entity

```ts
interface Entity {
  id: string;
  entityType: EntityType;
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

Tagは独立Entityではなく `string[]` とする。

### Relationship

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

---

## 5. Candidate型

AI出力はcreate候補のみとする。

Candidateに以下を含めない。

- action
- 正式ID
- merge先ID
- 正典判定
- confidenceによる自動登録

### EntityCandidate

```ts
interface EntityCandidate {
  candidateId: string;
  entityType: EntityType;
  name: string;
  aliases: string[];
  description: string;
  attributes: Record<string, ScalarValue>;
  tags: string[];
  sourceRefs: SourceRef[];
}
```

### EntityReference

```ts
interface EntityReference {
  candidateId?: string;
  name?: string;
  entityType?: EntityType;
}
```

`candidateId` または `name` の最低一方を必須とする。

### RelationshipCandidate

```ts
interface RelationshipCandidate {
  candidateId: string;
  fromRef: EntityReference;
  toRef: EntityReference;
  relationType: string;
  description: string;
  sourceRefs: SourceRef[];
}
```

### CandidateBundle

```ts
interface CandidateBundle {
  schemaVersion: 1;
  documentId: string;
  entities: EntityCandidate[];
  relationships: RelationshipCandidate[];
}
```

---

## 6. Zod Schema

上記すべてにZod Schemaを実装する。

TypeScript型は、可能な限りZod Schemaから推論し、二重定義による不整合を避ける。

Schemaはstrictとし、未知フィールドを拒否する。

最低限、次を拒否する。

- 未知のentityType
- 空のcandidateId
- 空のname
- 空のrelationType
- candidateIdとnameが両方ないEntityReference
- 属性値としてのnull、配列、オブジェクト
- schemaVersionが1以外
- entities / relationshipsが配列でない
- 不正なSourceRef
- Relationshipのconfidence
- 不明な追加フィールド

---

## 7. 正規化

次の関数を作る。

```ts
normalizeEntityName(value: string): string
normalizeAttributeKey(value: string): string
normalizeScalarValue(value: ScalarValue): string
normalizeRelationType(value: string): string
```

### normalizeEntityName

- Unicode NFKC
- trim
- 連続空白を単一空白へ変換
- 英字小文字化

### normalizeAttributeKey

- Unicode NFKC
- trim
- 連続空白を単一空白へ変換
- 英字小文字化

### normalizeRelationType

- Unicode NFKC
- trim
- 連続空白を単一空白へ変換
- 英字小文字化

### normalizeScalarValue

型を含む安定した比較表現を返す。

例：

```text
string:17
number:17
boolean:true
```

規則：

- string：NFKC、trim、連続空白正規化
- number：有限値のみ、安定した文字列表現
- boolean：true / false
- stringの `"17"` とnumberの `17` を同一扱いしない
- stringの `"true"` とbooleanの `true` を同一扱いしない

---

## 8. ID発行

次のインターフェースを定義する。

```ts
interface IdGenerator {
  nextId(prefix: string): string;
}
```

### 本番用

衝突しにくいIDを生成する。

### テスト用

事前に渡したIDを順番に返す。

ID不足時の挙動を明示し、テストで固定する。推奨は例外を送出すること。

ドメインロジック内から直接 `crypto.randomUUID()` を呼ばず、IdGeneratorを注入する。

---

## 9. Entity名前インデックス

次を実装する。

```ts
buildEntityNameIndex(
  entities: Entity[]
): Map<string, string[]>
```

既存Entityのnameとaliasesを正規化し、Entity IDを検索できるようにする。

要件：

- 同じ正規化名に複数Entity IDを保持可能
- 各ID配列の順序を決定的にする
- Entity入力順に依存しない安定した結果を返す

次も実装する。

```ts
findDuplicateEntityIds(
  candidate: EntityCandidate,
  index: Map<string, string[]>
): string[]
```

Candidateのnameまたはaliasesが、既存Entityのnameまたはaliasesと正規化後に完全一致した場合、そのEntity IDを返す。

曖昧一致、編集距離、意味的類似、AI判定は実装しない。

結果の重複を除き、決定的な順序で返す。

---

## 10. AttributeRecord純関数

### createAttributeRecord

```ts
createAttributeRecord(
  claim: AttributeClaim
): AttributeRecord
```

結果：

- canonicalValue：claim.value
- claims：claimを1件含む
- conflictResolvedAt：null

### addAttributeClaim

```ts
addAttributeClaim(
  record: AttributeRecord,
  claim: AttributeClaim
): AttributeRecord
```

規則：

- 入力を直接変更しない
- 同一claimは重複追加しない
- 同一claimの判定は、同じSourceRefかつ同じ正規化値
- 新しいclaimをclaimsへ追加
- 既存claimsと異なる正規化値が追加された場合、conflictResolvedAtをnullへ戻す
- canonicalValueは自動変更しない

SourceRefの同一性判定規則を明示し、テストで固定する。

推奨：

```text
documentId + fileName + excerpt
```

の完全一致。

### resolveAttributeConflict

```ts
resolveAttributeConflict(
  record: AttributeRecord,
  canonicalValue: ScalarValue,
  resolvedAt: string
): AttributeRecord
```

規則：

- canonicalValueを指定値へ更新
- conflictResolvedAtを指定日時へ更新
- claimsを保持
- 入力を直接変更しない
- resolvedAtは有効なISO 8601日時であることを検証する

### hasUnresolvedAttributeConflict

```ts
hasUnresolvedAttributeConflict(
  record: AttributeRecord
): boolean
```

次の両方を満たす場合のみtrue。

1. claims内に、型を含めて異なる正規化値が2種類以上ある
2. conflictResolvedAtがnull

---

## 11. Relationship重複キー

次を実装する。

```ts
buildRelationshipKey(input: {
  fromEntityId: string;
  toEntityId: string;
  relationType: string;
}): string
```

要件：

- relationTypeを `normalizeRelationType` で正規化
- 方向を維持
- A→BとB→Aは別キー
- 区切り文字による衝突を防ぐ安全な表現にする

単純な文字列連結で曖昧になる場合は、JSON配列の安定した文字列化などを使う。

---

## 12. 追加の小規模ユーティリティ

後続Stepで使えるよう、配列の決定的な和集合関数を用意してよい。

例：

```ts
unionStrings(valuesA: string[], valuesB: string[]): string[]
unionSourceRefs(
  valuesA: SourceRef[],
  valuesB: SourceRef[]
): SourceRef[]
```

ただしStep 0–1の必須範囲を広げすぎない。

実装した場合は、重複排除規則と並び順をテストで固定する。

---

## 13. 自動テスト

最低限、次をテストする。

### Schema

- 正常なCandidateBundleを受理する
- 不明なEntityTypeを拒否する
- name欠落を拒否する
- EntityReferenceの両識別子欠落を拒否する
- 属性値の配列・オブジェクト・nullを拒否する
- schemaVersion不一致を拒否する
- Relationshipのconfidenceを拒否する
- 不明な追加フィールドを拒否する
- 不正なSourceRefを拒否する
- 不正なconflictResolvedAtを拒否する

### 正規化

- 全角英数字がNFKC正規化される
- 前後空白が除去される
- 連続空白が単一化される
- 英字が小文字化される
- number 17とstring `"17"`が異なる
- boolean trueとstring `"true"`が異なる
- relationTypeが決定的に正規化される

### ID発行

- テスト用発行器が指定順にIDを返す
- ID不足時の挙動が固定される
- ドメイン処理がIdGeneratorへ依存できる

### Duplicate判定

- name同士の一致
- Candidate nameと既存aliasの一致
- Candidate aliasと既存nameの一致
- 大文字小文字、全角半角、余分な空白を吸収する
- 一致しない場合は空配列
- 複数一致時の順序が決定的
- 同一IDを重複返却しない

### AttributeRecord

- 最初のclaimがcanonicalValueになる
- claimsが1件で初期化される
- conflictResolvedAtがnullで初期化される
- claim追加でcanonicalValueが自動変更されない
- 同値claimだけではConflictにならない
- 異なる値のclaimで未解決Conflictになる
- Conflict解決後は未解決として検出されない
- 解決後に新しい異なるclaimが追加されると未解決へ戻る
- claimsが解決時にも保持される
- 同一claimが重複追加されない
- number 17とstring `"17"`が異なるclaim値として扱われる
- 入力オブジェクトが変更されない
- 不正なresolvedAtを拒否する

### Relationship key

- 同じ入力から同じキーが生成される
- relationTypeの表記差を正規化する
- 方向がキーに反映される
- 区切り文字を含むIDでも衝突しない

---

## 14. README

Step 0–1終了時点のREADMEに次を記載する。

- プロジェクトの一文説明
- CreativeOSとの関係
- 現在はStep 0–1であること
- セットアップ方法
- 開発サーバー起動方法
- テスト実行方法
- 現在実装済みの範囲
- 未実装の範囲
- AIはcreate候補のみを返すこと
- Entity Resolutionはアプリケーション側の完全一致で行うこと
- Demo Modeを主経路とする方針
- Live AIはまだ未実装であること

---

## 15. 品質条件

- TypeScriptの型エラーがない
- 全自動テストが通る
- Lintを導入した場合はLintが通る
- Domain処理がReact Componentへ依存しない
- Mutationを避け、純関数として実装する
- テスト結果が実行ごとに変動しない
- 不必要な依存ライブラリを導入しない

---

## 16. 完了報告

完了後、次を報告する。

1. 作成・変更ファイル一覧
2. 採用したディレクトリ構成
3. 型とZod Schemaの設計概要
4. 正規化規則
5. ID発行方式
6. Duplicate判定規則
7. AttributeRecordとConflict処理
8. Relationship重複キー
9. テスト件数と結果
10. 仕様上判断が必要だった点
11. 次Stepへ持ち越した事項

Step 2以降には着手しない。
