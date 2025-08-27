import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ocpp';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

// WebSocket connection cache
const wsConnections = new Map();

const getWebSocket = (chargePointId) => {
    if (!wsConnections.has(chargePointId)) {
        const ws = new WebSocket(`${WS_BASE_URL}/${chargePointId}`);
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

        const onMessage = (event) => {
            try {
                const response = JSON.parse(event.data);
                if (response[1] === messageId) {
                    if (response[0] === 3) { // MessageType.CALLRESULT
                        resolve(response[2]);
                    } else if (response[0] === 4) { // MessageType.CALLERROR
                        reject(new Error(response[3] || 'OCPP Error'));
                    }
                    ws.removeEventListener('message', onMessage);
                }
            } catch (error) {
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
    
    // OCPP WebSocket commands
    remoteStart: async (chargePointId, idTag, connectorId) => {
        return sendOcppMessage(chargePointId, 'StartTransaction', {
            connectorId: parseInt(connectorId, 10),
            idTag,
            meterStart: 0, // This should be set by the charging station
            timestamp: new Date().toISOString()
        });
    },
    
    remoteStop: async (chargePointId, transactionId) => {
        return sendOcppMessage(chargePointId, 'StopTransaction', {
            transactionId: parseInt(transactionId, 10),
            idTag: 'ADMIN', // Or get the actual idTag from the transaction
            meterStop: 0, // This should be set by the charging station
            timestamp: new Date().toISOString(),
            reason: 'Remote',
            transactionData: []
        });
    },
    
    reset: (id, type = 'Soft') =>
        api.post(`/charging-stations/${id}/reset`, null, {
            params: { type }
        }),
        
    unlockConnector: (id, connectorId) =>
        api.post(`/charging-stations/${id}/unlock-connector`, null, {
            params: { connectorId }
        }),
};

export const transactionAPI = {
    getAll: () => api.get('/transactions'),
    getActive: () => api.get('/transactions/active'),
    getById: (transactionId) => api.get(`/transactions/${transactionId}`),
};

export const idTagAPI = {
    getAll: () => api.get('/id-tags'),
    create: (idTag) => api.post('/id-tags', idTag),
    update: (idTagValue, idTag) => api.put(`/id-tags/${idTagValue}`, idTag),
    delete: (idTag) => api.delete(`/id-tags/${idTag}`),
    authorize: (idTag) => api.get(`/id-tags/${idTag}/authorize`),
};

export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
};
