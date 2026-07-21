import React, { useState, useEffect } from 'react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'customer-info', label: 'Customer Info' },
  { id: 'data-mapping', label: 'Data Mapping' },
  { id: 'tenant-setup', label: 'Tenant Setup' },
  { id: 'import', label: 'Import' }
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [onboardingData, setOnboardingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    fetch('/api/onboarding')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid response format');
        return data;
      })
      .then(data => {
        setOnboardingData(data);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch onboarding data:', err);
        setError(err.message);
        setOnboardingData([]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="app">
      <header>
        <div>
          <h1>Onboarding Dashboard</h1>
          <p>Customer Success Team - Internal Tool</p>
        </div>
        <button
          className="theme-toggle"
          onClick={() => setDark(d => !d)}
          aria-label="Toggle dark mode"
        >
          {dark ? '☀️ Light' : '🌙 Dark'}
        </button>
      </header>

      <nav className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === 'dashboard' && (
          <DashboardTab data={onboardingData} loading={loading} error={error} />
        )}
        {activeTab === 'customer-info' && (
          <CustomerInfoForm
            onCreated={(entry) => {
              setOnboardingData(prev => [entry, ...prev]);
              setActiveTab('dashboard');
            }}
          />
        )}
        {activeTab === 'data-mapping' && (
          <DataMappingForm
            customers={onboardingData}
            onUpdated={(entry) => {
              setOnboardingData(prev =>
                prev.map(c => (c.customerId === entry.customerId ? entry : c))
              );
              setActiveTab('dashboard');
            }}
          />
        )}
        {activeTab === 'tenant-setup' && (
          <TenantSetupTab
            customers={onboardingData}
            onUpdated={(entry) => {
              setOnboardingData(prev =>
                prev.map(c => (c.customerId === entry.customerId ? entry : c))
              );
              setActiveTab('dashboard');
            }}
          />
        )}
        {activeTab === 'import' && (
          <ImportTab
            customers={onboardingData}
            onUpdated={(entry) => {
              setOnboardingData(prev =>
                prev.map(c => (c.customerId === entry.customerId ? entry : c))
              );
            }}
          />
        )}
      </main>
    </div>
  );
}

