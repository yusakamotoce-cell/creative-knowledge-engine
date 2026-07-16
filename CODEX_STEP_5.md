# Codex実装指示
## Creative Knowledge Engine Step 5
### Project Astra Fixture、Knowledge Insights、Demo Modeデータ、end-to-end回帰
### v1.0

- **Status:** Ready for implementation
- **前提:** Step 4完了commit、作業ツリーclean
- **対象:** `C:\Users\tc120\projects\creative-knowledge-engine`
- **実装対象外:** UI、Search、Graph、Live AI、Context Bundle、Step 6以降

---

## 0. 目的

`PROJECT_ASTRA_FIXTURE_CONTRACT_v1.0.md`に従い、公式Project Astraを実ファイル化し、ImportからKnowledge適用、Insights、再Importまでをnetworkなしで完走させる。

```text
4 source Markdown
→ SHA-256
→ Fixture Extraction Adapter
→ 4 Candidate Bundle
→ Review
→ 4 apply
→ Knowledge revision 4
→ Insights
→ golden JSON
→ reImport
```

---

## 1. 参照資料

- Build Week仕様と追補
- `PROJECT_KICKOFF_v1.0.md`
- `CODEX_STEP_0-1.md`
- `CODEX_STEP_2.md`
- `CODEX_STEP_3.md`
- `CODEX_STEP_4.md`
- `PROJECT_ASTRA_v1.0.md`
- `PROJECT_ASTRA_FIXTURE_CONTRACT_v1.0.md`
- Fable review、post-freeze verification
- Step 0〜4 implementation decisions

競合時は上位仕様、既存実装契約、Project Astra v1.0、Fixture Contract、本指示書の順。Fixture Contractは最終Fixture値だけを固定する。

---

## 2. 作業前確認

```powershell
git status
git log -5 --oneline
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

- working tree clean
- HEADがStep 4完了commit
- 既存284テスト成功
- typecheck、lint、build成功

満たさない場合は開始しない。

---

## 3. 作成するFixture

```text
src/data/demo/project-astra/
  sources/
    01-astra-foundation.md
    02-nova-archive-revision.md
    03-unknown-nova-log.md
    04-quiet-prism-card.md
  candidates/
    01-astra-foundation.candidates.json
    02-nova-archive-revision.candidates.json
    03-unknown-nova-log.candidates.json
    04-quiet-prism-card.candidates.json
  expected/
    final-knowledge.json
    expected-insights.json
  fixture-manifest.json
  loader.ts
  runner.ts
  index.ts
```

source本文は`PROJECT_ASTRA_v1.0.md`どおり。UTF-8、BOMなし、LF、末尾改行1個。任意改善を混入させない。

Candidate JSONは既存Schema適合、Candidate順固定、全Relationship CandidateにSourceRef 1件、`cand-astra-002-nova.aliases`は`[]`。action、正式ID、merge先、canonicalValue、confidenceは禁止。

---

## 4. manifest

strict Schemaを実装する。

```ts
interface ProjectAstraFixtureManifest {
  schemaVersion: 1;
  sourceFiles: Array<{
    order: number;
    fileName: string;
    format: "markdown";
    mediaType: "text/markdown";
    contentSha256: string;
    documentId: string;
    reviewSessionId: string;
  }>;
  expected: {
    finalKnowledgeFile: "expected/final-knowledge.json";
    expectedInsightsFile: "expected/expected-insights.json";
    finalKnowledgeRevision: 4;
  };
}
```

- orderは1〜4、重複なし
- fileName、documentId、reviewSessionId重複なし
- hashはlowercase 64 hex
- source raw contentから再計算して一致をテスト
- unknown field拒否

---

## 5. Knowledge Insights

登録済みKnowledgeだけを入力にする純関数として実装する。

```ts
interface DuplicateInsight {
  normalizedKey: string;
  entityIds: string[];
}

interface ConflictInsight {
  entityId: string;
  attributeKey: string;
  canonicalValue: ScalarValue | null;
  claimValues: ScalarValue[];
  conflictResolvedAt: string | null;
}

interface KnowledgeStatistics {
  entityCount: number;
  entityCountByType: Record<EntityType, number>;
  relationshipCount: number;
  orphanCount: number;
  unresolvedConflictCount: number;
}

