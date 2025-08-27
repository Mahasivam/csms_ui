import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Zap,
    ChevronRight
} from 'lucide-react';
import { chargingStationAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const ChargingStations = () => {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStations = async () => {
            try {
                const response = await chargingStationAPI.getAll();
                setStations(response.data);
            } catch (error) {
                console.error('Error fetching charging stations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStations();
        const interval = setInterval(fetchStations, 15000); // Refresh every 15s
        return () => clearInterval(interval);
    }, []);

    const getStationStatus = (station) => {
        const now = new Date();
        const lastHeartbeat = station.lastHeartbeat ? new Date(station.lastHeartbeat) : null;
        const isOnline = lastHeartbeat && (now - lastHeartbeat) < 10 * 60 * 1000; // 10 minutes

        if (!station.isRegistered) return 'Pending';
        if (isOnline) return 'Online';
        return 'Offline';
    };

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
                <h1 className="text-3xl font-bold leading-tight text-gray-900">Charging Stations</h1>
                <p className="mt-1 text-md text-gray-600">
                    Manage and monitor your charging station network.
                </p>
            </div>

            <div className="bg-white shadow-sm rounded-xl border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Heartbeat</th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">View</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {stations.length === 0 ? (
                                <tr>
                                    <td colSpan="5">
                                        <div className="text-center py-16">
                                            <Zap className="mx-auto h-12 w-12 text-gray-400" />
                                            <h3 className="mt-2 text-sm font-medium text-gray-900">No charging stations found</h3>
                                            <p className="mt-1 text-sm text-gray-500">Connect your first charging station to see it here.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                stations.map((station) => (
                                    <tr key={station.id} className="hover:bg-gray-50 transition-colors duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-gray-900">{station.chargePointId}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-600">{station.chargePointVendor}</div>
                                            <div className="text-xs text-gray-500">{station.chargePointModel}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge status={getStationStatus(station)} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {station.lastHeartbeat ? new Date(station.lastHeartbeat).toLocaleString() : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link to={`/charging-stations/${station.chargePointId}`} className="text-primary-600 hover:text-primary-800 flex items-center justify-end">
                                                View
                                                <ChevronRight className="h-4 w-4 ml-1" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ChargingStations;
