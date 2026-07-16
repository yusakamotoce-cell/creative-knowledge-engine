# Creative Knowledge Engine
## Project Kickoff v1.0

- **Project status:** 中核アーキテクチャ確定、実装開始直前
- **Primary milestone:** OpenAI Build Week提出
- **Long-term position:** CreativeOSの中核モジュール兼、単独利用可能な継続プロダクト
- **Document role:** プロジェクトの正本（Single Source of Truth）

---

## 1. プロジェクトの位置づけ

Creative Knowledge Engineは、CreativeOSの中核モジュールとして設計する。

Build Week向けの一時的なデモではなく、今後継続して開発する独立プロダクトである。Build Weekは、その最初の公開・提出機会として位置づける。

CreativeOS全体が、キャラクター、シーン、画像、プロンプト、タイムライン、外部資料などを扱う創作管理基盤であるのに対し、Creative Knowledge Engineは次の課題に集中する。

> 散らばった創作資料を、作者が確認・管理できる構造化知識へ変換する。

---

## 2. 解決する課題

生成AIの普及により、個人でも短時間に多数のキャラクター、世界、場面、設定、アイデアを生み出せるようになった。

一方で、創作量が増えるほど次の問題が生じる。

- 設定資料が複数のファイルやサービスに散在する
- 同一人物・同一設定が重複して登録される
- 古い設定と新しい設定が競合する
- どこに何を書いたか分からなくなる
- 生まれたキャラクターや世界が再利用されず、消耗品のように失われる
- 資料同士の関係が把握しにくい

Creative Knowledge Engineは、散らばった創作知識を次の状態へ変える。

- 構造化されている
- 検索できる
- 関係性を確認できる
- 出典を追跡できる
- 人間によるレビューを経ている
- 再利用できる

本製品は物語生成ツールではない。創作者が管理権を持つ **Creative Knowledge Manager** である。

---

## 3. Vision / Philosophy

### Vision

> Turn scattered creative knowledge into a structured, searchable, creator-controlled knowledge base.

### Internal philosophy

- AIは創作を代行するのではなく、整理・接続・確認を支援する
- 創作者が最終決定権を持つ
- 生み出されたキャラクター、世界、設定、場面を消耗品として扱わない
- 蓄積された創作知識を、次の創作へ再利用できる状態にする
- Knowledgeが主であり、Graphは表示方法の一つである

### Product image

CreativeOS全体を「創作者が乗る車」と考えた場合、Creative Knowledge Engineは、蓄積された創作知識を推進力へ変え、検索・関係表示・Insightによって進行を支援する中核処理系に相当する。

ただし、Build Weekの外部説明では比喩を前面に出さず、具体的な利用体験を優先する。

---

## 4. 絶対に守る設計原則

### P-001: AI proposes; creators decide

AIは候補を提案する。正典として採用するかは人間が決定する。

### P-002: Knowledge is primary; graph is a view

Knowledgeが主であり、Graphはその表示方法の一つである。

### P-003: Import never destroys source material

Import時に原文を変更・上書きしない。

### P-004: Human review is required

Knowledge登録には必ずCandidate Reviewを通す。

### P-005: Integration-ready architecture

単独利用できるが、将来CreativeOSへ接続できる構造にする。

### P-006: AI returns create candidates only

AIは既存Knowledgeを直接更新しない。正式ID、merge先、正典値を決めない。

### P-007: Entity resolution is deterministic and local

ID発行、名前正規化、重複判定、競合検出、merge、参照解決はアプリケーション側で決定論的に行う。

### P-008: Cross-entity links are Relationships

Entity間の接続はRelationshipへ一本化し、各Entity内部に重複して保持しない。

### P-009: Demo mode is the judging path

Fixtureによるオフラインデモを審査時の主経路とし、Live AIは補助的な技術実証とする。

---

## 5. 中核ワークフロー

```text
Import
↓
Extraction Adapter
↓
Candidate Bundle
↓
Candidate Review
↓
Knowledge Store
↓
Knowledge Insights
↓
Graph
↓
Search
```

Build Weekでは、Graph単体やAI抽出単体ではなく、この一連の流れが完成していることを示す。

特に重要な体験はCandidate Reviewである。

- Accept
- Reject
- Edit
- Merge

承認された候補だけがKnowledgeになる。

---

## 6. Build Week MVP

### 対象

- plain text、Markdown、JSON、貼り付けテキストのImport
- GPT-5.6による構造化Extraction
- FixtureによるオフラインDemo Mode
- Candidate Review
- Entity / Relationship登録
- Duplicate Insight
- Conflict Insight
- Orphan Insight
- Statistics
- 読み取り専用Graph
- 名前・エイリアス・タグ検索
- Knowledge Base全体のJSON Export
- 文書内容SHA-256による再インポート冪等化

### 対象外

- PDF
- OCR
- 画像解析
- 音声解析
- Word
- Obsidian Sync
- Google Drive等の外部サービス同期
- Graph編集
- AIによる既存Knowledge直接更新
- AIによる自動merge
- 曖昧一致・意味的類似によるEntity照合
- ソース全文検索
- 複数形式のExport

