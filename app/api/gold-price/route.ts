import { NextResponse } from "next/server";

type GoldPricePayload = {
  live: boolean;
  spotPriceUsd: number | null;
  pricePerGramInr: number | null;
  source: string;
  updatedAt: string;
};

const TROY_OUNCE_TO_GRAM = 31.1034768;
const USD_INR_FALLBACK = 83.25;

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : null;
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function buildResponse(
  data: Partial<GoldPricePayload> & Pick<GoldPricePayload, "spotPriceUsd" | "pricePerGramInr">,
): GoldPricePayload {
  return {
    live: data.live ?? true,
    spotPriceUsd: data.spotPriceUsd,
    pricePerGramInr: data.pricePerGramInr,
    source: data.source ?? "Live Market Feed",
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  };
}

async function fetchGoldSpotUsd() {
  const quote = await fetchJson("https://api.gold-api.com/price/XAU");
  const spotPriceUsd = toNumber(quote?.price);

  if (!spotPriceUsd || spotPriceUsd <= 0) {
    throw new Error("Invalid gold spot response");
  }

  return {
    spotPriceUsd,
    updatedAt:
      (typeof quote?.updatedAt === "string" && quote.updatedAt) || new Date().toISOString(),
    source: "gold-api.com",
  };
}

async function fetchUsdInrRate() {
  try {
    const frankfurter = await fetchJson("https://api.frankfurter.app/latest?from=USD&to=INR");
    const rate = toNumber(frankfurter?.rates?.INR);

    if (rate && rate > 0) {
      return {
        rate,
        live: true,
        source: "frankfurter.app",
        updatedAt:
          (typeof frankfurter?.date === "string" && frankfurter.date) || new Date().toISOString(),
      };
    }
  } catch {
    // try secondary provider
  }

  try {
    const openErApi = await fetchJson("https://open.er-api.com/v6/latest/USD");
    const rate = toNumber(openErApi?.rates?.INR);

    if (rate && rate > 0) {
      return {
        rate,
        live: true,
        source: "open.er-api.com",
        updatedAt:
          (typeof openErApi?.time_last_update_utc === "string" && openErApi.time_last_update_utc) ||
          new Date().toISOString(),
      };
    }
  } catch {
    // fall through to fallback rate
  }

  return {
    rate: USD_INR_FALLBACK,
    live: false,
    source: "USD/INR fallback",
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const [gold, fx] = await Promise.all([fetchGoldSpotUsd(), fetchUsdInrRate()]);

    return NextResponse.json(
      buildResponse({
        live: fx.live,
        spotPriceUsd: gold.spotPriceUsd,
        pricePerGramInr: (gold.spotPriceUsd * fx.rate) / TROY_OUNCE_TO_GRAM,
        source: `${gold.source} + ${fx.source}`,
        updatedAt: gold.updatedAt,
      }),
    );
  } catch {
    return NextResponse.json(
      buildResponse({
        live: false,
        spotPriceUsd: null,
        pricePerGramInr: null,
        source: "Not available",
        updatedAt: new Date().toISOString(),
      }),
    );
  }
}
