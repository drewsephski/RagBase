#!/usr/bin/env node
/**
 * Create RagBase Pro Stripe catalog (product, price, payment link) and print env vars.
 *
 * Usage:
 *   node scripts/stripe-setup.mjs [--app-url http://localhost:3000] [--write-env]
 *   node scripts/stripe-setup.mjs --price-id price_xxx [--write-env]
 *
 * Requires STRIPE_SECRET_KEY in .env.local / .env, or Stripe CLI logged in.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const appUrlArg = args.includes("--app-url")
  ? args[args.indexOf("--app-url") + 1]
  : null;
const writeEnv = args.includes("--write-env");
const priceIdArg = args.includes("--price-id") ? args[args.indexOf("--price-id") + 1] : null;

const PRODUCT_NAME = "RagBase Pro";
const PRODUCT_METADATA = { app: "ragbase", tier: "pro" };
const PRICE_LOOKUP_KEY = "ragbase_pro_monthly";
const PRICE_AMOUNT_CENTS = 900;

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
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function createStripeClient(apiKey) {
  function stripeJson(commandArgs) {
    const prefix = apiKey ? `STRIPE_API_KEY=${apiKey} ` : "";
    const output = execSync(`${prefix}stripe ${commandArgs}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return JSON.parse(output);
  }

  return {
    findProduct() {
      const list = stripeJson("products list --limit 100");
      return (
        list.data.find(
          (product) =>
            product.name === PRODUCT_NAME &&
            product.metadata?.app === PRODUCT_METADATA.app &&
            product.metadata?.tier === PRODUCT_METADATA.tier,
        ) ?? null
      );
    },

    findPrice(productId) {
      const list = stripeJson(`prices list --product ${productId} --limit 20`);
      return (
        list.data.find(
          (price) =>
            price.lookup_key === PRICE_LOOKUP_KEY &&
            price.recurring?.interval === "month" &&
            price.unit_amount === PRICE_AMOUNT_CENTS,
        ) ?? null
      );
    },

    findPaymentLink() {
      const list = stripeJson("payment_links list --limit 100");
      return (
        list.data.find(
          (link) =>
            link.active &&
            link.metadata?.app === PRODUCT_METADATA.app &&
            link.metadata?.tier === PRODUCT_METADATA.tier,
        ) ?? null
      );
    },

    retrievePrice(priceId) {
      return stripeJson(`prices retrieve ${priceId}`);
    },

    createProduct() {
      const metadata = Object.entries(PRODUCT_METADATA)
        .map(([key, value]) => `-d metadata[${key}]=${value}`)
        .join(" ");
      return stripeJson(
        `products create --name="${PRODUCT_NAME}" -d "description=Full-site crawling, expanded source limits, and Pro workspace recovery." ${metadata}`,
      );
    },

    createPrice(productId) {
      return stripeJson(
        `prices create --product=${productId} --unit-amount=${PRICE_AMOUNT_CENTS} --currency=usd --lookup-key=${PRICE_LOOKUP_KEY} -d "recurring[interval]=month" -d "metadata[app]=ragbase"`,
      );
    },

    createPaymentLink(priceId, successUrl) {
      return stripeJson(
        `payment_links create -d "line_items[0][price]=${priceId}" -d "line_items[0][quantity]=1" -d "after_completion[type]=redirect" -d "after_completion[redirect][url]=${successUrl}" -d "metadata[app]=ragbase" -d "metadata[tier]=pro" -d "allow_promotion_codes=false"`,
      );
    },

    ensurePortalReturnUrl(returnUrl) {
      const configs = stripeJson("billing_portal configurations list --limit 5");
      const active = configs.data.find((config) => config.active);
      if (active?.default_return_url === returnUrl) {
        return active.id;
      }
      if (active && !active.default_return_url) {
        stripeJson(
          `billing_portal configurations update ${active.id} --default-return-url="${returnUrl}"`,
        );
        return active.id;
      }
      return active?.id ?? null;
    },
  };
}

function mergeEnvLocal(updates) {
  const cwd = process.cwd();
  const base = {
    ...parseEnvFile(join(cwd, ".env")),
    ...parseEnvFile(join(cwd, ".env.local")),
  };
  const merged = { ...base, ...updates };
  const lines = Object.entries(merged)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${value}`);
  writeFileSync(join(cwd, ".env.local"), `${lines.join("\n")}\n`);
}

function main() {
  const env = {
    ...parseEnvFile(join(process.cwd(), ".env")),
    ...parseEnvFile(join(process.cwd(), ".env.local")),
  };
  const apiKey = env.STRIPE_SECRET_KEY?.trim() || null;
  const stripe = createStripeClient(apiKey);

  const appUrl = (appUrlArg ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const successUrl = `${appUrl}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const returnUrl = `${appUrl}/app`;

  console.log(`\nRagBase Pro Stripe setup (${appUrl})\n`);

  let product;
  let price;

  if (priceIdArg) {
    price = stripe.retrievePrice(priceIdArg);
    const productId = typeof price.product === "string" ? price.product : price.product?.id;
    if (!productId) {
      throw new Error(`Price ${priceIdArg} has no linked product.`);
    }
    product = { id: productId };
    console.log(`✓ Using existing price: ${price.id} ($${(price.unit_amount ?? 0) / 100}/mo)`);
    console.log(`✓ Linked product: ${product.id}`);
  } else {
    product = stripe.findProduct();
    if (product) {
      console.log(`✓ Product exists: ${product.id}`);
    } else {
      product = stripe.createProduct();
      console.log(`+ Created product: ${product.id}`);
    }

    price = stripe.findPrice(product.id);
    if (price) {
      console.log(`✓ Price exists: ${price.id} ($${PRICE_AMOUNT_CENTS / 100}/mo)`);
    } else {
      price = stripe.createPrice(product.id);
      console.log(`+ Created price: ${price.id}`);
    }
  }

  let paymentLink = stripe.findPaymentLink();
  if (paymentLink) {
    console.log(`✓ Payment link exists: ${paymentLink.url}`);
  } else {
    paymentLink = stripe.createPaymentLink(price.id, successUrl);
    console.log(`+ Created payment link: ${paymentLink.url}`);
  }

  const portalId = stripe.ensurePortalReturnUrl(returnUrl);
  if (portalId) {
    console.log(`✓ Billing portal return URL: ${returnUrl}`);
  }

  const envUpdates = {
    NEXT_PUBLIC_APP_URL: appUrl,
    NEXT_PUBLIC_PRO_PRICE_DISPLAY: "$9 a month",
    STRIPE_PRO_PRODUCT_ID: product.id,
    STRIPE_PRO_PRICE_ID: price.id,
    NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL: paymentLink.url,
    NEXT_PUBLIC_STRIPE_SUCCESS_URL: successUrl,
    NEXT_PUBLIC_STRIPE_CANCEL_URL: `${appUrl}/app?checkout=cancel`,
  };

  console.log("\nAdd to .env.local:\n");
  for (const [key, value] of Object.entries(envUpdates)) {
    console.log(`${key}=${value}`);
  }

  console.log("\nWhen webhooks are verified, enable checkout:");
  console.log("NEXT_PUBLIC_BILLING_ENABLED=true");
  console.log("\nLocal webhook forwarding:");
  console.log(`stripe listen --forward-to ${appUrl}/api/webhooks/stripe`);

  if (writeEnv) {
    mergeEnvLocal(envUpdates);
    console.log("\n✓ Merged into .env.local (billing flag left off — enable manually)");
  }
}

main();