---

## 7. 確定済みのデータ契約

### Entityは5種類のみ

- Character
- Scene
- Location
- Item
- Organization

### Relationship

Entity間の接続データとして保持する。

### Tag

各Entityが `string[]` として保持する。独立Entityにはしない。

### AttributeRecord

- `canonicalValue`
- 全 `claims`
- `conflictResolvedAt`

を保持する。

解決後に異なるclaimが追加された場合、Conflictを未解決へ戻す。

### Entity照合

以下の正規化後に、nameまたはaliasの完全一致のみを使う。

- Unicode NFKC
- 前後空白除去
- 連続空白の単一化
- 英字小文字化

曖昧一致、編集距離、Embedding、AI判定はBuild Week版では使わない。

### Accept

Accept時に正式IDを即時発行し、Knowledge Storeへ登録する。

同一バッチの後続候補は、先にAcceptされたEntityも照合対象に含める。

### 2段階レビュー

1. Entity Candidateをレビュー
2. `candidateId → registeredEntityId` 対応表を作成
3. Relationship Candidateをレビュー

Relationshipの両端が解決できない場合は `blocked` とし、Acceptできない。

### Relationship重複

`fromEntityId + toEntityId + normalized relationType` が同じ場合は、新規作成せず `sourceRefs` を統合する。

---

## 8. Project Astra

Project Astraは、Creative Knowledge Engineの公式サンプルデータセットとする。

用途：

- Build Weekデモ
- 自動テスト
- README
- スクリーンショット
- 動画
- 回帰テスト
- 将来のチュートリアル

最低限、実際の判定ロジックによって次が発生するFixtureを用意する。

- Duplicate：1件以上
- Conflict：1件以上
- Orphan：1件以上
- Relationship：複数件
- Organizationと所属者：1組以上

Duplicateは名前の類似ではなく、正規化後のnameまたはalias完全一致で成立させる。

Project Astraの世界観、キャラクター、資料構成は未確定であり、次の作業でv0.1を作成する。

---

## 9. 技術構成

- React
- TypeScript
- Vite
- Zod
- Vitest
- React Testing Library
- Cytoscape.js
- Storage Adapter
- Fixture Extraction Adapter
- Live AI Extraction Adapter
- localStorage（Build Week版の保存）
- サーバーレス関数1本（Live AI用）

Live AIでは、ブラウザーへOpenAI APIキーを配置しない。

---

## 10. LLMの役割分担

### GPT

- Product Requirements Document（製品要求仕様書）
- アーキテクチャ
- 仕様統合
- Project Astra設計
- Codexへの指示
- 提出資料
- 全体進行

### Codex

- 実装
- 自動テスト
- リファクタリング
- 仕様と実装の整合性確認

### Fable

- アーキテクチャレビュー
- データモデルレビュー
- リスク分析
- Project Astraのデモ成立性レビュー
- 品質監査

### Grok

- 実画面のUser Interface（ユーザーインターフェース、UI）レビュー
- User Experience（ユーザー体験、UX）レビュー
- 3分デモの見せ方
- 動画・キャッチコピーのレビュー

---

## 11. 開発フロー

```text
GPTが仕様作成
↓
Fableレビュー
↓
GPTが仕様反映
↓
Codex実装
↓
GPTが成果物確認
↓
実画面をGrokがレビュー
↓
改善
↓
デモ録画・提出
```

---

## 12. 現在地

完了：

- プロジェクトの位置づけ
- Vision / Philosophy
- Build Week MVP
- 中核アーキテクチャ
- データモデル
- Entity Resolution方針
- Conflictモデル
- Relationship一本化
- Demo Mode主経路化
- Fableによる中核アーキテクチャレビュー
- Codex Step 0–1実装指示の作成

未完了：

- Project Astra v0.1
- Project AstraのFableレビュー
- Project Astra凍結
- Vaultへの文書保存
- Codex実装
- 実画面
- Grokレビュー
- README
- 動画
- Build Week提出

---

## 13. 進行順

1. Project Kickoff v1.0、Build Week仕様 v0.3、v0.3追補、Codex Step 0–1をVaultへ保存
2. Project Astra v0.1を作成
3. Fableがデモデータ、シナリオ、デモ成立性をレビュー
4. Project Astraを凍結
5. Codex Step 0–1を実装
6. Step 2以降を実装
7. 実画面をGrokがレビュー
8. デモ録画・提出

---

## 14. 成功の定義

Build Week版の成功は、Graphが表示されることだけではない。

ユーザーが散らばった資料を取り込み、AI候補を確認し、正典を自分で決定し、重複や競合を把握し、登録された創作知識を検索・再利用できることを成功とする。

長期的には、創作者が「あの設定をどこに書いたか分からない」という状態を減らし、生み出したキャラクター・世界・場面を次の創作へ引き継げることを目指す。
