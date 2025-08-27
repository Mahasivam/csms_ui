import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Zap,
    Play,
    Square,
    RotateCcw,
    Unlock,
    AlertCircle,
    ArrowLeft,
    Info,
    Power
} from 'lucide-react';
import { chargingStationAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const ActionButton = ({ onClick, disabled, loading, icon: Icon, text, loadingText, className }) => (
    <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-150 ${className}`}
    >
        <Icon className={`-ml-1 mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? loadingText : text}
    </button>
);

const InfoRow = ({ label, value }) => (
    <div className="flex justify-between py-3 border-b border-gray-200">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="text-sm text-gray-900 font-semibold">{value || 'N/A'}</dd>
    </div>
);

const ChargingStationDetail = () => {
    const { id } = useParams();
    const [station, setStation] = useState(null);
    const [connectors, setConnectors] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [idTag, setIdTag] = useState('04B34299A33480'); // Default for demo

    useEffect(() => {
        const fetchStationDetails = async () => {
            try {
                const [stationRes, connectorsRes, transactionsRes] = await Promise.all([
                    chargingStationAPI.getById(id),
                    chargingStationAPI.getConnectors(id),
                    chargingStationAPI.getTransactions(id)
                ]);

                setStation(stationRes.data);
                setConnectors(connectorsRes.data);
                setTransactions(transactionsRes.data);
            } catch (error) {
                console.error('Error fetching station details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStationDetails();
        const interval = setInterval(fetchStationDetails, 5000); // Refresh every 5s
        return () => clearInterval(interval);
    }, [id]);

    const handleAction = async (action, params, loadingKey) => {
        setActionLoading(prev => ({ ...prev, [loadingKey]: true }));
        try {
            await action(...params);
        } catch (error) {
            console.error(`Error performing action ${loadingKey}:`, error);
            alert(`Error: ${error.response?.data?.message || 'An unexpected error occurred.'}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [loadingKey]: false }));
        }
    };

    const handleRemoteStart = (connectorId) => {
        // In a real app, you'd use a modal to get the idTag
        if (!idTag) {
            alert('Please enter an ID Tag.');
            return;
        }
        handleAction(chargingStationAPI.remoteStart, [id, idTag, connectorId], `start-${connectorId}`);
    };

    const handleRemoteStop = (transactionId) => {
        console.log('Stopping transaction with ID:', transactionId);
        if (!transactionId) {
            console.error('No transaction ID provided to stop');
            alert('Error: No transaction ID provided');
            return;
        }
        handleAction(chargingStationAPI.remoteStop, [id, transactionId], `stop-${transactionId}`);
    };

    const handleReset = () => {
        if (window.confirm('Are you sure you want to reset this charging station? This may interrupt charging sessions.')) {
            handleAction(chargingStationAPI.reset, [id], 'reset');
        }
    };

    const handleUnlockConnector = (connectorId) => {
        handleAction(chargingStationAPI.unlockConnector, [id, connectorId], `unlock-${connectorId}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!station) {
        return (
            <div className="text-center py-16">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">Charging Station Not Found</h3>
                <p className="mt-1 text-sm text-gray-500">The requested station could not be found.</p>
                <Link to="/charging-stations" className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
                    Go Back to Stations
                </Link>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <Link to="/charging-stations" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-3">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Stations
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold leading-tight text-gray-900">
                            {station.chargePointId}
                        </h1>
                        <p className="mt-1 text-md text-gray-600">
                            {station.chargePointVendor} • {station.chargePointModel}
                        </p>
                    </div>
                    <ActionButton
                        onClick={handleReset}
                        disabled={actionLoading.reset}
                        loading={actionLoading.reset}
                        icon={RotateCcw}
                        text="Reset Station"
                        loadingText="Resetting..."
                        className="bg-danger-600 hover:bg-danger-700 focus:ring-danger-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Connectors (Main Column) */}
                <div className="lg:col-span-2 space-y-6">
                    {connectors.map((connector) => {
                        const activeTransaction = transactions.find(t => t.connectorId === connector.connectorId && t.status === 'Active');
                        return (
                            <div key={connector.id} className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                                <div className="p-5 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-gray-900">Connector #{connector.connectorId}</h3>
                                        <StatusBadge status={connector.status} />
                                    </div>
                                </div>

                                <div className="p-5">
                                    {activeTransaction ? (
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <h4 className="font-semibold text-blue-800 mb-3">Active Session</h4>
                                            <InfoRow label="Transaction ID" value={activeTransaction.transactionId} />
                                            <InfoRow label="ID Tag" value={activeTransaction.idTag} />
                                            <InfoRow label="Started" value={new Date(activeTransaction.startTimestamp).toLocaleString()} />
                                            <InfoRow label="Energy Consumed" value={`${activeTransaction.startMeterValue || 0} Wh`} />
                                            <div className="mt-4">
                                                <ActionButton
                                                    onClick={() => handleRemoteStop(activeTransaction.transactionId)}
                                                    disabled={actionLoading[`stop-${activeTransaction.transactionId}`]}
                                                    loading={actionLoading[`stop-${activeTransaction.transactionId}`]}
                                                    icon={Square}
                                                    text="Stop Session"
                                                    loadingText="Stopping..."
                                                    className="w-full bg-danger-600 hover:bg-danger-700 focus:ring-danger-500"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className="text-gray-500">No active session on this connector.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-50 p-4 border-t border-gray-200 flex items-center justify-end space-x-3">
                                    <ActionButton
                                        onClick={() => handleUnlockConnector(connector.connectorId)}
                                        disabled={actionLoading[`unlock-${connector.connectorId}`]}
                                        loading={actionLoading[`unlock-${connector.connectorId}`]}
                                        icon={Unlock}
                                        text="Unlock"
                                        loadingText="Unlocking..."
                                        className="bg-gray-600 hover:bg-gray-700 focus:ring-gray-500"
                                    />
                                    <ActionButton
                                        onClick={() => handleRemoteStart(connector.connectorId)}
                                        disabled={connector.status !== 'Available' || actionLoading[`start-${connector.connectorId}`]}
                                        loading={actionLoading[`start-${connector.connectorId}`]}
                                        icon={Play}
                                        text="Start Session"
                                        loadingText="Starting..."
                                        className="bg-success-600 hover:bg-success-700 focus:ring-success-500"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Station Info (Sidebar) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white shadow-sm rounded-xl border border-gray-200">
                        <div className="p-5 border-b border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                <Info className="h-5 w-5 mr-2 text-primary-600" />
                                Station Information
                            </h3>
                        </div>
                        <div className="p-5">
                            <dl>
                                <InfoRow label="Status" value={station.isRegistered ? 'Registered' : 'Pending'} />
                                <InfoRow label="Firmware Version" value={station.firmwareVersion} />
                                <InfoRow label="Serial Number" value={station.chargePointSerialNumber} />
                                <InfoRow label="Last Heartbeat" value={station.lastHeartbeat ? new Date(station.lastHeartbeat).toLocaleString() : 'Never'} />
                            </dl>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChargingStationDetail;
