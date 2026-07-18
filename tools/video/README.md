# Video Automation A1

Playwright 1.61.1のScreencast APIで、提出動画用の無音WebMを生成する補助ツールです。製品機能ではありません。

## 現在のマイルストーン

- 7つのFixture状態を、既存UIとLocal Storage Adapter経由で準備
- 代表ショット `05_accept_entity.webm` を1920×1080で生成
- Fixture操作中の `/api/extract` と外部通信を禁止
- Shot 14はmanifest上でProduction成功版14Aを選択済み。ただし実API録画は未実施
- テスト件数は `video:metadata` がVitest出力から毎回取得し、固定値を持たない

残り14ショット、最終結合、音声、字幕、Descript、YouTube／Devpostはこの実証マイルストーンの対象外です。

## 実行

```powershell
npm.cmd run video:install
npm.cmd run video:metadata
npm.cmd run video:prepare
$env:VIDEO_SHOT="05_accept_entity"
npm.cmd run video:record
npm.cmd run video:verify
```

`VIDEO_BASE_URL`未指定時は、ローカルのVite previewを使います。指定時はhttp／httpsの絶対URLだけを受け付け、query、fragment、credentialsを拒否します。

生成物は `artifacts/video/` に保存され、Git管理から除外されます。
