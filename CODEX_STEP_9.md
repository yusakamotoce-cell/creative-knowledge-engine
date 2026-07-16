# Codex実装指示
## Creative Knowledge Engine Step 9
### Vercelデプロイ・実OpenAI API検証・公開環境安定化
### v1.0

- Status: Ready for implementation
- 前提: Step 8完了commit、working tree clean
- 採用先: Vercel
- 対象外: Context Bundle、IndexedDB、認証、課金、semantic search、Step 10以降

## 0. 目的

Step 8まででFixture DemoとGPT-5.6 Live Extractionの実装・mock検証は完了した。Step 9では以下を実環境で証明する。

1. Vite frontendと`/api/extract`がVercel上でsame-origin動作する
2. server環境変数からOpenAI Responses APIへ接続できる
3. Structured Outputs provider Schemaが実APIに受理される
4. provider DTO変換、Candidate Bundle検証、SourceRef groundingが成功する
5. Project Astra、Search、Graph、ExportがProductionで動く
6. API keyがbrowser・response・log・repositoryへ漏れない
7. 公開Live AI endpointがrate limitで保護される

新機能追加ではなく、提出用の安定版を固定する工程である。

## 1. 作業前確認

```powershell
git status
git log -9 --oneline
node --version
npm.cmd --version
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd audit --offline --audit-level=low
```

条件:

- working tree clean
- HEADがStep 8完了commit
- 既存561テスト成功
- typecheck、lint、build成功
- audit 0
- 未追跡は`CODEX_STEP_9.md`だけ

満たさなければ開始しない。

## 2. 人間の認証が必要な操作

次を無断で代替・推測しない。

- GitHub repository作成／公開設定
- Vercel login／project作成／Git連携
- OpenAI Project作成／API key発行
- Vercel環境変数登録
- Vercel Firewall設定
- Preview／Production deployment

認証で止まった場合は、途中成果を維持し、ユーザーが行う手順を正確に報告する。secretを会話、source、commit、README、shell historyへ貼らせない。

## 3. Vercel互換性

現在の構成を維持する。

- frontend: Vite
- build: `npm run build`
- output: `dist`
- server function: `api/extract.ts`
- same-origin endpoint: `/api/extract`
- Node.js runtime
- native fetch

`api/extract.ts`が現行Vercel Functionのexport形式へ適合するか確認する。必要な場合だけ薄いplatform adapterを修正し、Prompt、Schema、grounding、service logicを移さない。

### Node version

local／test済みversionとVercel対応versionを確認する。`package.json.engines.node`を追加する場合は22.xまたは24.xから実測で選び、理由を記録する。互換性を確認せずpinしない。

### vercel.json

