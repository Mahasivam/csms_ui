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
import { dashboardAPI, chargingStationAPI, transactionAPI } from '../services/api';

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

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                {/* Connector Status Chart */}
                <div className="lg:col-span-3 bg-white shadow-sm rounded-xl border border-gray-200 p-6">
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

                {/* Recent Transactions */}
                <div className="lg:col-span-2 bg-white shadow-sm rounded-xl border border-gray-200 p-6">
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
                                            <div className="w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                Transaction #{transaction.transactionId}
                                            </p>
                                            <p className="text-sm text-gray-500 truncate">
                                                {transaction.idTag} @ Connector {transaction.connectorId}
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
            </div>
        </div>
    );
};

export default Dashboard;
