import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Zap, PauseCircle, Power, Ban } from 'lucide-react';

const statusConfig = {
    // Connector Statuses
    Available: { text: 'Available', icon: CheckCircle, className: 'bg-success-100 text-success-700' },
    Charging: { text: 'Charging', icon: Zap, className: 'bg-blue-100 text-blue-700' },
    Preparing: { text: 'Preparing', icon: Clock, className: 'bg-yellow-100 text-yellow-700' },
    SuspendedEV: { text: 'Suspended EV', icon: PauseCircle, className: 'bg-yellow-100 text-yellow-700' },
    SuspendedEVSE: { text: 'Suspended EVSE', icon: PauseCircle, className: 'bg-yellow-100 text-yellow-700' },
    Finishing: { text: 'Finishing', icon: Power, className: 'bg-blue-100 text-blue-700' },
    Faulted: { text: 'Faulted', icon: AlertTriangle, className: 'bg-danger-100 text-danger-700' },
    Unavailable: { text: 'Unavailable', icon: Ban, className: 'bg-gray-100 text-gray-700' },

    // Station Statuses
    Online: { text: 'Online', icon: CheckCircle, className: 'bg-success-100 text-success-700' },
    Offline: { text: 'Offline', icon: XCircle, className: 'bg-gray-100 text-gray-700' },
    Pending: { text: 'Pending', icon: Clock, className: 'bg-yellow-100 text-yellow-700' },

    // Transaction Statuses
    Active: { text: 'Active', icon: Zap, className: 'bg-success-100 text-success-700' },
    Completed: { text: 'Completed', icon: CheckCircle, className: 'bg-gray-100 text-gray-700' },
};

const StatusBadge = ({ status }) => {
    const config = statusConfig[status] || { text: status, icon: Ban, className: 'bg-gray-100 text-gray-800' };
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
            <Icon className="-ml-0.5 h-3.5 w-3.5" />
            {config.text}
        </span>
    );
};

export default StatusBadge;
