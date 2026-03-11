import 'dotenv/config';
import express from 'express';
import apiProxy from './proxy.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 許可するオリジン（環境変数またはデフォルト値）
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://mabl-cosme.mayoct.net').split(',');

// CORSミドルウェア
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // OPTIONSリクエスト（プリフライト）への応答
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// JSONボディパーサーを設定
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 全リクエストのヘッダーをチェックするミドルウェア（デバッグ用）
// TODO: 本番環境にデプロイする前に削除してください
app.use((req, _res, next) => {
  const authHeader = req.headers['authorization'];
  console.log(`[DEBUG_AUTH] URL: ${req.url}, Authorization: ${authHeader ? authHeader : '(header not present)'}`);
  next();
});

// リクエストログ
app.use((req, _res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

// API proxy routes
app.use('/api', apiProxy);

// ルートエンドポイント
app.get('/', (_req, res) => {
  res.json({
    message: 'mabl-cosme API server',
    endpoints: {
      login: 'POST /api/login',
      openai: 'POST /api/openai'
    }
  });
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
  console.log(`JWT Auth credentials: ${process.env.AUTH_USERNAME || 'demo'} / ${process.env.AUTH_PASSWORD ? '****' : 'demo123'}`);
  console.log(`OpenAI API Key configured: ${!!process.env.OPENAI_API_KEY}`);
});
