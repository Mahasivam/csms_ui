import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ocpp';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

// WebSocket connection cache and message handlers
const wsConnections = new Map();
const messageHandlers = new Map();
const eventListeners = [];

// OCPP Message Types
const MessageType = {
    CALL: 2,
    CALLRESULT: 3,
    CALLERROR: 4
};

// Event system for real-time updates
const notifyListeners = (event, data) => {
    eventListeners.forEach(listener => {
        if (listener.event === event) {
            listener.callback(data);
        }
    });
};

export const addEventListener = (event, callback) => {
    eventListeners.push({ event, callback });
    return () => {
        const index = eventListeners.findIndex(l => l.callback === callback);
        if (index > -1) {
            eventListeners.splice(index, 1);
        }
    };
};

// Handle incoming OCPP messages from charge points
const handleIncomingMessage = (chargePointId, message) => {
    try {
        const parsedMessage = JSON.parse(message);
        const [messageType, messageId, action, payload] = parsedMessage;

        if (messageType === MessageType.CALL) {
            console.log(`📨 Received ${action} from ${chargePointId}:`, payload);
            
            // Handle different OCPP messages
            switch (action) {
                case 'BootNotification':
                    handleBootNotification(chargePointId, messageId, payload);
                    break;
                case 'StatusNotification':
                    handleStatusNotification(chargePointId, messageId, payload);
                    break;
                case 'Heartbeat':
                    handleHeartbeat(chargePointId, messageId, payload);
                    break;
                case 'Authorize':
                    handleAuthorize(chargePointId, messageId, payload);
                    break;
                case 'StartTransaction':
                    handleStartTransaction(chargePointId, messageId, payload);
                    break;
                case 'StopTransaction':
                    handleStopTransaction(chargePointId, messageId, payload);
                    break;
                case 'MeterValues':
                    handleMeterValues(chargePointId, messageId, payload);
                    break;
                default:
                    console.warn(`Unknown OCPP action: ${action}`);
                    sendResponse(chargePointId, messageId, { error: 'NotSupported' });
            }
        }
    } catch (error) {
        console.error('Error parsing incoming message:', error);
    }
};

// OCPP Message Handlers
const handleBootNotification = (chargePointId, messageId, payload) => {
    // Accept the boot notification
    const response = {
        status: 'Accepted',
        currentTime: new Date().toISOString(),
        interval: 300 // Heartbeat interval in seconds
    };
    sendResponse(chargePointId, messageId, response);
    
    // Notify UI of new charge point registration
    notifyListeners('chargingStationRegistered', {
        chargePointId,
        vendor: payload.chargePointVendor,
        model: payload.chargePointModel,
        serialNumber: payload.chargePointSerialNumber,
        firmwareVersion: payload.firmwareVersion
    });
};

const handleStatusNotification = (chargePointId, messageId, payload) => {
    // Acknowledge status notification
    sendResponse(chargePointId, messageId, {});
    
    // Notify UI of status change
    notifyListeners('statusNotification', {
        chargePointId,
        connectorId: payload.connectorId,
        status: payload.status,
        errorCode: payload.errorCode,
        timestamp: payload.timestamp
    });
};

const handleHeartbeat = (chargePointId, messageId, payload) => {
    // Respond with current time
    const response = {
        currentTime: new Date().toISOString()
    };
    sendResponse(chargePointId, messageId, response);
    
    // Notify UI that charge point is alive
    notifyListeners('heartbeat', { chargePointId, timestamp: new Date().toISOString() });
};

const handleAuthorize = (chargePointId, messageId, payload) => {
    // For demo purposes, accept all ID tags
    // In production, this should check against a database
    const response = {
        idTagInfo: {
            status: 'Accepted'
        }
    };
    sendResponse(chargePointId, messageId, response);
    
    notifyListeners('authorize', {
        chargePointId,
        idTag: payload.idTag,
        status: 'Accepted'
    });
};

const handleStartTransaction = (chargePointId, messageId, payload) => {
    // Generate a transaction ID and accept the transaction
    const transactionId = Math.floor(Math.random() * 1000000);
    const response = {
        idTagInfo: {
            status: 'Accepted'
        },
        transactionId
    };
    sendResponse(chargePointId, messageId, response);
    
    notifyListeners('transactionStarted', {
        chargePointId,
        transactionId,
        connectorId: payload.connectorId,
        idTag: payload.idTag,
        meterStart: payload.meterStart,
        timestamp: payload.timestamp
    });
};

const handleStopTransaction = (chargePointId, messageId, payload) => {
    // Accept the transaction stop
    const response = {
        idTagInfo: {
            status: 'Accepted'
        }
    };
    sendResponse(chargePointId, messageId, response);
    
    notifyListeners('transactionStopped', {
        chargePointId,
        transactionId: payload.transactionId,
        meterStop: payload.meterStop,
        timestamp: payload.timestamp,
        reason: payload.reason
    });
};

