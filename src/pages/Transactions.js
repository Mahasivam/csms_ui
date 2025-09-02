import React, { useState, useEffect } from 'react';
import { Receipt, Clock, Zap, User, Activity } from 'lucide-react';
import { transactionAPI, meterValuesAPI, addEventListener } from '../services/api';

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [meterValues, setMeterValues] = useState({});

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const response = filter === 'active'
                    ? await transactionAPI.getActive()
                    : await transactionAPI.getAll();
                setTransactions(response.data);
                
                // Fetch meter values for active transactions
                for (const transaction of response.data) {
                    if (transaction.status === 'Active') {
                        try {
                            const meterResponse = await meterValuesAPI.getByTransaction(transaction.transactionId);
                            setMeterValues(prev => ({
                                ...prev,
                                [transaction.transactionId]: meterResponse.data
                            }));
                        } catch (error) {
                            console.warn('Error fetching meter values for transaction', transaction.transactionId);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching transactions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
        const interval = setInterval(fetchTransactions, 15000);

        // Listen for real-time meter values
        const unsubscribeMeterValues = addEventListener('meterValues', (data) => {
            if (data.transactionId) {
                setMeterValues(prev => ({
                    ...prev,
                    [data.transactionId]: [...(prev[data.transactionId] || []), {
                        timestamp: new Date().toISOString(),
                        measurand: 'Energy.Active.Import.Register',
                        value: data.meterValue,
                        unit: 'Wh'
                    }]
                }));
            }
        });

        return () => {
            clearInterval(interval);
            unsubscribeMeterValues();
        };
    }, [filter]);

    const calculateDuration = (start, end) => {
        const startTime = new Date(start);
        const endTime = end ? new Date(end) : new Date();
        const diffMs = endTime - startTime;
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const minutes = diffMins % 60;
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    const calculateEnergy = (start, end) => {
        if (!end) return 'In progress';
        return `${(end - start) / 1000} kWh`;
    };

    const getLatestMeterValue = (transactionId) => {
        const values = meterValues[transactionId];
        if (!values || values.length === 0) return null;
        return values[values.length - 1];
    };

    const getCurrentPower = (transactionId) => {
        const values = meterValues[transactionId];
        if (!values || values.length < 2) return 'N/A';
        
        const latest = values[values.length - 1];
        const previous = values[values.length - 2];
        
        if (latest && previous && latest.measurand === 'Power.Active.Import') {
            return `${(parseFloat(latest.value) / 1000).toFixed(1)} kW`;
        }
        return 'N/A';
    };

    const getTotalConsumed = (transaction, transactionId) => {
        const latestMeter = getLatestMeterValue(transactionId);
        if (latestMeter && latestMeter.measurand === 'Energy.Active.Import.Register') {
            const consumed = (parseFloat(latestMeter.value) - transaction.startMeterValue) / 1000;
            return `${consumed.toFixed(2)} kWh`;
        }
        return calculateEnergy(transaction.startMeterValue, transaction.endMeterValue);
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
                    <h1 className="text-2xl font-bold leading-7 text-gray-900">Transactions</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Monitor charging sessions and transaction history
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                    >
                        <option value="all">All Transactions</option>
                        <option value="active">Active Only</option>
                    </select>
                </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul role="list" className="divide-y divide-gray-200">
                    {transactions.length === 0 ? (
                        <li className="px-6 py-8 text-center">
                            <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Start a charging session to see transactions here.
                            </p>
                        </li>
                    ) : (
                        transactions.map((transaction) => (
                            <li key={transaction.id} className="px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <div className={`w-3 h-3 rounded-full ${
                                                transaction.status === 'Active' ? 'bg-success-400' : 'bg-gray-400'
                                            }`}></div>
                                        </div>
                                        <div className="ml-4">
                                            <div className="flex items-center">
                                                <p className="text-sm font-medium text-gray-900">
                                                    Transaction #{transaction.transactionId}
                                                </p>
                                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    transaction.status === 'Active'
                                                        ? 'bg-success-100 text-success-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                          {transaction.status}
                        </span>
                                            </div>
                                            <div className="mt-1 flex items-center text-sm text-gray-500 space-x-4">
                                                <div className="flex items-center">
                                                    <User className="h-4 w-4 mr-1" />
                                                    {transaction.idTag}
                                                </div>
                                                <div className="flex items-center">
                                                    <Zap className="h-4 w-4 mr-1" />
                                                    Connector {transaction.connectorId}
                                                </div>
                                                <div className="flex items-center">
                                                    <Clock className="h-4 w-4 mr-1" />
                                                    {calculateDuration(transaction.startTimestamp, transaction.endTimestamp)}
                                                </div>
                                                {transaction.status === 'Active' && getCurrentPower(transaction.transactionId) !== 'N/A' && (
                                                    <div className="flex items-center">
                                                        <Activity className="h-4 w-4 mr-1" />
                                                        {getCurrentPower(transaction.transactionId)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">
                                            {getTotalConsumed(transaction, transaction.transactionId)}
                                        </p>
                                        {transaction.status === 'Active' ? (
                                            <p className="text-sm text-success-600 font-medium">
                                                Charging • {new Date(transaction.startTimestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-500">
                                                {new Date(transaction.startTimestamp).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
};

export default Transactions;
