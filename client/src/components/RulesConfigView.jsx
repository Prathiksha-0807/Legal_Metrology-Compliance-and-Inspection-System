import React, { useState, useEffect } from 'react';
import {
  Settings2,
  Edit,
  Save,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Sliders,
  Scale
} from 'lucide-react';

export default function RulesConfigView({ currentUser }) {
  const [rules, setRules] = useState([]);
  const [standardPacks, setStandardPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const isAdmin = currentUser.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, spRes] = await Promise.all([
        fetch('/api/rules'),
        fetch('/api/standard-packs')
      ]);
      const rData = await rRes.json();
      const spData = await spRes.json();
      if (rData.success) setRules(rData.rules);
      if (spData.success) setStandardPacks(spData.standardPacks);
    } catch (err) {
      console.error('Failed fetching rules configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Toggle Rule Status (Enable/Disable)
  const handleToggleRule = async (rule) => {
    if (!isAdmin) return;
    try {
      const updated = { ...rule, enabled: !rule.enabled };
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        setRules(prev => prev.map(r => r.id === rule.id ? data.rule : r));
        showSuccess('Rule status updated successfully.');
      }
    } catch (err) {
      console.error('Failed updating rule:', err);
    }
  };

  // Save Rule Configuration Edits
  const handleSaveRuleConfig = async (e) => {
    e.preventDefault();
    if (!isAdmin || !editingRule) return;

    try {
      const res = await fetch(`/api/rules/${editingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRule)
      });
      const data = await res.json();
      if (data.success) {
        setRules(prev => prev.map(r => r.id === editingRule.id ? data.rule : r));
        setEditingRule(null);
        showSuccess(`Configuration for ${data.rule.ruleReference} saved.`);
      }
    } catch (err) {
      console.error('Failed saving rule:', err);
    }
  };

  // Update Standard Pack Sizes
  const handleUpdatePackSizes = async (category, newSizesString) => {
    if (!isAdmin) return;
    try {
      const parsedSizes = newSizesString.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      const res = await fetch(`/api/standard-packs/${encodeURIComponent(category)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sizes: parsedSizes })
      });
      const data = await res.json();
      if (data.success) {
        setStandardPacks(prev => prev.map(sp => sp.category === category ? data.standardPack : sp));
        showSuccess(`Second Schedule sizes updated for ${category}.`);
      }
    } catch (err) {
      console.error('Failed updating standard packs:', err);
    }
  };

  const showSuccess = (msg) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(''), 3500);
  };

  return (
    <div className="animate-fade-in">
      {saveSuccessMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '0.6rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Check size={16} /> {saveSuccessMsg}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title">
            <Sliders size={18} className="text-blue-600" />
            Configurable Legal Metrology Rules Registry (FR-3.9)
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Data-driven compliance criteria (Zero code changes required for GSR amendments)
          </span>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Rule Reference</th>
              <th>Mandatory Field / Title</th>
              <th>Category</th>
              <th>Severity</th>
              <th aria-label="Edit controls"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td>
                  <button
                    disabled={!isAdmin}
                    onClick={() => handleToggleRule(rule)}
                    style={{
                      border: 'none',
                      background: rule.enabled ? '#15803d' : '#94a3b8',
                      color: '#ffffff',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: isAdmin ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {rule.enabled ? 'ACTIVE' : 'DISABLED'}
                  </button>
                </td>
                <td style={{ fontWeight: 700, color: '#1e3a8a', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                  {rule.ruleReference}
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{rule.title}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{rule.description}</div>
                </td>
                <td><span className="badge badge-info">{rule.category}</span></td>
                <td>
                  <span className={`badge ${rule.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                    {rule.severity}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {isAdmin && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingRule(rule)} title="Edit parameters">
                      <Edit size={13} /> Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Section 2: Second Schedule Standard Pack Sizes (Rule 5) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Scale size={18} className="text-blue-600" />
            Second Schedule Standard Pack Sizes (Rule 5 &amp; Second Schedule)
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Prescribed standard sizes per commodity category
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {standardPacks.map((sp) => (
            <div
              key={sp.category}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                background: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{sp.category}</strong>
                <span className="badge badge-info">Unit: {sp.unit}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.6rem' }}>
                {sp.description}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Prescribed Sizes ({sp.unit}):
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    defaultValue={sp.sizes.join(', ')}
                    disabled={!isAdmin}
                    id={`input-${sp.category}`}
                    style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  {isAdmin && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        const val = document.getElementById(`input-${sp.category}`).value;
                        handleUpdatePackSizes(sp.category, val);
                      }}
                      title="Save standard pack sizes"
                    >
                      <Save size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(3px)'
          }}
        >
          <div className="card" style={{ maxWidth: '580px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header">
              <div className="card-title">
                <Edit size={18} className="text-blue-600" />
                Edit Rule: {editingRule.ruleReference}
              </div>
              <button
                onClick={() => setEditingRule(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRuleConfig} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '3px' }}>Rule Title:</label>
                <input
                  type="text"
                  value={editingRule.title}
                  onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '3px' }}>Rule Description:</label>
                <textarea
                  rows="2"
                  value={editingRule.description}
                  onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '3px' }}>Severity Level:</label>
                <select
                  value={editingRule.severity}
                  onChange={(e) => setEditingRule({ ...editingRule, severity: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="CRITICAL">CRITICAL (Immediate non-compliance defect)</option>
                  <option value="HIGH">HIGH (Noticeable statutory defect)</option>
                  <option value="MEDIUM">MEDIUM (Technical / standardization flag)</option>
                  <option value="INFO">INFO (Informational / Exemption rule)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '3px' }}>Rule Parameters (JSON):</label>
                <textarea
                  rows="5"
                  value={JSON.stringify(editingRule.parameters, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setEditingRule({ ...editingRule, parameters: parsed });
                    } catch (err) {
                      // allow typing invalid json until submit
                    }
                  }}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingRule(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