const handleMeterValues = (chargePointId, messageId, payload) => {
    // Acknowledge meter values
    sendResponse(chargePointId, messageId, {});
    
    notifyListeners('meterValues', {
        chargePointId,
        connectorId: payload.connectorId,
        transactionId: payload.transactionId,
        meterValue: payload.meterValue
    });
};

const sendResponse = (chargePointId, messageId, payload) => {
    const ws = wsConnections.get(chargePointId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        const response = [MessageType.CALLRESULT, messageId, payload];
        ws.send(JSON.stringify(response));
    }
};

const getWebSocket = (chargePointId) => {
    if (!wsConnections.has(chargePointId)) {
        const ws = new WebSocket(`${WS_BASE_URL}/${chargePointId}`);
        
        ws.onopen = () => {
            console.log(`✅ WebSocket connected to ${chargePointId}`);
            notifyListeners('connectionOpen', { chargePointId });
        };
        
        ws.onclose = (event) => {
            console.log(`🔌 WebSocket disconnected from ${chargePointId} - Code: ${event.code}, Reason: ${event.reason}`);
            wsConnections.delete(chargePointId);
            notifyListeners('connectionClosed', { chargePointId, code: event.code, reason: event.reason });
        };
        
        ws.onerror = (error) => {
            console.error(`❌ WebSocket error for ${chargePointId}:`, error);
            notifyListeners('connectionError', { chargePointId, error });
        };
        
        ws.onmessage = (event) => {
            handleIncomingMessage(chargePointId, event.data);
        };
        
        wsConnections.set(chargePointId, ws);
    }
    return wsConnections.get(chargePointId);
};

const sendOcppMessage = (chargePointId, messageType, payload) => {
    return new Promise((resolve, reject) => {
        const ws = getWebSocket(chargePointId);
        const messageId = `ui_${Date.now()}`;
        
        const message = [
            2, // MessageType.CALL
            messageId,
            messageType,
            payload
        ];

        console.log(`📤 Sending ${messageType} to ${chargePointId}:`, JSON.stringify(message));
        console.log(`📡 WebSocket readyState: ${ws.readyState} (OPEN=1)`);
        console.log(`📡 WebSocket URL: ${ws.url}`);

        const onMessage = (event) => {
            try {
                const response = JSON.parse(event.data);
                if (response[1] === messageId) {
                    if (response[0] === 3) { // MessageType.CALLRESULT
                        console.log(`✅ Received ${messageType} response from ${chargePointId}:`, response[2]);
                        resolve(response[2]);
                    } else if (response[0] === 4) { // MessageType.CALLERROR
                        const errorCode = response[2];
                        const errorDescription = response[3];
                        const errorDetails = response[4];
                        console.error(`❌ Received ${messageType} error from ${chargePointId}:`, {
                            errorCode,
                            errorDescription,
                            errorDetails
                        });
                        reject(new Error(`${errorCode}: ${errorDescription}`));
                    }
                    ws.removeEventListener('message', onMessage);
                }
            } catch (error) {
                console.error(`❌ Error parsing ${messageType} response:`, error);
                reject(error);
            }
        };

        ws.addEventListener('message', onMessage);
        
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        } else {
            ws.onopen = () => {
                ws.send(JSON.stringify(message));
            };
        }

        // Set a timeout for the response
        setTimeout(() => {
            ws.removeEventListener('message', onMessage);
            reject(new Error('OCPP request timed out'));
        }, 10000); // 10 seconds timeout
    });
};

