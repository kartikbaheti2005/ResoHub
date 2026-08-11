import React, { useState, useEffect } from 'react';
import { Resource, ResourceCategory, ResourceStatus } from '../../types';
import { api } from '../../lib/api';
import { Building2, MapPin, Users, X, Loader2, Sparkles, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  resourceToEdit?: Resource | null;
  categories: ResourceCategory[];
  onSaved: () => void;
}

export const ResourceFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  resourceToEdit,
  categories,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(50);
  const [status, setStatus] = useState<ResourceStatus>('AVAILABLE');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Specs
  const [systemCount, setSystemCount] = useState(0);
  const [hasProjector, setHasProjector] = useState(false);
  const [hasScreen, setHasScreen] = useState(false);
  const [hasAC, setHasAC] = useState(false);
  const [hasInternet, setHasInternet] = useState(true);
  const [hasAudioSystem, setHasAudioSystem] = useState(false);
  const [hasSmartBoard, setHasSmartBoard] = useState(false);
  const [softwareInput, setSoftwareInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (resourceToEdit) {
        setName(resourceToEdit.name);
        setCategoryId(resourceToEdit.categoryId);
        setLocation(resourceToEdit.location);
        setCapacity(resourceToEdit.capacity);
        setStatus(resourceToEdit.status);
        setDescription(resourceToEdit.description || '');
        setImageUrl(resourceToEdit.imageUrl || '');

        const specs = resourceToEdit.specifications || {};
        setSystemCount(specs.systemCount || 0);
        setHasProjector(!!specs.hasProjector);
        setHasScreen(!!specs.hasScreen);
        setHasAC(!!specs.hasAC);
        setHasInternet(!!specs.hasInternet);
        setHasAudioSystem(!!specs.hasAudioSystem);
        setHasSmartBoard(!!specs.hasSmartBoard);
        setSoftwareInput((specs.installedSoftware || []).join(', '));
      } else {
        setName('');
        setCategoryId(categories[0]?.id || '');
        setLocation('');
        setCapacity(50);
        setStatus('AVAILABLE');
        setDescription('');
        setImageUrl('https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=60');
        setSystemCount(0);
        setHasProjector(true);
        setHasScreen(true);
        setHasAC(true);
        setHasInternet(true);
        setHasAudioSystem(false);
        setHasSmartBoard(false);
        setSoftwareInput('VSCode, Python, MATLAB');
      }
    }
  }, [isOpen, resourceToEdit, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId || !location.trim() || capacity <= 0) {
      setError('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    setError(null);

    const installedSoftware = softwareInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const specifications = {
      systemCount: Number(systemCount),
      hasProjector,
      hasScreen,
      hasAC,
      hasInternet,
      hasAudioSystem,
      hasSmartBoard,
      installedSoftware,
    };

    const payload = {
      name: name.trim(),
      categoryId,
      location: location.trim(),
      capacity: Number(capacity),
      status,
      description: description.trim(),
      imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=60',
      specifications,
    };

    try {
      if (resourceToEdit) {
        await api.updateResource(resourceToEdit.id, payload);
      } else {
        await api.createResource(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save resource.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="resource-form-backdrop" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div id="resource-form-modal" className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-8">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
              Admin Resource Manager
            </span>
            <h3 className="text-lg font-bold text-white mt-1">
              {resourceToEdit ? `Edit "${resourceToEdit.name}"` : 'Add New College Resource'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-800 mb-1">Resource Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Computer Lab 4 or Main Conference Room"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Resource Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ResourceStatus)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="UNAVAILABLE">UNAVAILABLE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Location / Room Number *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Building B, 3rd Floor, Room 302"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Seating Capacity *</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                min={1}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-800 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key equipment, usage rules, or notes"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-800 mb-1">Cover Image URL</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Specifications Checklist */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="font-bold text-slate-900 mb-2">Resource Specifications & Equipment</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <label className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasProjector}
                  onChange={(e) => setHasProjector(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Projector</span>
              </label>

              <label className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasScreen}
                  onChange={(e) => setHasScreen(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Projection Screen</span>
              </label>

              <label className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAC}
                  onChange={(e) => setHasAC(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Air Conditioned</span>
              </label>

              <label className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasInternet}
                  onChange={(e) => setHasInternet(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">High-Speed Wi-Fi</span>
              </label>

              <label className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAudioSystem}
                  onChange={(e) => setHasAudioSystem(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Audio System / Mics</span>
              </label>

              <label className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSmartBoard}
                  onChange={(e) => setHasSmartBoard(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Smart Touch Board</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Number of Computer Systems</label>
                <input
                  type="number"
                  value={systemCount}
                  onChange={(e) => setSystemCount(Number(e.target.value))}
                  min={0}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Installed Software (comma separated)</label>
                <input
                  type="text"
                  value={softwareInput}
                  onChange={(e) => setSoftwareInput(e.target.value)}
                  placeholder="VSCode, MATLAB, MySQL, Docker"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition shadow-md flex items-center space-x-1.5 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{resourceToEdit ? 'Save Changes' : 'Create Resource'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
