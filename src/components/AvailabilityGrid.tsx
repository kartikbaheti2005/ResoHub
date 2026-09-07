import React, { useEffect, useState } from 'react';
import { TimeSlotStatus } from '../types';
import { api } from '../lib/api';
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertTriangle, ShieldX, Info } from 'lucide-react';

interface Props {
  resourceId: string;
  resourceName: string;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSelectSlot?: (startTime: string, endTime: string) => void;
}

export const AvailabilityGrid: React.FC<Props> = ({
  resourceId,
  resourceName,
  selectedDate,
  onDateChange,
  onSelectSlot,
}) => {
  const [timeline, setTimeline] = useState<TimeSlotStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await api.getResourceAvailability(resourceId, selectedDate);
      setTimeline(res.timeline);
    } catch (err) {
      console.error('Failed to load availability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resourceId && selectedDate) {
      fetchTimeline();
    }
  }, [resourceId, selectedDate]);

  return (
    <div id={`availability-grid-${resourceId}`} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
        <div>
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Resource Availability Schedule</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time checking against college timetable & approved reservations
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-600 flex items-center space-x-1">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>Date:</span>
          </label>
          <input
            type="date"
            id="input-availability-date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          <Clock className="w-5 h-5 mx-auto animate-spin text-indigo-500 mb-2" />
          Checking schedule for {selectedDate}...
        </div>
      ) : timeline.length === 0 ? (
        <div className="py-6 text-center text-slate-400 text-xs">
          No schedule data available.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {timeline.map((slot, index) => {
            const isAvailable = slot.status === 'AVAILABLE';
            const isTimetable = slot.status === 'TIMETABLE_OCCUPIED';
            const isApproved = slot.status === 'APPROVED_BOOKING';
            const isPending = slot.status === 'PENDING_REQUEST';
            const isMaintenance = slot.status === 'MAINTENANCE';

            return (
              <div
                key={index}
                onClick={() => isAvailable && onSelectSlot && onSelectSlot(slot.startTime, slot.endTime)}
                className={`p-3 rounded-lg border text-xs transition-all ${
                  isAvailable
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:border-emerald-400 hover:shadow-xs cursor-pointer'
                    : isTimetable
                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                    : isApproved
                    ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
                    : isPending
                    ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                    : 'bg-slate-100 border-slate-200 text-slate-600 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="font-mono text-slate-800">{slot.timeSlot}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold ${
                      isAvailable
                        ? 'bg-emerald-200 text-emerald-800'
                        : isTimetable
                        ? 'bg-amber-200 text-amber-900'
                        : isApproved
                        ? 'bg-indigo-200 text-indigo-800'
                        : isPending
                        ? 'bg-blue-200 text-blue-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isAvailable
                      ? 'AVAILABLE'
                      : isTimetable
                      ? 'TIMETABLE'
                      : isApproved
                      ? 'RESERVED'
                      : isPending
                      ? 'PENDING'
                      : 'MAINTENANCE'}
                  </span>
                </div>

                {slot.details ? (
                  <p className="text-[11px] font-medium text-slate-700 mt-1 line-clamp-1 truncate" title={slot.details}>
                    {slot.details}
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">
                    Ready for instant booking request
                  </p>
                )}

                {slot.occupiedBy && (
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 italic">
                    {slot.occupiedBy}
                  </p>
                )}

                {isAvailable && onSelectSlot && (
                  <span className="block mt-2 text-[10px] font-bold text-indigo-600 hover:underline">
                    Click slot to book →
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