auto-detectionを優先する。必要なら最小限:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite"
}
```

不要なrewrite、CORS、runtime指定を追加しない。Appはpathname routerを使わないためSPA rewriteは原則不要。

Function durationを設定する場合は、OpenAI client timeoutより短くせず、利用planの範囲を確認する。

## 4. Health endpoint

OpenAI APIを消費しないendpointを追加する。

```text
GET /api/health
```

例:

```json
{
  "ok": true,
  "schemaVersion": 1,
  "service": "creative-knowledge-engine",
  "liveAi": "enabled"
}
```

規則:

- API key、prefix、length、Project IDを返さない
- `LIVE_AI_ENABLED=false`またはkey未設定なら`disabled`
- 200、JSON、`Cache-Control: no-store`
- GET以外405
- env一覧、stack、内部pathを返さない
- statusは設定状態でありOpenAI接続成功を保証しない

## 5. Deployment smoke script

作成:

```text
scripts/smoke-deployment.mjs
```

使用:

```powershell
$env:DEPLOYMENT_URL="https://example.vercel.app"
npm.cmd run smoke:deployment
```

最低検査:

1. `/`が200
2. app rootを含む
3. `/api/health`が200でstrict envelope
4. healthに`no-store`
5. `GET /api/extract`が405
6. wildcard CORSなし
7. error responseにsecret／stackなし

Live AIは明示opt-in:

```powershell
$env:RUN_LIVE_AI="true"
npm.cmd run smoke:deployment
```

短いsynthetic文書を1回だけPOSTする。

```text
Mira Vale is a navigator in the Dawn Survey Team.
She carries the brass Sun Compass.
The departure briefing takes place at Eastwatch Harbor.
```

期待:

- success envelope
- Candidate Bundle Schema適合
- documentId一致
- SourceRef excerptがraw contentに完全一致
- raw responseをfile保存しない
- 自動retryしない

`DEPLOYMENT_URL`未指定や実接続未実施を成功扱いしない。

## 6. Environment variables

PreviewとProductionへ個別設定する。

```text
OPENAI_API_KEY=<server-only secret>
OPENAI_MODEL=gpt-5.6
LIVE_AI_ENABLED=true
```

安全な順序:

1. 最初は`LIVE_AI_ENABLED=false`
2. Fixture DemoだけPreview確認
3. API keyをPreviewへ設定
4. Firewall rate limitを設定
5. Live AIを有効化
6. Preview実API smoke
7. 成功後Productionへ同等設定
8. Production実API smokeを1回

禁止:

- `VITE_OPENAI_API_KEY`
- public env
- source hard-code
- Local Storage
- URL query
- README／Devpost／screenshotへのsecret

## 7. OpenAI側の準備

提出用に専用OpenAI Projectと専用API keyを使用する。

手動確認:

- 本案件用Project
- 必要最小限のkey権限
- usage notification／budget設定
- rate limits
- 提出後にkeyを失効可能
- 他projectの個人keyを流用しない

budgetを完全なhard capと断定しない。現行dashboard表示に従う。

## 8. Vercel Firewall

公開前に`/api/extract`へrate limitを設定する。

最低基準:

```text
Path: /api/extract
Method: POST
Source: same client / IP
Limit: 5 requests per minute
Action: HTTP 429
```

次のいずれかを満たすまでProduction Live AIを有効にしない。

A. WAF rate limit公開済み  
B. `LIVE_AI_ENABLED=false`

Serverless instance内のin-memory Mapだけを安全なrate limitと見なさない。

## 9. Preview deployment

まずLive AI disabledで:

- Home
- Project Astra全体
- Review
- Knowledge
- Search
- Graph
- Export
- refresh
- Local Storage
- health
- Live AI disabled表示

その後FirewallとPreview keyを設定しLive AIを有効化:

- consent
- synthetic文書
- GPT-5.6 extraction
- Review遷移
- SourceRef確認
- Accept／apply
- refresh
- 同じraw content再ImportでAPI再呼出なし

Preview失敗状態でProductionへ進まない。

## 10. Production deployment

Preview必須項目成功後にProductionへ進む。

Productionで各1回:

- Fixture Demo
- Live AI smoke
- Search
- Graph
- Export download
- refresh
- reset
- 1280px／768px
- Chrome／Edge
- console
- Network
- secret非露出
- response no-store
- WAF存在

## 11. 実OpenAI API smoke

Step 9完全完了には最低1回の実API成功を必須とする。

未実施なら:

```text
BLOCKED: REAL_API_NOT_VERIFIED
```

として報告し、成功扱いしない。

証明対象:

- server env key
- model alias
- Responses API request
- Structured Outputs Schema
- `store: false`
- provider DTO parse
- Record変換
- Candidate Bundle validation
- grounding
- browser success envelope
- Review接続

AI出力の候補数や表現はgolden固定しない。

## 12. 実API失敗時

### OpenAI 400

provider JSON Schema、required、`additionalProperties`、`text.format`、reasoning optionを確認。

### 401／403

key、Project権限、model access、Preview／Production envを確認。

### 404

model aliasとenv overrideを確認。

### 429

Vercel WAFかOpenAI rate limitか区別する。

### timeout

Vercel duration、client timeout、OpenAI latency、文書長を確認。

### app 422

provider DTO、Candidate Bundle、grounding、excerpt完全一致を確認。

validationを緩めて通さない。

## 13. Security headers

実ブラウザー検証を条件に最低限を追加してよい。

```text
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: DENY
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

CSPは推測で追加してAppを壊さない。APIの`Cache-Control: no-store`を維持する。

## 14. Logging

許容:

- status
- error code
- duration
- OpenAI response ID
- usage summary
- deployment environment

禁止:

- API key
- Authorization
- raw文書
- raw Candidate Bundle
- prompt全文
- SourceRef全文
- browser storage

外部observability serviceは追加しない。

## 15. Secret inspection

tracked files、`dist/**`、source maps、取得可能なserver bundleを検査する。

検出対象:

- 実API key pattern
- test secret marker
- `Bearer sk-`
- `.env.local`実値

