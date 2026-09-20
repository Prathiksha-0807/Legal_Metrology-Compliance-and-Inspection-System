import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info,
  RefreshCw
} from 'lucide-react';

export default function HistoryView({ onSelectScan }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchScans = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (statusFilter) query.append('status', statusFilter);
      if (categoryFilter) query.append('category', categoryFilter);

      const res = await fetch(`/api/history?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setScans(data.scans || []);
      }
    } catch (err) {
      console.error('Failed fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchScans();
  };

  return (
    <div className="animate-fade-in">
      {/* Header & Filter Controls */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <div className="card-title">
            <FileText size={18} className="text-blue-600" />
            Legal Metrology Inspection Repository (FR-5)
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchScans}>
            <RefreshCw size={14} /> Refresh Records
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search by product name, manufacturer, or inspection ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '160px' }}>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
            >
              <option value="">All Statuses</option>
              <option value="COMPLIANT">Compliant</option>
              <option value="NON_COMPLIANT">Non-Compliant</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="EXEMPT">Statutory Exempt</option>
            </select>
          </div>

          {/* Category Filter */}
          <div style={{ minWidth: '160px' }}>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
            >
              <option value="">All Categories</option>
              <option value="Tea">Tea</option>
              <option value="Edible Oils">Edible Oils</option>
              <option value="Spices">Spices</option>
              <option value="Detergent Powder">Detergent Powder</option>
              <option value="Cosmetics">Cosmetics / Shampoo</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </form>
      </div>

      {/* Scans Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
            Loading inspection records...
          </div>
        ) : scans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            No inspection records match the selected filter criteria.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Inspection ID</th>
                <th>Commodity &amp; Packaging</th>
                <th>Category</th>
                <th>Manufacturer / Packer</th>
                <th>Date &amp; Time</th>
                <th>Overall Verdict</th>
                <th>Inspector</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((item) => {
                let badgeClass = 'badge-success';
                let Icon = CheckCircle2;
                if (item.overallStatus === 'NON_COMPLIANT') {
                  badgeClass = 'badge-danger';
                  Icon = XCircle;
                } else if (item.overallStatus === 'NEEDS_REVIEW') {
                  badgeClass = 'badge-warning';
                  Icon = AlertTriangle;
                } else if (item.overallStatus === 'EXEMPT') {
                  badgeClass = 'badge-info';
                  Icon = Info;
                }

                return (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e3a8a' }}>
                      {item.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.productName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {item.isPDP ? 'Principal Display Panel (PDP)' : 'Panel'}
                      </div>
                    </td>
                    <td>{item.category || 'General'}</td>
                    <td style={{ fontSize: '0.8rem', color: '#334155', maxWidth: '220px' }}>
                      {item.manufacturer || 'Pending'}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <span className={`badge ${badgeClass}`}>
                        <Icon size={13} />
                        {item.overallStatus}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#475569' }}>
                      {item.inspectorName || 'Officer'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => onSelectScan(item)}
                          title="Open full interactive audit report"
                        >
                          <Eye size={13} />
                          View
                        </button>
                        <a 
                          href={`/api/reports/${item.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          title="Export official PDF"
                        >
                          <Download size={13} />
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
