const db = {
  users: new Map(),
  payments: [],
  failedPayments: [],
  usage: []
};

function currentMonthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getOrCreateUser(userId, tenantId = "default") {
  const key = `${tenantId}:${userId}`;
  const existing = db.users.get(key);
  if (existing) return existing;

  const created = {
    userId,
    tenantId,
    status: "inactive",
    planCode: null,
    creditsBalance: 0,
    creditsUsedCurrentMonth: 0,
    lemonCustomerId: null,
    lemonSubscriptionId: null,
    subscriptionStatus: "none",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  db.users.set(key, created);
  return created;
}

export function saveUser(user) {
  user.updatedAt = new Date().toISOString();
  db.users.set(`${user.tenantId}:${user.userId}`, user);
  return user;
}

export function listUsers() {
  return Array.from(db.users.values());
}

export function addPayment(payment) {
  db.payments.push({ id: db.payments.length + 1, at: new Date().toISOString(), ...payment });
  if (db.payments.length > 2000) db.payments.shift();
}

export function addFailedPayment(payment) {
  db.failedPayments.push({ id: db.failedPayments.length + 1, at: new Date().toISOString(), ...payment });
  if (db.failedPayments.length > 2000) db.failedPayments.shift();
}

export function listPayments() {
  return [...db.payments].reverse();
}

export function listFailedPayments() {
  return [...db.failedPayments].reverse();
}

export function addUsage({ userId, tenantId = "default", credits = 1, source = "voice" }) {
  const month = currentMonthKey();
  db.usage.push({ id: db.usage.length + 1, at: new Date().toISOString(), month, userId, tenantId, credits, source });
  if (db.usage.length > 100_000) db.usage.shift();
}

export function listUsage({ month, tenantId } = {}) {
  return db.usage.filter((u) => (!month || u.month === month) && (!tenantId || u.tenantId === tenantId));
}

export function getMonthlyUsageSummary({ month = currentMonthKey(), tenantId } = {}) {
  const usage = listUsage({ month, tenantId });
  const byUser = new Map();
  for (const row of usage) {
    const key = `${row.tenantId}:${row.userId}`;
    byUser.set(key, (byUser.get(key) || 0) + row.credits);
  }

  return {
    month,
    tenantId: tenantId || null,
    totalCreditsUsed: usage.reduce((acc, row) => acc + row.credits, 0),
    users: Array.from(byUser.entries()).map(([key, creditsUsed]) => {
      const [t, userId] = key.split(":");
      return { tenantId: t, userId, creditsUsed };
    })
  };
}
