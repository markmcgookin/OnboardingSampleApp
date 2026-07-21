const express = require('express');
const cors = require('cors');
const store = require('./data/store');
const {
  createCustomer,
  createTenant,
  createDefaultOnboardingSteps,
  calculateProgress
} = require('./models');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all customers
app.get('/api/customers', (req, res) => {
  res.json(store.getCustomers());
});

// Create a customer (Customer Info step auto-completed)
app.post('/api/customers', (req, res) => {
  const { name, industry, region, contactEmail } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const customer = createCustomer({ name: name.trim(), industry, region, contactEmail });

  const steps = createDefaultOnboardingSteps();
  const infoStep = steps.find(s => s.name === 'Customer Info');
  infoStep.status = 'completed';

  const onboardingState = {
    customerId: customer.id,
    steps,
    progressPercent: calculateProgress(steps)
  };

  store.addCustomer(customer);
  store.addOnboardingState(onboardingState);

  res.status(201).json({
    ...onboardingState,
    customerName: customer.name,
    customerIndustry: customer.industry,
    customerRegion: customer.region
  });
});

// Save a data mapping (Data Mapping step completed)
const REQUIRED_MAPPING_FIELDS = ['id', 'name'];

app.post('/api/customers/:id/mapping', (req, res) => {
  const state = store.getOnboardingState(req.params.id);
  if (!state) {
    return res.status(404).json({ error: 'Onboarding state not found' });
  }

  const { mapping } = req.body || {};
  const missing = REQUIRED_MAPPING_FIELDS.filter(
    field => !mapping || !mapping[field] || !String(mapping[field]).trim()
  );
  if (missing.length > 0) {
    return res.status(400).json({ error: `mapping is missing required field(s): ${missing.join(', ')}` });
  }

  const steps = state.steps.map(step =>
    step.name === 'Data Mapping' ? { ...step, status: 'completed' } : step
  );

  const updated = store.updateOnboardingState(req.params.id, {
    steps,
    mapping,
    progressPercent: calculateProgress(steps)
  });

  const customer = store.getCustomerById(req.params.id);
  res.status(200).json({
    ...updated,
    customerName: customer?.name || 'Unknown',
    customerIndustry: customer?.industry || '',
    customerRegion: customer?.region || ''
  });
});

// Import customer data from CSV text (Import step completed)
app.post('/api/customers/:id/import', (req, res) => {
  const state = store.getOnboardingState(req.params.id);
  if (!state) {
    return res.status(404).json({ error: 'Onboarding state not found' });
  }

  const { csv } = req.body || {};
  const lines = (typeof csv === 'string' ? csv : '')
    .split('\n')
    .map(line => line.replace(/\r$/, '').trim())
    .filter(line => line.length > 0);

  if (lines.length < 2) {
    return res.status(400).json({ error: 'csv must have a header row and at least one data row' });
  }

  const columns = lines[0].split(',');
  const importSummary = {
    rowCount: lines.length - 1,
    columnCount: columns.length,
    columns,
    importedAt: new Date().toISOString()
  };

  const steps = state.steps.map(step =>
    step.name === 'Import' ? { ...step, status: 'completed' } : step
  );

  const updated = store.updateOnboardingState(req.params.id, {
    steps,
    importSummary,
    progressPercent: calculateProgress(steps)
  });

  const customer = store.getCustomerById(req.params.id);
  res.status(200).json({
    ...updated,
    customerName: customer?.name || 'Unknown',
    customerIndustry: customer?.industry || '',
    customerRegion: customer?.region || ''
  });
});

// Get customer by ID
app.get('/api/customers/:id', (req, res) => {
  const customer = store.getCustomerById(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json(customer);
});

// Get onboarding state for a customer
app.get('/api/customers/:id/onboarding', (req, res) => {
  const state = store.getOnboardingState(req.params.id);
  if (!state) {
    return res.status(404).json({ error: 'Onboarding state not found' });
  }
  res.json(state);
});

// Get all onboarding states (dashboard view)
app.get('/api/onboarding', (req, res) => {
  const states = store.getAllOnboardingStates();
  const customers = store.getCustomers();
  
  // Join customer info with onboarding state
  const dashboard = states.map(state => {
    const customer = customers.find(c => c.id === state.customerId);
    return {
      ...state,
      customerName: customer?.name || 'Unknown',
      customerIndustry: customer?.industry || '',
      customerRegion: customer?.region || ''
    };
  });
  
  res.json(dashboard);
});

// Get tenant by customer ID
app.get('/api/tenants/:customerId', (req, res) => {
  const tenant = store.getTenantByCustomerId(req.params.customerId);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  res.json(tenant);
});

// Provision a customer's tenant (Tenant Setup step completed)
app.post('/api/tenants/:customerId/provision', (req, res) => {
  const customerId = req.params.customerId;
  const state = store.getOnboardingState(customerId);
  if (!state) {
    return res.status(404).json({ error: 'Onboarding state not found' });
  }

  let tenant = store.getTenantByCustomerId(customerId);
  if (!tenant) {
    tenant = store.addTenant(createTenant({ customerId }));
  }
  tenant.status = 'active';

  const steps = state.steps.map(step =>
    step.name === 'Tenant Setup' ? { ...step, status: 'completed' } : step
  );

  const updated = store.updateOnboardingState(customerId, {
    steps,
    progressPercent: calculateProgress(steps)
  });

  const customer = store.getCustomerById(customerId);
  res.status(200).json({
    ...updated,
    customerName: customer?.name || 'Unknown',
    customerIndustry: customer?.industry || '',
    customerRegion: customer?.region || '',
    tenant
  });
});

// Start server (only when run directly, not when imported for tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Onboarding API server running at http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
