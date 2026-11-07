import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'nextask_dev_jwt_secret_key_2026';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'nextask_dev_refresh_secret_key_2026';

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export function generateTokens(userId: string, email: string, role: string) {
  const accessToken = jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '2h' });
  const refreshToken = jwt.sign({ userId, email, role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    let user = (db.getUserById ? db.getUserById(decoded.userId) : null) || db.users.find((u) => u.id === decoded.userId);

    if (!user && decoded.email) {
      user = (db.getUserByEmail ? db.getUserByEmail(decoded.email) : null) || db.users.find((u) => u.email.toLowerCase() === decoded.email.toLowerCase());
    }

    if (!user) {
      // Auto-recover session from valid verified JWT token
      const now = new Date().toISOString();
      const userName = (decoded.email || 'User').split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      const recoveredUser = {
        id: decoded.userId || `usr_${Date.now()}`,
        name: userName,
        email: decoded.email || `${decoded.userId}@nextask.io`,
        passwordHash: '',
        isVerified: true,
        role: (decoded.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
        createdAt: now,
        updatedAt: now,
      };
      db.users.push(recoveredUser);
      if (db.seedUserData) {
        db.seedUserData(recoveredUser.id, recoveredUser.name);
      }
      db.persist();
      user = recoveredUser;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Session expired. Please refresh your token.', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ error: 'Invalid authentication token.' });
  }
}