export const chargingStationAPI = {
    // REST API endpoints
    getAll: () => api.get('/charging-stations'),
    getById: (id) => api.get(`/charging-stations/${id}`),
    getConnectors: (id) => api.get(`/charging-stations/${id}/connectors`),
    getTransactions: (id) => api.get(`/charging-stations/${id}/transactions`),
    
    // REST API remote commands (alternative to WebSocket)
    remoteStartRest: (chargePointId, idTag, connectorId) => 
        api.post(`/charging-stations/${chargePointId}/remote-start`, null, {
            params: { idTag, connectorId }
        }),
    remoteStopRest: (chargePointId, transactionId) => 
        api.post(`/charging-stations/${chargePointId}/remote-stop`, null, {
            params: { transactionId }
        }),
    resetRest: (chargePointId, type = 'Soft') => 
        api.post(`/charging-stations/${chargePointId}/reset`, null, {
            params: { type }
        }),
    unlockConnectorRest: (chargePointId, connectorId) => 
        api.post(`/charging-stations/${chargePointId}/unlock-connector`, null, {
            params: { connectorId }
        }),
    
    // WebSocket connection management
    connect: (chargePointId) => {
        return getWebSocket(chargePointId);
    },
    
    disconnect: (chargePointId) => {
        const ws = wsConnections.get(chargePointId);
        if (ws) {
            ws.close();
            wsConnections.delete(chargePointId);
        }
    },
    
    // OCPP WebSocket commands (sent FROM CSMS TO charge point)
    remoteStartTransaction: async (chargePointId, idTag, connectorId) => {
        return sendOcppMessage(chargePointId, 'RemoteStartTransaction', {
            idTag,
            connectorId: parseInt(connectorId, 10)
        });
    },
    
    remoteStopTransaction: async (chargePointId, transactionId) => {
        return sendOcppMessage(chargePointId, 'RemoteStopTransaction', {
            transactionId: parseInt(transactionId, 10)
        });
    },
    
    reset: async (chargePointId, type = 'Soft') => {
        return sendOcppMessage(chargePointId, 'Reset', {
            type
        });
    },
    
    unlockConnector: async (chargePointId, connectorId) => {
        return sendOcppMessage(chargePointId, 'UnlockConnector', {
            connectorId: parseInt(connectorId, 10)
        });
    },
    
    changeAvailability: async (chargePointId, connectorId, type) => {
        return sendOcppMessage(chargePointId, 'ChangeAvailability', {
            connectorId: parseInt(connectorId, 10),
            type // 'Operative' or 'Inoperative'
        });
    },
    
    changeConfiguration: async (chargePointId, key, value) => {
        return sendOcppMessage(chargePointId, 'ChangeConfiguration', {
            key,
            value
        });
    },
    
    getConfiguration: async (chargePointId, key = null) => {
        return sendOcppMessage(chargePointId, 'GetConfiguration', 
            key ? { key: [key] } : {}
        );
    },
    
    triggerMessage: async (chargePointId, requestedMessage, connectorId = null) => {
        const payload = { requestedMessage };
        if (connectorId !== null) {
            payload.connectorId = parseInt(connectorId, 10);
        }
        return sendOcppMessage(chargePointId, 'TriggerMessage', payload);
    }
};

export const transactionAPI = {
    getAll: () => api.get('/transactions'),
    getActive: () => api.get('/transactions/active'),
    getById: (transactionId) => api.get(`/transactions/${transactionId}`),
};

export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
};

// Configuration Management API
export const configurationAPI = {
    get: (chargePointId) => api.get(`/configuration/${chargePointId}`),
    set: (chargePointId, key, value) => api.post(`/configuration/${chargePointId}`, { key, value }),
};

// ID Tags (User Management) API
export const idTagAPI = {
    getAll: () => api.get('/id-tags'),
    create: (idTag) => api.post('/id-tags', idTag),
    update: (idTagValue, idTag) => api.put(`/id-tags/${idTagValue}`, idTag),
    delete: (idTag) => api.delete(`/id-tags/${idTag}`),
    authorize: (idTag) => api.get(`/id-tags/${idTag}/authorize`),
};

// Reservations API
export const reservationAPI = {
    getAll: () => api.get('/reservations'),
    create: (reservation) => api.post('/reservations', reservation),
    cancel: (reservationId) => api.delete(`/reservations/${reservationId}`),
};

// Meter Values API
export const meterValuesAPI = {
    getByTransaction: (transactionId) => api.get(`/meter-values/transaction/${transactionId}`),
    getByConnector: (chargingStationId, connectorId) => api.get(`/meter-values/connector/${chargingStationId}/${connectorId}`),
    get: (chargePointId, params = {}) => api.get(`/meter-values/${chargePointId}`, { params }),
    getByDateRange: (chargePointId, startTime, endTime) => 
        api.get(`/meter-values/${chargePointId}`, { 
            params: { startTime, endTime } 
        }),
};

// Smart Charging API
export const smartChargingAPI = {
    getProfiles: (chargePointId) => api.get(`/smart-charging/${chargePointId}/profiles`),
    setProfile: (chargePointId, profile) => api.post(`/smart-charging/${chargePointId}/set-profile`, profile),
    clearProfile: (chargePointId) => api.delete(`/smart-charging/${chargePointId}/clear-profile`),
};

// Firmware Management API
export const firmwareAPI = {
    getStatus: (chargePointId) => api.get(`/firmware/${chargePointId}/status`),
    update: (chargePointId, firmwareData) => api.post(`/firmware/${chargePointId}/update`, firmwareData),
    getDiagnostics: (chargePointId) => api.post(`/firmware/${chargePointId}/diagnostics`),
};
