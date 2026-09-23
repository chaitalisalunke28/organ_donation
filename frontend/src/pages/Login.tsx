import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Lock,
  Mail,
  AlertCircle,
  Info,
  Building2,
  Stethoscope,
  ShieldCheck,
  GitMerge,
  FileCheck2,
  Timer,
  ArrowRight,
} from 'lucide-react';
import { login as apiLogin } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { AuthUser } from '../types';

const DEMO_ACCOUNTS = [
  {
    label: 'Coordinator',
    hint: 'Matching & allocation',
    email: 'coordinator@organalloc.com',
    password: 'coord123',
    icon: <GitMerge className="h-4 w-4" />,
  },
  {
    label: 'Hospital',
    hint: 'Patients & offers',
    email: 'hospitala@organalloc.com',
    password: 'hospital123',
    icon: <Stethoscope className="h-4 w-4" />,
  },
  {
    label: 'Admin',
    hint: 'Hospital network',
    email: 'admin@organalloc.com',
    password: 'admin123',
    icon: <Building2 className="h-4 w-4" />,
  },
];

const FEATURES = [
  { icon: <ShieldCheck className="h-4 w-4" />, text: 'ABO & HLA compatibility screening with hard safety filters' },
  { icon: <Timer className="h-4 w-4" />, text: 'Ischemia-aware transport feasibility for every offer' },
  { icon: <FileCheck2 className="h-4 w-4" />, text: 'Auditable decision records for each allocation' },
];

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
    <div className="flex min-h-screen bg-white">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden bg-ink-950 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-teal-600/30 blur-[120px]" />
          <div className="absolute -bottom-40 right-[-6rem] h-[26rem] w-[26rem] rounded-full bg-emerald-500/20 blur-[120px]" />
          <svg className="absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden="true">
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M32 0H0V32" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-700 shadow-lg shadow-teal-900/50">
            <Heart className="h-5 w-5 fill-white text-white" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-lg font-bold">OrganConnect</p>
            <p className="text-xs text-gray-400">Transplant Coordination Network</p>
          </div>
        </div>

        <div className="relative space-y-8">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Every organ, matched with care
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.15] tracking-tight text-white xl:text-[2.75rem]">
              From donor to recipient,
              <br />
              <span className="bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">
                one coordinated flow.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-gray-400">
              Register patients, verify clinical evidence, rank compatible recipients and track every offer
              across the hospital network.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm text-gray-300">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-teal-300 ring-1 ring-white/10">
                  {f.icon}
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-gray-500">
          &copy; {new Date().getFullYear()} OrganConnect · EDI Project
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700">
              <Heart className="h-5 w-5 fill-white text-white" />
            </div>
            <p className="font-display text-lg font-bold text-gray-900">OrganConnect</p>
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight text-gray-950">Welcome back</h2>
          <p className="mt-1.5 text-sm text-gray-500">
            Sign in with your authorised account. All access is logged.
          </p>

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@hospital.org"
                  className="input h-11 pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input h-11 pl-10"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary h-11 w-full text-[15px]">
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <div className="mb-3 flex items-center gap-3">
              <span className="h-px flex-1 bg-gray-200" />
              <span className="text-2xs font-semibold uppercase tracking-[0.08em] text-gray-400">
                Demo accounts
              </span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const selected = email === acc.email;
                return (
                  <button
                    key={acc.label}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword(acc.password);
                      setError('');
                    }}
                    className={`rounded-xl border bg-white p-3 text-left transition-all hover:shadow-raised ${
                      selected ? 'border-teal-500 ring-4 ring-teal-500/15' : 'border-gray-200'
                    }`}
                  >
                    <span
                      className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${
                        selected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {acc.icon}
                    </span>
                    <span className="block text-[13px] font-semibold text-gray-900">{acc.label}</span>
                    <span className="block text-2xs leading-snug text-gray-500">{acc.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-8 flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs leading-relaxed text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p>
              <span className="font-semibold">Academic prototype.</span> Built for an Engineering Design &amp;
              Innovation project with synthetic data. Not for clinical use. Real allocation decisions must be
              made by qualified transplant professionals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
