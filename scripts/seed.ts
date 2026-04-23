/**
 * Seed script — fills DB with test data.
 * Run with: npx ts-node scripts/seed.ts
 * Requires the server to be running on localhost:3000
 */

const BASE = process.env.API_URL ?? 'http://localhost:3000';

async function post(path: string, body: object): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`POST ${path} failed: ${err}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

function monthAgo(n: number): { month: number; year: number } {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function seed() {
  console.log('Seeding database...');

  // ── Clients ──────────────────────────────────────────────────────────────
  const acme = await post('/api/clients', {
    name: 'Acme Corp',
    currency: 'USD',
    defaultRate: 50,
    notes: 'Main US client',
  });
  const beta = await post('/api/clients', {
    name: 'Beta GmbH',
    currency: 'EUR',
    defaultRate: 65,
    notes: 'German client',
  });
  const gama = await post('/api/clients', {
    name: 'Gama UA',
    currency: 'UAH',
    defaultRate: 1500,
  });

  const acmeId = acme['id'] as number;
  const betaId = beta['id'] as number;
  const gamaId = gama['id'] as number;

  // ── Acme Corp invoices (USD, $50/h) ──────────────────────────────────────
  const acme1 = await post('/api/invoices', { clientId: acmeId, ...monthAgo(5), rate: 50, hours: 160 }); // $8000 — fully paid
  const acme2 = await post('/api/invoices', { clientId: acmeId, ...monthAgo(3), rate: 50, hours: 120 }); // $6000 — partial
  const acme3 = await post('/api/invoices', { clientId: acmeId, ...monthAgo(1), rate: 55, hours: 80  }); // $4400 — unpaid

  // Acme payments (client-level, no invoiceId)
  await post('/api/payments', { clientId: acmeId, amount: 8000, paidAt: dateStr(120) });
  await post('/api/payments', { clientId: acmeId, amount: 3000, paidAt: dateStr(60), note: 'First instalment' });
  await post('/api/payments', { clientId: acmeId, amount: 2000, paidAt: dateStr(30), note: 'Second instalment' });
  console.log('  ✓ Acme Corp:', [acme1, acme2, acme3].map(i => i['id']).join(', '));

  // ── Beta GmbH invoices (EUR, €65/h) ──────────────────────────────────────
  const beta1 = await post('/api/invoices', { clientId: betaId, ...monthAgo(4), rate: 65, hours: 88 });  // €5720 — fully paid
  const beta2 = await post('/api/invoices', { clientId: betaId, ...monthAgo(2), rate: 65, hours: 104 }); // €6760 — partial
  const beta3 = await post('/api/invoices', { clientId: betaId, ...monthAgo(0), rate: 65, hours: 40 });  // €2600 — unpaid

  await post('/api/payments', { clientId: betaId, amount: 5720, paidAt: dateStr(95) });
  await post('/api/payments', { clientId: betaId, amount: 3000, paidAt: dateStr(45) });
  console.log('  ✓ Beta GmbH:', [beta1, beta2, beta3].map(i => i['id']).join(', '));

  // ── Gama UA invoices (UAH, ₴1500/h) ──────────────────────────────────────
  const gama1 = await post('/api/invoices', { clientId: gamaId, ...monthAgo(4), rate: 1500, hours: 40 });  // ₴60000 — paid
  const gama2 = await post('/api/invoices', { clientId: gamaId, ...monthAgo(2), rate: 1500, hours: 24 });  // ₴36000 — unpaid

  await post('/api/payments', { clientId: gamaId, amount: 60000, paidAt: dateStr(85) });
  console.log('  ✓ Gama UA:', [gama1, gama2].map(i => i['id']).join(', '));

  console.log('\nDone! Open http://localhost:3000 to see the dashboard.');
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
