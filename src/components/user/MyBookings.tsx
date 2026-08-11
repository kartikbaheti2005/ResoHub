import React, { useState } from 'react';
import { BookingRequest } from '../../types';
import { api } from '../../lib/api';
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, AlertCircle, Ban, RefreshCw, FileText } from 'lucide-react';

interface Props {
  bookings: BookingRequest[];
  onRefresh: () => void;
}

export const MyBookings: React.FC<Props> = ({ bookings, onRefresh }) => {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING' | 'PAST'>('ACTIVE');

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking request?')) return;
    setCancellingId(id);
    try {
      await api.cancelBooking(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const pendingList = bookings.filter((b) => b.status === 'PENDING');
  const activeList = bookings.filter((b) => b.status === 'APPROVED' && b.date >= todayStr);
  const pastList = bookings.filter((b) => b.status === 'REJECTED' || b.status === 'CANCELLED' || b.status === 'COMPLETED' || (b.status === 'APPROVED' && b.date < todayStr));

  const displayList =
    activeTab === 'ACTIVE'
      ? activeList
      : activeTab === 'PENDING'
      ? pendingList
      : pastList;

  return (
    <div id="my-bookings-container" className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" />
            <span>My Resource Reservations & Requests</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track approval status, access details, and manage your upcoming resource reservations.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`pb-3 px-4 flex items-center space-x-1.5 border-b-2 cursor-pointer transition ${
            activeTab === 'ACTIVE'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Approved Reservations ({activeList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PENDING')}
          className={`pb-3 px-4 flex items-center space-x-1.5 border-b-2 cursor-pointer transition ${
            activeTab === 'PENDING'
              ? 'border-indigo-600 text-indigo-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Pending Approval ({pendingList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PAST')}
          className={`pb-3 px-4 flex items-center space-x-1.5 border-b-2 cursor-pointer transition ${
            activeTab === 'PAST'
              ? 'border-slate-800 text-slate-900 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>History & Decisions ({pastList.length})</span>
        </button>
      </div>

      {/* List */}
      {displayList.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
          <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-slate-700 text-sm">No bookings in this category.</p>
          <p className="text-slate-400 mt-0.5">Explore resources from the catalog to submit a new reservation request.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayList.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      b.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : b.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                        : b.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {b.status}
                  </span>

                  <span className="text-xs font-mono font-bold text-slate-700">
                    {b.date}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-sm">{b.resourceName}</h4>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>{b.resourceLocation}</span>
                </p>

                <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                  <p className="font-bold text-slate-800">
                    Time Slot: <span className="font-mono text-indigo-600">{b.startTime} - {b.endTime}</span>
                  </p>
                  <p className="text-slate-700 font-medium">
                    Purpose: <span className="font-normal">{b.purpose}</span>
                  </p>
                  <p className="text-slate-500">
                    Expected Headcount: <strong className="text-slate-800">{b.expectedCount}</strong>
                  </p>
                  {b.rejectionReason && (
                    <div className="mt-2 p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
                      <strong>Manager Decision Note:</strong> {b.rejectionReason}
                    </div>
                  )}
                </div>
              </div>

              {['PENDING', 'APPROVED'].includes(b.status) && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleCancel(b.id)}
                    disabled={cancellingId === b.id}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancel Request</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
