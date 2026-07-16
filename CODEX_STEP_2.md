# Codex実装指示
## Creative Knowledge Engine Step 2
### Candidate Reviewドメイン、即時登録、Relationship参照解決
### v1.0

- **Status:** Ready for implementation
- **前提:** Step 0–1完了、Git commit `7a465da`
- **対象リポジトリ:** `C:\Users\tc120\projects\creative-knowledge-engine`
- **実装範囲:** ドメイン処理と自動テスト
- **実装対象外:** User Interface（ユーザーインターフェース、UI）、永続Storage、Project Astra Fixture、Graph、Search、Live AI、Context Bundle

---

## 0. 目的

Step 0–1で固定した型、Schema、正規化、identifier（識別子、ID）発行、Duplicate判定、AttributeRecord、Relationship重複キーを使用し、Candidate Reviewの中核処理を完成させる。

このStepでは、次の処理をReactから独立した純関数として実装する。

```text
Candidate Bundle
↓
Entity Candidate Review
  - Edit
  - Accept as new
  - Merge into existing
  - Reject
↓
candidateId → registeredEntityId対応表
↓
Relationship Candidate Review
  - 参照解決
  - blocked判定
  - manual resolution
  - Accept
  - 重複Relationshipへの統合
  - Reject
↓
Review Session完了
```

Step 2終了時点で、画面やlocalStorageがなくても、自動テストからCandidate Bundleを最後までレビューし、登録済みKnowledgeの最終状態を決定的に得られることを完成条件とする。

---

## 1. 参照資料と優先順位

次を確認する。

- `PROJECT_KICKOFF_v1.0.md`
- `BUILD_WEEK_SPEC_v0.3.md`
- `BUILD_WEEK_SPEC_v0.3_ADDENDUM.md`
- `CODEX_STEP_0-1.md`
- `PROJECT_ASTRA_v1.0.md`
- `PROJECT_ASTRA_CHANGELOG_v0.1_to_v1.0.md`
- `PROJECT_ASTRA_POST_FREEZE_VERIFICATION.md`
- `notes/reviews/STEP_0-1_IMPLEMENTATION_DECISIONS.md`

仕様が競合する場合は次の順を優先する。

1. `BUILD_WEEK_SPEC_v0.3_ADDENDUM.md`
2. `BUILD_WEEK_SPEC_v0.3.md`
3. `PROJECT_KICKOFF_v1.0.md`
4. `CODEX_STEP_0-1.md`
5. 本Step 2指示書

本指示書は上位仕様を変更せず、未確定だった実装規則をStep 2の範囲に限って固定する。

---

## 2. 作業開始前の確認

コード変更前に次を実行し、結果を記録する。

```powershell
git status
git log -1 --oneline
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

期待基準：

- Git作業ツリーがclean
- HEADがStep 0–1完了commit
- 既存73テストが成功
- typecheck、lint、buildが成功

基準を満たさない場合は、Step 2を開始せず原因を報告する。

---

## 3. 今回実装する範囲

### 3.1 Review Session

- Review Sessionの作成
- Entity Review phase
- Relationship Review phase
- Complete phase
- Candidateごとの状態
- 登録済みKnowledgeのimmutableな更新
- `candidateId → registeredEntityId`対応表
- typed error
- 決定的な処理順

### 3.2 Entity Candidate

- Duplicate候補の再計算
- Edit
- Accept as new
- Merge into existing
- Reject
- Accept時の即時登録
- Merge時の既存ID維持
- 同一バッチの後続Candidateへの即時反映
- Candidate属性からAttributeRecordへの変換
- Conflictの生成と再開

### 3.3 Relationship Candidate

- Entity Referenceの決定的な解決
- candidateId対応表による解決
- name／alias完全一致による解決
- entityType指定時の絞り込み
- 複数一致時の未解決扱い
- manual resolution
- blocked判定
- Reject推奨状態
- Accept
- 重複RelationshipへのSourceRef統合
- 既存Relationship ID維持
- Reject

### 3.4 文書とテスト

- 追加のArchitecture Decision Record（設計判断記録、ADR）
- README更新
- 自動テスト
- Step 2実装判断記録

---

## 4. 今回実装しない範囲

- Candidate Review UI
- React stateへの接続
- Import画面
- ファイル読込
- JavaScript Object Notation（JSON）Download
- localStorage
- IndexedDB
- Storage Adapter本実装
- Undo／Redo
- Project Astra Fixture実ファイル
- Project Astra expected JSON
- Search
- Knowledge Insights
- Graph
- Demo Mode画面
- Live AI
- サーバーレス関数
- Context Bundle
- Step 3以降

既存の最小アプリシェルは、必要がなければ変更しない。

---

## 5. ディレクトリ構成

既存構成を維持し、最低限次を追加する。

```text
src/core/
  review/
    reviewSession.ts
    reviewSession.test.ts
    entityReview.ts
    entityReview.test.ts
    relationshipReview.ts
    relationshipReview.test.ts
    referenceResolution.ts
    referenceResolution.test.ts
    candidateAttributes.ts
    candidateAttributes.test.ts
    errors.ts
    types.ts
    index.ts
  knowledge/
    knowledgeState.ts
    knowledgeState.test.ts
  shared/
    clock.ts
    clock.test.ts
