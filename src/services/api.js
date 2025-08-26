import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

export const chargingStationAPI = {
    getAll: () => api.get('/charging-stations'),
    getById: (chargePointId) => api.get(`/charging-stations/${chargePointId}`),
    getConnectors: (chargePointId) => api.get(`/charging-stations/${chargePointId}/connectors`),
    getTransactions: (chargePointId) => api.get(`/charging-stations/${chargePointId}/transactions`),
    remoteStart: (chargePointId, idTag, connectorId) =>
        api.post(`/charging-stations/${chargePointId}/remote-start`, null, {
            params: { idTag, connectorId }
        }),
    remoteStop: (chargePointId, transactionId) =>
        api.post(`/charging-stations/${chargePointId}/remote-stop`, null, {
            params: { transactionId }
        }),
    reset: (chargePointId, type = 'Soft') =>
        api.post(`/charging-stations/${chargePointId}/reset`, null, {
            params: { type }
        }),
    unlockConnector: (chargePointId, connectorId) =>
        api.post(`/charging-stations/${chargePointId}/unlock-connector`, null, {
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
