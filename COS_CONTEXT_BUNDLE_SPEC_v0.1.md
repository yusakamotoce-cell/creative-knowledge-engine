# CreativeOS Context Bundle 仕様 v0.1

**Status:** Draft for review  
**対象:** CreativeOS / Creative Knowledge Engine  
**実装状態:** 設計のみ。現行Build Week実装の完成条件には追加しない。

---

## 0. 決定事項

1. Context Bundleは、登録済みKnowledgeから生成する**読み取り専用の派生データ**とする。
2. Knowledge Base Export、Context Bundle、Candidate Bundleは別契約とし、兼用しない。
3. Context Bundleの起点は、ユーザーが明示的に選択した登録済みEntityとする。
4. Relationshipの探索は深さ0〜2に制限し、既定値は深さ1、方向はincomingとoutgoingの両方とする。
5. Relationshipを含める場合、両端のEntityを必ず含める。詳細を収められないEntityはstubとして含める。
6. 未解決Conflictは隠さず、正典値、異なるclaim、出典をまとめて含める。
7. 文字数上限を決定的に適用する。モデル固有のtoken数は契約に使用しない。
8. AIの返答はKnowledgeへ直接反映しない。構造化して戻す場合もCandidate Reviewを通す。
9. 同じKnowledge、選択条件、生成設定からは、同じ並び順と同じdigestを生成する。
10. Build Week版のEntity 5種類、Relationship、Tag、AttributeRecordの現行契約は変更しない。

---

## 1. 目的

Context Bundleは、CreativeOSに登録された創作知識のうち、特定の作業に必要な範囲だけを外部または内蔵のAIへ渡すためのデータ契約である。

対象となる作業例：

- 特定Characterを使ったScene案の作成
- Scene本文の下書き
- 設定間の矛盾確認
- Organizationと所属Characterの整理
- ItemやLocationを含む場面条件の提示
- 複数のAIへ同一条件を渡して結果を比較する作業

Context Bundle自体は、文章生成の指示文でもKnowledge Baseのバックアップでもない。登録済みKnowledgeから作られる、追跡可能な入力資料である。

---

## 2. 対象外

v0.1では次を行わない。

- AIによる登録済みEntityの直接更新
- AIによる正典値の自動変更
- AIによる自動merge
- 曖昧一致、意味的類似、EmbeddingによるEntity追加
- Relationshipの無制限探索
- ソース文書全文の自動添付
- AIによる要約をContext Bundle生成処理へ組み込むこと
- model別tokenizerをデータ契約へ組み込むこと
- Projectを新しいEntityTypeとして追加すること
- Context BundleをKnowledge BaseへImportすること

---

## 3. 3つのデータ契約の分離

| 契約 | 方向 | 目的 | 正式ID | Knowledgeへの反映 |
|---|---|---|---|---|
| Knowledge Base Export | アプリケーションから保存先 | バックアップ、復元、移行 | 含む | Import時に復元 |
| Context Bundle | アプリケーションからAI | 選択した登録済みKnowledgeの受け渡し | 含む | 読み取り専用 |
| Candidate Bundle | AIからアプリケーション | 新規Entity、Relationship、属性、Tagの候補提示 | 含まない | Candidate Review後のみ |

Candidate Bundleはcreate候補のみを返す。Context Bundleを受け取ったAIが既存Entityへの変更を提案しても、その返答を直接保存しない。必要な場合は、返答を新しいソース文書として再取り込みし、既存のDuplicate判定とMerge Reviewを通す。

---

## 4. 用語

### Root Entity

ユーザーが明示的に選択した登録済みEntity。文字数上限によって自動除外してはならない。

### Neighbor Entity

Relationship探索によって追加されたEntity。

### Full Entity

name以外に、description、attributes、tags、aliases、出典参照などを含むEntity表現。

### Stub Entity

Relationshipの両端を欠落させないために含める最小表現。`id`、`entityType`、`name`、`detailLevel`だけを持つ。

### Source Mode

出典情報の含め方。

