import express from 'express';
import fetch from 'node-fetch';
import { authenticateUser, verifyToken } from './auth.js';

const router = express.Router();

/**
 * ログインエンドポイント
 * POST /api/login
 * Body: { username: string, password: string }
 * Response: { token: string } または { error: string }
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const result = authenticateUser(username, password);

  if (result.success) {
    console.log(`Login successful: ${username}`);
    return res.json({ token: result.token });
  } else {
    console.log(`Login failed: ${username}`);
    return res.status(401).json({ error: result.error });
  }
});

/**
 * OpenAI API プロキシ（認証必須）
 * POST /api/openai
 * Headers: Authorization: Bearer <token>
 */
router.post('/openai', verifyToken, async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    console.log(`OpenAI API request from user: ${req.user?.username}`);

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API Error:', data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ error: 'Failed to communicate with OpenAI' });
  }
});

export default router;
