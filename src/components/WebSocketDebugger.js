import React, { useState, useEffect } from 'react';
import { Terminal, Wifi, WifiOff, Send } from 'lucide-react';

const WebSocketDebugger = ({ chargePointId = 'CP001' }) => {
    const [ws, setWs] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [rawMessage, setRawMessage] = useState('');
    const [wsUrl, setWsUrl] = useState(`ws://localhost:8080/ocpp/${chargePointId}`);

    const addMessage = (message, type, direction) => {
        setMessages(prev => [{
            id: Date.now(),
            content: message,
            type,
            direction,
            timestamp: new Date().toLocaleTimeString()
        }, ...prev.slice(0, 49)]);
    };

    useEffect(() => {
        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, [ws]);

    useEffect(() => {
        // Update WebSocket URL when chargePointId changes
        const newUrl = `ws://localhost:8080/ocpp/${chargePointId}`;
        setWsUrl(newUrl);
        
        // If connected, disconnect and reconnect to new URL
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
            setWs(null);
            setIsConnected(false);
            addMessage(`URL changed to ${newUrl} - please reconnect`, 'system', 'system');
        }
    }, [chargePointId]);

    const connect = () => {
        if (ws) {
            ws.close();
        }

        const newWs = new WebSocket(wsUrl);
        
        newWs.onopen = () => {
            console.log('🔗 Raw WebSocket connected');
            setIsConnected(true);
            addMessage('Connection established', 'system', 'system');
        };

        newWs.onclose = (event) => {
            console.log('🔌 Raw WebSocket disconnected', event);
            setIsConnected(false);
            addMessage(`Connection closed - Code: ${event.code}, Reason: ${event.reason || 'Normal closure'}`, 'system', 'system');
        };

        newWs.onerror = (error) => {
            console.error('❌ Raw WebSocket error', error);
            addMessage('Connection error occurred', 'error', 'system');
        };

        newWs.onmessage = (event) => {
            console.log('📨 Raw message received:', event.data);
            addMessage(event.data, 'received', 'incoming');
        };

        setWs(newWs);
    };

    const disconnect = () => {
        if (ws) {
            ws.close();
            setWs(null);
        }
    };

    const sendRawMessage = () => {
        if (ws && ws.readyState === WebSocket.OPEN && rawMessage.trim()) {
            console.log('📤 Sending raw message:', rawMessage);
            ws.send(rawMessage);
            addMessage(rawMessage, 'sent', 'outgoing');
            setRawMessage('');
        }
    };

    const sendTestMessages = () => {
        const testMessages = [
            // Boot Notification
            '[2,"debug001","BootNotification",{"chargePointVendor":"TestVendor","chargePointModel":"TestModel","chargePointSerialNumber":"CP001SN","firmwareVersion":"1.0.0"}]',
            // Status Notification
            '[2,"debug002","StatusNotification",{"connectorId":1,"status":"Available","errorCode":"NoError","timestamp":"' + new Date().toISOString() + '"}]',
            // Heartbeat
            '[2,"debug003","Heartbeat",{}]'
        ];

        testMessages.forEach((msg, index) => {
            setTimeout(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    console.log(`📤 Sending test message ${index + 1}:`, msg);
                    ws.send(msg);
                    addMessage(msg, 'sent', 'outgoing');
                }
            }, index * 1000);
        });
    };

    const sendRemoteStartCommand = () => {
        const remoteStart = `[2,"ui_${Date.now()}","RemoteStartTransaction",{"idTag":"04E91C5A123456","connectorId":1}]`;
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('📤 Sending RemoteStartTransaction:', remoteStart);
            ws.send(remoteStart);
            addMessage(remoteStart, 'sent', 'outgoing');
        }
    };

    const sendRemoteStopCommand = () => {
        const remoteStop = `[2,"ui_${Date.now()}","RemoteStopTransaction",{"transactionId":2}]`;
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('📤 Sending RemoteStopTransaction:', remoteStop);
            ws.send(remoteStop);
            addMessage(remoteStop, 'sent', 'outgoing');
        }
    };

    const getMessageColor = (type, direction) => {
        if (direction === 'outgoing') return 'bg-blue-50 border-blue-200';
        if (direction === 'incoming') return 'bg-green-50 border-green-200';
        if (type === 'error') return 'bg-red-50 border-red-200';
        return 'bg-gray-50 border-gray-200';
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Terminal className="w-5 h-5 mr-2" />
                    WebSocket Debugger
                </h3>
                <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded text-sm ${
                        isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">WebSocket URL: {wsUrl}</p>
                <div className="flex space-x-2">
                    {!isConnected ? (
                        <button
                            onClick={connect}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                            Connect
                        </button>
                    ) : (
                        <button
                            onClick={disconnect}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                            Disconnect
                        </button>
                    )}
                    
                    <button
                        onClick={sendTestMessages}
                        disabled={!isConnected}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                    >
                        Send Test Sequence
                    </button>
                    
                    <button
                        onClick={sendRemoteStartCommand}
                        disabled={!isConnected}
                        className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50"
                    >
                        Remote Start
                    </button>
                    
                    <button
                        onClick={sendRemoteStopCommand}
                        disabled={!isConnected}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                    >
                        Remote Stop
                    </button>
                </div>
            </div>

            {/* Raw Message Input */}
            <div className="mb-4">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={rawMessage}
                        onChange={(e) => setRawMessage(e.target.value)}
                        placeholder="Enter raw OCPP message JSON..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && sendRawMessage()}
                    />
                    <button
                        onClick={sendRawMessage}
                        disabled={!isConnected || !rawMessage.trim()}
                        className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Message Log */}
            <div className="border rounded max-h-96 overflow-y-auto">
                <div className="bg-gray-50 px-3 py-2 border-b">
                    <span className="text-sm font-medium text-gray-700">Message Log</span>
                    <button
                        onClick={() => setMessages([])}
                        className="float-right text-xs text-gray-500 hover:text-gray-700"
                    >
                        Clear
                    </button>
                </div>
                <div className="p-3 space-y-2">
                    {messages.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">No messages yet</p>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`p-2 rounded border text-xs font-mono ${getMessageColor(msg.type, msg.direction)}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                        msg.direction === 'outgoing' ? 'bg-blue-200 text-blue-800' :
                                        msg.direction === 'incoming' ? 'bg-green-200 text-green-800' :
                                        'bg-gray-200 text-gray-800'
                                    }`}>
                                        {msg.direction === 'outgoing' ? 'SENT' : msg.direction === 'incoming' ? 'RECEIVED' : 'SYSTEM'}
                                    </span>
                                    <span className="text-gray-500">{msg.timestamp}</span>
                                </div>
                                <div className="break-all">
                                    {msg.content}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default WebSocketDebugger;