import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { NotificationDrawer } from './NotificationDrawer';
import {
  Building2,
  Bell,
  LogOut,
  Calendar,
  Layers,
  Clock,
  ShieldAlert,
  User,
  PlusCircle,
} from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRequestNewBooking?: () => void;
}

export const Navbar: React.FC<Props> = ({ activeTab, setActiveTab, onRequestNewBooking }) => {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const checkUnread = async () => {
    if (!user) return;
    try {
      const notifs = await api.getNotifications();
      setUnreadCount(notifs.filter((n) => !n.isRead).length);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    checkUnread();
    const interval = setInterval(checkUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const isManager = user?.role === 'MANAGER';

  return (
    <>
      <nav id="main-nav" className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Primary Nav */}
            <div className="flex items-center space-x-6">
              <div
                onClick={() => setActiveTab(isManager ? 'dashboard' : 'catalog')}
                className="flex items-center space-x-3 cursor-pointer group"
              >
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition">
                  <span className="text-white font-bold text-xs">RH</span>
                </div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">ResoHub</h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 text-[10px] font-semibold text-slate-500 rounded uppercase tracking-wider">
                    {user?.role} PORTAL
                  </span>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="hidden md:flex items-center space-x-1">
                {isManager ? (
                  <>
                    <button
                      id="nav-tab-manager-dashboard"
                      onClick={() => setActiveTab('dashboard')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                        activeTab === 'dashboard'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>Dashboard</span>
                    </button>
                    <button
                      id="nav-tab-manager-resources"
                      onClick={() => setActiveTab('resources')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                        activeTab === 'resources'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Resources</span>
                    </button>
                    <button
                      id="nav-tab-manager-timetable"
                      onClick={() => setActiveTab('timetable')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                        activeTab === 'timetable'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Timetable</span>
                    </button>
                    <button
                      id="nav-tab-manager-requests"
                      onClick={() => setActiveTab('requests')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                        activeTab === 'requests'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>Approvals</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      id="nav-tab-user-catalog"
                      onClick={() => setActiveTab('catalog')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                        activeTab === 'catalog'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Explore Resources</span>
                    </button>
                    <button
                      id="nav-tab-user-mybookings"
                      onClick={() => setActiveTab('mybookings')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                        activeTab === 'mybookings'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>My Bookings</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-3">
              {!isManager && onRequestNewBooking && (
                <button
                  id="btn-header-new-request"
                  onClick={onRequestNewBooking}
                  className="hidden sm:inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Request Resource</span>
                </button>
              )}

              {/* Notification Bell */}
              <button
                id="btn-notification-bell"
                onClick={() => setIsNotifOpen(true)}
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* User Profile Info */}
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                  {user?.name.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'U'}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold text-slate-900 leading-none">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{user?.department}</p>
                </div>
                <button
                  id="btn-logout"
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <NotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onRefreshUnread={checkUnread}
      />
    </>
  );
};
