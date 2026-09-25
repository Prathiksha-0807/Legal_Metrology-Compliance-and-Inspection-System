import React from 'react';
import {
  ScanLine,
  FileText,
  BarChart3,
  Settings2,
  ShieldCheck,
  UserCheck,
  LogOut,
  BookOpen,
  Scale
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentUser, onLogout }) {
  return (
    <header>
      {/* Official Government / Legal Metrology Header */}
      <div className="top-header">
        <div className="brand-section">
          <div className="gov-emblem">
            <Scale size={26} />
          </div>
          <div>
            <div className="brand-title">
              Legal Metrology Compliance Inspector
            </div>
          </div>
        </div>

        {/* Signed-in user identity */}
        <div className="header-controls">
          <div className="role-switcher-card">
            <UserCheck size={16} className={currentUser.role === 'ADMIN' ? 'text-amber-400' : 'text-blue-400'} />
            <div>
              <div style={{ fontWeight: 600, color: '#f8fafc' }}>{currentUser.name}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                Role: <strong style={{ color: currentUser.role === 'ADMIN' ? '#f59e0b' : '#60a5fa' }}>{currentUser.role}</strong> ({currentUser.badgeNumber || 'Officer'})
              </div>
            </div>
            <button
              className="logout-btn"
              type="button"
              onClick={onLogout}
              title="Log out of the portal"
            >
              <LogOut size={16} aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <nav className="nav-tab-bar">
        <button
          className={`nav-tab ${activeTab === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          <ScanLine size={18} />
          <span>New Inspection &amp; Scan</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          <FileText size={18} />
          <span>Active Audit Report</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <ShieldCheck size={18} />
          <span>Repository &amp; Records</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <BarChart3 size={18} />
          <span>Enforcement Dashboard</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <Settings2 size={18} />
          <span>Rules &amp; Second Schedule</span>
          {currentUser.role !== 'ADMIN' && (
            <span style={{ fontSize: '0.65rem', background: '#e2e8f0', color: '#475569', padding: '1px 5px', borderRadius: '4px' }}>Admin</span>
          )}
        </button>

        {currentUser.role === 'ADMIN' && (
          <button
            className={`nav-tab ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => setActiveTab('guide')}
          >
            <BookOpen size={18} />
            <span>Architecture &amp; PS Guide</span>
          </button>
        )}
      </nav>
    </header>
  );
}
