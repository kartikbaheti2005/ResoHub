import React, { useState } from 'react';
import { BookingRequest } from '../../types';
import { api } from '../../lib/api';
import { CheckCircle2, XCircle, Clock, ShieldAlert, User, Calendar, MapPin, FileText, Check, AlertTriangle } from 'lucide-react';

interface Props {
  bookings: BookingRequest[];
  onRefresh: () => void;
}

export const BookingRequestsTable: React.FC<Props> = ({ bookings, onRefresh }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [rejectingBooking, setRejectingBooking] = useState<BookingRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    setActionError(null);
    try {
      await api.updateBookingStatus(id, 'APPROVED');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve booking.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingBooking) return;
    setActionLoading(rejectingBooking.id);
    setActionError(null);

    try {
      await api.updateBookingStatus(rejectingBooking.id, 'REJECTED', rejectionReason.trim());
      setRejectingBooking(null);
      setRejectionReason('');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject booking.');
    } finally {
      setActionLoading(null);
    }
  };

  let filtered = bookings;
  if (filterStatus !== 'ALL') {
    filtered = bookings.filter((b) => b.status === filterStatus);
  }

  return (
    <div id="booking-requests-table-container" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header and Filter */}
      <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <span>Booking Request Approvals</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Review user requests, inspect conflict warnings, and manage resource access.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="font-bold text-slate-600">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses ({bookings.length})</option>
            <option value="PENDING">Pending Approval ({bookings.filter((b) => b.status === 'PENDING').length})</option>
            <option value="APPROVED">Approved ({bookings.filter((b) => b.status === 'APPROVED').length})</option>
            <option value="REJECTED">Rejected ({bookings.filter((b) => b.status === 'REJECTED').length})</option>
            <option value="CANCELLED">Cancelled ({bookings.filter((b) => b.status === 'CANCELLED').length})</option>
          </select>
        </div>
      </div>

      {actionError && (
        <div className="m-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{actionError}</span>
        </div>
      )}

      {/* Table / List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          No booking requests match the selected status filter.
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {filtered.map((b) => (
            <div key={b.id} className="p-5 hover:bg-slate-50/80 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
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

                    <h4 className="font-bold text-slate-900 text-sm">{b.resourceName}</h4>
                    <span className="text-xs text-slate-400 font-medium">• {b.resourceLocation}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5 font-medium text-slate-800">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{b.userName} <strong className="text-slate-500">({b.userRole})</strong></span>
                    </p>

                    <p className="flex items-center gap-1.5 font-medium text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{b.date} <strong className="font-mono text-indigo-700">({b.startTime} - {b.endTime})</strong></span>
                    </p>

                    <p className="flex items-center gap-1.5 text-slate-500">
                      <span>Attendees: <strong className="text-slate-800">{b.expectedCount}</strong></span>
                    </p>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                    <p className="font-semibold text-slate-800">
                      Purpose: <span className="font-normal text-slate-700">{b.purpose}</span>
                    </p>
                    {b.description && (
                      <p className="text-slate-500 mt-1 italic">{b.description}</p>
                    )}
                    {b.requiredEquipment.length > 0 && (
                      <p className="text-[11px] text-indigo-700 font-medium mt-1">
                        Equipment Requested: {b.requiredEquipment.join(', ')}
                      </p>
                    )}
                  </div>

                  {b.rejectionReason && (
                    <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md">
                      <strong>Rejection Reason:</strong> {b.rejectionReason}
                    </div>
                  )}
                </div>

                {/* Right Actions */}
                {b.status === 'PENDING' && (
                  <div className="flex items-center space-x-2 shrink-0 self-end lg:self-center">
                    <button
                      onClick={() => handleApprove(b.id)}
                      disabled={actionLoading === b.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-xs flex items-center space-x-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve</span>
                    </button>

                    <button
                      onClick={() => {
                        setRejectingBooking(b);
                        setRejectionReason('');
                      }}
                      disabled={actionLoading === b.id}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-4 py-2 rounded-lg border border-rose-200 transition cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 inline mr-1" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 p-5 space-y-4 text-xs">
            <h4 className="text-base font-bold text-slate-900">Decline Booking Request</h4>
            <p className="text-slate-600">
              Provide a reason for declining <strong className="text-slate-800">{rejectingBooking.userName}</strong>'s request for {rejectingBooking.resourceName} on {rejectingBooking.date}.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Scheduled maintenance / Alternative hall available / High demand"
                rows={3}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRejectingBooking(null)}
                  className="px-3.5 py-2 bg-slate-100 font-semibold text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
