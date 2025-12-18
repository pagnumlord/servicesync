import React, { useState } from 'react';
import { X, CheckCircle, Pause, AlertCircle } from 'lucide-react';
import { WorkOrder } from '../types';

interface CheckOutModalProps {
  workOrder: WorkOrder;
  onClose: () => void;
  onCheckOut: (data: {
    status_after_visit: string;
    suspension_reason?: string;
    notes?: string;
  }) => void;
}

const CheckOutModal: React.FC<CheckOutModalProps> = ({
  workOrder,
  onClose,
  onCheckOut
}) => {
  const [statusAfterVisit, setStatusAfterVisit] = useState<string>('Active');
  const [suspensionReason, setSuspensionReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onCheckOut({
      status_after_visit: statusAfterVisit,
      suspension_reason: statusAfterVisit === 'Suspended' ? suspensionReason : undefined,
      notes: notes || undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Check Out</h2>
            <p className="text-sm text-gray-600">WO-{workOrder.work_order_number}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Status After Visit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status After Visit *
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setStatusAfterVisit('Active')}
                className={`w-full flex items-center p-3 rounded-lg border-2 transition-colors ${
                  statusAfterVisit === 'Active'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CheckCircle
                  size={20}
                  className={statusAfterVisit === 'Active' ? 'text-blue-500' : 'text-gray-400'}
                />
                <div className="ml-3 text-left">
                  <div className="font-medium text-gray-900">Continue Work</div>
                  <div className="text-xs text-gray-600">Will return later, still active</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatusAfterVisit('Suspended')}
                className={`w-full flex items-center p-3 rounded-lg border-2 transition-colors ${
                  statusAfterVisit === 'Suspended'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Pause
                  size={20}
                  className={statusAfterVisit === 'Suspended' ? 'text-purple-500' : 'text-gray-400'}
                />
                <div className="ml-3 text-left">
                  <div className="font-medium text-gray-900">Suspend</div>
                  <div className="text-xs text-gray-600">Needs parts or return trip</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatusAfterVisit('Complete')}
                className={`w-full flex items-center p-3 rounded-lg border-2 transition-colors ${
                  statusAfterVisit === 'Complete'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CheckCircle
                  size={20}
                  className={statusAfterVisit === 'Complete' ? 'text-green-500' : 'text-gray-400'}
                />
                <div className="ml-3 text-left">
                  <div className="font-medium text-gray-900">Complete</div>
                  <div className="text-xs text-gray-600">Job finished</div>
                </div>
              </button>
            </div>
          </div>

          {/* Suspension Reason (only if Suspended) */}
          {statusAfterVisit === 'Suspended' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suspension Reason *
              </label>
              <select
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select reason...</option>
                <option value="needs_parts">Needs Parts</option>
                <option value="needs_return">Needs Return Trip</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visit Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What was done during this visit..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={statusAfterVisit === 'Suspended' && !suspensionReason}
              className={`flex-1 px-4 py-2 rounded-md text-white ${
                statusAfterVisit === 'Suspended' && !suspensionReason
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Check Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckOutModal;
