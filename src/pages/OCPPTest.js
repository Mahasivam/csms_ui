import React, { useState, useEffect } from 'react';
import { 
    Activity, 
    Zap, 
    Play, 
    Square, 
    RefreshCw, 
    Wifi,
    WifiOff,
    MessageCircle,
    Clock
} from 'lucide-react';
import { chargingStationAPI, addEventListener } from '../services/api';
import WebSocketDebugger from '../components/WebSocketDebugger';

const OCPPTest = () => {
    const [chargePointId, setChargePointId] = useState('CP001');
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');

    useEffect(() => {
        // Set up real-time event listeners
        const unsubscribers = [
            addEventListener('connectionOpen', (data) => {
                if (data.chargePointId === chargePointId) {
                    setConnected(true);
                    setConnectionStatus('connected');
                    addMessage(`Connected to ${data.chargePointId}`, 'system');
                }
            }),

            addEventListener('connectionClosed', (data) => {
                if (data.chargePointId === chargePointId) {
                    setConnected(false);
                    setConnectionStatus('disconnected');
                    addMessage(`Disconnected from ${data.chargePointId}`, 'system');
                }
            }),

            addEventListener('chargingStationRegistered', (data) => {
                addMessage(
                    `BootNotification received from ${data.chargePointId} (${data.vendor} ${data.model})`,
                    'received'
                );
            }),

            addEventListener('statusNotification', (data) => {
                addMessage(
                    `StatusNotification: Connector ${data.connectorId} is ${data.status}`,
                    'received'
                );
            }),

            addEventListener('heartbeat', (data) => {
                addMessage(`Heartbeat received from ${data.chargePointId}`, 'received');
            }),

            addEventListener('authorize', (data) => {
                addMessage(
                    `Authorize request for ID tag: ${data.idTag} - ${data.status}`,
                    'received'
                );
            }),

            addEventListener('transactionStarted', (data) => {
                addMessage(
                    `StartTransaction: #${data.transactionId} on connector ${data.connectorId} with tag ${data.idTag}`,
                    'received'
                );
            }),

            addEventListener('transactionStopped', (data) => {
                addMessage(
                    `StopTransaction: #${data.transactionId} - ${data.reason || 'Local'}`,
                    'received'
                );
            }),

            addEventListener('meterValues', (data) => {
                const values = data.meterValue?.[0]?.sampledValue || [];
                const energy = values.find(v => v.measurand === 'Energy.Active.Import.Register')?.value || 'N/A';
                addMessage(
                    `MeterValues: Connector ${data.connectorId} - Energy: ${energy} Wh`,
                    'received'
                );
            })
        ];

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [chargePointId]);

    const addMessage = (text, type) => {
        const message = {
            id: Date.now() + Math.random(),
            text,
            type,
            timestamp: new Date()
        };
        setMessages(prev => [message, ...prev.slice(0, 49)]); // Keep last 50 messages
    };

    const connectToChargePoint = () => {
        setConnectionStatus('connecting');
        addMessage(`Connecting to ${chargePointId}...`, 'system');
        chargingStationAPI.connect(chargePointId);
        
        // Set a timeout to update status if connection doesn't open
        setTimeout(() => {
            if (connectionStatus === 'connecting') {
                setConnectionStatus('failed');
                addMessage(`Failed to connect to ${chargePointId}`, 'system');
            }
        }, 5000);
    };

    const disconnectFromChargePoint = () => {
        chargingStationAPI.disconnect(chargePointId);
        setConnected(false);
        setConnectionStatus('disconnected');
        addMessage(`Disconnecting from ${chargePointId}`, 'system');
    };

    const sendRemoteCommand = async (command, params = {}) => {
        try {
            addMessage(`Sending ${command} command...`, 'sent');
            let result;
            
            switch (command) {
                case 'RemoteStartTransaction':
                    result = await chargingStationAPI.remoteStartTransaction(
                        chargePointId, 
                        params.idTag || '04E91C5A123456', 
                        params.connectorId || 1
                    );
                    break;
                case 'RemoteStopTransaction':
                    result = await chargingStationAPI.remoteStopTransaction(
                        chargePointId, 
                        params.transactionId || 1
                    );
                    break;
                case 'Reset':
                    result = await chargingStationAPI.reset(chargePointId, params.type || 'Soft');
                    break;
                case 'UnlockConnector':
                    result = await chargingStationAPI.unlockConnector(
                        chargePointId, 
                        params.connectorId || 1
                    );
                    break;
                default:
                    throw new Error(`Unknown command: ${command}`);
            }
            
            addMessage(`${command} response: ${JSON.stringify(result)}`, 'response');
        } catch (error) {
            addMessage(`${command} error: ${error.message}`, 'error');
        }
    };

    const clearMessages = () => {
        setMessages([]);
    };

    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'connected': return 'text-green-600 bg-green-100';
            case 'connecting': return 'text-yellow-600 bg-yellow-100';
            case 'failed': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getMessageColor = (type) => {
        switch (type) {
            case 'sent': return 'bg-blue-50 border-blue-200';
            case 'received': return 'bg-green-50 border-green-200';
            case 'response': return 'bg-purple-50 border-purple-200';
            case 'error': return 'bg-red-50 border-red-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">OCPP Test Interface</h1>
                <p className="text-gray-600">Connect to charging stations and test OCPP communication</p>
            </div>

            {/* Connection Panel */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Connection</h2>
                
                <div className="flex items-center space-x-4 mb-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Charge Point ID
                        </label>
                        <input
                            type="text"
                            value={chargePointId}
                            onChange={(e) => setChargePointId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter charge point ID (e.g., CP001)"
                            disabled={connected}
                        />
                    </div>
                    
                    <div className="flex flex-col items-center">
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${getStatusColor()}`}>
                            {connectionStatus === 'connected' ? <Wifi className="w-3 h-3" /> : 
                             connectionStatus === 'connecting' ? <RefreshCw className="w-3 h-3 animate-spin" /> :
                             <WifiOff className="w-3 h-3" />}
                            <span>{connectionStatus.toUpperCase()}</span>
                        </div>
                    </div>
                </div>

                <div className="flex space-x-2">
                    {!connected ? (
                        <button
                            onClick={connectToChargePoint}
                            disabled={connectionStatus === 'connecting'}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                        >
                            <Play className="w-4 h-4" />
                            <span>Connect</span>
                        </button>
                    ) : (
                        <button
                            onClick={disconnectFromChargePoint}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
                        >
                            <Square className="w-4 h-4" />
                            <span>Disconnect</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Command Panel */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Remote Commands</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => sendRemoteCommand('RemoteStartTransaction', { idTag: '04E91C5A123456', connectorId: 1 })}
                        disabled={!connected}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Zap className="w-6 h-6 mx-auto mb-2 text-green-600" />
                        <div className="text-sm font-medium text-gray-900">Start Transaction</div>
                        <div className="text-xs text-gray-500">Connector 1</div>
                    </button>

                    <button
                        onClick={() => sendRemoteCommand('RemoteStopTransaction', { transactionId: 1 })}
                        disabled={!connected}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Square className="w-6 h-6 mx-auto mb-2 text-red-600" />
                        <div className="text-sm font-medium text-gray-900">Stop Transaction</div>
                        <div className="text-xs text-gray-500">Transaction #1</div>
                    </button>

                    <button
                        onClick={() => sendRemoteCommand('Reset', { type: 'Soft' })}
                        disabled={!connected}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                        <div className="text-sm font-medium text-gray-900">Soft Reset</div>
                        <div className="text-xs text-gray-500">Restart software</div>
                    </button>

                    <button
                        onClick={() => sendRemoteCommand('UnlockConnector', { connectorId: 1 })}
                        disabled={!connected}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Activity className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                        <div className="text-sm font-medium text-gray-900">Unlock Connector</div>
                        <div className="text-xs text-gray-500">Connector 1</div>
                    </button>
                </div>
            </div>

            {/* Raw WebSocket Debugger */}
            <div className="mb-6">
                <WebSocketDebugger chargePointId={chargePointId} />
            </div>

            {/* Messages Panel */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">API Message Log</h2>
                    <button
                        onClick={clearMessages}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                    >
                        Clear
                    </button>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {messages.length === 0 ? (
                        <div className="text-center py-8">
                            <MessageCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-gray-500 text-sm">No messages yet. Connect to a charge point to see OCPP communication.</p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={`p-3 rounded-lg border ${getMessageColor(message.type)}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-900">{message.text}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                            message.type === 'sent' ? 'bg-blue-100 text-blue-800' :
                                            message.type === 'received' ? 'bg-green-100 text-green-800' :
                                            message.type === 'response' ? 'bg-purple-100 text-purple-800' :
                                            message.type === 'error' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {message.type.toUpperCase()}
                                        </span>
                                        <span className="text-xs text-gray-500 flex items-center">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {message.timestamp.toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default OCPPTest;