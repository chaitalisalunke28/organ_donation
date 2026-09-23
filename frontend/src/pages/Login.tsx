import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Lock, Mail, AlertCircle, Activity } from 'lucide-react';
import { login as apiLogin } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { AuthUser } from '../types';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiLogin(email.trim(), password);
      const userData: AuthUser = res.data;
      login(userData);

      // Role-based redirect
      switch (userData.role) {
        case 'ADMIN':
          navigate('/admin/dashboard', { replace: true });
          break;
        case 'HOSPITAL':
          navigate('/hospital/dashboard', { replace: true });
          break;
        case 'COORDINATOR':
          navigate('/coordinator/dashboard', { replace: true });
          break;
        default:
          navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail ??
          'Invalid credentials. Please check your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-cyan-50 flex flex-col items-center justify-center px-4">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl shadow-lg mb-4">
            <Heart className="w-8 h-8 text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">OrganConnect</h1>
          <p className="text-sm text-teal-700 font-semibold mt-1 uppercase tracking-widest">
            Transplant Coordination System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Sign in to your account</h2>
            <p className="text-sm text-gray-500 mt-1">
              Authorized personnel only. All access is logged and monitored.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@hospital.org"
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Quick Demo Credentials */}
        <div className="mt-4 bg-white/80 backdrop-blur rounded-xl border border-gray-200 p-3 shadow-sm">
          <p className="text-xs font-semibold text-gray-600 mb-2 text-center">One-Click Demo Fill:</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => { setEmail('coordinator@organalloc.com'); setPassword('coord123'); }}
              className="py-1.5 px-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded border border-teal-200 font-medium transition-colors"
            >
              Coordinator
            </button>
            <button
              type="button"
              onClick={() => { setEmail('hospitala@organalloc.com'); setPassword('hospital123'); }}
              className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded border border-blue-200 font-medium transition-colors"
            >
              Hospital A
            </button>
            <button
              type="button"
              onClick={() => { setEmail('admin@organalloc.com'); setPassword('admin123'); }}
              className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded border border-purple-200 font-medium transition-colors"
            >
              Admin
            </button>
          </div>
        </div>

        {/* Academic Disclaimer */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
          <div className="flex items-start gap-2">
            <Activity className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold mb-1">Academic / Research Disclaimer</p>
              <p>
                This system is developed solely for educational and research purposes as part of an
                Engineering Design &amp; Innovation (EDI) project. It is{' '}
                <strong>not intended for clinical or real-world medical use</strong>. Patient data
                shown is synthetic. All organ allocation decisions must be made by qualified
                transplant professionals under applicable regulations.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          &copy; {new Date().getFullYear()} OrganConnect &mdash; EDI Project
        </p>
      </div>
    </div>
  );
}
