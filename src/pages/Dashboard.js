import React, { useState, useEffect } from 'react';
import {
    Zap,
    Activity,
    Users,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardAPI, chargingStationAPI, transactionAPI } from '../services/api';

const Dashboard = () => {
    const [stats, setStats] = useState({});
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, transactionsRes] = await Promise.all([
                    dashboardAPI.getStats(),
                    transactionAPI.getActive()
                ]);

                setStats(statsRes.data);
                setRecentTransactions(transactionsRes.data.slice(0, 5)); // Latest 5
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const chartData = [
        { name: 'Available', value: stats.availableConnectors || 0, fill: '#22c55e' },
        { name: 'Charging', value: stats.chargingConnectors || 0, fill: '#3b82f6' },
        { name: 'Faulted', value: stats.faultedConnectors || 0, fill: '#ef4444' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
                    Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Overview of your charging station network
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Zap className="h-6 w-6 text-primary-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Charging Stations
                                    </dt>
                                    <dd className="flex items-baseline">
                                        <div className="text-2xl font-semibold text-gray-900">
                                            {stats.totalStations || 0}
                                        </div>
                                        <div className="ml-2 flex items-baseline text-sm font-semibold text-success-600">
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            {stats.onlineStations || 0} online
                                        </div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Activity className="h-6 w-6 text-success-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Active Sessions
                                    </dt>
                                    <dd className="text-2xl font-semibold text-gray-900">
                                        {stats.activeTransactions || 0}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Users className="h-6 w-6 text-primary-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Connectors
                                    </dt>
                                    <dd className="text-2xl font-semibold text-gray-900">
                                        {stats.totalConnectors || 0}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                {stats.offlineStations > 0 ? (
                                    <XCircle className="h-6 w-6 text-danger-400" />
                                ) : (
                                    <CheckCircle className="h-6 w-6 text-success-400" />
                                )}
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        System Status
                                    </dt>
                                    <dd className="text-2xl font-semibold text-gray-900">
                                        {stats.offlineStations > 0 ? 'Warning' : 'Healthy'}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Connector Status Chart */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Connector Status</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Active Sessions</h3>
                    <div className="overflow-hidden">
                        <div className="space-y-3">
                            {recentTransactions.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No active transactions</p>
                            ) : (
                                recentTransactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex-shrink-0">
                                                <div className="w-2 h-2 bg-success-400 rounded-full"></div>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    Transaction #{transaction.transactionId}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    ID: {transaction.idTag} • Connector {transaction.connectorId}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            {new Date(transaction.startTimestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
