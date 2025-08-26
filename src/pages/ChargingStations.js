import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Zap,
    Circle,
    AlertTriangle,
    CheckCircle,
    Clock,
    ExternalLink
} from 'lucide-react';
import { chargingStationAPI } from '../services/api';

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

    const getStatusIcon = (station) => {
        const now = new Date();
        const lastHeartbeat = station.lastHeartbeat ? new Date(station.lastHeartbeat) : null;
        const isOnline = lastHeartbeat && (now - lastHeartbeat) < 10 * 60 * 1000; // 10 minutes

        if (!station.isRegistered) {
            return <AlertTriangle className="h-5 w-5 text-warning-500" />;
        }
        if (isOnline) {
            return <CheckCircle className="h-5 w-5 text-success-500" />;
        }
        return <Circle className="h-5 w-5 text-gray-400" />;
    };

    const getStatusText = (station) => {
        const now = new Date();
        const lastHeartbeat = station.lastHeartbeat ? new Date(station.lastHeartbeat) : null;
        const isOnline = lastHeartbeat && (now - lastHeartbeat) < 10 * 60 * 1000;

        if (!station.isRegistered) return 'Pending';
        if (isOnline) return 'Online';
        return 'Offline';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="sm:flex sm:items-center mb-8">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold leading-7 text-gray-900">Charging Stations</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage and monitor your charging station network
                    </p>
                </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul role="list" className="divide-y divide-gray-200">
                    {stations.length === 0 ? (
                        <li className="px-6 py-8 text-center">
                            <Zap className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No charging stations</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Connect your first charging station to get started.
                            </p>
                        </li>
                    ) : (
                        stations.map((station) => (
                            <li key={station.id}>
                                <Link
                                    to={`/charging-stations/${station.chargePointId}`}
                                    className="block hover:bg-gray-50 px-6 py-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                {getStatusIcon(station)}
                                            </div>
                                            <div className="ml-4">
                                                <div className="flex items-center">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {station.chargePointId}
                                                    </p>
                                                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        getStatusText(station) === 'Online' ? 'bg-success-100 text-success-800' :
                                                            getStatusText(station) === 'Offline' ? 'bg-gray-100 text-gray-800' :
                                                                'bg-warning-100 text-warning-800'
                                                    }`}>
                            {getStatusText(station)}
                          </span>
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {station.chargePointVendor} {station.chargePointModel}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <Clock className="h-4 w-4 mr-1" />
                                                    {station.lastHeartbeat
                                                        ? new Date(station.lastHeartbeat).toLocaleString()
                                                        : 'Never'
                                                    }
                                                </div>
                                            </div>
                                            <ExternalLink className="h-4 w-4 text-gray-400" />
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
};

export default ChargingStations;
