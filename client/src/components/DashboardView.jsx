import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  TrendingUp, 
  ShieldAlert, 
  ArrowRight,
  PieChart as PieIcon,
  Layers
} from 'lucide-react';

export default function DashboardView({ onSelectScan }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats);
        }
      })
      .catch(err => console.error('Failed fetching stats:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
        Loading enforcement analytics...
      </div>
    );
  }

  const total = stats.totalScans || 1;
  const compliantPercent = Math.round((stats.compliantCount / total) * 100);
  const nonCompliantPercent = Math.round((stats.nonCompliantCount / total) * 100);
  const reviewPercent = Math.round((stats.reviewCount / total) * 100);
  const exemptPercent = Math.round((stats.exemptCount / total) * 100);

  return (
    <div className="animate-fade-in">
      {/* 1. Metric KPI Cards Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Inspected Packages</div>
            <div className="stat-val" style={{ color: '#0f172a' }}>{stats.totalScans}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>All audited commodities</div>
          </div>
          <Layers size={32} style={{ color: '#2563eb', opacity: 0.8 }} />
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Statutory Compliance Rate</div>
            <div className="stat-val" style={{ color: stats.complianceRate > 70 ? '#15803d' : '#b45309' }}>
              {stats.complianceRate}%
            </div>
            <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '4px' }}>
              {stats.compliantCount} compliant packages
            </div>
          </div>
          <TrendingUp size={32} style={{ color: '#15803d', opacity: 0.8 }} />
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Non-Compliant (Defects)</div>
            <div className="stat-val" style={{ color: '#b91c1c' }}>{stats.nonCompliantCount}</div>
            <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: '4px' }}>
              Violations flagged under Rules 2011
            </div>
          </div>
          <ShieldAlert size={32} style={{ color: '#b91c1c', opacity: 0.8 }} />
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Manual Review / Exempt</div>
            <div className="stat-val" style={{ color: '#0284c7' }}>
              {stats.reviewCount + stats.exemptCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: '4px' }}>
              {stats.reviewCount} gauge checks, {stats.exemptCount} exempt
            </div>
          </div>
          <Info size={32} style={{ color: '#0284c7', opacity: 0.8 }} />
        </div>
      </div>

      {/* 2. Charts Section */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {/* Most Frequent Violations Bar Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <BarChart3 size={18} className="text-blue-600" />
              Most Common Statutory Violations (FR-6.1)
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {stats.topViolations && stats.topViolations.length > 0 ? (
              stats.topViolations.map((v, i) => {
                const maxCount = Math.max(...stats.topViolations.map(x => x.count), 1);
                const barWidth = Math.max(12, (v.count / maxCount) * 100);

                return (
                  <div key={i} style={{ fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{v.rule}</span>
                      <strong style={{ color: '#b91c1c' }}>{v.count} violation(s)</strong>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${barWidth}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, #ef4444, #b91c1c)', 
                          borderRadius: '5px',
                          transition: 'width 0.5s ease'
                        }} 
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No violations recorded yet.</div>
            )}
          </div>
        </div>

        {/* Status Distribution Donut Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <PieIcon size={18} className="text-blue-600" />
              Enforcement Compliance Breakdown
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '1rem', padding: '0.5rem 0' }}>
            {/* SVG Donut Visual */}
            <svg viewBox="0 0 100 100" width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="14" />
              {/* Green Compliant */}
              <circle
                cx="50" cy="50" r="38"
                fill="transparent"
                stroke="#15803d"
                strokeWidth="14"
                strokeDasharray={`${(compliantPercent / 100) * 238.7} 238.7`}
                strokeDashoffset="0"
              />
              {/* Red Non-compliant */}
              <circle
                cx="50" cy="50" r="38"
                fill="transparent"
                stroke="#b91c1c"
                strokeWidth="14"
                strokeDasharray={`${(nonCompliantPercent / 100) * 238.7} 238.7`}
                strokeDashoffset={`-${(compliantPercent / 100) * 238.7}`}
              />
            </svg>

            {/* Legend & Percentages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#15803d' }} />
                <span>Compliant: <strong>{compliantPercent}%</strong> ({stats.compliantCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#b91c1c' }} />
                <span>Non-Compliant: <strong>{nonCompliantPercent}%</strong> ({stats.nonCompliantCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }} />
                <span>Needs Review: <strong>{reviewPercent}%</strong> ({stats.reviewCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#0ea5e9' }} />
                <span>Rule 26 Exempt: <strong>{exemptPercent}%</strong> ({stats.exemptCount})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recent Inspection Feed (Drill-Down) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <CheckCircle2 size={18} className="text-blue-600" />
            Recent Inspections Activity Feed (FR-6.2 Drill-Down)
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {stats.recentScans && stats.recentScans.map((scan) => {
            let badgeClass = 'badge-success';
            if (scan.overallStatus === 'NON_COMPLIANT') badgeClass = 'badge-danger';
            if (scan.overallStatus === 'NEEDS_REVIEW') badgeClass = 'badge-warning';
            if (scan.overallStatus === 'EXEMPT') badgeClass = 'badge-info';

            return (
              <div 
                key={scan.id}
                onClick={() => onSelectScan(scan)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{scan.productName}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {scan.id} • {scan.manufacturer} • {new Date(scan.timestamp).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={`badge ${badgeClass}`}>
                    {scan.overallStatus}
                  </span>
                  <ArrowRight size={16} className="text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
