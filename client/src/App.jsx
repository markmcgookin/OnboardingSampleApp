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
        <h1>Onboarding Dashboard</h1>
        <p>Customer Success Team - Internal Tool</p>
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
          <PlaceholderTab title="Import" description="Import customer data into the platform" />
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
