import { dashboardAPI, chargingStationAPI, transactionAPI } from '../services/api';

// Test function to verify backend integration
export const testBackendIntegration = async () => {
    const results = {
        dashboardStats: null,
        chargingStations: null,
        activeTransactions: null,
        errors: []
    };

    console.log('🧪 Testing Backend Integration...');

    // Test 1: Dashboard Stats
    try {
        console.log('📊 Testing dashboard stats endpoint...');
        const statsResponse = await dashboardAPI.getStats();
        results.dashboardStats = statsResponse.data;
        console.log('✅ Dashboard stats:', results.dashboardStats);
    } catch (error) {
        console.error('❌ Dashboard stats failed:', error.message);
        results.errors.push(`Dashboard stats: ${error.message}`);
    }

    // Test 2: Charging Stations
    try {
        console.log('⚡ Testing charging stations endpoint...');
        const stationsResponse = await chargingStationAPI.getAll();
        results.chargingStations = stationsResponse.data;
        console.log('✅ Charging stations:', results.chargingStations);
    } catch (error) {
        console.error('❌ Charging stations failed:', error.message);
        results.errors.push(`Charging stations: ${error.message}`);
    }

    // Test 3: Active Transactions
    try {
        console.log('🔄 Testing active transactions endpoint...');
        const transactionsResponse = await transactionAPI.getActive();
        results.activeTransactions = transactionsResponse.data;
        console.log('✅ Active transactions:', results.activeTransactions);
    } catch (error) {
        console.error('❌ Active transactions failed:', error.message);
        results.errors.push(`Active transactions: ${error.message}`);
    }

    // Summary
    console.log('\n📋 Integration Test Summary:');
    console.log(`✅ Successful tests: ${3 - results.errors.length}/3`);
    console.log(`❌ Failed tests: ${results.errors.length}/3`);
    
    if (results.errors.length > 0) {
        console.log('\n🚨 Errors encountered:');
        results.errors.forEach(error => console.log(`   - ${error}`));
    }

    return results;
};

// Quick CORS test
export const testCORS = async () => {
    try {
        const response = await fetch('http://localhost:8080/api/dashboard/stats');
        if (response.ok) {
            const data = await response.json();
            console.log('✅ CORS working - Dashboard stats:', data);
            return data;
        } else {
            console.error('❌ CORS test failed with status:', response.status);
            return null;
        }
    } catch (error) {
        console.error('❌ CORS test failed:', error.message);
        return null;
    }
};