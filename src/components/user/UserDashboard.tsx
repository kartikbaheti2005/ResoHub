import React, { useState, useEffect } from 'react';
import { Resource, ResourceCategory, BookingRequest } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ResourceCard } from '../ResourceCard';
import { AvailabilityGrid } from '../AvailabilityGrid';
import { BookingModal } from '../BookingModal';
import { MyBookings } from './MyBookings';
import {
  Building2,
  Search,
  Filter,
  Calendar,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  SlidersHorizontal,
} from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  bookingModalOpen: boolean;
  setBookingModalOpen: (open: boolean) => void;
  selectedResourceForBooking: Resource | null;
  setSelectedResourceForBooking: (res: Resource | null) => void;
}

export const UserDashboard: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  bookingModalOpen,
  setBookingModalOpen,
  selectedResourceForBooking,
  setSelectedResourceForBooking,
}) => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [userBookings, setUserBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [equipmentFilters, setEquipmentFilters] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Schedule Drawer
  const [inspectingResource, setInspectingResource] = useState<Resource | null>(null);
  const [inspectDate, setInspectDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Initial slot passed from grid click
  const [initialSlot, setInitialSlot] = useState<{ start: string; end: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, c, b] = await Promise.all([
        api.getResources({
          category: selectedCategory || undefined,
          search: searchQuery || undefined,
          minCapacity: minCapacity > 0 ? minCapacity : undefined,
          date: selectedDate || undefined,
          startTime: selectedStartTime || undefined,
          endTime: selectedEndTime || undefined,
          requiredEquipment: equipmentFilters,
        }),
        api.getCategories(),
        api.getBookings(),
      ]);

      setResources(r);
      setCategories(c);
      setUserBookings(b);
    } catch (err) {
      console.error('Failed to load user dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, searchQuery, minCapacity, selectedDate, selectedStartTime, selectedEndTime, equipmentFilters]);

  const toggleEquipmentFilter = (item: string) => {
    setEquipmentFilters((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleStartBooking = (resource: Resource) => {
    setSelectedResourceForBooking(resource);
    setInitialSlot(null);
    setBookingModalOpen(true);
  };

  const handleSlotClickFromGrid = (startTime: string, endTime: string) => {
    if (inspectingResource) {
      setSelectedResourceForBooking(inspectingResource);
      setInitialSlot({ start: startTime, end: endTime });
      setInspectingResource(null);
      setBookingModalOpen(true);
    }
  };

  const upcomingApproved = userBookings.filter((b) => b.status === 'APPROVED');
  const pendingRequests = userBookings.filter((b) => b.status === 'PENDING');

  return (
    <div id="user-dashboard" className="space-y-6 pb-12">
      {/* Welcome Hero Bento Box */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <span className="bg-indigo-500/30 text-indigo-200 text-[11px] font-bold px-3 py-1 rounded-full border border-indigo-400/30 tracking-wider uppercase inline-block mb-2">
            ResoHub Resource Discovery & Booking
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
            Discover real-time availability of computer labs, auditoriums, classrooms, and projectors. Reserve facilities with automated conflict detection.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('catalog')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Explore All Resources</span>
            </button>

            <button
              onClick={() => setActiveTab('mybookings')}
              className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl backdrop-blur-md transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>My Reservations ({upcomingApproved.length} Active, {pendingRequests.length} Pending)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Available Facilities</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-slate-900">{resources.filter((r) => r.status === 'AVAILABLE').length}</span>
            <span className="text-xs text-emerald-500 font-medium">Ready for booking</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Active Reservations</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-indigo-600">{upcomingApproved.length}</span>
            <span className="text-xs text-slate-400 font-medium">Approved</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Pending Review</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-amber-600">{pendingRequests.length}</span>
            <span className="text-xs text-amber-500 font-medium">Awaiting Manager</span>
          </div>
        </div>

        <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg border border-indigo-700 flex flex-col justify-between text-white">
          <span className="text-xs font-semibold text-indigo-100 uppercase tracking-widest">Quick Request</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-bold">Instant Booking</span>
            <button
              onClick={() => {
                if (resources.length > 0) handleStartBooking(resources[0]);
              }}
              className="text-xs bg-indigo-500 hover:bg-indigo-400 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer"
            >
              Book Now →
            </button>
          </div>
        </div>
      </div>

      {/* Primary Tab Selector */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-1">
        <button
          id="btn-tab-catalog"
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Browse College Resources ({resources.length})</span>
        </button>

        <button
          id="btn-tab-mybookings"
          onClick={() => setActiveTab('mybookings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'mybookings'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>My Reservations & Requests ({userBookings.length})</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Search and Filters Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              {/* Keyword Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  id="input-user-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by lab name, building, equipment, or software..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-medium text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category Dropdown */}
              <select
                id="select-user-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Advanced Filters Toggle */}
              <button
                id="btn-toggle-advanced-filters"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer ${
                  showAdvancedFilters || equipmentFilters.length > 0 || minCapacity > 0
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters {equipmentFilters.length > 0 && `(${equipmentFilters.length})`}</span>
              </button>
            </div>

            {/* Advanced Filters Drawer */}
            {showAdvancedFilters && (
              <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Min Capacity */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Minimum Seating Capacity</label>
                  <select
                    value={minCapacity}
                    onChange={(e) => setMinCapacity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    <option value={0}>Any Capacity</option>
                    <option value={30}>30+ People</option>
                    <option value={60}>60+ People</option>
                    <option value={100}>100+ People</option>
                    <option value={250}>250+ People</option>
                  </select>
                </div>

                {/* Date & Slot availability filter */}
                <div className="md:col-span-2 grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Check Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">From Time</label>
                    <select
                      value={selectedStartTime}
                      onChange={(e) => setSelectedStartTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                    >
                      <option value="">Any Time</option>
                      {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">To Time</label>
                    <select
                      value={selectedEndTime}
                      onChange={(e) => setSelectedEndTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                    >
                      <option value="">Any Time</option>
                      {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Equipment Checkboxes */}
                <div className="md:col-span-3 pt-2">
                  <label className="block font-bold text-slate-800 mb-1.5">Required Specifications</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'projector', label: 'Projector' },
                      { id: 'ac', label: 'Air Conditioning' },
                      { id: 'internet', label: 'Wi-Fi / Internet' },
                      { id: 'smartboard', label: 'Smart Board' },
                      { id: 'audiosystem', label: 'Audio System' },
                    ].map((eq) => (
                      <button
                        key={eq.id}
                        onClick={() => toggleEquipmentFilter(eq.id)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                          equipmentFilters.includes(eq.id)
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {eq.label}
                      </button>
                    ))}

                    {(searchQuery || selectedCategory || minCapacity > 0 || selectedDate || equipmentFilters.length > 0) && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('');
                          setMinCapacity(0);
                          setSelectedDate('');
                          setSelectedStartTime('');
                          setSelectedEndTime('');
                          setEquipmentFilters([]);
                        }}
                        className="text-xs font-bold text-rose-600 hover:underline px-2 py-1.5"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Catalog Grid */}
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm">Searching resources...</div>
          ) : resources.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
              <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-sm">No Resources Found</p>
              <p className="text-xs text-slate-400 mt-0.5">Try clearing or adjusting your search filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {resources.map((res) => (
                <ResourceCard
                  key={res.id}
                  resource={res}
                  onSelectForBooking={handleStartBooking}
                  onViewAvailability={(r) => {
                    setInspectingResource(r);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Bookings Tab */}
      {activeTab === 'mybookings' && (
        <MyBookings bookings={userBookings} onRefresh={loadData} />
      )}

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
          setSelectedResourceForBooking(null);
          setInitialSlot(null);
        }}
        selectedResource={selectedResourceForBooking}
        allResources={resources}
        initialDate={selectedDate || new Date().toISOString().split('T')[0]}
        initialStartTime={initialSlot?.start}
        initialEndTime={initialSlot?.end}
        onBookingSubmitted={loadData}
      />

      {/* Resource Schedule Drawer */}
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
              onSelectSlot={handleSlotClickFromGrid}
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                Click any <strong className="text-emerald-700">Available</strong> slot to open reservation request.
              </span>
              <button
                onClick={() => setInspectingResource(null)}
                className="px-4 py-2 bg-slate-100 font-semibold text-xs text-slate-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