function DashboardTab({ data, loading, error }) {
  if (loading) {
    return <div className="placeholder"><p>Loading...</p></div>;
  }

  if (error) {
    return (
      <div className="placeholder">
        <p style={{ color: '#dc2626' }}>⚠️ Failed to load onboarding data</p>
        <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="placeholder"><p>No customers in the onboarding queue</p></div>;
  }

  return (
    <div>
      <h2>Onboarding Queue</h2>
      <p style={{ color: '#6b7280', marginBottom: '20px' }}>
        {data.length} customer(s) awaiting onboarding
      </p>

      {data.map(item => (
        <div key={item.customerId} className="customer-card">
          <h3>{item.customerName}</h3>
          <div className="customer-meta">
            <span>📍 {item.customerRegion}</span>
            <span>🏭 {item.customerIndustry}</span>
          </div>

          <div className="progress-section">
            <ProgressBar percent={item.progressPercent} />
            <Checklist steps={item.steps} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ percent }) {
  return (
    <div className="progress-bar-container">
      <div 
        className="progress-bar" 
        style={{ width: `${Math.max(percent, 0)}%` }}
      >
        {percent > 0 ? `${percent}%` : ''}
      </div>
    </div>
  );
}

function Checklist({ steps }) {
  return (
    <ul className="checklist">
      {steps.map(step => (
        <li key={step.id}>
          <span className={`step-status ${step.status}`}>
            {step.status === 'completed' ? '✓' : step.order}
          </span>
          <span>{step.name}</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#9ca3af' }}>
            {step.status.replace('_', ' ')}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CustomerInfoForm({ onCreated }) {
  const [form, setForm] = useState({ name: '', industry: '', region: '', contactEmail: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const entry = await res.json();
      onCreated(entry);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="customer-form" onSubmit={handleSubmit}>
      <h2>Add Customer</h2>
      {error && <p className="form-error">⚠️ {error}</p>}

      <div className="form-field">
        <label htmlFor="name">Name *</label>
        <input id="name" type="text" value={form.name} onChange={update('name')} required />
      </div>
      <div className="form-field">
        <label htmlFor="industry">Industry</label>
        <input id="industry" type="text" value={form.industry} onChange={update('industry')} />
      </div>
      <div className="form-field">
        <label htmlFor="region">Region</label>
        <input id="region" type="text" value={form.region} onChange={update('region')} />
      </div>
      <div className="form-field">
        <label htmlFor="contactEmail">Contact Email</label>
        <input id="contactEmail" type="email" value={form.contactEmail} onChange={update('contactEmail')} />
      </div>

      <button className="form-submit" type="submit" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add to Queue'}
      </button>
    </form>
  );
}

function DataMappingForm({ customers, onUpdated }) {
  const needsMapping = customers.filter(c =>
    c.steps.some(s => s.name === 'Data Mapping' && s.status !== 'completed')
  );

  const [customerId, setCustomerId] = useState('');
  const [mapping, setMapping] = useState({ id: '', name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (field) => (e) => setMapping(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      setError('Select a customer');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapping })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const entry = await res.json();
      onUpdated(entry);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (needsMapping.length === 0) {
    return (
      <div className="placeholder">
        <h2>Data Mapping</h2>
        <p>No customers are awaiting data mapping.</p>
      </div>
    );
  }

  return (
    <form className="customer-form" onSubmit={handleSubmit}>
      <h2>Map Customer Data</h2>
      <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '0.9rem' }}>
        Enter the customer's column header for each platform field.
      </p>
      {error && <p className="form-error">⚠️ {error}</p>}

      <div className="form-field">
        <label htmlFor="mapping-customer">Customer *</label>
        <select
          id="mapping-customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          required
        >
          <option value="">Select a customer…</option>
          {needsMapping.map(c => (
            <option key={c.customerId} value={c.customerId}>{c.customerName}</option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="map-id">Client ID → platform <code>id</code> *</label>
        <input id="map-id" type="text" value={mapping.id} onChange={update('id')}
          placeholder="e.g. Client ID / clientId / client_id" required />
      </div>
      <div className="form-field">
        <label htmlFor="map-name">Client Name → platform <code>name</code> *</label>
        <input id="map-name" type="text" value={mapping.name} onChange={update('name')}
          placeholder="e.g. Client Name / companyName / business_name" required />
      </div>

      <button className="form-submit" type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save Mapping'}
      </button>
    </form>
  );
}

function TenantSetupTab({ customers, onUpdated }) {
  const needsSetup = customers.filter(c =>
    c.steps.some(s => s.name === 'Tenant Setup' && s.status !== 'completed')
  );

  const [customerId, setCustomerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      setError('Select a customer');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenants/${customerId}/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const entry = await res.json();
      onUpdated(entry);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (needsSetup.length === 0) {
    return (
      <div className="placeholder">
        <h2>Tenant Setup</h2>
        <p>No customers are awaiting tenant provisioning.</p>
      </div>
    );
  }

  return (
    <form className="customer-form" onSubmit={handleSubmit}>
      <h2>Provision Tenant</h2>
      <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '0.9rem' }}>
        Creates the customer's tenant and sets it active.
      </p>
      {error && <p className="form-error">⚠️ {error}</p>}

      <div className="form-field">
        <label htmlFor="tenant-customer">Customer *</label>
        <select
          id="tenant-customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          required
        >
          <option value="">Select a customer…</option>
          {needsSetup.map(c => (
            <option key={c.customerId} value={c.customerId}>{c.customerName}</option>
          ))}
        </select>
      </div>

      <button className="form-submit" type="submit" disabled={submitting}>
        {submitting ? 'Provisioning…' : 'Provision Tenant'}
      </button>
    </form>
  );
}

function ImportTab({ customers, onUpdated }) {
  const needsImport = customers.filter(c =>
    c.steps.some(s => s.name === 'Import' && s.status !== 'completed')
  );

  const [customerId, setCustomerId] = useState('');
  const [csv, setCsv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result));
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      setError('Select a customer');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const entry = await res.json();
      onUpdated(entry);
      setSuccess({ rowCount: entry.importSummary.rowCount, percent: entry.progressPercent });
      setCsv('');
      setCustomerId('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="customer-form" onSubmit={handleSubmit}>
      <h2>Import Data</h2>
      <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '0.9rem' }}>
        Paste a customer's CSV export (or choose a file) to import their records.
      </p>
      {error && <p className="form-error">⚠️ {error}</p>}
      {success && (
        <p className="form-success">
          ✓ Imported {success.rowCount} record(s) — customer now at {success.percent}%.
        </p>
      )}

      {needsImport.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No customers are awaiting import.</p>
      ) : (
        <>
          <div className="form-field">
            <label htmlFor="import-customer">Customer *</label>
            <select
              id="import-customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="">Select a customer…</option>
              {needsImport.map(c => (
                <option key={c.customerId} value={c.customerId}>{c.customerName}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="import-file">CSV file (optional)</label>
            <input id="import-file" type="file" accept=".csv,text/csv" onChange={handleFile} />
          </div>

          <div className="form-field">
            <label htmlFor="import-csv">CSV data *</label>
            <textarea
              id="import-csv"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={8}
              placeholder="Client ID,Client Name&#10;1,Acme Corp&#10;2,Globex Inc"
              required
            />
          </div>

          <button className="form-submit" type="submit" disabled={submitting}>
            {submitting ? 'Importing…' : 'Import Data'}
          </button>
        </>
      )}
    </form>
  );
}

function PlaceholderTab({ title, description }) {
  return (
    <div className="placeholder">
      <h2>{title}</h2>
      <p>{description}</p>
      <p style={{ marginTop: '20px', fontSize: '0.9rem' }}>
        🚧 This section is ready to be built
      </p>
    </div>
  );
}

export default App;
