import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ScannerView from './components/ScannerView';
import InteractiveReportView from './components/InteractiveReportView';
import HistoryView from './components/HistoryView';
import DashboardView from './components/DashboardView';
import RulesConfigView from './components/RulesConfigView';
import ArchitectureGuideView from './components/ArchitectureGuideView';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [currentUser, setCurrentUser] = useState({
    id: 'usr_inspector_01',
    name: 'Inspector R. Sharma',
    role: 'INSPECTOR',
    designation: 'Legal Metrology Inspector, Zone 4',
    badgeNumber: 'LM-DL-2024-884'
  });
  const [samples, setSamples] = useState([]);
  const [activeScan, setActiveScan] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Fetch initial user and samples
  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/samples').then(r => r.json()),
      fetch('/api/history').then(r => r.json())
    ])
      .then(([userData, samplesData, historyData]) => {
        if (userData.success) setCurrentUser(userData.user);
        if (samplesData.success) setSamples(samplesData.samples || []);
        if (historyData.success && historyData.scans && historyData.scans.length > 0) {
          setActiveScan(historyData.scans[0]); // Default to first scan
        }
      })
      .catch(err => console.error('Failed initial load:', err))
      .finally(() => setLoadingInitial(false));
  }, []);

  // Switch role between Inspector & Admin
  const handleSwitchRole = async (newRole) => {
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Failed switching role:', err);
    }
  };

  // When a scan completes in ScannerView
  const handleScanComplete = (newScan) => {
    setActiveScan(newScan);
    setActiveTab('report');
  };

  // When a scan is selected from History or Dashboard
  const handleSelectScan = (scan) => {
    setActiveScan(scan);
    setActiveTab('report');
  };

  // When manual override or remarks are saved
  const handleUpdateScan = (updatedScan) => {
    setActiveScan(updatedScan);
  };

  return (
    <div className="app-container">
      {/* Top Bar & Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser}
        onSwitchRole={handleSwitchRole}
      />

      {/* Main View Area */}
      <main className="main-content">
        {loadingInitial ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: '0.75rem', fontWeight: 600 }}>Loading Legal Metrology Compliance Portal...</div>
          </div>
        ) : (
          <>
            {activeTab === 'scanner' && (
              <ScannerView 
                samples={samples} 
                onScanComplete={handleScanComplete} 
              />
            )}

            {activeTab === 'report' && (
              <InteractiveReportView 
                scan={activeScan}
                onUpdateScan={handleUpdateScan}
                currentUser={currentUser}
                onNewScan={() => setActiveTab('scanner')}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView 
                onSelectScan={handleSelectScan} 
              />
            )}

            {activeTab === 'dashboard' && (
              <DashboardView 
                onSelectScan={handleSelectScan} 
              />
            )}

            {activeTab === 'rules' && (
              <RulesConfigView 
                currentUser={currentUser}
                onSwitchRole={handleSwitchRole}
              />
            )}

            {activeTab === 'guide' && (
              <ArchitectureGuideView />
            )}
          </>
        )}
      </main>
    </div>
  );
}