```

ファイル分割は現行コードとの整合を優先して調整してよい。ただし、次を守る。

- Reactへ依存しない
- Storageへ依存しない
- Step 0–1の型や正規化処理を複製しない
- 公開面は`index.ts`に限定する
- 循環依存を作らない

---

## 6. 追加する型

型名は現行exportとの衝突を避けて調整してよい。

```ts
interface KnowledgeState {
  entities: Entity[];
  relationships: Relationship[];
}

type ReviewPhase =
  | "entities"
  | "relationships"
  | "complete";

type EntityReviewStatus =
  | "pending"
  | "accepted"
  | "merged"
  | "rejected";

type RelationshipReviewStatus =
  | "pending"
  | "accepted"
  | "merged"
  | "blocked"
  | "rejected";

interface EntityReviewRecord {
  candidateId: string;
  candidate: EntityCandidate;
  status: EntityReviewStatus;
  registeredEntityId: string | null;
  duplicateEntityIds: string[];
}

type RelationshipBlockedReason =
  | "unresolved_from"
  | "unresolved_to"
  | "unresolved_both"
  | "ambiguous_from"
  | "ambiguous_to"
  | "ambiguous_both"
  | "references_rejected_entity";

type RelationshipReviewRecommendation =
  | "reject"
  | null;

interface RelationshipReviewRecord {
  candidateId: string;
  candidate: RelationshipCandidate;
  status: RelationshipReviewStatus;
  resolvedFromEntityId: string | null;
  resolvedToEntityId: string | null;
  blockedReason: RelationshipBlockedReason | null;
  recommendation: RelationshipReviewRecommendation;
  registeredRelationshipId: string | null;
}

interface ReviewSession {
  schemaVersion: 1;
  documentId: string;
  phase: ReviewPhase;
  knowledge: KnowledgeState;
  entityReviews: EntityReviewRecord[];
  relationshipReviews: RelationshipReviewRecord[];
  candidateIdToRegisteredEntityId: Record<string, string>;
}