- `none`: 出典を含めない
- `reference`: `documentId`と`fileName`を含め、excerptを含めない
- `excerpt`: excerptを含める

---

## 5. 生成の入力契約

```ts
type ContextPurposePreset =
  | "entity_focus"
  | "scene_drafting"
  | "consistency_review"
  | "world_overview";

type TraversalDirection =
  | "incoming"
  | "outgoing"
  | "both";

type SourceMode =
  | "none"
  | "reference"
  | "excerpt";

interface ContextBundleRequest {
  rootEntityIds: string[];
  purpose: {
    preset: ContextPurposePreset;
    instruction: string;
  };
  traversal: {
    depth: 0 | 1 | 2;
    direction: TraversalDirection;
  };
  sourceMode: SourceMode;
  maxCharacters: number;
  maxExcerptCharacters: number;
}
```

### 検証規則

- `rootEntityIds`は1件以上。
- 全IDが登録済みEntityを参照していること。
- 同一IDは重複排除する。
- `instruction`は空文字を許可する。
- `maxCharacters`は正の整数。
- `sourceMode !== "excerpt"`の場合、`maxExcerptCharacters`は無視する。
- 未登録Candidate、Reject済みCandidate、Review中Candidateは選択できない。
- blocked状態のRelationshipは登録済みKnowledgeではないため対象外。

---

## 6. Relationship探索

### 6.1 深さ

- 深さ0: Root Entityのみ。Entity間Relationshipは、両端がRoot Entityに含まれる場合だけ含める。
- 深さ1: Root Entityに直接接続するEntityまで含める。
- 深さ2: 深さ1で追加されたEntityに直接接続するEntityまで含める。
- 深さ3以上と無制限探索はv0.1では拒否する。

### 6.2 方向

探索方向はincoming、outgoing、bothから選ぶ。ただし、出力するRelationshipの方向は元データの`fromEntityId`と`toEntityId`を維持する。

### 6.3 Endpoint Closure

出力するRelationshipは、両端のEntityを必ず`entities`へ含める。

- 文字数に余裕がある場合: Full Entity
- 文字数に余裕がない場合: Stub Entity
- Stubも収められない場合: そのRelationship自体を除外し、diagnosticsへ記録する

片端だけのRelationshipは出力しない。

### 6.4 重複

登録済みKnowledge Storeで重複排除済みのRelationshipだけを対象とする。Context Bundle生成時に新しいRelationshipを推測しない。

---

## 7. 出力契約

JavaScript Object Notation（JSON）を正規形式とする。MarkdownはJSONから生成する表示形式であり、正規データではない。

```ts
interface ContextBundle {
  schemaVersion: 1;
  bundleId: string;
  generatedAt: string;

  purpose: {
    preset: ContextPurposePreset;
    instruction: string;
  };

  selection: {
    rootEntityIds: string[];
    traversalDepth: 0 | 1 | 2;
    traversalDirection: TraversalDirection;
    sourceMode: SourceMode;
  };

  budget: {
    maxCharacters: number;
    actualCharacters: number;
    truncated: boolean;
  };

  entities: ContextEntity[];
  relationships: ContextRelationship[];
  sources: ContextSourceRef[];

  diagnostics: {
    unresolvedConflictCount: number;
    omittedEntityIds: string[];
    omittedRelationshipIds: string[];
    warnings: ContextWarning[];
  };

  integrity: {
    sourceSnapshotSha256: string;
    bundleSha256: string;
  };
}
```

`generatedAt`はInternational Organization for Standardization（ISO）8601形式の日時文字列とする。

`sourceSnapshotSha256`と`bundleSha256`にはSecure Hash Algorithm 256-bit（SHA-256）を使用する。

---

## 8. Entity表現

```ts
type ContextEntity = ContextFullEntity | ContextStubEntity;

interface ContextStubEntity {
  detailLevel: "stub";
  id: string;
  entityType:
    | "character"
    | "scene"
    | "location"
    | "item"
    | "organization";
  name: string;
}

interface ContextFullEntity {
  detailLevel: "full";
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
  attributes: Record<string, ContextAttribute>;
  tags: string[];
  sourceRefIds: string[];
  updatedAt: string;
}
```

