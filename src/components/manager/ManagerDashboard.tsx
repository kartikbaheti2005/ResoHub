import React, { useState, useEffect } from 'react';
import { Resource, ResourceCategory, BookingRequest, DashboardMetrics } from '../../types';
import { api } from '../../lib/api';
import { ResourceCard } from '../ResourceCard';
import { ResourceFormModal } from './ResourceFormModal';
import { TimetableManager } from './TimetableManager';
import { BookingRequestsTable } from './BookingRequestsTable';
import { AvailabilityGrid } from '../AvailabilityGrid';
import {
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  BarChart3,
  Plus,
  Calendar,
  Layers,
  Wrench,
  Search,
  Filter,
  Check,
  Shield,
  Activity,
} from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const ManagerDashboard: React.FC<Props> = ({ activeTab, setActiveTab }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal controls
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  // Availability schedule drawer modal
  const [inspectingResource, setInspectingResource] = useState<Resource | null>(null);
  const [inspectDate, setInspectDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, r, c, b] = await Promise.all([
        api.getDashboardMetrics(),
        api.getResources(),
        api.getCategories(),
        api.getBookings(),
      ]);
      setMetrics(m);
      setResources(r);
      setCategories(c);
      setBookings(b);
    } catch (err) {
      console.error('Failed to load manager dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingRequests = bookings.filter((b) => b.status === 'PENDING');

  let filteredResources = resources;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredResources = filteredResources.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.categoryName.toLowerCase().includes(q)
    );
  }
  if (categoryFilter) {
    filteredResources = filteredResources.filter((r) => r.categoryId === categoryFilter);
  }
  if (statusFilter) {
    filteredResources = filteredResources.filter((r) => r.status === statusFilter);
  }

  return (
    <div id="manager-dashboard" className="space-y-6 pb-12">
      {/* Bento Grid Header / Stat Cards */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Total Resources</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-slate-900">{metrics.totalResources}</span>
              <span className="text-xs text-emerald-500 font-medium">{metrics.availableResources} available</span>
            </div>
          </div>

          <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg border border-indigo-700 flex flex-col justify-between text-white">
            <span className="text-xs font-semibold text-indigo-100 uppercase tracking-widest">Pending Requests</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold">{metrics.pendingRequests}</span>
              <span className="text-xs bg-indigo-500 text-indigo-100 font-bold px-2 py-0.5 rounded-md">Priority Review</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Approved Today</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-slate-900">{metrics.todayApprovedBookings}</span>
              <span className="text-xs text-slate-400 font-medium">Active reservations</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Maintenance</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-slate-900">{metrics.maintenanceResources}</span>
              <span className="text-xs text-amber-500 font-medium">Action required</span>
            </div>
          </div>
        </div>
      )}

      {/* Primary Tab Navigation */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between overflow-x-auto">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Overview & Pending ({pendingRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'resources'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Manage Resources ({resources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('timetable')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'timetable'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>College Timetable</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Booking Approvals</span>
          </button>
        </div>

        <button
          onClick={() => {
            setEditingResource(null);
            setShowResourceModal(true);
          }}
          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer ml-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Resource</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW & PENDING TAB - Bento Grid Layout */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Bento Block Left: Pending Booking Requests Table */}
            <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <span>Recent Booking Requests</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Review faculty and student resource reservation requests.</p>
                </div>

                <button
                  onClick={() => setActiveTab('requests')}
                  className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  View All Requests →
                </button>
              </div>

              <div className="p-4 flex-grow">
                {pendingRequests.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 text-xs">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">All Clear!</p>
                    <p className="text-slate-400 mt-0.5">There are no pending booking requests waiting for review.</p>
                  </div>
                ) : (
                  <BookingRequestsTable
                    bookings={pendingRequests}
                    onRefresh={loadData}
                  />
                )}
              </div>
            </div>

            {/* Bento Block Right: Utilization & System Insight */}
            <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between space-y-5">
              <div>
                <h2 className="font-bold text-slate-900 text-base mb-4">Utilization Rates</h2>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>Computer Labs</span>
                      <span>84%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: '84%' }}></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>Seminar Halls</span>
                      <span>42%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: '42%' }}></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>Projectors & AV Gear</span>
                      <span>61%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: '61%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-600" />
                    <span>System Insight</span>
                  </h3>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    Peak demand predicted for Wednesday between 10 AM and 2 PM. Consider flagging high-capacity rooms for larger groups only.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('timetable')}
                className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Manage Timetable & Auto-Blocks
              </button>
            </div>
          </div>

          {/* College Resources Overview Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span>College Resource Inventory</span>
              </h3>
              <button
                onClick={() => setActiveTab('resources')}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                View & Edit All →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {resources.slice(0, 6).map((res) => (
                <ResourceCard
                  key={res.id}
                  resource={res}
                  isManager={true}
                  onSelectForBooking={() => {}}
                  onViewAvailability={(r) => {
                    setInspectingResource(r);
                  }}
                  onEditResource={(r) => {
                    setEditingResource(r);
                    setShowResourceModal(true);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Bento Grid Bottom Status Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap gap-8 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Availability Engine</span>
                <span className="text-xs font-medium text-slate-700">Active & Monitoring Timetable Logs</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Database Sync</span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Synchronized
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditingResource(null);
                  setShowResourceModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Add Resource</span>
              </button>
              <button
                onClick={() => setActiveTab('timetable')}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Timetable Schedule</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MANAGE RESOURCES TAB */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources by name or location..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="UNAVAILABLE">Unavailable</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredResources.map((res) => (
              <ResourceCard
                key={res.id}
                resource={res}
                isManager={true}
                onSelectForBooking={() => {}}
                onViewAvailability={(r) => {
                  setInspectingResource(r);
                }}
                onEditResource={(r) => {
                  setEditingResource(r);
                  setShowResourceModal(true);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3. TIMETABLE TAB */}
      {activeTab === 'timetable' && (
        <TimetableManager resources={resources} />
      )}

      {/* 4. BOOKING REQUESTS TAB */}
      {activeTab === 'requests' && (
        <BookingRequestsTable bookings={bookings} onRefresh={loadData} />
      )}

      {/* Resource Form Modal */}
      <ResourceFormModal
        isOpen={showResourceModal}
        onClose={() => {
          setShowResourceModal(false);
          setEditingResource(null);
        }}
        resourceToEdit={editingResource}
        categories={categories}
        onSaved={loadData}
      />

      {/* Schedule Availability Drawer */}
      {inspectingResource && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{inspectingResource.name}</h3>
                <p className="text-xs text-slate-500">{inspectingResource.location}</p>
              </div>
              <button
                onClick={() => setInspectingResource(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <AvailabilityGrid
              resourceId={inspectingResource.id}
              resourceName={inspectingResource.name}
              selectedDate={inspectDate}
              onDateChange={setInspectDate}
            />

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectingResource(null)}
                className="px-4 py-2 bg-slate-100 font-semibold text-xs text-slate-700 rounded-lg"
              >
                Close Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