interface Clock {
  now(): string;
}
```

### 規則

- Review Sessionは入力Candidate Bundleの配列順を維持する。
- 登録済みEntityとRelationshipの既存配列順を不用意にsortしない。
- 新規登録は末尾へ追加する。
- mergeは既存要素の位置を維持して置換する。
- 全更新関数は入力objectを変更しない。
- `schemaVersion`は1だけを許可する。

---

## 7. Review Session作成

次に相当する純関数を作る。

```ts
createReviewSession(input: {
  bundle: CandidateBundle;
  initialKnowledge: KnowledgeState;
}): ReviewSession
```

### 処理

- Candidate Bundleを既存Zod Schemaで検証する。
- initialKnowledgeのEntity ID、Relationship ID、Candidate IDの重複を検証する。
- phaseは`entities`。
- Entity Candidateはすべて`pending`。
- Relationship Candidateも記録するが、Entity phase中は処理できない。
- 各Entity CandidateのDuplicate候補を現在のKnowledgeから計算する。
- 対応表は空で開始する。
- 入力を変更しない。

### 拒否する状態

- Entity Candidate内でcandidateId重複
- Relationship Candidate内でcandidateId重複
- EntityとRelationshipをまたぐcandidateId重複
- initialKnowledge内のEntity ID重複
- initialKnowledge内のRelationship ID重複
- Relationshipが存在しないEntity IDを端点に持つ不正なinitialKnowledge

Context生成と異なり、不正なKnowledgeを自動修復しない。

---

## 8. Entity CandidateのEdit

次に相当する純関数を作る。

```ts
editEntityCandidate(
  session: ReviewSession,
  candidateId: string,
  edit: {
    entityType?: EntityType;
    name?: string;
    aliases?: string[];
    description?: string;
    attributes?: Record<string, ScalarValue>;
    tags?: string[];
  }
): ReviewSession
```

### 規則

- Entity phaseでのみ実行可能。
- statusが`pending`のCandidateだけ編集可能。
- `candidateId`、`sourceRefs`は編集不可。
- 編集後Candidateを既存Schemaで再検証する。
- 編集後はDuplicate候補を再計算する。
- Duplicate候補提示だけを更新し、自動Mergeしない。
- 入力sessionを変更しない。

---

## 9. Candidate属性からAttributeClaimへの変換規則

Step 2で次を確定する。

### 9.1 SourceRef選択

Entity Candidateの属性値には属性単位のSourceRefがないため、次を使用する。

> Candidateが持つ重複排除済みの全SourceRefを、各属性値の根拠として使用する。

CandidateがSourceRefを2件持つ場合、各属性値について同じvalueを持つAttributeClaimを2件生成する。SourceRefが異なるため、同一claimとはみなさない。

### 9.2 SourceRefがないCandidate

- attributesが空なら、sourceRefsが空でもAccept／Merge可能。
- attributesが1件以上あり、sourceRefsが空ならAccept／Mergeを拒否する。
- error codeは`ATTRIBUTE_SOURCE_REF_REQUIRED`。

SourceRefを捏造しない。

### 9.3 Attribute key

- 保存時のattribute keyは`normalizeAttributeKey`の結果を使用する。
- 異なるraw keyが同じ正規化keyへ衝突するCandidateはAccept／Mergeを拒否する。
- error codeは`ATTRIBUTE_KEY_COLLISION`。
- ユーザーがEditで衝突を解消するまで登録しない。

### 9.4 AttributeRecord生成

正規化keyごとに次を行う。

1. Candidate SourceRefの先出現順でclaimを作る。
2. 最初のclaimで`createAttributeRecord`を呼ぶ。
3. 残りを`addAttributeClaim`で追加する。
4. canonicalValueはCandidateのvalue。
5. conflictResolvedAtは`null`。

Candidate内の同一属性値について、SourceRefが複数あってもConflictにはならない。

---

## 10. Accept as new

次に相当する純関数を作る。

```ts
acceptEntityCandidate(
  session: ReviewSession,
  candidateId: string,
  dependencies: {
    idGenerator: IdGenerator;
    clock: Clock;
  }
): ReviewSession
```

### 前提

- Entity phase
- statusが`pending`
- Candidate Schema適合
- Attribute key衝突なし
- 属性がある場合はSourceRefが1件以上

### 登録規則

- `idGenerator.nextId("entity")`で正式IDを即時発行する。
- `createdAt`と`updatedAt`は同じ`clock.now()`。
- name、description、entityTypeはCandidate値。
- aliases、tags、sourceRefsは既存の決定的和集合関数で重複排除し、先出現順を維持する。
- attributesは第9章の規則でAttributeRecordへ変換する。
- EntityをKnowledgeへ即時追加する。
- EntityReviewRecordを`accepted`にする。
- `registeredEntityId`へ新規IDを保存する。
- 対応表へ`candidateId → 新規Entity ID`を即時追加する。
- すべての未処理Entity CandidateのDuplicate候補を、更新後Knowledgeで再計算する。

Duplicate候補があっても、ユーザーが明示的にAccept as newを選んだ場合は登録を許可する。

---

## 11. Merge into existing

次に相当する純関数を作る。

```ts
mergeEntityCandidate(
  session: ReviewSession,
  candidateId: string,
  targetEntityId: string,
  resolution: {
    name?: string;
    description?: string;
  },
  dependencies: {
    clock: Clock;
  }
): ReviewSession
```

### 前提

- Entity phase
- statusが`pending`
- merge先Entityが存在する
- Candidateとmerge先のentityTypeが一致する
- Attribute key衝突なし
- 属性がある場合はSourceRefが1件以上

entityType不一致は`ENTITY_TYPE_MISMATCH`で拒否する。

### Merge規則

- merge先の正式IDを維持する。
- createdAtを維持する。
- updatedAtを`clock.now()`へ更新する。
- nameは`resolution.name`が指定された場合だけ変更し、未指定なら既存値を維持する。
- descriptionは`resolution.description`が指定された場合だけ変更し、未指定なら既存値を維持する。
- aliases、tags、sourceRefsは既存値→Candidate値の先出現順で和集合にする。
- Candidate nameが最終nameと正規化後に異なる場合、Candidate nameをaliases末尾へ追加する。
- canonicalValueを自動上書きしない。
- 既存属性へCandidate claimを`addAttributeClaim`で追加する。
- 新規属性は第9章の規則で作る。
- 異なるclaim追加時は既存`addAttributeClaim`の規則によりConflictを再開する。
- merge先Entityを同じ配列位置で置換する。
- EntityReviewRecordを`merged`にする。
- `registeredEntityId`へmerge先IDを保存する。
- 対応表へ`candidateId → merge先Entity ID`を即時追加する。
- すべての未処理Entity CandidateのDuplicate候補を再計算する。

### 今回確定する未決定事項

MergeされたCandidateも、AcceptされたCandidateと同様に対応表へ登録する。

```text
candidateId → merge先のregisteredEntityId
```

これにより、同一Bundle内のRelationship Candidateはmerge済みCandidateを正式IDへ解決できる。

---

## 12. Reject Entity Candidate

次に相当する純関数を作る。

```ts
rejectEntityCandidate(
  session: ReviewSession,
  candidateId: string
): ReviewSession
```

### 規則

- Entity phase
- statusが`pending`
- Knowledgeを変更しない
- 正式IDを発行しない
- 対応表へ追加しない
- statusを`rejected`にする
- `registeredEntityId`は`null`

Reject済みCandidateは再編集・Accept・Mergeできない。UndoはStep 2対象外。

---

## 13. Relationship phaseへの移行

次に相当する純関数を作る。

```ts
advanceToRelationshipReview(
  session: ReviewSession
): ReviewSession
```

### 前提

すべてのEntity Reviewが次のいずれかであること。

- accepted
- merged
- rejected

1件でもpendingなら`ENTITY_REVIEW_INCOMPLETE`。

### 処理

全Relationship Candidateについて端点解決を行い、Relationship Review Recordを更新する。

---

## 14. Entity Reference解決規則

次に相当する純関数を作る。

```ts
resolveEntityReference(input: {
  reference: EntityReference;
  session: ReviewSession;
  manualEntityId?: string;
}): {
  entityId: string | null;
  reason:
    | "resolved_by_candidate_id"
    | "resolved_by_name"
    | "resolved_manually"
    | "unresolved"
    | "ambiguous"
    | "references_rejected_entity";
}
```

### 解決順

1. manualEntityIdが指定されている場合
2. reference.candidateIdと対応表
3. reference.nameと登録済みEntityのname／aliases完全一致
4. 未解決

manual resolutionはユーザーの明示操作なので最優先とする。

### candidateId

- 対応表に存在すればその正式IDへ解決する。
- 対応するEntity Candidateがrejectedで、name解決もできなければ`references_rejected_entity`。
- 不明candidateIdは未解決。

### name／alias

- Step 0–1の`normalizeEntityName`と名前インデックスを使う。
- reference.entityTypeが指定されている場合、同じentityTypeだけに絞る。
- 一致0件：未解決
- 一致1件：解決
- 一致2件以上：ambiguous
- 曖昧一致、編集距離、Embedding、AI判定を使わない。

### manualEntityId

- 登録済みEntity IDだけを許可する。
- reference.entityTypeがある場合、選択Entityと一致しなければ拒否する。
- 不正IDは`MANUAL_ENTITY_NOT_FOUND`。
- type不一致は`ENTITY_TYPE_MISMATCH`。

---

## 15. blocked判定

from／toの解決結果から次を決定する。

- 両方解決：status `pending`、blockedReason `null`
- fromだけ未解決：`blocked` / `unresolved_from`
- toだけ未解決：`blocked` / `unresolved_to`
- 両方未解決：`blocked` / `unresolved_both`
- fromだけambiguous：`blocked` / `ambiguous_from`
- toだけambiguous：`blocked` / `ambiguous_to`
- 両方ambiguous：`blocked` / `ambiguous_both`
- rejected Candidateだけを参照し代替解決不能：`blocked` / `references_rejected_entity`

`references_rejected_entity`の場合は`recommendation: "reject"`とする。

自動Rejectは行わない。Human review requiredを維持し、ユーザーがRejectを確定する。

---

## 16. Manual Relationship resolution

次に相当する純関数を作る。

```ts
setRelationshipManualResolution(
  session: ReviewSession,
  candidateId: string,
  input: {
    fromEntityId?: string;
    toEntityId?: string;
  }
): ReviewSession
```

### 規則

- Relationship phaseでのみ実行可能。
- statusが`pending`または`blocked`のCandidateだけ変更可能。
- 指定したIDの存在とentityTypeを検証する。
- 指定しなかった側は自動解決規則を再実行する。
- 両端が解決すればstatusを`pending`へ戻す。
- 片端が未解決ならblockedを維持する。
- Candidate本体のfromRef／toRefは変更しない。
- 入力sessionを変更しない。

---

## 17. Accept Relationship Candidate

次に相当する純関数を作る。

```ts
acceptRelationshipCandidate(
  session: ReviewSession,
  candidateId: string,
  dependencies: {
    idGenerator: IdGenerator;
    clock: Clock;
  }
): ReviewSession
```

### 前提

- Relationship phase
- statusが`pending`
- from/toが両方解決済み
- blockedではない
- relationTypeが有効

### 新規Relationship

同じRelationship keyが存在しない場合：

- `idGenerator.nextId("relationship")`で正式IDを発行
- fromEntityId／toEntityIdは解決済みID
- relationTypeはCandidate値を保持する
- descriptionはCandidate値
- sourceRefsは重複排除して先出現順を維持
- createdAt／updatedAtは同じ`clock.now()`
- Knowledgeへ末尾追加
- statusを`accepted`
- registeredRelationshipIdへ新規ID

### 重複Relationship

同じ`fromEntityId + toEntityId + normalized relationType`が存在する場合：

- 新規IDを発行しない
- 既存Relationship IDを維持
- from／to／relationTypeを変更しない
- descriptionを自動上書きしない
- sourceRefsだけを既存→Candidateの先出現順で和集合
- createdAtを維持
- updatedAtを`clock.now()`へ更新
- 同じ配列位置で置換
- statusを`merged`
- registeredRelationshipIdへ既存ID

同一keyの既存Relationshipが複数存在する不正Knowledgeは、自動修復せず`DUPLICATE_RELATIONSHIP_KEY_IN_KNOWLEDGE`で拒否する。

---

## 18. Reject Relationship Candidate

次に相当する純関数を作る。

```ts
rejectRelationshipCandidate(
  session: ReviewSession,
  candidateId: string
): ReviewSession
```

### 規則

- Relationship phase
- statusが`pending`または`blocked`
- Knowledgeを変更しない
- IDを発行しない
- statusを`rejected`
- registeredRelationshipIdは`null`

---

## 19. Review Session完了

次に相当する純関数を作る。

```ts
completeReviewSession(
  session: ReviewSession
): ReviewSession
```

### 前提

すべてのRelationship Reviewが次のいずれかであること。

- accepted
- merged
- rejected

blockedまたはpendingが1件でも残る場合は`RELATIONSHIP_REVIEW_INCOMPLETE`。

完了後はphaseを`complete`にする。Complete後のEdit／Accept／Merge／Rejectは禁止する。

---

## 20. Clock

本番用とテスト用を用意する。

```ts
interface Clock {
  now(): string;
}
```

- 本番用は有効なISO 8601形式の日時文字列を返す。
- テスト用は事前指定した日時を順番に返す。
- 値不足時は`CLOCK_SEQUENCE_EXHAUSTED`。
- ドメイン関数内から直接`new Date()`を呼ばない。

---

## 21. typed error

最低限、次のerror codeを定義する。

```text
INVALID_REVIEW_PHASE
CANDIDATE_NOT_FOUND
CANDIDATE_ALREADY_REVIEWED
ENTITY_NOT_FOUND
ENTITY_TYPE_MISMATCH
ENTITY_REVIEW_INCOMPLETE
RELATIONSHIP_REVIEW_INCOMPLETE
ATTRIBUTE_SOURCE_REF_REQUIRED
ATTRIBUTE_KEY_COLLISION
MANUAL_ENTITY_NOT_FOUND
RELATIONSHIP_BLOCKED
RELATIONSHIP_ENDPOINT_UNRESOLVED
DUPLICATE_CANDIDATE_ID
DUPLICATE_ENTITY_ID
DUPLICATE_RELATIONSHIP_ID
DANGLING_RELATIONSHIP_ENDPOINT
DUPLICATE_RELATIONSHIP_KEY_IN_KNOWLEDGE
CLOCK_SEQUENCE_EXHAUSTED
```

既存の`ID_SEQUENCE_EXHAUSTED`は再利用する。

エラー判定をmessage文字列へ依存させない。

---

## 22. 決定性とMutation禁止

### 決定性

- Candidate処理順はCandidate Bundle配列順。
- SourceRef、aliases、tagsの和集合は先出現順。
- Duplicate候補IDは既存Step 0–1の決定順。
- Attribute key衝突判定は正規化keyで行う。
- name解決の複数候補は自動選択しない。
- ClockとIdGeneratorを注入する。
- Objectの列挙順だけに依存した期待値を作らない。

### Mutation禁止

すべての公開関数について次をテストする。

- session入力を変更しない
- Knowledge入力を変更しない
- Candidate入力を変更しない
- Entity／Relationship／AttributeRecordの既存objectを直接変更しない

---

## 23. 必須自動テスト

既存73件を維持し、最低限次を追加する。

### Review Session

- 正常なSession作成
- phase初期値
- Candidate順維持
- 重複candidateId拒否
- Knowledgeの重複ID拒否
- dangling Relationship拒否
- 入力Mutationなし

### Entity Edit

- name編集
- aliases編集
- attributes編集
- sourceRefs編集不可
- 編集後Duplicate再照合
- reviewed Candidate編集拒否
- Relationship phaseでの編集拒否

### Accept as new

- 正式ID即時発行
- createdAt／updatedAt
- 対応表即時更新
- 後続CandidateのDuplicate候補更新
- Duplicateがあっても明示Accept可能
- attributesからclaim生成
- 複数SourceRefから複数claim生成
- attributesあり／SourceRefなしを拒否
- 正規化attribute keyで保存
- attribute key衝突拒否
- Mutationなし

### Merge

- 既存ID維持
- createdAt維持
- updatedAt更新
- name／description既存値維持
- resolution指定時だけ更新
- aliases／tags／sourceRefs和集合
- Candidate nameのalias追加
- 同entityTypeだけ許可
- 対応表へmerge先ID登録
- canonicalValue非上書き
- 異なるclaimでConflict生成
- 解決済みConflictの再開
- 同値claim別SourceRefで解決状態維持
- 新規属性作成
- 後続Duplicate再照合
- Mutationなし

### Reject Entity

- Knowledge不変
- ID未発行
- 対応表不変
- status更新
- 再処理拒否

### phase移行

- pending Entityがある場合拒否
- 全Entity完了後に移行
- Relationship端点を一括再解決

### Reference解決

- candidateId対応表
- merge済みcandidateId
- name一致
- alias一致
- entityType絞り込み
- 一致0件
- 一致複数
- rejected Candidate
- manual resolution
- manual ID不正
- manual type不一致
- 曖昧一致を行わない

### blocked

- unresolved_from
- unresolved_to
- unresolved_both
- ambiguous_from
- ambiguous_to
- ambiguous_both
- references_rejected_entity
- Reject推奨だが自動Rejectしない
- blockedのAccept禁止
- manual resolution後にpendingへ戻る

### Relationship Accept／Merge

- 新規ID発行
- 方向維持
- description保持
- 重複keyで既存ID維持
- 重複時にID未発行
- SourceRef和集合
- description非自動上書き
- createdAt維持
- updatedAt更新
- 同一keyがKnowledge内に複数ある場合拒否
- Mutationなし

### Relationship Reject／Complete

- blockedからReject可能
- Knowledge不変
- ID未発行
- pending／blockedが残るComplete拒否
- 全件完了後Complete
- Complete後の操作拒否

### 回帰

- 既存73テストが成功
- Candidate Bundle Schema不変
- Entity／Relationship Schema不変
- Step 0–1正規化規則不変
- Project Astra、Context Bundle、上位仕様書のファイル非変更

---

## 24. ADR

最低限、次を追加する。

- ADR-009: Candidate Review is a two-stage state machine
- ADR-010: Merge maps candidate IDs to existing registered entity IDs
- ADR-011: Candidate attribute provenance expands across all candidate SourceRefs
- ADR-012: Review domain uses immutable in-memory KnowledgeState before persistence

各ADRに次を含める。

- Status
- Context
- Decision
- Consequences

---

## 25. READMEと実装判断記録

READMEへ次を追記する。

- Step 2で実装済みの範囲
- UIと永続化は未実装
- Candidate ReviewがEntity→Relationshipの2段階であること
- Accept／Merge時に対応表が即時更新されること
- blocked Relationshipは手動解決またはRejectが必要なこと
- Project Astra Fixtureはまだ未生成

次も作成する。

```text
notes/reviews/STEP_2_IMPLEMENTATION_DECISIONS.md
```

最低限記載する。

- 作業開始時のGit commit
- SourceRef選択規則
- Attribute key衝突規則
- Merge時対応表規則
- Manual resolutionの優先順位
- Relationship重複統合規則
- Search正規化を未決定のまま残したこと
- Project Astra post-freeze R-2をFixture生成前へ持ち越したこと

---

## 26. 品質条件

- TypeScript型エラーなし
- 全テスト成功
- ESLint警告・エラーなし
- Production build成功
- `npm audit`で新規脆弱性なし
- Reactへ依存しない
- Storageへ依存しない
- Mutationなし
- 実行ごとに結果が変わらない
- 不要な依存ライブラリを追加しない
- Step 0–1の公開契約を破壊しない

---

## 27. 完了報告

完了後、次を報告する。

1. 作業開始時のcommitと検証結果
2. 作成・変更ファイル一覧
3. Review Sessionの型とphase
4. Entity Edit
5. Accept as new
6. Merge
7. Reject Entity
8. Candidate属性からAttributeClaimへの変換
9. `candidateId → registeredEntityId`対応表
10. Relationship参照解決
11. blocked判定とmanual resolution
12. Relationship Accept／重複統合／Reject
13. typed error一覧
14. ADR一覧
15. 追加テスト件数と総テスト件数
16. typecheck／lint／build／audit結果
17. 仕様上判断した点
18. Step 3への持ち越し
19. `git status`
20. 変更した凍結資料がないこと

Step 3以降には着手しない。

---

## 28. 完了条件

次をすべて満たした場合にStep 2完了とする。

1. Candidate BundleからReview Sessionを作成できる。
2. Entity CandidateをEdit／Accept／Merge／Rejectできる。
3. AcceptとMergeの直後に対応表とKnowledgeが更新される。
4. 後続CandidateのDuplicate候補が更新される。
5. Candidate属性が出典を失わずAttributeRecordへ変換される。
6. Entity Review完了前にRelationship Reviewへ進めない。
7. Relationship端点を決定的な順で解決できる。
8. 曖昧または未解決のRelationshipがblockedになる。
9. blocked RelationshipをAcceptできない。
10. manual resolutionでblockedを解除できる。
11. 重複Relationshipで既存IDを維持しSourceRefを統合できる。
12. すべてのRelationshipをAccept／Merge／Rejectした後だけSessionを完了できる。
13. 既存Step 0–1テストを含む全テストが成功する。
14. typecheck、lint、buildが成功する。
15. Project Astra、Context Bundle、上位仕様を変更しない。
