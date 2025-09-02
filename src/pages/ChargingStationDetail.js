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
    Power,
    User
} from 'lucide-react';
import { chargingStationAPI, addEventListener, idTagAPI } from '../services/api';
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
    const [idTag, setIdTag] = useState('');
    const [availableIdTags, setAvailableIdTags] = useState([]);

    useEffect(() => {
        const fetchStationDetails = async () => {
            try {
                let stationData = null;
                let connectorsData = [];
                let transactionsData = [];

                // Try to fetch station details
                try {
                    const stationRes = await chargingStationAPI.getById(id);
                    stationData = stationRes.data;
                } catch (stationError) {
                    console.warn('Station API not available, using fallback data for:', id);
                    // Create mock station data based on the ID
                    stationData = {
                        chargePointId: id,
                        chargePointVendor: 'Unknown Vendor',
                        chargePointModel: 'Unknown Model',
                        firmwareVersion: 'Unknown',
                        chargePointSerialNumber: 'Unknown',
                        isRegistered: true,
                        lastHeartbeat: new Date().toISOString()
                    };
                }

                // Try to fetch connectors
                try {
                    const connectorsRes = await chargingStationAPI.getConnectors(id);
                    connectorsData = connectorsRes.data;
                } catch (connectorsError) {
                    console.warn('Connectors API not available, using fallback data');
                    // Create mock connector data (assume 2 connectors per station)
                    connectorsData = [
                        {
                            id: 1,
                            connectorId: 1,
                            status: 'Available'
                        },
                        {
                            id: 2,
                            connectorId: 2,
                            status: 'Available'
                        }
                    ];
                }

                // Try to fetch transactions
                try {
                    const transactionsRes = await chargingStationAPI.getTransactions(id);
                    transactionsData = transactionsRes.data;
                } catch (transactionsError) {
                    console.warn('Transactions API not available, using empty data');
                    transactionsData = [];
                }

                setStation(stationData);
                setConnectors(connectorsData);
                setTransactions(transactionsData);

                // Fetch available ID tags
                try {
                    const idTagsRes = await idTagAPI.getAll();
                    const acceptedIdTags = idTagsRes.data.filter(tag => tag.status === 'Accepted');
                    setAvailableIdTags(acceptedIdTags);
                    
                    // Auto-select first available authorized ID tag
                    if (acceptedIdTags.length > 0 && !idTag) {
                        setIdTag(acceptedIdTags[0].idTag);
                    }
                } catch (idTagError) {
                    console.warn('ID Tags API not available, using manual input');
                    setAvailableIdTags([]);
                }

                // Connect to WebSocket for real-time updates
                if (stationData) {
                    try {
                        chargingStationAPI.connect(stationData.chargePointId);
                    } catch (wsError) {
                        console.warn('WebSocket connection failed:', wsError);
                    }
                }

            } catch (error) {
                console.error('Error fetching station details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStationDetails();
        const interval = setInterval(fetchStationDetails, 10000); // Refresh every 10s (reduced frequency)
        
        // Set up real-time event listeners for this station
        const unsubscribers = [
            addEventListener('transactionStarted', (data) => {
                if (data.chargePointId === id) {
                    console.log('Transaction started on this station:', data);
                    setTransactions(prev => [...prev, {
                        id: data.transactionId,
                        transactionId: data.transactionId,
                        connectorId: data.connectorId,
                        idTag: data.idTag,
                        startTimestamp: data.timestamp,
                        status: 'Active',
                        startMeterValue: data.meterStart
                    }]);
                }
            }),

            addEventListener('transactionStopped', (data) => {
                if (data.chargePointId === id) {
                    console.log('Transaction stopped on this station:', data);
                    setTransactions(prev => 
                        prev.filter(t => t.transactionId !== data.transactionId)
                    );
                }
            }),

            addEventListener('statusNotification', (data) => {
                if (data.chargePointId === id) {
                    console.log('Status update for this station:', data);
                    setConnectors(prev => 
                        prev.map(connector => 
                            connector.connectorId === data.connectorId
                                ? { ...connector, status: data.status }
                                : connector
                        )
                    );
                }
            })
        ];

        return () => {
            clearInterval(interval);
            unsubscribers.forEach(unsub => unsub());
        };
    }, [id]);

    const handleAction = async (action, params, loadingKey) => {
        setActionLoading(prev => ({ ...prev, [loadingKey]: true }));
        try {
            const result = await action(...params);
            console.log(`${loadingKey} action completed:`, result);
            // Show success message
            if (result?.status === 'Accepted') {
                alert(`Action ${loadingKey} completed successfully!`);
            }
        } catch (error) {
            console.error(`Error performing action ${loadingKey}:`, error);
            
            let errorMessage = 'An unexpected error occurred.';
            
            if (error.message.includes('NotSupported')) {
                errorMessage = 'This action is not supported by the backend. Please check the BACKEND_INTEGRATION_GUIDE.md file.';
            } else if (error.message.includes('timed out')) {
                errorMessage = 'Request timed out. Please check if the charging station is connected.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            alert(`Error: ${errorMessage}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [loadingKey]: false }));
        }
    };

    const handleRemoteStart = async (connectorId) => {
        // In a real app, you'd use a modal to get the idTag
        if (!idTag) {
            alert('Please enter an ID Tag.');
            return;
        }
        
        console.log('🔄 Attempting to start transaction on connector:', connectorId);
        console.log('🔄 Station ID:', id, 'ID Tag:', idTag);
        
        setActionLoading(prev => ({ ...prev, [`start-${connectorId}`]: true }));
        
        try {
            // Try WebSocket OCPP command first
            console.log('📡 Trying WebSocket OCPP RemoteStartTransaction...');
            const result = await chargingStationAPI.remoteStartTransaction(id, idTag, connectorId);
            console.log('✅ WebSocket start transaction result:', result);
            
            if (result?.status === 'Accepted') {
                alert('Start transaction command sent successfully! Wait for the charging station to respond.');
                
                // Optimistically add a pending transaction to UI
                const pendingTransaction = {
                    id: `pending-${Date.now()}`,
                    transactionId: `pending-${Date.now()}`,
                    connectorId: connectorId,
                    idTag: idTag,
                    startTimestamp: new Date().toISOString(),
                    status: 'Starting...',
                    startMeterValue: 0
                };
                
                setTransactions(prev => [...prev, pendingTransaction]);
                
                // Remove pending transaction after 10 seconds if no real transaction started
                setTimeout(() => {
                    setTransactions(prev => 
                        prev.filter(t => !t.id.toString().startsWith('pending-'))
                    );
                }, 10000);
                
            } else {
                console.warn('⚠️ WebSocket command returned non-Accepted status:', result);
                alert('Start transaction was not accepted by the charging station.');
            }
            
        } catch (wsError) {
            console.error('❌ WebSocket start transaction failed:', wsError);
            
            // If WebSocket fails, try REST API as fallback
            if (wsError.message.includes('NotSupported') || wsError.message.includes('timed out')) {
                console.log('🔄 Trying REST API fallback...');
                try {
                    const restResult = await chargingStationAPI.remoteStartRest(id, idTag, connectorId);
                    console.log('✅ REST API start transaction result:', restResult);
                    alert('Start transaction command sent via REST API!');
                    
                } catch (restError) {
                    console.error('❌ REST API start transaction also failed:', restError);
                    let errorMessage = 'Both WebSocket and REST API failed.';
                    if (restError.response?.data?.message) {
                        errorMessage = restError.response.data.message;
                    } else if (restError.message) {
                        errorMessage = restError.message;
                    }
                    alert(`Error starting transaction: ${errorMessage}`);
                }
            } else {
                let errorMessage = 'An unexpected error occurred.';
                if (wsError.response?.data?.message) {
                    errorMessage = wsError.response.data.message;
                } else if (wsError.message) {
                    errorMessage = wsError.message;
                }
                alert(`Error starting transaction: ${errorMessage}`);
            }
        }
        
        // Always try to refresh transactions from API
        try {
            console.log('🔄 Refreshing transactions from API...');
            const transactionsRes = await chargingStationAPI.getTransactions(id);
            setTransactions(transactionsRes.data);
            console.log('✅ Transactions refreshed:', transactionsRes.data);
        } catch (refreshError) {
            console.warn('⚠️ Could not refresh transactions from API:', refreshError);
        }
        
        setActionLoading(prev => ({ ...prev, [`start-${connectorId}`]: false }));
    };

    const handleRemoteStop = async (transactionId) => {
        console.log('🔄 Attempting to stop transaction with ID:', transactionId);
        console.log('🔄 Station ID:', id);
        
        if (!transactionId) {
            console.error('❌ No transaction ID provided to stop');
            alert('Error: No transaction ID provided');
            return;
        }
        
        setActionLoading(prev => ({ ...prev, [`stop-${transactionId}`]: true }));
        
        try {
            // First try WebSocket OCPP command
            console.log('📡 Trying WebSocket OCPP RemoteStopTransaction...');
            const result = await chargingStationAPI.remoteStopTransaction(id, transactionId);
            console.log('✅ WebSocket stop transaction result:', result);
            console.log('✅ Backend response details:', JSON.stringify(result, null, 2));
            
            // Immediately remove the transaction from UI state (optimistic update)
            setTransactions(prev => 
                prev.filter(t => t.transactionId !== transactionId)
            );
            
            if (result?.status === 'Accepted') {
                alert('Transaction stopped successfully via WebSocket!');
            } else {
                console.warn('⚠️ WebSocket command returned non-Accepted status:', result);
            }
            
        } catch (wsError) {
            console.error('❌ WebSocket stop transaction failed:', wsError);
            
            // If WebSocket fails, try REST API as fallback
            if (wsError.message.includes('NotSupported') || wsError.message.includes('timed out')) {
                console.log('🔄 Trying REST API fallback...');
                try {
                    const restResult = await chargingStationAPI.remoteStopRest(id, transactionId);
                    console.log('✅ REST API stop transaction result:', restResult);
                    
                    // Remove from UI state
                    setTransactions(prev => 
                        prev.filter(t => t.transactionId !== transactionId)
                    );
                    
                    alert('Transaction stopped successfully via REST API!');
                    
                } catch (restError) {
                    console.error('❌ REST API stop transaction also failed:', restError);
                    
                    // If both fail, just remove from UI anyway (force stop)
                    console.log('🔧 Forcing UI update (removing transaction from display)');
                    setTransactions(prev => 
                        prev.filter(t => t.transactionId !== transactionId)
                    );
                    
                    alert('⚠️ Backend stop command failed, but transaction removed from UI. Please check if it actually stopped on the charging station.');
                }
            } else {
                // For other errors, don't remove from UI
                let errorMessage = 'An unexpected error occurred.';
                if (wsError.response?.data?.message) {
                    errorMessage = wsError.response.data.message;
                } else if (wsError.message) {
                    errorMessage = wsError.message;
                }
                alert(`Error stopping transaction: ${errorMessage}`);
            }
        }
        
        // Always try to refresh transactions from API to get the real state
        try {
            console.log('🔄 Refreshing transactions from API...');
            const transactionsRes = await chargingStationAPI.getTransactions(id);
            setTransactions(transactionsRes.data);
            console.log('✅ Transactions refreshed:', transactionsRes.data);
        } catch (refreshError) {
            console.warn('⚠️ Could not refresh transactions from API:', refreshError);
        }
        
        setActionLoading(prev => ({ ...prev, [`stop-${transactionId}`]: false }));
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
                        // Find any transaction for this connector (status might be 'Active', undefined, or other values)
                        const activeTransaction = transactions.find(t => t.connectorId === connector.connectorId);
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
                    {/* ID Tag Input */}
                    <div className="bg-white shadow-sm rounded-xl border border-gray-200">
                        <div className="p-5 border-b border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                <User className="h-5 w-5 mr-2 text-primary-600" />
                                User ID Tag
                            </h3>
                        </div>
                        <div className="p-5">
                            <label htmlFor="idTag" className="block text-sm font-medium text-gray-700 mb-2">
                                ID Tag for Remote Start
                            </label>
                            {availableIdTags.length > 0 ? (
                                <select
                                    id="idTag"
                                    value={idTag}
                                    onChange={(e) => setIdTag(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="">Select an ID Tag</option>
                                    {availableIdTags.map((tag) => (
                                        <option key={tag.idTag} value={tag.idTag}>
                                            {tag.idTag} {tag.status === 'Accepted' ? '✓' : '⚠️'}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    id="idTag"
                                    value={idTag}
                                    onChange={(e) => setIdTag(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Enter ID Tag (no authorized tags found)"
                                />
                            )}
                            <p className="mt-2 text-xs text-gray-500">
                                {availableIdTags.length > 0 
                                    ? `${availableIdTags.length} authorized ID tags available. Only "Accepted" tags can start transactions.`
                                    : 'No authorized ID tags found. You can add them in the ID Tags section or enter one manually.'
                                }
                            </p>
                        </div>
                    </div>

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
