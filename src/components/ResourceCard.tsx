import React, { useState } from 'react';
import { Resource } from '../types';
import {
  Building2,
  MapPin,
  Users,
  Monitor,
  Laptop,
  Projector,
  Tv,
  Wind,
  Wifi,
  Volume2,
  CheckCircle,
  Clock,
  Sparkles,
  Wrench,
  AlertCircle,
} from 'lucide-react';

interface Props {
  resource: Resource;
  onSelectForBooking: (resource: Resource) => void;
  onViewAvailability: (resource: Resource) => void;
  isManager?: boolean;
  onEditResource?: (resource: Resource) => void;
}

export const ResourceCard: React.FC<Props> = ({
  resource,
  onSelectForBooking,
  onViewAvailability,
  isManager,
  onEditResource,
}) => {
  const specs = resource.specifications || {};

  const statusColor =
    resource.status === 'AVAILABLE'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : resource.status === 'MAINTENANCE'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-rose-100 text-rose-800 border-rose-300';

  return (
    <div
      id={`resource-card-${resource.id}`}
      className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group"
    >
      {/* Header / Image Area */}
      <div className="relative h-44 bg-slate-100 overflow-hidden">
        <img
          src={resource.imageUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=60'}
          alt={resource.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex items-center space-x-2">
          <span className="bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-white/20">
            {resource.categoryName}
          </span>
        </div>

        <div className="absolute top-3 right-3">
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-xs ${statusColor}`}
          >
            {resource.status}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h3 className="text-base font-bold leading-tight drop-shadow-xs line-clamp-1">{resource.name}</h3>
          <p className="text-xs text-slate-200 flex items-center gap-1 mt-1 font-medium">
            <MapPin className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
            <span className="truncate">{resource.location}</span>
          </p>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
            {resource.description || 'College owned resource managed via ResoHub platform.'}
          </p>

          {/* Key Specifications Grid */}
          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Specifications & Features
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-700 font-medium">
              <span className="inline-flex items-center space-x-1 bg-white px-2 py-1 rounded-md border border-slate-200">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cap: {resource.capacity}</span>
              </span>

              {specs.systemCount !== undefined && specs.systemCount > 0 && (
                <span className="inline-flex items-center space-x-1 bg-white px-2 py-1 rounded-md border border-slate-200">
                  <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{specs.systemCount} Systems</span>
                </span>
              )}

              {specs.hasProjector && (
                <span className="inline-flex items-center space-x-1 bg-white px-2 py-1 rounded-md border border-slate-200">
                  <Projector className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Projector</span>
                </span>
              )}

              {specs.hasAC && (
                <span className="inline-flex items-center space-x-1 bg-white px-2 py-1 rounded-md border border-slate-200">
                  <Wind className="w-3.5 h-3.5 text-sky-600" />
                  <span>AC</span>
                </span>
              )}

              {specs.hasInternet && (
                <span className="inline-flex items-center space-x-1 bg-white px-2 py-1 rounded-md border border-slate-200">
                  <Wifi className="w-3.5 h-3.5 text-blue-600" />
                  <span>Internet</span>
                </span>
              )}

              {specs.hasSmartBoard && (
                <span className="inline-flex items-center space-x-1 bg-white px-2 py-1 rounded-md border border-slate-200">
                  <Tv className="w-3.5 h-3.5 text-purple-600" />
                  <span>Smart Board</span>
                </span>
              )}

              {specs.hasAudioSystem && (
                <span className="inline-flex items-center space-x-1 bg-white px-2 py-1 rounded-md border border-slate-200">
                  <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Audio System</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
          <button
            id={`btn-view-schedule-${resource.id}`}
            onClick={() => onViewAvailability(resource)}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-2 px-3 rounded-lg transition flex items-center justify-center space-x-1 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-slate-600" />
            <span>Check Schedule</span>
          </button>

          {isManager ? (
            <button
              id={`btn-edit-resource-${resource.id}`}
              onClick={() => onEditResource && onEditResource(resource)}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold py-2 px-3 rounded-lg transition cursor-pointer"
            >
              Edit
            </button>
          ) : (
            <button
              id={`btn-request-resource-${resource.id}`}
              disabled={resource.status !== 'AVAILABLE'}
              onClick={() => onSelectForBooking(resource)}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-lg transition flex items-center justify-center space-x-1 cursor-pointer ${
                resource.status === 'AVAILABLE'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Book Slot</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
