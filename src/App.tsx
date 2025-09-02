import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ChargingStations from './pages/ChargingStations';
import ChargingStationDetail from './pages/ChargingStationDetail';
import Transactions from './pages/Transactions';
import IdTags from './pages/IdTags';
import OCPPTest from './pages/OCPPTest';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/charging-stations" element={<ChargingStations />} />
          <Route path="/charging-stations/:id" element={<ChargingStationDetail />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/id-tags" element={<IdTags />} />
          <Route path="/ocpp-test" element={<OCPPTest />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
