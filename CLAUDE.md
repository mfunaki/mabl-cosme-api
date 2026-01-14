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
│   └── proxy.js          # APIプロキシルーター
├── Dockerfile            # コンテナイメージ定義
├── .dockerignore         # Dockerビルド除外ファイル
├── package.json          # 依存関係定義
├── .env.example          # 環境変数テンプレート
└── CLAUDE.md             # このファイル
```

## API Endpoints

- `GET /` - サーバー情報
- `POST /api/openai` - OpenAI画像生成APIへのプロキシ

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
3. （オプション）Basic認証を有効にする場合は`BASIC_AUTH_USERNAME`と`BASIC_AUTH_PASSWORD`を設定

## Technology Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 4.18
- **HTTP Client**: node-fetch 3.3

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
| `BASIC_AUTH_USERNAME` | Basic認証ユーザー名（オプション） |
| `BASIC_AUTH_PASSWORD` | Basic認証パスワード（オプション） |

#### GCP事前準備

mabl-cosmeと同じArtifact Registryリポジトリ（`mabl-cosme`）を使用します。
新規作成は不要です。Workload Identity Federationの設定もmabl-cosmeと共有できます。

### ローカルでのDocker実行

```bash
docker build -t mabl-cosme-api .
docker run -p 3000:3000 -e OPENAI_API_KEY=your-key mabl-cosme-api
```
