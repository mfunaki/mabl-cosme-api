# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## プロジェクト概要

`mabl-cosme-api` は、OpenAI の画像生成 API（DALL·E）へのプロキシとして動作する小さな Node.js/Express バックエンドです。mabl-cosme プロジェクトのバックエンド API を独立させたリポジトリであり、ローカル実行と Google Cloud Run へのデプロイを前提としています。

## 開発用コマンド

すべてリポジトリルートで実行します。

### 依存関係のインストール

- 初回セットアップ:
  - `npm install`

### ローカル開発サーバーの起動

`package.json` の `scripts.dev` は、`.env` を読み込みつつ `server/index.js` を起動します。

- 開発サーバー起動:
  - `npm run dev`

### 本番相当モードでの起動

`npm start` も同じエントリーポイント（`server/index.js`）を使用しますが、本番運用に近い起動方法として想定されています。

- 本番相当起動:
  - `npm start`

### Docker でのローカル実行

Cloud Run と同等のコンテナ環境で挙動を確認したい場合に使用します。

- ビルド:
  - `docker build -t mabl-cosme-api .`
- 実行（例）:
  - `docker run -p 3000:3000 -e OPENAI_API_KEY=your-openai-api-key mabl-cosme-api`
  - Basic 認証を試す場合は、必要に応じて `BASIC_AUTH_USERNAME` / `BASIC_AUTH_PASSWORD` も `-e` で渡してください。

### テスト・Lint

現時点の `package.json` にはテストや Lint 用の npm スクリプトは定義されていません（`npm test` / `npm run lint` などは未設定）。
将来的にテストや Lint を導入する場合は、`scripts` にコマンドを追加し、ここに代表的な実行方法（全テスト・単体テストなど）を追記してください。

## 環境変数と設定

設定は環境変数ベースで行います（`.env.example` 参照）。主なものは以下です。

- `OPENAI_API_KEY`（必須）
  - OpenAI の Images API 用 API キー。
- `BASIC_AUTH_USERNAME` / `BASIC_AUTH_PASSWORD`（任意）
  - 両方設定されている場合、すべてのリクエストに HTTP Basic 認証が必須になります。
  - どちらか一方でも未設定の場合、認証はスキップされます。
- `PORT`（任意、デフォルト: `3000`）
  - Express サーバーの待ち受けポート。
- `ALLOWED_ORIGINS`（任意、`.env.example` には記載なし）
  - CORS を許可するオリジンのカンマ区切りリスト。
  - 未設定時は `https://mabl-cosme-ixi7x7b23a-an.a.run.app` のみが許可されます。

ローカル開発時は、`.env.example` を `.env` にコピーし、少なくとも `OPENAI_API_KEY` を設定してください。Basic 認証を有効にしたい場合はユーザー名／パスワードも設定します。

## アーキテクチャ概要

このリポジトリは、シンプルな 2 ファイル構成の Express アプリケーションです。

### エントリーポイント: `server/index.js`

- `dotenv/config` をインポートして `.env` を読み込みます。
- `express()` でアプリケーションインスタンスを生成し、`PORT`（デフォルト `3000`）で待ち受けます。
- **CORS 設定**
  - `ALLOWED_ORIGINS` 環境変数（カンマ区切り）またはデフォルト値から許可オリジン一覧を生成します。
  - リクエストの `Origin` ヘッダが許可リストに含まれる場合のみ、`Access-Control-Allow-Origin` などの CORS ヘッダを付与します。
  - `OPTIONS` メソッドはプリフライトとして `200` を返して早期終了します。
- **ボディパーサー**
  - `express.json` と `express.urlencoded` を利用し、どちらも `10mb` のサイズ上限を設定しています（画像生成リクエストのペイロード想定）。
- **Basic 認証ミドルウェア**
  - `BASIC_AUTH_USERNAME` / `BASIC_AUTH_PASSWORD` が両方設定されている場合のみ有効になります。
  - `Authorization: Basic ...` ヘッダを検証し、一致しない場合は `401` と `WWW-Authenticate` ヘッダを返します。
  - 未設定の場合はそのまま `next()` に進み、認証は行いません。
- **デバッグ用 Authorization ログミドルウェア**
  - 全リクエストについて、`Authorization` ヘッダを `[DEBUG_AUTH]` 付きで `console.log` します。
  - コード内に「本番デプロイ前に削除すること」という TODO コメントがあります。認証周りを変更する際は、このミドルウェアの扱いに注意してください。
- **API リクエストログ**
  - パスが `/api/` で始まるリクエストのみ、`METHOD PATH` 形式でログ出力します。
- **ルーティング**
  - `/api` 配下のルートを `server/proxy.js` からインポートした `apiProxy` に委譲します。
  - ルート `GET /` はサービス情報（メッセージと `/api/openai` エンドポイント）を JSON で返します。
- **起動ログ**
  - サーバー起動時に、Basic 認証が有効かどうか、および OpenAI API キーが設定されているかどうかをブール値でログ出力します。

### プロキシルーター: `server/proxy.js`

- `express.Router()` を用いて `/api` 配下のルートを定義しています。
- メインエンドポイントは `POST /api/openai` です。
  - `OPENAI_API_KEY` が未設定の場合、HTTP `500` とエラーメッセージを返します。
  - リクエストボディをそのまま `https://api.openai.com/v1/images/generations` に転送します。
    - ヘッダ: `Content-Type: application/json` と `Authorization: Bearer <OPENAI_API_KEY>`。
  - OpenAI 側のレスポンスを JSON として受け取り、そのままクライアントに返却します。
  - OpenAI 側でエラー（非 2xx）が発生した場合は、ログ出力したうえでステータスコードとボディをそのまま転送します。
  - ネットワークエラーなど予期しない例外はキャッチし、HTTP `500` と汎用的なエラーメッセージを返します。

この分割により、HTTP レイヤー（CORS / 認証 / ロギング）は `server/index.js` に集約され、外部サービス（OpenAI API）との連携は `server/proxy.js` に閉じ込められています。

## デプロイフロー

デプロイは GitHub Actions を通じて Google Cloud Run に行われます。

- ワークフロー定義: `.github/workflows/deploy.yml`
- トリガー:
  - `main` ブランチへの push
  - `workflow_dispatch` による手動実行
- 主な処理フロー:
  1. Workload Identity Federation で GCP に認証。
  2. Artifact Registry に対して Docker のログイン設定を実施。
  3. `mabl-cosme-api` の Docker イメージをビルドし、`mabl-cosme` リポジトリに push。
  4. Cloud Run サービス `mabl-cosme-api`（リージョン: `asia-northeast1`）に対してデプロイ。
- Cloud Run には以下の環境変数が GitHub Secrets から設定されます:
  - `OPENAI_API_KEY`
  - `BASIC_AUTH_USERNAME`
  - `BASIC_AUTH_PASSWORD`
  - `NODE_ENV=production`

サービス名、リージョン、必要な環境変数を変更する場合は、`Dockerfile` / `.env.example` / `.github/workflows/deploy.yml` の整合性が取れているか確認してください。