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
