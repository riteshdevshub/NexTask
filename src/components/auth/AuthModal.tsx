import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User as UserIcon, ArrowRight, ShieldCheck, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { Logo } from '../brand/Logo.js';

type AuthView = 'login' | 'register' | 'passwordless' | 'otp' | 'forgot' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: AuthView;
  prefillCode?: string;
}

export function AuthModal({ isOpen, onClose, initialView = 'login', prefillCode = '' }: AuthModalProps) {
  const { login, register, passwordlessRequest, verifyOtp, resendOtp, forgotPassword, resetPassword } = useAuth();
  const { success, error } = useToast();

  const [view, setView] = useState<AuthView>(initialView);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState(prefillCode);
  const [otpType, setOtpType] = useState<string>('verification');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(600); // 10 minutes in seconds

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (prefillCode) {
      setOtpCode(prefillCode);
    }
  }, [prefillCode]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (view === 'otp' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [view, countdown]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.requiresOtp) {
        setOtpType('verification');
        setView('otp');
        setCountdown(600);
        success('Verification code dispatched. Please check your inbox.');
      } else {
        success('Welcome back to NexTask!');
        onClose();
      }
    } catch (err: any) {
      error(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await register(name, email, password);
      if (res.requiresOtp) {
        setOtpType('verification');
        setView('otp');
        setCountdown(600);
        success('Account created! A 6-digit verification code has been dispatched.');
      } else {
        success('Account created and verified!');
        onClose();
      }
    } catch (err: any) {
      error(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordless = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await passwordlessRequest(email);
      setOtpType('passwordless');
      setView('otp');
      setCountdown(600);
      success('Magic sign-in code sent to your email.');
    } catch (err: any) {
      error(err.message || 'Could not send magic code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      error('Please enter the complete 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(email, otpCode);
      success('Authentication verified successfully!');
      onClose();
    } catch (err: any) {
      error(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await resendOtp(email, otpType);
      setCountdown(600);
      success('A fresh 6-digit code has been dispatched.');
    } catch (err: any) {
      error(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setView('reset');
      setCountdown(600);
      success('Password reset code dispatched to your email.');
    } catch (err: any) {
      error(err.message || 'Failed to request reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      error('Please enter the 6-digit verification code.');
      return;
    }
    if (newPassword.length < 6) {
      error('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, otpCode, newPassword);
      success('Password reset successfully! Please log in.');
      setView('login');
      setPassword(newPassword);
    } catch (err: any) {
      error(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setEmail('demo@nextask.io');
    setPassword('password123');
    setLoading(true);
    try {
      await login('demo@nextask.io', 'password123');
      success('Signed in as Demo User Alex Rivera!');
      onClose();
    } catch (err: any) {
      error(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 md:p-8 text-slate-900 dark:text-slate-100 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="inline-block mb-3">
            <Logo size="md" />
          </div>
          <h2 className="text-xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            {view === 'login' && 'Sign in to NexTask'}
            {view === 'register' && 'Create your workspace'}
            {view === 'passwordless' && 'Passwordless magic login'}
            {view === 'otp' && 'Enter 6-digit code'}
            {view === 'forgot' && 'Reset your password'}
            {view === 'reset' && 'Choose new password'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {view === 'login' && 'Plan Smart. Work Better. Enter your credentials to continue.'}
            {view === 'register' && 'Get started with high-velocity task and doc productivity.'}
            {view === 'passwordless' && 'We will send a one-time login code to your email.'}
            {view === 'otp' && `Sent to ${email || 'your email'}. Code expires in ${formatCountdown(countdown)}.`}
            {view === 'forgot' && 'Enter your email to receive a password reset code.'}
            {view === 'reset' && 'Provide the code from your email along with your new password.'}
          </p>
        </div>

        {/* View: Standard Login */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setView('forgot')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </button>

            {/* Quick Demo Sign In Button */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider text-slate-400 bg-white dark:bg-[#111827] px-2">
                Instant Evaluation
              </div>
            </div>

            <button
              type="button"
              onClick={handleDemoSignIn}
              disabled={loading}
              className="w-full py-2 px-3 border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/50 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              1-Click Demo Login (Alex Rivera)
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setView('passwordless')}
                className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Passwordless OTP login
              </button>
              <button
                type="button"
                onClick={() => setView('register')}
                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                Create account
              </button>
            </div>
          </form>
        )}

        {/* View: Register */}
        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Taylor Smith"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="taylor@company.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Register & Receive OTP'}
            </button>

            <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500">Already have an account? </span>
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                Sign in
              </button>
            </div>
          </form>
        )}

        {/* View: Passwordless OTP Request */}
        {view === 'passwordless' && (
          <form onSubmit={handlePasswordless} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Enter your email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Send Magic OTP Code'}
            </button>

            <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors"
              >
                Back to password login
              </button>
            </div>
          </form>
        )}

        {/* View: OTP Verification */}
        {view === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 text-center mb-2">
                6-Digit Security Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                className="w-full text-center text-2xl font-mono tracking-[0.5em] font-bold py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify & Continue'}
            </button>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || countdown > 540}
                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline disabled:opacity-50"
              >
                Resend Code
              </button>
            </div>
          </form>
        )}

        {/* View: Forgot Password */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Enter your account email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Send Reset Code'}
            </button>

            <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-slate-600 dark:text-slate-400 hover:text-indigo-600"
              >
                Back to Sign in
              </button>
            </div>
          </form>
        )}

        {/* View: Reset Password with OTP */}
        {view === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                6-Digit Reset Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                className="w-full text-center text-xl font-mono tracking-widest font-bold py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6 || newPassword.length < 6}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm New Password'}
            </button>

            <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-slate-600 dark:text-slate-400 hover:text-indigo-600"
              >
                Back to Sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