`OPENAI_API_KEY`という変数名は許容する。実値と区別する。明確な終了codeを返す。

## 16. 自動テスト

既存561件を維持する。

追加:

### health

- enabled／disabled
- no key
- GET 200
- POST 405
- strict envelope
- no-store
- secret非露出

### smoke script

- root success
- health success
- extract GET 405
- live opt-in
- live disabled
- invalid envelope
- timeout
- exit code
- secret marker

### Vercel adapter

- Function export contract
- Request／Response
- env injection
- thin adapter
- server moduleがbrowser bundleへ入らない

### regression

- Project Astra
- Live AI mock
- Search
- Graph
- Export
- build
- secret scan

通常unit testで外部networkへ接続しない。

## 17. Manual checklist

作成:

```text
notes/reviews/STEP_9_DEPLOYMENT_CHECKLIST.md
```

状態:

```text
NOT_RUN / PASS / FAIL / BLOCKED
```

最低項目:

- Step 8 commit
- GitHub push
- Vercel project
- Preview deploy
- Production deploy
- Preview／Production env
- dedicated OpenAI Project
- WAF rate limit
- health
- Fixture Demo
- real Live AI smoke
- SourceRef
- Review／apply
- reImport
- Search
- Graph
- Export
- refresh
- Chrome／Edge
- 1280／768
- console／network
- no-store
- secret scan
- public URL
- stable commit

未実施をPASSにしない。

## 18. ADR

追加:

- ADR-047: Vercel is the submission deployment target
- ADR-048: Preview must pass before production
- ADR-049: Public live extraction requires platform rate limiting
- ADR-050: Real OpenAI API smoke is required
- ADR-051: Deployment smoke tests are opt-in
- ADR-052: Health checks expose no secret metadata

各ADRにStatus、Context、Decision、Consequences。

## 19. README

追記:

- Vercel deployment
- Vite／`dist`
- `/api/extract`
- `/api/health`
- Node version
- environment variables
- Preview／Production分離
- WAF rate limit
- dedicated OpenAI Project
- `store: false`
- deployment smoke
- opt-in real API smoke
- public app URL欄
- repository URL欄
- stable commit欄

未確定URLを架空値で埋めない。

## 20. 判断記録

作成:

```text
notes/reviews/STEP_9_IMPLEMENTATION_DECISIONS.md
```

記録:

- 開始commit
- Vercel採用
- Node version
- vercel.json
- Function export
- maxDuration
- health
- environment separation
- WAF
- Preview first
- dedicated OpenAI Project
- deployment smoke
- real API smoke結果
- Production URL
- stable commit
- known limitations
- Context Bundle延期

## 21. 品質条件

- 既存561件を含む全test成功
- typecheck、lint、build成功
- offline audit 0
- `git diff --check`
- Preview／Production build成功
- public URL 200
- health成功
- Fixture Demo成功
- 実API smoke成功
- Search／Graph／Export成功
- console error 0
- secret scan 0
- WAF設定済み、またはLive AI disabled
- 凍結資料／golden非変更
- 新機能追加なし

## 22. 完了報告

1. 開始commit
2. 作成／変更ファイル
3. Vercel／Node設定
4. Function互換性
5. health
6. env
7. Preview
8. Production
9. public URL
10. WAF
11. OpenAI Project
12. real API smoke
13. Structured Outputs結果
14. grounding
15. Review接続
16. reImport
17. Fixture Demo
18. Search／Graph／Export
19. secret
20. headers／no-store
21. browser／responsive
22. ADR／checklist
23. test総数
24. typecheck／lint／build／audit
25. BLOCKED項目
26. known limitations
27. git status
28. 凍結資料非変更

Step 10、新機能、Context Bundleへ着手しない。

## 23. 完了条件

1. Vercel Preview／Productionへdeploy
2. frontendとAPIがsame-origin動作
3. healthがsecretなしで応答
4. Fixture DemoがPreview／Productionで動作
5. 実OpenAI API smoke成功
6. Structured Outputsと`store:false`が実APIで成功
7. provider DTO、Candidate、grounding成功
8. Review／apply成功
9. reImportでAPI再呼出なし
10. Search／Graph／Export成功
11. API keyがbrowser／response／log／repositoryへ漏れない
12. WAF rate limit、またはLive AI disabled
13. 全test・品質check成功
14. 凍結資料／golden非変更

実API smoke未実施または失敗時、Step 9は`BLOCKED`であり完了ではない。
