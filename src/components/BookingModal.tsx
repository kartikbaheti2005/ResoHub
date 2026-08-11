import React, { useState, useEffect } from 'react';
import { Resource } from '../types';
import { api } from '../lib/api';
import {
  Calendar,
  Clock,
  Building2,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Users,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedResource?: Resource | null;
  allResources?: Resource[];
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  onBookingSubmitted?: () => void;
}

export const BookingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedResource,
  allResources = [],
  initialDate,
  initialStartTime,
  initialEndTime,
  onBookingSubmitted,
}) => {
  const [resourceId, setResourceId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [purpose, setPurpose] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [expectedCount, setExpectedCount] = useState<number>(30);
  const [requiredEquipment, setRequiredEquipment] = useState<string[]>([]);

  // Conflict Checking State
  const [conflictChecking, setConflictChecking] = useState<boolean>(false);
  const [conflictResult, setConflictResult] = useState<{
    hasConflict: boolean;
    reason?: string;
    details?: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSubmitSuccess(false);
      setSubmitError(null);
      setResourceId(selectedResource?.id || (allResources[0]?.id || ''));
      const todayStr = new Date().toISOString().split('T')[0];
      setDate(initialDate || todayStr);
      setStartTime(initialStartTime || '10:00');
      setEndTime(initialEndTime || '12:00');
      setPurpose('');
      setDescription('');
      setExpectedCount(selectedResource?.capacity ? Math.min(30, selectedResource.capacity) : 30);
      setRequiredEquipment([]);
    }
  }, [isOpen, selectedResource]);

  // Trigger Conflict Check whenever resource, date, start or end time changes
  useEffect(() => {
    if (resourceId && date && startTime && endTime && startTime < endTime) {
      checkConflictNow();
    } else {
      setConflictResult(null);
    }
  }, [resourceId, date, startTime, endTime]);

  const checkConflictNow = async () => {
    setConflictChecking(true);
    try {
      const res = await api.checkConflict({ resourceId, date, startTime, endTime });
      setConflictResult(res);
    } catch (err) {
      console.error('Error checking conflict:', err);
    } finally {
      setConflictChecking(false);
    }
  };

  const handleEquipmentToggle = (item: string) => {
    setRequiredEquipment((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceId || !date || !startTime || !endTime || !purpose.trim()) {
      setSubmitError('Please fill in all required fields.');
      return;
    }

    if (startTime >= endTime) {
      setSubmitError('End time must be after start time.');
      return;
    }

    if (conflictResult?.hasConflict) {
      setSubmitError(`Cannot submit request due to schedule conflict: ${conflictResult.reason}`);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await api.createBookingRequest({
        resourceId,
        date,
        startTime,
        endTime,
        purpose: purpose.trim(),
        description: description.trim(),
        expectedCount: Number(expectedCount),
        requiredEquipment,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
        if (onBookingSubmitted) onBookingSubmitted();
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentRes = selectedResource || allResources.find((r) => r.id === resourceId);

  return (
    <div id="booking-modal-backdrop" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div id="booking-modal" className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
              New Resource Reservation Request
            </span>
            <h3 className="text-lg font-bold mt-1 text-white">
              {currentRes ? currentRes.name : 'Select Resource'}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {currentRes?.location} • Max Capacity: {currentRes?.capacity}
            </p>
          </div>
          <button
            id="btn-close-booking-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitSuccess ? (
          <div className="p-8 text-center my-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-slate-900">Request Submitted Successfully!</h4>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
              Your booking request for <span className="font-bold">{currentRes?.name}</span> on {date} ({startTime} - {endTime}) has been sent to the Manager for approval.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{submitError}</span>
              </div>
            )}

            {/* Select Resource if not pre-selected */}
            {!selectedResource && allResources.length > 0 && (
              <div>
                <label className="block font-bold text-slate-800 mb-1">Select College Resource *</label>
                <select
                  id="select-booking-resource"
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {allResources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.location}) - Capacity: {r.capacity}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date and Time Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Date *</span>
                </label>
                <input
                  type="date"
                  id="input-booking-date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Start Time *</span>
                </label>
                <select
                  id="select-booking-starttime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>End Time *</span>
                </label>
                <select
                  id="select-booking-endtime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* REAL-TIME CONFLICT PREVIEW BOX */}
            {conflictChecking ? (
              <div className="p-3 bg-slate-100 rounded-xl flex items-center space-x-2 text-slate-500 font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Checking timetable & reservation conflicts...</span>
              </div>
            ) : conflictResult?.hasConflict ? (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900">
                <div className="flex items-start space-x-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs text-rose-900">Conflict Detected: Resource Occupied!</h5>
                    <p className="text-xs font-semibold mt-0.5 text-rose-800">{conflictResult.reason}</p>
                    {conflictResult.details && (
                      <p className="text-[11px] text-rose-700 mt-1">{conflictResult.details}</p>
                    )}
                    <p className="text-[10px] text-rose-600 font-bold mt-2">
                      ⚠️ Please choose another date or time slot to proceed.
                    </p>
                  </div>
                </div>
              </div>
            ) : conflictResult && !conflictResult.hasConflict ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">Resource is Available for this time slot!</span>
              </div>
            ) : null}

            {/* Purpose & Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-800 mb-1">
                  Purpose of Booking *
                </label>
                <input
                  type="text"
                  id="input-booking-purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g., Guest Lecture / Robotics Workshop / Hackathon Practice"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Expected Attendees *</span>
                </label>
                <input
                  type="number"
                  id="input-booking-attendees"
                  value={expectedCount}
                  onChange={(e) => setExpectedCount(Number(e.target.value))}
                  min={1}
                  max={currentRes?.capacity || 500}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Description / Special Instructions
                </label>
                <input
                  type="text"
                  id="input-booking-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional context for manager review"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Equipment Checklist */}
            <div>
              <label className="block font-bold text-slate-800 mb-2">Required Equipment Setup</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['Projector', 'Audio System', 'Microphones', 'Smart Board', 'AC', 'High-Speed Internet'].map((item) => (
                  <label
                    key={item}
                    className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100"
                  >
                    <input
                      type="checkbox"
                      checked={requiredEquipment.includes(item)}
                      onChange={() => handleEquipmentToggle(item)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                id="btn-cancel-booking-form"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-submit-booking-form"
                disabled={submitting || conflictResult?.hasConflict}
                className={`px-5 py-2 font-bold rounded-lg transition shadow-md flex items-center space-x-1.5 cursor-pointer ${
                  conflictResult?.hasConflict || submitting
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <span>Submit Request to Manager</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
