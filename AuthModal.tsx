import React, { useState, useRef } from 'react';
import { User } from '../types';
import {
  Camera,
  MessageCircle,
  Lock,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  registerUser,
  loginUser,
  formatFirebaseError,
} from '../services/authService';
import { isFirebaseConfigured } from '../lib/firebase';

interface AuthModalProps {
  onLoginSuccess: (user: User) => void;
  registeredUsers?: User[];
  onRegisterUser?: (newUser: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLoginSuccess,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Common fields
  const [identifier, setIdentifier] = useState(''); // email or username for login
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('Hey there! I am using SB Messenger.');
  const [avatar, setAvatar] = useState<string>('');

  // Status & error handling
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate username suggestion from name during signup
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!username || username === name.toLowerCase().replace(/[^a-z0-9]/g, '')) {
      const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16);
      if (clean) {
        setUsername(clean);
      }
    }
  };

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Please choose a photo under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatar(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!isFirebaseConfigured) {
      setError(
        'Firebase configuration is missing in your environment. Please supply VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, and VITE_FIREBASE_APP_ID.'
      );
      return;
    }

    setLoading(true);

    try {
      if (authMode === 'register') {
        const cleanName = name.trim();
        const cleanUsername = (
          username.trim().startsWith('@') ? username.trim().slice(1) : username.trim()
        ).toLowerCase();
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanName) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }

        if (!cleanUsername || cleanUsername.length < 2) {
          setError('Username must be at least 2 characters.');
          setLoading(false);
          return;
        }

        if (!cleanEmail || !cleanEmail.includes('@')) {
          setError('Please enter a valid email address.');
          setLoading(false);
          return;
        }

        if (!password || password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        const user = await registerUser({
          name: cleanName,
          username: cleanUsername,
          email: cleanEmail,
          password,
          avatar: avatar || undefined,
          bio,
        });

        setSuccessMsg('Account created successfully! Logging you in...');
        setTimeout(() => {
          onLoginSuccess(user);
        }, 300);
      } else {
        // Log in
        if (!identifier.trim()) {
          setError('Please enter your email or @username.');
          setLoading(false);
          return;
        }

        if (!password) {
          setError('Please enter your password.');
          setLoading(false);
          return;
        }

        const user = await loginUser({
          loginIdentifier: identifier.trim(),
          password,
        });

        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const currentSeed = username.trim() || name.trim() || identifier.trim() || 'sb_messenger';
  const previewAvatarUrl =
    avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentSeed}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080d11]/95 backdrop-blur-xl overflow-y-auto">
      <div className="w-full max-w-md my-6 bg-[#111b21] border border-[#222e35] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/20 relative overflow-hidden text-[#e9edef]">
        {/* Ambient subtle glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#00a884]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-[#25d366]/10 rounded-full blur-3xl pointer-events-none" />

        {/* SB Messenger Header */}
        <div className="text-center relative z-10 mb-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-[#00a884] to-[#25d366] shadow-lg shadow-[#00a884]/30 text-white mb-3">
            <MessageCircle className="w-8 h-8 fill-white/20 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            SB Messenger
          </h1>
          <p className="text-xs sm:text-sm text-[#8696a0] mt-1">
            Simple. Reliable. Real-time private messaging.
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex rounded-xl bg-[#202c33] p-1 mb-5 relative z-10 border border-[#2a3942]/60">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authMode === 'login'
                ? 'bg-[#00a884] text-[#111b21] shadow-md'
                : 'text-[#8696a0] hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authMode === 'register'
                ? 'bg-[#00a884] text-[#111b21] shadow-md'
                : 'text-[#8696a0] hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Firebase Config Missing Notice */}
        {!isFirebaseConfigured && (
          <div className="mb-4 p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-200 relative z-10 flex gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Firebase Configuration Required</p>
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                Add your Firebase Web credentials in the project settings or environment to enable live cloud authentication.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300 relative z-10 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 relative z-10 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#00a884] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10">
          {authMode === 'register' && (
            <>
              {/* Profile Photo Upload */}
              <div className="flex flex-col items-center justify-center mb-2">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload Profile Photo"
                >
                  <img
                    src={previewAvatarUrl}
                    alt="Profile Preview"
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-[#00a884]/40 group-hover:ring-[#25d366] transition shadow-md"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
                    <Camera className="w-5 h-5" />
                    <span className="text-[9px] font-semibold mt-0.5">Upload</span>
                  </div>
                  <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#00a884] text-white shadow">
                    <Camera className="w-3 h-3" />
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarPick}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1.5 text-[11px] text-[#00a884] hover:text-[#25d366] font-semibold"
                >
                  {avatar ? 'Change Photo' : 'Add Profile Photo (optional)'}
                </button>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#8696a0] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. Sona Miam"
                  maxLength={40}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white placeholder-[#8696a0] text-sm focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884]/30 transition disabled:opacity-50"
                  required
                />
              </div>

              {/* Unique Username */}
              <div>
                <label className="block text-xs font-semibold text-[#8696a0] mb-1">
                  Unique Username (@handle)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0] text-sm font-semibold">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.replace('@', '').toLowerCase().replace(/[^a-z0-9_]/g, '')
                      )
                    }
                    placeholder="username"
                    maxLength={24}
                    disabled={loading}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-[#00a884] font-semibold text-sm focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884]/30 transition disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-[#8696a0] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white placeholder-[#8696a0] text-sm focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884]/30 transition disabled:opacity-50"
                  required
                />
              </div>

              {/* Bio / About */}
              <div>
                <label className="block text-xs font-semibold text-[#8696a0] mb-1">
                  Bio / About
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Hey there! I am using SB Messenger."
                  maxLength={100}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white placeholder-[#8696a0] text-sm focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884]/30 transition disabled:opacity-50"
                />
              </div>
            </>
          )}

          {authMode === 'login' && (
            <>
              {/* Login Identifier (Email or Username) */}
              <div>
                <label className="block text-xs font-semibold text-[#8696a0] mb-1">
                  Email or Username
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter email or @username"
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white placeholder-[#8696a0] text-sm focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884]/30 transition disabled:opacity-50"
                  required
                  autoFocus
                />
              </div>
            </>
          )}

          {/* Password (both in Register and Login) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#8696a0]">
                Password
              </label>
              {authMode === 'register' && (
                <span className="text-[10px] text-[#8696a0]">Min 6 characters</span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full px-3.5 pr-10 py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white placeholder-[#8696a0] text-sm focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884]/30 transition disabled:opacity-50"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-white transition p-0.5"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-bold text-sm shadow-lg shadow-[#00a884]/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#111b21]" />
                <span>{authMode === 'register' ? 'Creating account…' : 'Signing in…'}</span>
              </>
            ) : (
              <>
                <span>{authMode === 'register' ? 'Agree & Create Account' : 'Log In to Messenger'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info & Encryption notice */}
        <div className="mt-5 pt-3 border-t border-[#222e35] text-center text-[11px] text-[#8696a0] flex items-center justify-center gap-1.5 relative z-10">
          <Lock className="w-3 h-3 text-[#00a884]" />
          <span>End-to-end encrypted • Real-time cloud synchronization</span>
        </div>
      </div>
    </div>
  );
};
