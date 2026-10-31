import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { User } from '../models/schema.js';
import { authenticate, generateTokens, AuthenticatedRequest, JWT_REFRESH_SECRET, AuthUserPayload } from '../middleware/auth.js';
import { sendOtpEmail, devOtpStore } from '../services/emailService.js';

const router = Router();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Dev route: get active OTPs for the developer inspector banner
router.get('/dev-otp', (_req, res) => {
  const valid = devOtpStore.filter((item) => item.expiresAt > Date.now());
  res.json({ otps: valid });
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (existing) {
      res.status(400).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const otpCode = generateOtp();
    const otpExpiresAt = Date.now() + 10 * 60 * 1000;
    const now = new Date().toISOString();
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newUser: User = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      isVerified: false,
      otpCode,
      otpExpiresAt,
      otpType: 'verification',
      role: 'user',
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newUser);
    db.persist();

    await sendOtpEmail(cleanEmail, otpCode, 'verification');

    res.status(201).json({
      message: 'Account registered successfully. A 6-digit verification code has been dispatched.',
      email: cleanEmail,
      requiresOtp: true,
      otpType: 'verification',
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// Verify OTP
router.post('/verify-otp', (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ error: 'Email and 6-digit code are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    if (!user.otpCode || user.otpCode !== code.trim()) {
      res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
      return;
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < Date.now()) {
      res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
      return;
    }

    // Mark as verified & clear OTP
    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpType = undefined;
    user.updatedAt = new Date().toISOString();
    db.persist();

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Email verified successfully!',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify code.' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, type = 'verification' } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    const otpCode = generateOtp();
    user.otpCode = otpCode;
    user.otpExpiresAt = Date.now() + 10 * 60 * 1000;
    user.otpType = type;
    db.persist();

    await sendOtpEmail(cleanEmail, otpCode, type);

    res.json({ message: 'A new 6-digit code has been dispatched.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend code.' });
  }
});

// Standard Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!user.isVerified) {
      const otpCode = generateOtp();
      user.otpCode = otpCode;
      user.otpExpiresAt = Date.now() + 10 * 60 * 1000;
      user.otpType = 'verification';
      db.persist();

      await sendOtpEmail(cleanEmail, otpCode, 'verification');

      res.status(403).json({
        error: 'Email address has not yet been verified.',
        requiresOtp: true,
        email: cleanEmail,
        otpType: 'verification',
      });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Signed in successfully!',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// Passwordless Login: Request OTP
router.post('/passwordless-request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    // If user does not exist, auto-provision
    if (!user) {
      const salt = bcrypt.genSaltSync(10);
      const defaultHash = bcrypt.hashSync(Math.random().toString(), salt);
      const now = new Date().toISOString();
      user = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        passwordHash: defaultHash,
        isVerified: true,
        role: 'user',
        createdAt: now,
        updatedAt: now,
      };
      db.users.push(user);
    }

    const otpCode = generateOtp();
    user.otpCode = otpCode;
    user.otpExpiresAt = Date.now() + 10 * 60 * 1000;
    user.otpType = 'passwordless';
    db.persist();

    await sendOtpEmail(cleanEmail, otpCode, 'passwordless');

    res.json({
      message: 'A 6-digit magic sign-in code has been dispatched.',
      email: cleanEmail,
      requiresOtp: true,
      otpType: 'passwordless',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to initiate passwordless sign-in.' });
  }
});

// Forgot Password: Request Reset OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      // Don't disclose non-existence
      res.json({ message: 'If an account exists with that email, a password reset code has been sent.' });
      return;
    }

    const otpCode = generateOtp();
    user.otpCode = otpCode;
    user.otpExpiresAt = Date.now() + 10 * 60 * 1000;
    user.otpType = 'reset';
    db.persist();

    await sendOtpEmail(cleanEmail, otpCode, 'reset');

    res.json({
      message: 'A 6-digit password reset code has been dispatched.',
      email: cleanEmail,
      requiresOtp: true,
      otpType: 'reset',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to initiate password reset.' });
  }
});

// Reset Password: Confirm with OTP & New Password
router.post('/reset-password', (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      res.status(400).json({ error: 'Email, verification code, and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user || user.otpCode !== code.trim()) {
      res.status(400).json({ error: 'Invalid or expired password reset code.' });
      return;
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < Date.now()) {
      res.status(400).json({ error: 'Password reset code has expired.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    user.passwordHash = bcrypt.hashSync(newPassword, salt);
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpType = undefined;
    user.updatedAt = new Date().toISOString();
    db.persist();

    res.json({ message: 'Password has been reset successfully. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// Refresh Token
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token is required.' });
      return;
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as AuthUserPayload;
    const user = db.users.find((u) => u.id === decoded.userId);

    if (!user) {
      res.status(401).json({ error: 'User not found.' });
      return;
    }

    const tokens = generateTokens(user.id, user.email, user.role);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

// Get Current User
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.find((u) => u.id === req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isVerified: user.isVerified,
    },
  });
});

// Update Profile
router.put('/profile', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.find((u) => u.id === req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  const { name, avatarUrl } = req.body;
  if (name) user.name = name.trim();
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
  user.updatedAt = new Date().toISOString();
  db.persist();

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isVerified: user.isVerified,
    },
  });
});

// Logout
router.post('/logout', (_req, res) => {
  res.clearCookie('accessToken');
  res.json({ message: 'Signed out successfully.' });
});

export default router;
