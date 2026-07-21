const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('./index');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://localhost:${port}`;
});

after(() => {
  server.close();
});

async function postCustomer(body) {
  const res = await fetch(`${baseUrl}/api/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

describe('POST /api/customers', () => {
  it('creates a customer with the Customer Info step completed at 25%', async () => {
    const { status, data } = await postCustomer({
      name: 'Test Corp',
      industry: 'Tech',
      region: 'EMEA',
      contactEmail: 'hi@test.example.com'
    });

    assert.strictEqual(status, 201);
    assert.strictEqual(data.customerName, 'Test Corp');

    const infoStep = data.steps.find(s => s.name === 'Customer Info');
    assert.strictEqual(infoStep.status, 'completed');
    assert.strictEqual(data.progressPercent, 25);
  });

  it('returns 400 when name is missing', async () => {
    const { status, data } = await postCustomer({ industry: 'Tech' });

    assert.strictEqual(status, 400);
    assert.ok(data.error);
  });
});

async function postMapping(customerId, body) {
  const res = await fetch(`${baseUrl}/api/customers/${customerId}/mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

describe('POST /api/customers/:id/mapping', () => {
  it('saves a mapping, completes the Data Mapping step, and advances to 50%', async () => {
    const created = await postCustomer({ name: 'Mapping Corp' });
    const customerId = created.data.customerId;

    const { status, data } = await postMapping(customerId, {
      mapping: { id: 'Client ID', name: 'Client Name' }
    });

    assert.strictEqual(status, 200);
    const mappingStep = data.steps.find(s => s.name === 'Data Mapping');
    assert.strictEqual(mappingStep.status, 'completed');
    assert.strictEqual(data.progressPercent, 50);
    assert.deepStrictEqual(data.mapping, { id: 'Client ID', name: 'Client Name' });
  });

  it('returns 400 when a required target field is missing', async () => {
    const created = await postCustomer({ name: 'Incomplete Corp' });
    const { status, data } = await postMapping(created.data.customerId, {
      mapping: { id: 'Client ID' }
    });

    assert.strictEqual(status, 400);
    assert.ok(data.error);
  });

  it('returns 404 for an unknown customer', async () => {
    const { status } = await postMapping('cust_does_not_exist', {
      mapping: { id: 'a', name: 'b' }
    });

    assert.strictEqual(status, 404);
  });
});

async function provisionTenant(customerId) {
  const res = await fetch(`${baseUrl}/api/tenants/${customerId}/provision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

describe('POST /api/tenants/:customerId/provision', () => {
  it('provisions a tenant, sets it active, completes Tenant Setup, and advances to 50%', async () => {
    const created = await postCustomer({ name: 'Tenant Corp' });
    const customerId = created.data.customerId;

    const { status, data } = await provisionTenant(customerId);

    assert.strictEqual(status, 200);
    assert.strictEqual(data.tenant.status, 'active');
    assert.strictEqual(data.tenant.customerId, customerId);
    const tenantStep = data.steps.find(s => s.name === 'Tenant Setup');
    assert.strictEqual(tenantStep.status, 'completed');
    assert.strictEqual(data.progressPercent, 50);
  });

  it('returns 404 for an unknown customer', async () => {
    const { status } = await provisionTenant('cust_does_not_exist');
    assert.strictEqual(status, 404);
  });
});