### 並び順

Entityは次の順で決定的に並べる。

1. Root Entityを`rootEntityIds`の正規化済み入力順で配置
2. Neighbor Entityを`entityType`
3. 正規化済み`name`
4. `id`

入力順を保持する必要がない箇所では、保存時の配列順に依存しない。

---

## 9. AttributeとConflict

```ts
type ConflictState =
  | "empty"
  | "none"
  | "resolved"
  | "unresolved";

interface ContextAttribute {
  canonicalValue: string | number | boolean | null;
  conflictState: ConflictState;
  canonicalSourceRefIds: string[];
  claims?: ContextAttributeClaim[];
  conflictResolvedAt?: string;
}

interface ContextAttributeClaim {
  value: string | number | boolean;
  sourceRefId: string;
}
```

### conflictState

- `empty`: `canonicalValue === null`で、有効なclaimがない
- `none`: 型を含めて異なる正規化値が1種類以下
- `resolved`: 異なる正規化値が2種類以上あり、`conflictResolvedAt !== null`
- `unresolved`: 異なる正規化値が2種類以上あり、`conflictResolvedAt === null`

### 出力規則

- `none`では、`claims`を省略してよい。`canonicalSourceRefIds`は保持する。
- `resolved`と`unresolved`では、異なる値を含む全claimを省略せず出力する。
- numberの`17`とstringの`"17"`は異なる値として維持する。
- 未解決ConflictがあるEntityをFull Entityとして含める場合、Conflict情報を部分的に削除してはならない。
- `canonicalValue`が存在しても、`unresolved`では「確定済み」とAIへ表現しない。
- Attribute keyはKnowledge Storeのkeyを保持する。並び順の決定時だけ既存の正規化関数を使用する。

---

## 10. Source Reference

```ts
interface ContextSourceRef {
  id: string;
  documentId: string;
  fileName: string;
  excerpt?: string;
  excerptTruncated?: boolean;
}
```

### ID

`id`は次の連結値からSHA-256で決定的に生成する。

```text
documentId + "\u0000" + fileName + "\u0000" + excerpt
```

### sourceMode

- `none`: `sources`は空配列。各`sourceRefIds`と`canonicalSourceRefIds`も空配列。
- `reference`: `documentId`と`fileName`を含める。excerptは含めない。
- `excerpt`: excerptを含める。上限を超えるexcerptだけをUnicode code point境界で切り、末尾へ`…`を付ける。

異なるSourceRefをAIで統合、要約、言い換えしない。

---

## 11. Relationship表現

```ts
interface ContextRelationship {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  relationType: string;
  description: string;
  sourceRefIds: string[];
}
```

### 並び順

次の順で決定的に並べる。

1. `fromEntityId`
2. `toEntityId`
3. 正規化済み`relationType`
4. `id`

方向は変更しない。A→BとB→Aは別Relationshipである。

---

## 12. 文字数上限

### 12.1 測定方法

`actualCharacters`は、`integrity.bundleSha256`を空文字にした正規JSONを、空白なしで直列化したUnicode code point数とする。

model固有のtoken数は参考表示に使用してよいが、合否判定には使用しない。

### 12.2 優先順位

文字数上限へ収める際は、次の順で保持する。

1. Bundleの必須metadata
2. Root Entityの必須情報
3. Root Entityの未解決Conflict
4. Root Entity同士のRelationship
5. Root Entityに直接接続するRelationshipと、その端点Stub
6. Neighbor EntityのFull情報
7. 解決済みConflictのclaim
8. Source Referenceのexcerpt
9. stable属性の出典参照
10. aliases、tags、updatedAt

ただし、Full Entityとして残す`resolved`または`unresolved`属性のclaimは部分削除しない。収まらないNeighbor EntityはStubへ変更する。

### 12.3 Root Entityが収まらない場合

