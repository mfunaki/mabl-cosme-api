# mabl-cosme-api

OpenAI 画像生成 API（DALL·E）へのプロキシサーバーです。[mabl-cosme](https://github.com/mfunaki/mabl-cosme) のバックエンド API として動作します。

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/` | サーバー情報 |
| `POST` | `/api/login` | ログイン（JWT トークン取得） |
| `POST` | `/api/openai` | OpenAI 画像生成 API へのプロキシ（要 JWT 認証） |

## セットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .env を編集して OPENAI_API_KEY を設定する
```

### 環境変数

| 変数名 | 必須 | デフォルト | 説明 |
|--------|:----:|-----------|------|
| `OPENAI_API_KEY` | ✅ | - | OpenAI API キー |
| `AUTH_USERNAME` | | `demo` | ログイン用ユーザー名 |
| `AUTH_PASSWORD` | | `demo123` | ログイン用パスワード |
| `JWT_SECRET` | | ランダム生成 | JWT 署名用シークレット |
| `PORT` | | `3000` | サーバーポート |
| `ALLOWED_ORIGINS` | | Cloud Run URL | CORS 許可オリジン（カンマ区切り） |

## 起動方法

```bash
# 開発サーバー（.env を読み込み）
npm run dev

# 本番相当
npm start
```

## Docker

```bash
docker build -t mabl-cosme-api .
docker run -p 3000:3000 -e OPENAI_API_KEY=your-key mabl-cosme-api
```

## デプロイ

`main` ブランチへの push で GitHub Actions が起動し、Google Cloud Run（リージョン: `asia-northeast1`）へ自動デプロイされます。

## 使用技術

- Node.js (ES Modules) + Express.js 4.18
- jsonwebtoken 9.x（JWT 認証）
- node-fetch 3.3
