# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mabl-cosme-api - OpenAI画像生成APIへのプロキシサーバー

mabl-cosmeプロジェクトのバックエンドAPI部分を独立させたプロジェクトです。Express.jsを使用してOpenAI DALL-E APIへのプロキシ機能を提供します。

## Architecture

```
mabl-cosme-api/
├── .github/
│   └── workflows/
│       └── deploy.yml    # Cloud Runデプロイ用GitHub Actions
├── server/
│   ├── index.js          # Express.jsメインサーバー
│   ├── proxy.js          # APIプロキシルーター
│   └── auth.js           # JWT認証ロジック
├── Dockerfile            # コンテナイメージ定義
├── .dockerignore         # Dockerビルド除外ファイル
├── package.json          # 依存関係定義
├── .env.example          # 環境変数テンプレート
└── CLAUDE.md             # このファイル
```

## API Endpoints

- `GET /` - サーバー情報
- `POST /api/login` - ログイン（JWTトークン取得）
- `POST /api/openai` - OpenAI画像生成APIへのプロキシ（要JWT認証）

## Commands

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# 本番サーバーの起動
npm start
```

## Environment Setup

1. `.env.example`を`.env`にコピー
2. `OPENAI_API_KEY`にOpenAI APIキーを設定
3. `AUTH_USERNAME`と`AUTH_PASSWORD`にログイン用クレデンシャルを設定（未設定時は`demo`/`demo123`）
4. （オプション）`JWT_SECRET`にJWT署名用シークレットを設定

### 主な環境変数一覧

| 変数名 | 必須 | デフォルト | 説明 |
|--------|:----:|-----------|------|
| `OPENAI_API_KEY` | ✅ | - | OpenAI Images API用キー |
| `AUTH_USERNAME` | - | `demo` | JWTログイン用ユーザー名 |
| `AUTH_PASSWORD` | - | `demo123` | JWTログイン用パスワード |
| `JWT_SECRET` | - | ランダム生成 | JWT署名用シークレット |
| `PORT` | - | `3000` | Expressサーバーの待ち受けポート |
| `ALLOWED_ORIGINS` | - | Cloud Runデフォルト URL | CORSを許可するオリジン（カンマ区切り） |

## Testing / Lint

現時点では `package.json` にテストや Lint 用のスクリプトは定義されていません（`npm test` / `npm run lint` は未設定）。導入時は `scripts` にコマンドを追加してください。

## Technology Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 4.18
- **HTTP Client**: node-fetch 3.3
- **認証**: jsonwebtoken 9.x（JWT）

## Implementation Notes

### server/index.js
- CORS: `ALLOWED_ORIGINS`（カンマ区切り）またはデフォルトURLから許可オリジンを生成。OPTIONSリクエストはプリフライトとして200を返す
- ボディパーサー: `express.json` / `express.urlencoded` ともに上限10MB
- **デバッグ用Authorizationログ**: 全リクエストの`Authorization`ヘッダを`[DEBUG_AUTH]`付きでコンソール出力。本番デプロイ前に削除すること（TODO コメントあり）
- ルーティング: `/api` 配下を `server/proxy.js` に委譲

### server/proxy.js
- `POST /api/openai`: リクエストボディをそのまま `https://api.openai.com/v1/images/generations` に転送し、レスポンスをクライアントに返却
- OpenAI側の非2xxレスポンスはステータスコードごとクライアントに転送

## Deployment

### Cloud Run（GitHub Actions経由）

mainブランチへのpushで自動デプロイされます。

#### 必要なGitHub Secrets

| Secret名 | 説明 |
|----------|------|
| `GCP_PROJECT_ID` | GCPプロジェクトID |
| `WIF_PROVIDER` | Workload Identity Federationプロバイダー |
| `WIF_SERVICE_ACCOUNT` | サービスアカウントメール |
| `OPENAI_API_KEY` | OpenAI APIキー |
| `AUTH_USERNAME` | JWTログイン用ユーザー名 |
| `AUTH_PASSWORD` | JWTログイン用パスワード |
| `JWT_SECRET` | JWT署名用シークレット |

#### GCP事前準備

mabl-cosmeと同じArtifact Registryリポジトリ（`mabl-cosme`）を使用します。
新規作成は不要です。Workload Identity Federationの設定もmabl-cosmeと共有できます。

### ローカルでのDocker実行

```bash
docker build -t mabl-cosme-api .
docker run -p 3000:3000 -e OPENAI_API_KEY=your-key mabl-cosme-api
```
