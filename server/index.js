import 'dotenv/config';
import express from 'express';
import apiProxy from './proxy.js';

const app = express();
const PORT = process.env.PORT || 3000;

// JSONボディパーサーを設定
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic認証ミドルウェア
const basicAuthMiddleware = (req, res, next) => {
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;

  // 環境変数が設定されていない場合は認証をスキップ
  if (!username || !password) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="mabl-cosme-api"');
    return res.status(401).send('Authentication required');
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [inputUsername, inputPassword] = credentials.split(':');

  if (inputUsername === username && inputPassword === password) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="mabl-cosme-api"');
  return res.status(401).send('Invalid credentials');
};

// Basic認証を適用（有効な場合のみ）
app.use(basicAuthMiddleware);

// リクエストログ
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

// API proxy routes
app.use('/api', apiProxy);

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    message: 'mabl-cosme API server',
    endpoints: {
      openai: 'POST /api/openai'
    }
  });
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
  console.log(`Basic Auth enabled: ${!!(process.env.BASIC_AUTH_USERNAME && process.env.BASIC_AUTH_PASSWORD)}`);
  console.log(`OpenAI API Key configured: ${!!process.env.OPENAI_API_KEY}`);
});
