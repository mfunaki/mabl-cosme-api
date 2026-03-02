import jwt from 'jsonwebtoken';

// JWT設定
const JWT_SECRET = process.env.JWT_SECRET || 'mabl-cosme-demo-secret-key';
const JWT_EXPIRES_IN = '24h';

// 認証用クレデンシャル
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'demo';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'demo123';

/**
 * ユーザー認証を行い、JWTトークンを生成
 */
export function authenticateUser(username, password) {
  if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
    const token = jwt.sign(
      { username, iat: Date.now() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    return { success: true, token };
  }
  return { success: false, error: 'Invalid credentials' };
}

/**
 * JWTトークンを検証するミドルウェア
 */
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
