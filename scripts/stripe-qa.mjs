#!/usr/bin/env node
/**
 * Local Stripe billing QA (phase 6c).
 * Starts stripe listen, requires dev server on BASE_URL (restart after .env.local write).
 *
 * Usage: node scripts/stripe-qa.mjs [--base-url http://localhost:3000] [--skip-listen]
 */

import { execSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const BASE_URL = process.argv.includes("--base-url")
  ? process.argv[process.argv.indexOf("--base-url") + 1]
  : "http://localhost:3000";
const SKIP_LISTEN = process.argv.includes("--skip-listen");

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`❌ ${name}${detail ? ` — ${detail}` : ""}`);
}

function skip(name, detail) {
  results.push({ name, ok: null, detail });
  console.log(`⏭️  ${name}${detail ? ` — ${detail}` : ""}`);
}

function parseEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function readStripeTestKey() {
  const configPath = join(homedir(), ".config/stripe/config.toml");
  if (!existsSync(configPath)) {
    throw new Error("Stripe CLI config not found. Run `stripe login`.");
  }
  const content = readFileSync(configPath, "utf8");
  const match = content.match(/test_mode_api_key\s*=\s*"([^"]+)"/);
  if (!match?.[1]) {
    throw new Error("No test_mode_api_key in Stripe CLI config.");
  }
  return match[1];
}

function writeEnvLocal(baseEnv, extras) {
  const merged = { ...baseEnv, ...extras };
  const lines = Object.entries(merged)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${v}`);
  writeFileSync(join(process.cwd(), ".env.local"), `${lines.join("\n")}\n`);
}

async function fetchJson(path, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, options);
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { status: response.status, body };
  } catch (error) {
    return {
      status: 0,
      body: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function workspaceHeaders(id, secret) {
  return {
    "Content-Type": "application/json",
    "X-Workspace-Id": id,
    "X-Workspace-Secret": secret,
  };
}

async function waitFor(fn, timeoutMs = 60_000, intervalMs = 2000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await fn()) {
      return true;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

function startStripeListen(webhookSecretHolder) {
  const child = spawn(
    "stripe",
    ["listen", "--forward-to", `${BASE_URL}/api/webhooks/stripe`, "--print-secret"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        reject(new Error("stripe listen did not print secret within 15s"));
      }
    }, 15_000);

    const onData = (chunk) => {
      const text = chunk.toString();
      const match = text.match(/whsec_[a-zA-Z0-9]+/);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        webhookSecretHolder.secret = match[0];
        resolve(child);
      }
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (!resolved) {
        reject(new Error(`stripe listen exited with code ${code}`));
      }
    });
  });
}

async function createTestSubscription(stripeSecret, configuredPriceId) {
  const stripe = new Stripe(stripeSecret);
  const customer = await stripe.customers.create({ metadata: { source: "stripe-qa" } });
  let priceId = configuredPriceId?.trim() || null;
  if (!priceId) {
    const price = await stripe.prices.create({
      unit_amount: 900,
      currency: "usd",
      recurring: { interval: "month" },
      product_data: { name: "RagBase Pro QA" },
    });
    priceId = price.id;
  }
  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: { token: "tok_visa" },
  });
  await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: paymentMethod.id },
  });
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
  });
  return {
    stripe,
    customerId: customer.id,
    subscriptionId: subscription.id,
  };
}

async function sendCheckoutCompletedWebhook({
  stripeSecret,
  webhookSecret,
  workspaceId,
  customerId,
  subscriptionId,
}) {
  const stripe = new Stripe(stripeSecret);
  const payload = JSON.stringify({
    id: `evt_qa_${Date.now()}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_qa_${Date.now()}`,
        object: "checkout.session",
        mode: "subscription",
        client_reference_id: workspaceId,
        customer: customerId,
        subscription: subscriptionId,
      },
    },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });
  const response = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": signature,
    },
    body: payload,
  });
  const body = await response.text();
  return { status: response.status, body };
}

async function sendSignedWebhookEvent({
  stripeSecret,
  webhookSecret,
  type,
  objectPayload,
}) {
  const stripe = new Stripe(stripeSecret);
  const payload = JSON.stringify({
    id: `evt_qa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    object: "event",
    type,
    data: { object: objectPayload },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });
  const response = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": signature,
    },
    body: payload,
  });
  return { status: response.status, body: await response.text() };
}

