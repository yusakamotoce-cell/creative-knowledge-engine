# Codex依頼書：Context Bundle設計の固定と純関数の準備

## 目的

`COS_CONTEXT_BUNDLE_SPEC_v0.1.md`をレビューし、現行Build Week契約と矛盾しない実装単位へ分解する。

この依頼では既存UI、Storage、Candidate Review、Knowledge Base Exportを変更しない。コード実装へ進む場合も、Context Bundleの純関数と自動テストを独立ディレクトリへ追加するところまでとする。

## 参照

- `BUILD_WEEK_SPEC_v0.3.md`
- `CODEX_STEP_0-1.md`
- `COS_CONTEXT_BUNDLE_SPEC_v0.1.md`
- `context-bundle-project-astra-example.json`

## 守る契約

- EntityTypeはCharacter、Scene、Location、Item、Organizationの5種類のみ
- Tagは各Entityの`string[]`
- RelationshipはEntity間の接続データ
- Relationshipの方向を維持
- AttributeRecordは`canonicalValue`、全`claims`、`conflictResolvedAt`を保持
- numberとstringを同値扱いしない
- Entity照合規則を変更しない
- AIは正式ID、merge先ID、canonicalValueの最終判断を行わない
- AI返答をKnowledgeへ直接適用しない
- 現行Build Week完成条件を変更しない

## Step 1：契約レビュー

次を重要度順に指摘する。

1. 現行Entity、Relationship、AttributeRecord、SourceRefとの型矛盾
2. Candidate Bundle、Knowledge Base Exportとの責務重複
3. 決定的生成を壊す項目
4. 文字数上限処理でConflictやRelationshipの意味が欠落する条件
5. Project Astra Fixtureで再現できない検証項目
6. 過剰な仕様、Build Week後まで延期できる項目

各指摘には、該当箇所、問題、具体的な修正案、修正しない場合の影響を記載する。

## Step 2：実装単位

レビュー後、次の構成案を作成する。

```text
src/core/context/
  requestSchema.ts
  traverseContextGraph.ts
  buildContextEntities.ts
  buildSourceIndex.ts
  reduceContextToBudget.ts
  canonicalizeContextBundle.ts
  hashContextBundle.ts
  renderContextMarkdown.ts
  types.ts
```

既存の正規化関数、ScalarValue、Entity、Relationship、SourceRef型を再利用し、同じ処理を別実装しない。

## Step 3：テスト一覧

最低限、次を具体的なテスト名へ変換する。

- depth 0、1、2
- incoming、outgoing、both
- endpoint closure
- FullからStubへの変更
- Relationship省略
- Root保持
- unresolved Conflict全claim保持
- resolved Conflict表示
- number 17とstring `"17"`の区別
- sourceMode 3種類
- SourceRef重複排除
- Unicode excerpt切り詰め
- 決定的sort
- 同一入力の同一digest
- budget failure

## Step 4：成果物

コード変更前に次を出力する。

1. `CONTEXT_BUNDLE_REVIEW.md`
2. `CONTEXT_BUNDLE_IMPLEMENTATION_PLAN.md`
3. `CONTEXT_BUNDLE_TEST_MATRIX.md`

実装許可が明示されていない場合、コードは変更しない。
