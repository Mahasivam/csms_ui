import React from 'react';

const StatusBadge = ({ status, type = 'default' }) => {
    const getStatusColor = () => {
        if (type === 'connector') {
            switch (status) {
                case 'Available': return 'bg-success-100 text-success-800';
                case 'Charging': return 'bg-primary-100 text-primary-800';
                case 'Preparing': return 'bg-warning-100 text-warning-800';
                case 'SuspendedEV': case 'SuspendedEVSE': return 'bg-warning-100 text-warning-800';
                case 'Finishing': return 'bg-warning-100 text-warning-800';
                case 'Faulted': return 'bg-danger-100 text-danger-800';
                case 'Unavailable': return 'bg-gray-100 text-gray-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        }

        if (type === 'transaction') {
            switch (status) {
                case 'Active': return 'bg-success-100 text-success-800';
                case 'Completed': return 'bg-gray-100 text-gray-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        }

        // Default status colors
        switch (status) {
            case 'Accepted': case 'Online': case 'Available':
                return 'bg-success-100 text-success-800';
            case 'Blocked': case 'Offline': case 'Faulted':
                return 'bg-danger-100 text-danger-800';
            case 'Pending': case 'Preparing':
                return 'bg-warning-100 text-warning-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
      {status}
    </span>
    );
};

export default StatusBadge;

// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