async function getWorkspaceSubscriptionId(supabaseUrl, serviceKey, workspaceId) {
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from("workspaces")
    .select("stripe_subscription_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.stripe_subscription_id ?? null;
}

async function main() {
  console.log(`\nStripe QA — ${BASE_URL}\n`);

  const baseEnv = {
    ...parseEnvFile(join(process.cwd(), ".env")),
    ...parseEnvFile(join(process.cwd(), ".env.local")),
  };
  if (!baseEnv.SUPABASE_SERVICE_ROLE_KEY || !baseEnv.NEXT_PUBLIC_SUPABASE_URL) {
    fail("Env: Supabase configured", "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in .env");
    printSummary();
    process.exit(1);
  }
  pass("Env: Supabase configured");

  let stripeSecret;
  try {
    stripeSecret = readStripeTestKey();
    pass("Env: Stripe CLI test key");
  } catch (error) {
    fail("Env: Stripe CLI test key", error instanceof Error ? error.message : String(error));
    printSummary();
    process.exit(1);
  }

  const recoveryPepper =
    baseEnv.RECOVERY_TOKEN_PEPPER ||
    execSync("openssl rand -hex 32", { encoding: "utf8" }).trim();

  const webhookSecretHolder = { secret: baseEnv.STRIPE_WEBHOOK_SECRET?.trim() || null };
  let listenProcess = null;

  if (!SKIP_LISTEN && !webhookSecretHolder.secret) {
    try {
      listenProcess = await startStripeListen(webhookSecretHolder);
      pass("Stripe listen started", webhookSecretHolder.secret?.slice(0, 12) + "…");
    } catch (error) {
      fail("Stripe listen started", error instanceof Error ? error.message : String(error));
      printSummary();
      process.exit(1);
    }
  } else if (webhookSecretHolder.secret) {
    pass("Stripe webhook secret", "from env");
  } else {
    fail("Stripe webhook secret", "missing — run stripe listen --print-secret or omit --skip-listen");
    printSummary();
    process.exit(1);
  }

  if (!SKIP_LISTEN || !baseEnv.STRIPE_SECRET_KEY) {
    writeEnvLocal(parseEnvFile(join(process.cwd(), ".env")), {
      ...parseEnvFile(join(process.cwd(), ".env.local")),
      STRIPE_SECRET_KEY: stripeSecret,
      STRIPE_WEBHOOK_SECRET: webhookSecretHolder.secret ?? "",
      STRIPE_WEBHOOKS_ENABLED: "true",
      RECOVERY_TOKEN_PEPPER: recoveryPepper,
    });
    pass("Env: wrote .env.local (restart dev server if it was already running)");
  } else {
    pass("Env: using existing .env.local");
  }

  const health = await fetchJson("/");
  if (health.status >= 500) {
    fail(
      "Dev server healthy",
      `HTTP ${health.status} — run: rm -rf .next && npm run dev (after .env.local write)`,
    );
    cleanup(listenProcess);
    printSummary();
    process.exit(1);
  }
  pass("Dev server healthy", `HTTP ${health.status}`);

  const webhookProbe = await fetchJson("/api/webhooks/stripe", {
    method: "POST",
    body: "{}",
  });
  if (webhookProbe.status === 503) {
    fail("Webhooks enabled", "503 — dev server needs restart to pick up STRIPE_WEBHOOKS_ENABLED=true");
    cleanup(listenProcess);
    printSummary();
    process.exit(1);
  }
  pass("Webhooks enabled", `probe HTTP ${webhookProbe.status}`);

  const create = await fetchJson("/api/workspaces", { method: "POST", body: "{}" });
  if (create.status !== 200 || !create.body?.workspaceId) {
    fail("Create test workspace", `HTTP ${create.status} ${JSON.stringify(create.body)}`);
    cleanup(listenProcess);
    printSummary();
    process.exit(1);
  }

  const workspaceId = create.body.workspaceId;
  let workspaceSecret = create.body.workspaceSecret;
  pass("Create test workspace", workspaceId);

  let testSubscription = null;
  try {
    testSubscription = await createTestSubscription(stripeSecret, baseEnv.STRIPE_PRO_PRICE_ID);
    pass("Stripe test subscription created", testSubscription.subscriptionId);
  } catch (error) {
    fail("Stripe test subscription created", error instanceof Error ? error.message : String(error));
  }

  if (testSubscription) {
    try {
      const webhookResult = await sendCheckoutCompletedWebhook({
        stripeSecret,
        webhookSecret: webhookSecretHolder.secret,
        workspaceId,
        customerId: testSubscription.customerId,
        subscriptionId: testSubscription.subscriptionId,
      });
      if (webhookResult.status === 200) {
        pass("Signed checkout.session.completed webhook", `HTTP ${webhookResult.status}`);
      } else {
        fail(
          "Signed checkout.session.completed webhook",
          `HTTP ${webhookResult.status} ${webhookResult.body}`,
        );
      }
    } catch (error) {
      fail(
        "Signed checkout.session.completed webhook",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const proActivated = await waitFor(async () => {
    const sub = await fetchJson("/api/workspaces/subscription", {
      headers: workspaceHeaders(workspaceId, workspaceSecret),
    });
    return sub.status === 200 && sub.body?.isProActive === true;
  });

  if (proActivated) {
    const sub = await fetchJson("/api/workspaces/subscription", {
      headers: workspaceHeaders(workspaceId, workspaceSecret),
    });
    pass(
      "Webhook activates Pro",
      `plan=${sub.body?.plan}, status=${sub.body?.stripeSubscriptionStatus}`,
    );
  } else {
    fail("Webhook activates Pro", "subscription still free after 60s");
  }

  const subscriptionId = proActivated
    ? await getWorkspaceSubscriptionId(
        baseEnv.NEXT_PUBLIC_SUPABASE_URL,
        baseEnv.SUPABASE_SERVICE_ROLE_KEY,
        workspaceId,
      )
    : null;

  const recovery = await fetchJson("/api/workspaces/recovery-link", {
    method: "POST",
    headers: workspaceHeaders(workspaceId, workspaceSecret),
  });

  if (recovery.status === 200 && recovery.body?.url) {
    pass("Recovery link generation");
    const token = new URL(recovery.body.url).searchParams.get("token");
    if (token) {
      const oldSecret = workspaceSecret;
      const exchange = await fetchJson("/api/workspaces/recover", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      if (exchange.status === 200 && exchange.body?.workspaceSecret) {
        workspaceSecret = exchange.body.workspaceSecret;
        if (workspaceSecret !== oldSecret) {
          pass("Recovery exchange rotates secret");
        } else {
          fail("Recovery exchange rotates secret", "unchanged");
        }
      } else {
        fail("Recovery exchange", `HTTP ${exchange.status}`);
      }

      const bad = await fetchJson("/api/workspaces/recover", {
        method: "POST",
        body: JSON.stringify({ token: "not-a-valid-recovery-token" }),
      });
      if (bad.status === 401 || bad.status === 400) {
        pass("Recovery invalid token rejected", `HTTP ${bad.status}`);
      } else {
        fail("Recovery invalid token rejected", `HTTP ${bad.status}`);
      }
    }
  } else {
    fail("Recovery link generation", `HTTP ${recovery.status}`);
  }

  if (proActivated) {
    const portal = await fetchJson("/api/billing/portal", {
      method: "POST",
      headers: workspaceHeaders(workspaceId, workspaceSecret),
    });
    if (portal.status === 200 && portal.body?.url) {
      pass("Billing portal session", portal.body.url.includes("stripe.com") ? "Stripe URL" : portal.body.url);
    } else {
      fail("Billing portal session", `HTTP ${portal.status} ${JSON.stringify(portal.body)}`);
    }
  }

  if (subscriptionId) {
    try {
      const invoiceEvent = await sendSignedWebhookEvent({
        stripeSecret,
        webhookSecret: webhookSecretHolder.secret,
        type: "invoice.payment_failed",
        objectPayload: {
          id: `in_qa_${Date.now()}`,
          object: "invoice",
          parent: {
            subscription_details: {
              subscription: subscriptionId,
            },
          },
        },
      });
      if (invoiceEvent.status === 200) {
        pass("Signed invoice.payment_failed webhook", subscriptionId);
      } else {
        fail(
          "Signed invoice.payment_failed webhook",
          `HTTP ${invoiceEvent.status} ${invoiceEvent.body}`,
        );
      }
      await new Promise((r) => setTimeout(r, 2000));
      const sub = await fetchJson("/api/workspaces/subscription", {
        headers: workspaceHeaders(workspaceId, workspaceSecret),
      });
      if (sub.body?.stripeSubscriptionStatus === "past_due" && sub.body?.isProActive) {
        pass("Past due grace keeps Pro active");
      } else {
        fail(
          "Past due grace keeps Pro active",
          `status=${sub.body?.stripeSubscriptionStatus}, isProActive=${sub.body?.isProActive}`,
        );
      }
    } catch (error) {
      fail("Signed invoice.payment_failed webhook", error instanceof Error ? error.message : String(error));
    }

    try {
      const deleteEvent = await sendSignedWebhookEvent({
        stripeSecret,
        webhookSecret: webhookSecretHolder.secret,
        type: "customer.subscription.deleted",
        objectPayload: {
          id: subscriptionId,
          object: "subscription",
          status: "canceled",
        },
      });
      if (deleteEvent.status === 200) {
        pass("Signed customer.subscription.deleted webhook", subscriptionId);
      } else {
        fail(
          "Signed customer.subscription.deleted webhook",
          `HTTP ${deleteEvent.status} ${deleteEvent.body}`,
        );
      }
      await new Promise((r) => setTimeout(r, 2000));
      const sub = await fetchJson("/api/workspaces/subscription", {
        headers: workspaceHeaders(workspaceId, workspaceSecret),
      });
      if (sub.body?.isProActive === false) {
        pass("Subscription cancel downgrades workspace");
      } else {
        fail(
          "Subscription cancel downgrades workspace",
          `plan=${sub.body?.plan}, isProActive=${sub.body?.isProActive}`,
        );
      }
    } catch (error) {
      fail("Cancel subscription", error instanceof Error ? error.message : String(error));
    }
  } else {
    skip("Past due / cancel tests", "no subscription id");
  }

  const billingOff = parseEnvFile(join(process.cwd(), ".env.local"));
  if (billingOff.NEXT_PUBLIC_BILLING_ENABLED !== "true") {
    pass("Flags off: NEXT_PUBLIC_BILLING_ENABLED not true");
  } else {
    fail("Flags off: NEXT_PUBLIC_BILLING_ENABLED not true", "billing flag is on");
  }

  cleanup(listenProcess);
  printSummary();
  process.exit(results.some((r) => r.ok === false) ? 1 : 0);
}

function cleanup(listenProcess) {
  if (listenProcess && !listenProcess.killed) {
    listenProcess.kill("SIGTERM");
  }
}

function printSummary() {
  const passed = results.filter((r) => r.ok === true).length;
  const failed = results.filter((r) => r.ok === false).length;
  const skipped = results.filter((r) => r.ok === null).length;
  console.log(`\n--- Summary: ${passed} passed, ${failed} failed, ${skipped} skipped ---\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