次を除外してもRoot Entityの必須情報が収まらない場合、Bundle生成を失敗させる。

- Source excerpt
- stable属性のclaim詳細
- aliases
- tags
- updatedAt
- Neighbor Entity
- Neighbor Relationship

エラーコード:

```text
ROOT_CONTENT_EXCEEDS_BUDGET
```

Root Entityのdescription、canonicalValue、Conflict状態を黙って切り詰めない。

### 12.4 警告

```ts
interface ContextWarning {
  code:
    | "TRUNCATED"
    | "ENTITY_DOWNGRADED_TO_STUB"
    | "ENTITY_OMITTED"
    | "RELATIONSHIP_OMITTED"
    | "SOURCE_EXCERPT_TRUNCATED"
    | "UNRESOLVED_CONFLICT_INCLUDED";
  message: string;
  entityId?: string;
  relationshipId?: string;
  sourceRefId?: string;
}
```

---

## 13. Purpose Preset

Presetは優先順位を調整するが、Knowledgeの値を変更しない。

### entity_focus

- Root EntityをFullで保持
- 深さ1を推奨
- 直接RelationshipとNeighbor Entityを優先

### scene_drafting

- SceneをRootにすることを推奨
- `appears_in`、`located_at`、`owns`など、登録済みRelationshipを優先
- Character、Location、Item、Organizationの順ではなく、実際の接続とRootからの距離を優先
- relationType名から未登録の関係を推測しない

### consistency_review

- Conflict情報とSource Referenceを最優先
- 深さ1または2を推奨
- descriptionやcanonicalValueの自動修正は行わない

### world_overview

- 複数Root Entityの選択を前提とする
- Root間Relationshipを優先
- v0.1ではProject単位の自動選択を行わない

---

## 14. AIへ渡す形式

### 正規形式

`context-bundle.json`

### 表示形式

`context-bundle.md`

Markdown rendererは次の順で表示する。

1. Bundle ID、生成日時、purpose
2. 未解決Conflictの注意
3. Root Entity
4. Neighbor Entity
5. Relationship
6. Source Reference
7. 省略情報と警告

AIへ渡すinstructionとKnowledge本文は見出しを分け、instructionをKnowledgeの事実として混入させない。

---

## 15. AIからの返答

### 15.1 文章出力

AIの文章出力はDraftとして扱う。Knowledge Storeへ自動保存しない。

保存する場合も、次を別metadataとして記録する。

- 使用した`bundleId`
- `bundleSha256`
- model名
- 生成日時
- ユーザーが与えた追加指示

このmetadataはEntity、Relationship、AttributeRecordの契約には追加しない。

### 15.2 構造化出力

新しい設定をKnowledgeへ戻す場合は、既存のCandidate Bundleを使用する。

- AIは正式IDを発行しない
- 既存Entityの直接更新を要求しない
- nameまたはaliasの完全一致によるDuplicate候補提示を行う
- Merge、Edit、Reject、Acceptはユーザーが決定する
- 異なる属性claimはConflictとして保持する

### 15.3 禁止

- Context BundleをそのままKnowledge BaseへImport
- AI返答の自動merge
- AI返答によるcanonicalValueの自動置換
- Source Referenceのない変更を正典として自動採用

---

## 16. 生成画面

### Step 1: Root選択

- Search結果またはEntity詳細から複数選択
- 選択したRoot Entityを一覧表示
- 未解決Conflict数を併記

### Step 2: 用途と範囲

- Purpose Preset
- 追加instruction
- Relationship深さ
- 探索方向
- Source Mode
- 文字数上限

### Step 3: Preview

- Full Entity数
- Stub Entity数
- Relationship数
- 未解決Conflict数
- Source Reference数
- 推定文字数
- 省略予定情報
- 実際に送信する内容

### Step 4: ExportまたはSend

- JSONを保存
- Markdownを保存
- 接続済みAIへ送信
- クリップボードへコピー

送信前Previewを省略しない。

### Step 5: 結果

