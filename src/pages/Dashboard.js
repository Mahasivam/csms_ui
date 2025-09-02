import React, { useState, useEffect } from 'react';
import {
    Zap,
    Activity,
    Users,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    XCircle,
    HeartPulse
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { dashboardAPI, chargingStationAPI, transactionAPI, addEventListener } from '../services/api';

const StatCard = ({ icon: Icon, title, value, detail, detailColor }) => (
    <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
        <div className="p-5">
            <div className="flex items-center">
                <div className="flex-shrink-0">
                    <Icon className="h-7 w-7 text-primary-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                    <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                            {title}
                        </dt>
                        <dd>
                            <div className="text-2xl font-bold text-gray-900">
                                {value}
                            </div>
                            {detail && (
                                <div className={`mt-1 text-xs font-semibold ${detailColor}`}>
                                    {detail}
                                </div>
                            )}
                        </dd>
                    </dl>
                </div>
            </div>
        </div>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({});
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connectedStations, setConnectedStations] = useState(new Set());
    const [realtimeEvents, setRealtimeEvents] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Try to fetch real API data first
                let statsData = {};
                let transactionsData = [];
                
                try {
                    const statsRes = await dashboardAPI.getStats();
                    statsData = statsRes.data;
                } catch (statsError) {
                    console.warn('Stats API not available, calculating from WebSocket data');
                    // Calculate stats from connected stations and current state
                    statsData = {
                        totalStations: connectedStations.size || 1,
                        onlineStations: connectedStations.size,
                        offlineStations: Math.max(0, (connectedStations.size || 1) - connectedStations.size),
                        activeTransactions: recentTransactions.length,
                        totalConnectors: (connectedStations.size || 1) * 2, // Assume 2 connectors per station
                        availableConnectors: Math.max(0, ((connectedStations.size || 1) * 2) - recentTransactions.length),
                        chargingConnectors: recentTransactions.length,
                        faultedConnectors: 0
                    };
                }

                try {
                    const transactionsRes = await transactionAPI.getActive();
                    transactionsData = Array.isArray(transactionsRes.data) ? transactionsRes.data.slice(0, 5) : [];
                } catch (transError) {
                    console.warn('Transactions API not available, using WebSocket data');
                    // Keep existing transactions from WebSocket events
                    transactionsData = recentTransactions.slice(0, 5);
                }

                setStats(statsData);
                // Only update transactions if we got new data from API
                if (transactionsData.length > 0 || recentTransactions.length === 0) {
                    setRecentTransactions(transactionsData);
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                // Fallback to calculated data
                setStats({
                    totalStations: connectedStations.size || 1,
                    onlineStations: connectedStations.size,
                    offlineStations: 0,
                    activeTransactions: recentTransactions.length,
                    totalConnectors: (connectedStations.size || 1) * 2,
                    availableConnectors: Math.max(0, ((connectedStations.size || 1) * 2) - recentTransactions.length),
                    chargingConnectors: recentTransactions.length,
                    faultedConnectors: 0
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s

        // Set up real-time event listeners
        const unsubscribers = [
            addEventListener('chargingStationRegistered', (data) => {
                console.log('Charging station registered:', data);
                setConnectedStations(prev => new Set([...prev, data.chargePointId]));
                setRealtimeEvents(prev => [...prev.slice(-9), {
                    id: Date.now(),
                    type: 'registration',
                    message: `${data.chargePointId} registered (${data.vendor} ${data.model})`,
                    timestamp: new Date()
                }]);
                fetchDashboardData(); // Refresh stats
            }),

            addEventListener('statusNotification', (data) => {
                console.log('Status notification:', data);
                setRealtimeEvents(prev => [...prev.slice(-9), {
                    id: Date.now(),
                    type: 'status',
                    message: `${data.chargePointId} connector ${data.connectorId}: ${data.status}`,
                    timestamp: new Date()
                }]);
            }),

            addEventListener('transactionStarted', (data) => {
                console.log('Transaction started:', data);
                setRecentTransactions(prev => {
                    // Check if transaction already exists to avoid duplicates
                    const existingIndex = prev.findIndex(t => t.transactionId === data.transactionId);
                    if (existingIndex !== -1) {
                        return prev; // Transaction already exists, don't add duplicate
                    }
                    
                    return [{
                        id: data.transactionId,
                        transactionId: data.transactionId,
                        idTag: data.idTag,
                        connectorId: data.connectorId,
                        startTimestamp: data.timestamp,
                        chargePointId: data.chargePointId
                    }, ...prev.slice(0, 4)];
                });
                setRealtimeEvents(prev => [...prev.slice(-9), {
                    id: Date.now(),
                    type: 'transaction',
                    message: `Transaction #${data.transactionId} started on ${data.chargePointId}`,
                    timestamp: new Date()
                }]);
            }),

            addEventListener('transactionStopped', (data) => {
                console.log('Transaction stopped:', data);
                setRecentTransactions(prev => 
                    prev.filter(t => t.transactionId !== data.transactionId)
                );
                setRealtimeEvents(prev => [...prev.slice(-9), {
                    id: Date.now(),
                    type: 'transaction',
                    message: `Transaction #${data.transactionId} stopped`,
                    timestamp: new Date()
                }]);
            }),

            addEventListener('heartbeat', (data) => {
                console.log('Heartbeat from:', data.chargePointId);
                setConnectedStations(prev => new Set([...prev, data.chargePointId]));
            }),

            addEventListener('connectionClosed', (data) => {
                console.log('Connection closed:', data.chargePointId);
                setConnectedStations(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(data.chargePointId);
                    return newSet;
                });
                setRealtimeEvents(prev => [...prev.slice(-9), {
                    id: Date.now(),
                    type: 'disconnection',
                    message: `${data.chargePointId} disconnected`,
                    timestamp: new Date()
                }]);
            })
        ];

        return () => {
            clearInterval(interval);
            unsubscribers.forEach(unsub => unsub());
        };
    }, []);

    const chartData = [
        { name: 'Available', value: stats.availableConnectors || 0, color: '#22c55e' },
        { name: 'Charging', value: stats.chargingConnectors || 0, color: '#f59e0b' },
        { name: 'Faulted', value: stats.faultedConnectors || 0, color: '#ef4444' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold leading-tight text-gray-900">
                    Welcome to SmartCharge
                </h1>
                <p className="mt-1 text-md text-gray-600">
                    Your smart EV charging network overview.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <StatCard
                    icon={Zap}
                    title="Charging Stations"
                    value={stats.totalStations || 0}
                    detail={`${stats.onlineStations || 0} Online`}
                    detailColor="text-success-600"
                />
                <StatCard
                    icon={Activity}
                    title="Active Sessions"
                    value={stats.activeTransactions || 0}
                />
                <StatCard
                    icon={Users}
                    title="Total Connectors"
                    value={stats.totalConnectors || 0}
                />
                <StatCard
                    icon={stats.offlineStations > 0 ? XCircle : HeartPulse}
                    title="System Status"
                    value={stats.offlineStations > 0 ? 'Warning' : 'Healthy'}
                    detail={stats.offlineStations > 0 ? `${stats.offlineStations} stations offline` : 'All systems operational'}
                    detailColor={stats.offlineStations > 0 ? 'text-danger-600' : 'text-success-600'}
                />
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 mb-8">
                {/* Connector Status Chart */}
                <div className="lg:col-span-2 bg-white shadow-sm rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Connector Status</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '0.75rem',
                                        borderColor: '#e5e7eb',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                    }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Connected Stations */}
                <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Connected Stations</h3>
                    <div className="space-y-3">
                        {connectedStations.size === 0 ? (
                            <div className="text-center py-8">
                                <Zap className="mx-auto h-10 w-10 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-500">No stations connected</p>
                            </div>
                        ) : (
                            Array.from(connectedStations).map((stationId) => (
                                <div key={stationId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-sm font-medium text-gray-900">{stationId}</span>
                                    </div>
                                    <span className="text-xs text-green-600 font-semibold">ONLINE</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Recent Transactions */}
                <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Active Sessions</h3>
                    <div className="space-y-4">
                        {recentTransactions.length === 0 ? (
                            <div className="text-center py-10">
                                <Activity className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No active sessions</h3>
                                <p className="mt-1 text-sm text-gray-500">Get started by plugging in a vehicle.</p>
                            </div>
                        ) : (
                            recentTransactions.map((transaction) => (
                                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-shrink-0">
                                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                Transaction #{transaction.transactionId}
                                            </p>
                                            <p className="text-sm text-gray-500 truncate">
                                                {transaction.idTag} @ {transaction.chargePointId || 'Unknown'} C{transaction.connectorId}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {new Date(transaction.startTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Real-time Events */}
                <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Real-time Events</h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {realtimeEvents.length === 0 ? (
                            <div className="text-center py-10">
                                <HeartPulse className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No recent events</h3>
                                <p className="mt-1 text-sm text-gray-500">Events from charge points will appear here.</p>
                            </div>
                        ) : (
                            realtimeEvents.slice().reverse().map((event) => (
                                <div key={event.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                        event.type === 'registration' ? 'bg-blue-500' :
                                        event.type === 'transaction' ? 'bg-green-500' :
                                        event.type === 'status' ? 'bg-yellow-500' :
                                        event.type === 'disconnection' ? 'bg-red-500' :
                                        'bg-gray-500'
                                    }`}></div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-gray-900">{event.message}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {event.timestamp.toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
