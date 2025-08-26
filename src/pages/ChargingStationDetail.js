import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    Zap,
    Play,
    Square,
    RotateCcw,
    Unlock,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import { chargingStationAPI } from '../services/api';

const ChargingStationDetail = () => {
    const { chargePointId } = useParams();
    const [station, setStation] = useState(null);
    const [connectors, setConnectors] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});

    useEffect(() => {
        const fetchStationDetails = async () => {
            try {
                const [stationRes, connectorsRes, transactionsRes] = await Promise.all([
                    chargingStationAPI.getById(chargePointId),
                    chargingStationAPI.getConnectors(chargePointId),
                    chargingStationAPI.getTransactions(chargePointId)
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
        const interval = setInterval(fetchStationDetails, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, [chargePointId]);

    const handleRemoteStart = async (connectorId) => {
        const idTag = prompt('Enter ID Tag:');
        if (!idTag) return;

        setActionLoading(prev => ({ ...prev, [`start-${connectorId}`]: true }));
        try {
            await chargingStationAPI.remoteStart(chargePointId, idTag, connectorId);
            alert('Remote start command sent successfully');
        } catch (error) {
            alert('Error sending remote start command');
        } finally {
            setActionLoading(prev => ({ ...prev, [`start-${connectorId}`]: false }));
        }
    };

    const handleRemoteStop = async (transactionId) => {
        setActionLoading(prev => ({ ...prev, [`stop-${transactionId}`]: true }));
        try {
            await chargingStationAPI.remoteStop(chargePointId, transactionId);
            alert('Remote stop command sent successfully');
        } catch (error) {
            alert('Error sending remote stop command');
        } finally {
            setActionLoading(prev => ({ ...prev, [`stop-${transactionId}`]: false }));
        }
    };

    const handleReset = async () => {
        if (!confirm('Are you sure you want to reset this charging station?')) return;

        setActionLoading(prev => ({ ...prev, reset: true }));
        try {
            await chargingStationAPI.reset(chargePointId);
            alert('Reset command sent successfully');
        } catch (error) {
            alert('Error sending reset command');
        } finally {
            setActionLoading(prev => ({ ...prev, reset: false }));
        }
    };

    const handleUnlockConnector = async (connectorId) => {
        setActionLoading(prev => ({ ...prev, [`unlock-${connectorId}`]: true }));
        try {
            await chargingStationAPI.unlockConnector(chargePointId, connectorId);
            alert('Unlock connector command sent successfully');
        } catch (error) {
            alert('Error sending unlock connector command');
        } finally {
            setActionLoading(prev => ({ ...prev, [`unlock-${connectorId}`]: false }));
        }
    };

    const getConnectorStatusColor = (status) => {
        switch (status) {
            case 'Available': return 'text-success-600 bg-success-100';
            case 'Charging': return 'text-primary-600 bg-primary-100';
            case 'Preparing': return 'text-warning-600 bg-warning-100';
            case 'SuspendedEV': return 'text-warning-600 bg-warning-100';
            case 'SuspendedEVSE': return 'text-warning-600 bg-warning-100';
            case 'Finishing': return 'text-warning-600 bg-warning-100';
            case 'Faulted': return 'text-danger-600 bg-danger-100';
            case 'Unavailable': return 'text-gray-600 bg-gray-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!station) {
        return (
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="text-center py-12">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Charging station not found</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold leading-7 text-gray-900">
                            {station.chargePointId}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {station.chargePointVendor} {station.chargePointModel}
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={handleReset}
                            disabled={actionLoading.reset}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {actionLoading.reset ? 'Resetting...' : 'Reset'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Station Info */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Station Information</h3>
                    <dl className="space-y-3">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Status</dt>
                            <dd className="text-sm text-gray-900 flex items-center mt-1">
                                {station.isRegistered ? (
                                    <>
                                        <CheckCircle className="h-4 w-4 text-success-500 mr-2" />
                                        Registered
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="h-4 w-4 text-warning-500 mr-2" />
                                        Pending
                                    </>
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Firmware Version</dt>
                            <dd className="text-sm text-gray-900 mt-1">{station.firmwareVersion || 'N/A'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
                            <dd className="text-sm text-gray-900 mt-1">{station.chargePointSerialNumber || 'N/A'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Last Heartbeat</dt>
                            <dd className="text-sm text-gray-900 mt-1">
                                {station.lastHeartbeat
                                    ? new Date(station.lastHeartbeat).toLocaleString()
                                    : 'Never'
                                }
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* Connectors */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Connectors</h3>
                    <div className="space-y-4">
                        {connectors.map((connector) => (
                            <div key={connector.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">
                      Connector {connector.connectorId}
                    </span>
                                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConnectorStatusColor(connector.status)}`}>
                      {connector.status}
                    </span>
                                    </div>
                                </div>

                                <div className="flex space-x-2">
                                    {connector.status === 'Available' && (
                                        <button
                                            onClick={() => handleRemoteStart(connector.connectorId)}
                                            disabled={actionLoading[`start-${connector.connectorId}`]}
                                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-success-600 hover:bg-success-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-success-500 disabled:opacity-50"
                                        >
                                            <Play className="h-3 w-3 mr-1" />
                                            Start
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleUnlockConnector(connector.connectorId)}
                                        disabled={actionLoading[`unlock-${connector.connectorId}`]}
                                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                                    >
                                        <Unlock className="h-3 w-3 mr-1" />
                                        Unlock
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Active Transactions */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Active Transactions</h3>
                    <div className="space-y-4">
                        {transactions.filter(t => t.status === 'Active').length === 0 ? (
                            <p className="text-sm text-gray-500">No active transactions</p>
                        ) : (
                            transactions.filter(t => t.status === 'Active').map((transaction) => (
                                <div key={transaction.id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      Transaction #{transaction.transactionId}
                    </span>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      Active
                    </span>
                                    </div>
                                    <div className="text-xs text-gray-500 space-y-1">
                                        <div>ID Tag: {transaction.idTag}</div>
                                        <div>Connector: {transaction.connectorId}</div>
                                        <div>Started: {new Date(transaction.startTimestamp).toLocaleString()}</div>
                                        <div>Energy: {transaction.startMeterValue || 0} Wh</div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoteStop(transaction.transactionId)}
                                        disabled={actionLoading[`stop-${transaction.transactionId}`]}
                                        className="mt-3 w-full inline-flex justify-center items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-danger-600 hover:bg-danger-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger-500 disabled:opacity-50"
                                    >
                                        <Square className="h-3 w-3 mr-1" />
                                        {actionLoading[`stop-${transaction.transactionId}`] ? 'Stopping...' : 'Stop'}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChargingStationDetail;
