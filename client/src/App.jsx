import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ScannerView from './components/ScannerView';
import InteractiveReportView from './components/InteractiveReportView';
import HistoryView from './components/HistoryView';
import DashboardView from './components/DashboardView';
import RulesConfigView from './components/RulesConfigView';
import ArchitectureGuideView from './components/ArchitectureGuideView';
import LoginPage from './components/LoginPage';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeScan, setActiveScan] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Load existing user-created history after the user signs in.
  useEffect(() => {
    if (!isAuthenticated) return;

    fetch('/api/history')
      .then(r => r.json())
      .then(historyData => {
        if (historyData.success && historyData.scans && historyData.scans.length > 0) {
          setActiveScan(historyData.scans[0]);
        }
      })
      .catch(err => console.error('Failed initial load:', err))
      .finally(() => setLoadingInitial(false));
  }, [isAuthenticated]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setLoadingInitial(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveScan(null);
    setActiveTab('scanner');
    setLoadingInitial(true);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

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

  return (
    <div className="app-container">
      {/* Top Bar & Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
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
                onScanComplete={handleScanComplete}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'report' && (
              <InteractiveReportView
                scan={activeScan}
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
              />
            )}

            {activeTab === 'guide' && currentUser.role === 'ADMIN' && (
              <ArchitectureGuideView />
            )}
          </>
        )}
      </main>
    </div>
  );
}