interface KnowledgeInsights {
  duplicateGroups: DuplicateInsight[];
  conflicts: ConflictInsight[];
  orphanEntityIds: string[];
  statistics: KnowledgeStatistics;
}
```

### Duplicate

- nameとaliasesを既存正規化で比較
- 同じnormalized keyを共有する異なるEntity IDが2件以上
- 同一Entity内だけのname／alias重複は除外
- normalized key順、entityIdsはKnowledge順
- Astraは`nova`の1組

### Conflict

- `hasUnresolvedAttributeConflict`を再利用
- resolvedは除外
- Entity順、attribute keyの決定順、claims先出現順
- Astraはent-001 ageのみ

### Orphan

- 登録済みRelationshipのfrom／toにないEntity
- blocked Candidateは使わない
- Entity順
- Astraはent-007

### Statistics

5 EntityTypeを0件でも常に含める。

```ts
calculateKnowledgeInsights(knowledge): KnowledgeInsights
```

Mutation禁止。

---

## 6. Fixture loader

- coreドメインへfilesystem依存を持ち込まない
- Vite raw importまたはdata層の適切な方法でsourceを読み込む
- Candidate Bundle、manifest、expected JSONをSchema検証
- load結果は参照分離
- source hash検証関数を提供
- expected Knowledgeは既存Knowledge Schemaで検証
- expected Insightsは新Schemaで検証

---

## 7. Project Astra runner

```ts
async function runProjectAstraFixture(): Promise<{
  snapshot: StorageSnapshot;
  insights: KnowledgeInsights;
}>
```

依存：

- MemoryStorageAdapter
- FixtureExtractionAdapter
- Sha256Hasher
- Fixture ContractのSequenceIdGenerator
- Fixture ContractのSequenceClock

各文書で：

1. `importDocument`
2. Session取得
3. 規定Entity Review
4. Relationship phaseへ移行
5. 規定Relationship Review
6. complete
7. 更新Session保存
8. `applyCompletedReviewSession`

次文書は前文書apply後にImportする。

---

## 8. Review Session保存service

Step 4までに存在しない場合、最小Application serviceを追加する。

```ts
saveReviewSession(sessionId, updatedSession, { storage })
```

- 既存Session IDで置換
- documentIdとbaseKnowledgeRevision不変
- root Knowledge、revision、applications不変
- Storage save 1回
- 不正Session／不一致IDを拒否
- UI依存なし
- Memory Adapter内部を直接変更しない
- typed errorとテストを追加

---

## 9. Review操作

### Document 01

5 Entity Accept、4 Relationship Accept、complete、apply。

### Document 02

- Novaをent-astra-001へMerge
- Observatoryを`Northstar Observatory`へEdit後ent-astra-003へMerge
- member_ofをAcceptしrel-astra-001へ統合
- complete、apply

### Document 03

- Duplicate候補があってもＮＯＶＡをAccept as new
- appears_in Accept
- complete、apply

### Document 04

- Quiet Prism Accept
- Royal Key Reject
- points_toは`unresolved_to` blockedを確認後Reject
- complete、apply

---

## 10. Golden JSON

### final-knowledge.json

Fixture Contractの全Entity／Relationshipと完全一致。

- Array順
- aliases、tags、SourceRefs、claims
- timestamps
- descriptions
- canonicalValue
- conflictResolvedAt

### expected-insights.json

Fixture Contractの期待値と一致。

### 比較規則

- Schema parse後のdeep equality
- object key順不問
- array順一致必須
- goldenをテスト中に自動更新しない
- Storage全体の巨大goldenは作らない

---

## 11. end-to-end期待値

- knowledgeRevision: 4
- Entity: 7
- Relationship: 5
- Review Session: 4、全complete
- Review Application: 4
- Imported Document: 4
- Registry Entry: 4
- base revisions: 0,1,2,3
- applications: 0→1→2→3→4
- final Knowledge golden一致
- Insights golden一致

必須分岐：

- ＮＯＶＡにent-001のDuplicate候補
- 明示Acceptでent-006
- age 17／18、canonical 17の未解決Conflict
- ObservatoryはEdit前不一致、Edit後Duplicate候補
- Merge後name／description既存維持
- member_ofはrel-001へ統合、SourceRef 2件
- Royal Key RejectでID未発行
- points_to blocked、Accept不可、Reject
- Quiet Prismが唯一のOrphan

---

## 12. 再Import

最終SnapshotでDocument 01を同じraw contentで再Import。

- `already_imported`
- Extraction、ID、Clock、save 0回
- Snapshot deep equality
- Knowledge 7／5、revision 4
- claims、SourceRefs、Insights不変

---

## 13. Local Storage往復

最終SnapshotをLocalStorageAdapterでsave/load。

- versioned Envelope
- deep equality
- initializeApplicationでも一致
- raw値破損時は明示error
- 自動resetなし

---

## 14. Insights単体テスト

小さいsynthetic Knowledgeで：

- Duplicateなし
- 同一Entity内重複除外
- 3 Entity duplicate group
- resolved Conflict除外
- numberとstringの型差
- Relationshipなしで全Entity orphan
- 0件EntityTypeもStatisticsに含む
- Mutationなし
- 決定順

Astraへ境界ケースを追加しない。

---

## 15. 必須テスト

既存284件を維持し、最低限：

### Fixture

- 4 source存在、raw本文一致
- BOMなし、LF、末尾改行
- 4 Candidate Bundle Schema
- documentId一致
- Relationship SourceRefあり
- manifest hash一致
- golden Schema

### Runner

- 4 import
- 4 complete
- 4 apply
- revision 4
- fixed ID／Clock sequenceを過不足なく消費
- final Knowledge一致
- Insights一致

### 分岐

- Merge
- Edit後Merge
- DuplicateでもAccept
- Reject
- blocked Reject
- Relationship merge

### 回帰

- reImport
- Local Storage round trip
- existing tests
- frozen docs非変更
- Context Bundle資料非変更

---

## 16. ADR

追加：

- ADR-024: Project Astra is the official end-to-end regression fixture
- ADR-025: Golden fixture files are immutable test inputs
- ADR-026: Knowledge Insights are pure projections of registered Knowledge
- ADR-027: Demo Mode uses the same fixture adapter and domain workflow as tests
- ADR-028: Project Astra and synthetic boundary fixtures remain separate

---

## 17. READMEと判断記録

README：

- Project Astra Demo fixture完成
- API key不要
- 4文書、7 Entity、5 Relationship
- Duplicate／Conflict／Orphan
- Fixture test実行方法
- UI、Search、Graph未実装

作成：

```text
notes/reviews/STEP_5_IMPLEMENTATION_DECISIONS.md
```

記録：

- 開始commit
- Fixture Contract適用
- post-freeze R-2解消
- encoding／改行
- hash生成
- fixed ID／Clock
- Insights順序
- golden更新禁止
- Review Session保存service
- Demo Modeとtestの共通経路
- Search正規化未決定
- Context Bundle未実装

---

## 18. 品質条件

- 全テスト成功
- typecheck、lint、build成功
- `npm audit --offline` 0
- 新規依存は原則なし
- InsightsはReact非依存
- runnerはnetwork非依存
- source／goldenを自動修正しない
- Project Astra v1.0、Fable review、上位仕様を変更しない

---

## 19. 完了報告

1. 開始commitと事前検証
2. 作成／変更ファイル
3. source Markdown
4. Candidate Bundle
5. manifest／hash
6. final Knowledge golden
7. expected Insights golden
8. Insights
9. loader
10. runner
11. Review Session保存境界
12. end-to-end
13. Duplicate
14. Conflict
15. Orphan
16. Relationship重複
17. blocked／Reject
18. reImport
19. Local Storage往復
20. ADR
21. 追加／総テスト数
22. typecheck／lint／build／audit
23. 判断事項
24. Step 6持ち越し
25. git status
26. 凍結資料非変更

Step 6以降には着手しない。

---

## 20. 完了条件

1. 4 sourceと4 Candidate Bundleが実ファイル化
2. manifest hashがraw contentと一致
3. Importからapplyまで完走
4. final Knowledge golden一致
5. Insights golden一致
6. Entity 7、Relationship 5、revision 4
7. Duplicate、Conflict、Orphanが契約どおり
8. member_of SourceRef 2件
9. blocked RelationshipがKnowledgeへ入らない
10. reImportで状態不変
11. Local Storage往復一致
12. post-freeze R-2解消
13. 既存284テストを含む全テスト成功
14. typecheck、lint、build成功
15. UI、Search、Graph、Live AI、Context Bundleへ着手しない
