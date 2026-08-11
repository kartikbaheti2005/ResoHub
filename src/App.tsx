import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoLoginBanner } from './components/DemoLoginBanner';
import { Navbar } from './components/Navbar';
import { ManagerDashboard } from './components/manager/ManagerDashboard';
import { UserDashboard } from './components/user/UserDashboard';
import { Resource } from './types';
import { Building2, Shield, GraduationCap, Lock, Mail, User, Sparkles, Loader2, ArrowRight } from 'lucide-react';

function MainApp() {
  const { user, loading, login, register } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedResourceForBooking, setSelectedResourceForBooking] = useState<Resource | null>(null);

  // Auth screen state
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'TEACHER' | 'STUDENT' | 'CR'>('TEACHER');
  const [department, setDepartment] = useState('Computer Science');
  const [authError, setAuthError] = useState<string | null>(null);
  const [submittingAuth, setSubmittingAuth] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAuth(true);
    setAuthError(null);

    try {
      if (authMode === 'LOGIN') {
        await login(email, password);
      } else {
        await register({ name, email, password, role, department });
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setSubmittingAuth(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <Building2 className="w-12 h-12 text-indigo-500 animate-pulse mb-3" />
        <p className="text-sm font-bold tracking-wider uppercase text-slate-300">Loading ResoHub Platform...</p>
      </div>
    );
  }

  // If not logged in, show Auth Screen or Quick Switcher
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-slate-100 font-sans">
        <DemoLoginBanner />

        <div className="flex-1 flex items-center justify-center p-4 py-12">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700/80 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-indigo-500/30">
                <Building2 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-white">ResoHub</h1>
              <p className="text-xs text-slate-400 mt-1">Smart College Resource Availability & Booking Platform</p>
            </div>

            {authError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-medium">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
              {authMode === 'REGISTER' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Prof. Sunita Sharma"
                      required
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white font-medium focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">College Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@resohub.edu"
                    required
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {authMode === 'REGISTER' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="TEACHER">TEACHER</option>
                      <option value="CR">CLASS REP (CR)</option>
                      <option value="STUDENT">STUDENT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Computer Science"
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingAuth}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer mt-2"
              >
                {submittingAuth ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{authMode === 'LOGIN' ? 'Sign In to ResoHub' : 'Create College Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-700/60 text-center text-xs">
              <button
                onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                className="text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                {authMode === 'LOGIN' ? "Don't have an account? Register" : 'Already registered? Sign In'}
              </button>
            </div>
          </div>
        </div>

        <footer className="py-4 text-center text-[11px] text-slate-500 border-t border-slate-800">
          ResoHub College Resource Management Platform • Production-grade Architecture
        </footer>
      </div>
    );
  }

  const isManager = user.role === 'MANAGER';

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col">
      <DemoLoginBanner />

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRequestNewBooking={
          !isManager
            ? () => {
                setSelectedResourceForBooking(null);
                setBookingModalOpen(true);
              }
            : undefined
        }
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isManager ? (
          <ManagerDashboard
            activeTab={activeTab === 'catalog' ? 'dashboard' : activeTab}
            setActiveTab={setActiveTab}
          />
        ) : (
          <UserDashboard
            activeTab={activeTab === 'dashboard' ? 'catalog' : activeTab}
            setActiveTab={setActiveTab}
            bookingModalOpen={bookingModalOpen}
            setBookingModalOpen={setBookingModalOpen}
            selectedResourceForBooking={selectedResourceForBooking}
            setSelectedResourceForBooking={setSelectedResourceForBooking}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">ResoHub — Centralized College Resource Availability & Booking Platform</p>
        <p className="text-[11px] text-slate-400 mt-1">Built with automated conflict prevention, timetable sync, and role authorization.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