- 文章として保存
- 破棄
- 新しいソース文書としてCandidate抽出へ送る

---

## 17. 決定的生成

同じ入力から同じBundleを生成するため、次を固定する。

- Root Entityの重複排除規則
- Entityの並び順
- Relationshipの並び順
- Attribute keyの並び順
- claimの並び順
- Source Referenceの重複排除規則
- Source Reference ID
- JSONのkey順
- 文字数削減の適用順
- digest計算対象

`generatedAt`と`bundleId`を除いた内容が同じ場合、`sourceSnapshotSha256`は同じ値になる。

`bundleSha256`は、`integrity.bundleSha256`を空文字にして正規直列化したBundle全体から生成する。

---

## 18. 検証項目

### Schema

- 正常なContextBundleRequestを受理する
- Root Entityが0件なら拒否する
- 不明なPurpose Presetを拒否する
- 深さ3以上を拒否する
- 負の文字数上限を拒否する
- 未登録Entity IDを拒否する
- 未知フィールドを拒否する

### 探索

- 深さ0、1、2が正しく分かれる
- incoming、outgoing、bothが正しく分かれる
- 出力Relationshipの方向が維持される
- Relationshipの両端が必ず含まれる
- Budget不足時にNeighbor EntityがStubになる
- Stubも入らないRelationshipは省略される
- Root Entityは自動省略されない

### Attribute

- numberの17とstringの`"17"`を異なるclaimとして出力する
- 未解決Conflictの全claimを含める
- 解決済みConflictを`resolved`として出力する
- stable属性でclaim省略が許可される
- canonicalValueを自動変更しない

### Source Reference

- 同一SourceRefが1件へ重複排除される
- `none`、`reference`、`excerpt`が区別される
- excerpt切り詰めがUnicode code pointを壊さない
- SourceRef IDが決定的である

### Budget

- 同じ入力で同じ省略結果になる
- `actualCharacters <= maxCharacters`
- Root必須情報が収まらない場合に失敗する
- 未解決Conflictを部分削除しない

### Integrity

- 同じKnowledgeと設定から同じdigestを生成する
- Knowledge変更後は`sourceSnapshotSha256`が変わる
- Context Bundle変更後は`bundleSha256`が変わる

### Return Flow

- AI返答がKnowledgeへ自動反映されない
- Candidate Bundle経由でのみ登録候補化される
- Merge時に既存IDを維持する
- 異なるclaim追加時にConflictが未解決へ戻る

---

## 19. 完成条件

1. 登録済みEntityを1件以上選択できる
2. 深さ0〜2でRelationship範囲を生成できる
3. Endpoint Closureが成立する
4. Root Entityが必ず保持される
5. 未解決Conflictが明示される
6. Source Modeを選択できる
7. 文字数上限を決定的に適用できる
8. JSONとMarkdownを同じBundleから生成できる
9. Bundle生成前に実送信内容をPreviewできる
10. 同じ入力から同じdigestを生成できる
11. AI返答がKnowledgeへ直接反映されない
12. 構造化返答はCandidate Reviewを通る
13. 既存Build Weekの完成条件とテストを壊さない

---

## 20. 実装順

### Phase A: 純関数

- Request Schema
- graph traversal
- Endpoint Closure
- Attribute変換
- Source Reference index
- deterministic sort
- budget reducer
- canonical JSON serializer
- SHA-256 digest

### Phase B: Fixtureとテスト

- Project AstraからContext Bundle用Fixtureを作る
- 未解決Conflict
- resolved Conflict
- depth 0〜2
- Stub化
- Relationship省略
- sourceMode 3種類
- budget failure

### Phase C: 表示

- Context Builder画面
- Preview
- JSON renderer
- Markdown renderer

### Phase D: AI接続

- 送信Adapter
- 結果とBundle metadataの関連付け
- Draft保存
- Candidate抽出への再投入

Build Week期間中に実装する場合も、Phase AとPhase Bを先に完了し、既存Candidate Reviewの完成を妨げないこと。
