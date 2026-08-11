import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, GraduationCap, UserCheck, Sparkles, UserX } from 'lucide-react';

export const DemoLoginBanner: React.FC = () => {
  const { user, switchDemoRole, loading } = useAuth();

  const demoAccounts = [
    {
      role: 'MANAGER',
      label: 'Manager / Admin',
      name: 'Dr. Alok Verma',
      email: 'manager@resohub.edu',
      icon: Shield,
      badgeColor: 'bg-indigo-600 text-white',
    },
    {
      role: 'TEACHER',
      label: 'Faculty / Teacher',
      name: 'Prof. Sunita Sharma',
      email: 'dr.sharma@resohub.edu',
      icon: GraduationCap,
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      role: 'CR',
      label: 'Class Rep (CR)',
      name: 'Rahul Mehta',
      email: 'rahul.cse@resohub.edu',
      icon: UserCheck,
      badgeColor: 'bg-amber-600 text-white',
    },
    {
      role: 'STUDENT',
      label: 'Student',
      name: 'Ananya Roy',
      email: 'ananya.ece@resohub.edu',
      icon: Sparkles,
      badgeColor: 'bg-blue-600 text-white',
    },
  ];

  return (
    <div id="demo-login-banner" className="bg-slate-900 border-b border-slate-800 text-slate-200 text-xs py-2 px-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-slate-100">ResoHub Quick Role Switcher:</span>
          <span className="text-slate-400 hidden lg:inline">Test both sides of the platform instantly:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {demoAccounts.map((acc) => {
            const Icon = acc.icon;
            const isActive = user?.email === acc.email;
            return (
              <button
                key={acc.email}
                id={`btn-demo-${acc.role.toLowerCase()}`}
                disabled={loading}
                onClick={() => switchDemoRole(acc.email)}
                className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'ring-2 ring-indigo-400 shadow-sm bg-slate-800 text-white'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'
                }`}
                title={`Switch to ${acc.label} (${acc.name})`}
              >
                <Icon className="w-3.5 h-3.5 text-slate-300" />
                <span>{acc.label}</span>
                {isActive && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-indigo-500 text-white font-bold">
                    ACTIVE
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
