"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import Script from "next/script";

type GoldPricePayload = {
  live: boolean;
  spotPriceUsd: number | null;
  pricePerGramInr: number | null;
  source: string;
  updatedAt: string;
};

const HERO_TOTAL_FRAMES = 240;
const HERO_SCROLL_FRAMES = Array.from(
  { length: HERO_TOTAL_FRAMES },
  (_, index) => `/banner-scroll/ezgif-frame-${String(index + 1).padStart(3, "0")}.jpg`,
);

const SITE_URL = (() => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) {
    return "https://itngoldloan.in";
  }
  const withProtocol = configured.startsWith("http://") || configured.startsWith("https://")
    ? configured
    : `https://${configured}`;
  return withProtocol.replace(/\/$/, "");
})();

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "FinancialService",
  name: "ITN GOLD LOAN",
  url: SITE_URL,
  image: `${SITE_URL}/istockphoto-1291330978-612x612.jpg`,
  telephone: "+91 9400081950",
  areaServed: "Thrissur, Kerala, India",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Perincherry",
    addressLocality: "Thrissur",
    addressRegion: "Kerala",
    addressCountry: "IN",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:30",
      closes: "18:00",
    },
  ],
};

function formatRupees(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Home() {
  const [priceData, setPriceData] = useState<GoldPricePayload | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [activeHeroSrc, setActiveHeroSrc] = useState(HERO_SCROLL_FRAMES[0]);
  const [heroScrollProgress, setHeroScrollProgress] = useState(0);
  const [heroFrameStep, setHeroFrameStep] = useState(1);
  const [heroStaticMode, setHeroStaticMode] = useState(false);
  const [heroStageHeight, setHeroStageHeight] = useState(2600);
  const [heroStickyTop, setHeroStickyTop] = useState(0);
  const heroStageRef = useRef<HTMLDivElement | null>(null);
  const heroImagesRef = useRef<(HTMLImageElement | null)[]>(new Array(HERO_TOTAL_FRAMES).fill(null));
  const activeHeroFrameRef = useRef(0);
  const heroMetricsRef = useRef({ stageStart: 0, scrollTravel: 1 });
  const heroLayoutRef = useRef({ stickyTop: 0, stageHeight: 0 });

  const { scrollY } = useScroll();
  const heroProgress = useTransform(scrollY, (latest) => {
    const { stageStart, scrollTravel } = heroMetricsRef.current;
    return Math.min(Math.max((latest - stageStart) / scrollTravel, 0), 1);
  });
  const smoothHeroProgress = useSpring(heroProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.35,
  });

  const [weight, setWeight] = useState(35);
  const [tenure, setTenure] = useState(12);
  const [annualRate, setAnnualRate] = useState(11.5);
  const [ltv, setLtv] = useState(75);
  const [manualPrice, setManualPrice] = useState<number | "">("");

  const findNearestLoadedFrame = useCallback((frameIndex: number): number | null => {
    if (heroImagesRef.current[frameIndex]) {
      return frameIndex;
    }

    for (let offset = 1; offset < HERO_TOTAL_FRAMES; offset += 1) {
      const backward = frameIndex - offset;
      if (backward >= 0 && heroImagesRef.current[backward]) {
        return backward;
      }

      const forward = frameIndex + offset;
      if (forward < HERO_TOTAL_FRAMES && heroImagesRef.current[forward]) {
        return forward;
      }
    }

    return null;
  }, []);

  const applyHeroFrameForProgress = useCallback((progress: number) => {
    if (heroStaticMode) {
      return;
    }

    const bounded = Math.min(Math.max(progress, 0), 1);
    const rawFrameIndex = Math.round(bounded * (HERO_TOTAL_FRAMES - 1));
    const frameStep = Math.max(heroFrameStep, 1);
    const frameIndex = Math.min(
      HERO_TOTAL_FRAMES - 1,
      Math.max(0, Math.round(rawFrameIndex / frameStep) * frameStep),
    );
    const resolvedFrame = findNearestLoadedFrame(frameIndex);

    if (resolvedFrame !== null && resolvedFrame !== activeHeroFrameRef.current) {
      activeHeroFrameRef.current = resolvedFrame;
      setActiveHeroSrc(HERO_SCROLL_FRAMES[resolvedFrame]);
    }

    setHeroScrollProgress((prev) => (Math.abs(prev - bounded) < 0.001 ? prev : bounded));
  }, [findNearestLoadedFrame, heroFrameStep, heroStaticMode]);

  useEffect(() => {
    const revealNodes = document.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.15 },
    );

    revealNodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadPrice = async () => {
      try {
        const res = await fetch("/api/gold-price", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to fetch gold price");
        }
        const data: GoldPricePayload = await res.json();
        if (mounted) {
          setPriceData(data);
        }
      } catch {
        if (mounted) {
          setPriceData({
            live: false,
            spotPriceUsd: null,
            pricePerGramInr: null,
            source: "Not available",
            updatedAt: new Date().toISOString(),
          });
        }
      } finally {
        if (mounted) {
          setLoadingPrice(false);
        }
      }
    };

    loadPrice();
    const interval = setInterval(loadPrice, 60_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    type NetworkConnection = {
      saveData?: boolean;
      effectiveType?: string;
      addEventListener?: (type: "change", listener: () => void) => void;
      removeEventListener?: (type: "change", listener: () => void) => void;
    };
    type NavigatorWithConnection = Navigator & { connection?: NetworkConnection };

    const nav = window.navigator as NavigatorWithConnection;
    const connection = nav.connection;
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileViewportQuery = window.matchMedia("(max-width: 900px)");
    type LegacyMediaQueryList = MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };
    const addMediaListener = (query: MediaQueryList, handler: () => void) => {
      query.addEventListener("change", handler);
      (query as LegacyMediaQueryList).addListener?.(handler);
    };
    const removeMediaListener = (query: MediaQueryList, handler: () => void) => {
      query.removeEventListener("change", handler);
      (query as LegacyMediaQueryList).removeListener?.(handler);
    };

    const applyPerformanceMode = () => {
      const reducedMotion = reducedMotionQuery.matches;
      const saveData = Boolean(connection?.saveData);
      const slowNetwork = /(2g|3g)/i.test(connection?.effectiveType ?? "");
      const mobileViewport = mobileViewportQuery.matches;

      const staticMode = reducedMotion || saveData;
      const frameStep = staticMode ? HERO_TOTAL_FRAMES : mobileViewport || slowNetwork ? 2 : 1;

      setHeroStaticMode(staticMode);
      setHeroFrameStep(frameStep);

      if (staticMode) {
        activeHeroFrameRef.current = 0;
        setActiveHeroSrc(HERO_SCROLL_FRAMES[0]);
        setHeroScrollProgress(0);
      }
    };

    applyPerformanceMode();
    addMediaListener(reducedMotionQuery, applyPerformanceMode);
    addMediaListener(mobileViewportQuery, applyPerformanceMode);
    connection?.addEventListener?.("change", applyPerformanceMode);

    return () => {
      removeMediaListener(reducedMotionQuery, applyPerformanceMode);
      removeMediaListener(mobileViewportQuery, applyPerformanceMode);
      connection?.removeEventListener?.("change", applyPerformanceMode);
    };
  }, []);

  useEffect(() => {
    const isIOS =
      /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    if (!isIOS) {
      return;
    }

    const navEntry = window.performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navEntry?.type !== "reload") {
      return;
    }

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const rafId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      activeHeroFrameRef.current = 0;
      setActiveHeroSrc(HERO_SCROLL_FRAMES[0]);
      setHeroScrollProgress(0);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    const heroStage = heroStageRef.current;
    if (!heroStage) {
      return;
    }

    let rafId = 0;

    const getViewportHeight = () => window.visualViewport?.height ?? window.innerHeight ?? 1;

    const updateHeroMetrics = () => {
      const viewportHeight = getViewportHeight();
      const headerHeight = document.querySelector<HTMLElement>(".site-header")?.offsetHeight ?? 0;
      const frameCount = Math.ceil(HERO_TOTAL_FRAMES / Math.max(heroFrameStep, 1));
      const scrollTravel = heroStaticMode ? 1 : Math.max(frameCount * 8, Math.round(viewportHeight * 1.7));
      const stageHeight = heroStaticMode
        ? Math.max(viewportHeight - headerHeight + 1, viewportHeight * 1.05)
        : Math.max(viewportHeight - headerHeight + scrollTravel, viewportHeight * 1.35);
      const stageTop = heroStage.offsetTop;

      heroMetricsRef.current = {
        stageStart: Math.max(stageTop - headerHeight, 0),
        scrollTravel,
      };

      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      const currentProgress = (currentScrollY - heroMetricsRef.current.stageStart) / heroMetricsRef.current.scrollTravel;
      applyHeroFrameForProgress(currentProgress);

      if (Math.abs(heroLayoutRef.current.stickyTop - headerHeight) > 0.5) {
        heroLayoutRef.current.stickyTop = headerHeight;
        setHeroStickyTop(headerHeight);
      }
      if (Math.abs(heroLayoutRef.current.stageHeight - stageHeight) > 1) {
        heroLayoutRef.current.stageHeight = stageHeight;
        setHeroStageHeight(stageHeight);
      }
    };

    const scheduleMetricsUpdate = () => {
      if (rafId) {
        return;
      }
      rafId = window.requestAnimationFrame(() => {
        updateHeroMetrics();
        rafId = 0;
      });
    };

    const deferredUpdate = window.setTimeout(scheduleMetricsUpdate, 200);
    updateHeroMetrics();
    window.addEventListener("resize", scheduleMetricsUpdate);
    window.addEventListener("orientationchange", scheduleMetricsUpdate);
    window.addEventListener("pageshow", scheduleMetricsUpdate);
    window.visualViewport?.addEventListener("resize", scheduleMetricsUpdate);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.clearTimeout(deferredUpdate);
      window.removeEventListener("resize", scheduleMetricsUpdate);
      window.removeEventListener("orientationchange", scheduleMetricsUpdate);
      window.removeEventListener("pageshow", scheduleMetricsUpdate);
      window.visualViewport?.removeEventListener("resize", scheduleMetricsUpdate);
    };
  }, [applyHeroFrameForProgress, heroFrameStep, heroStaticMode]);

  useEffect(() => {
    let cancelled = false;
    heroImagesRef.current = new Array(HERO_TOTAL_FRAMES).fill(null);

    if (heroStaticMode) {
      const img = new Image();
      img.decoding = "async";
      img.src = HERO_SCROLL_FRAMES[0];
      heroImagesRef.current[0] = img;
      setActiveHeroSrc(HERO_SCROLL_FRAMES[0]);

      return () => {
        cancelled = true;
      };
    }

    HERO_SCROLL_FRAMES.forEach((src, index) => {
      if (index % heroFrameStep !== 0 && index !== HERO_TOTAL_FRAMES - 1) {
        return;
      }

      const img = new Image();
      let committed = false;

      const commitImage = () => {
        if (cancelled || committed) {
          return;
        }
        committed = true;
        heroImagesRef.current[index] = img;

        if (index === 0 && activeHeroFrameRef.current === 0) {
          setActiveHeroSrc(HERO_SCROLL_FRAMES[0]);
        }
      };

      img.decoding = "async";
      img.onload = commitImage;
      img.onerror = () => {
        committed = true;
      };
      img.src = src;
      img.decode?.().then(commitImage).catch(() => {});
    });

    return () => {
      cancelled = true;
    };
  }, [heroFrameStep, heroStaticMode]);

  useMotionValueEvent(smoothHeroProgress, "change", (latest) => {
    applyHeroFrameForProgress(latest);
  });

  const pricePerGram = manualPrice === "" ? (priceData?.pricePerGramInr ?? null) : manualPrice;
  const purityFactor = 1;

  const { eligibleLoan, emi, totalRepayment, totalInterest } = useMemo(() => {
    if (!pricePerGram || pricePerGram <= 0) {
      return {
        eligibleLoan: null,
        emi: null,
        totalRepayment: null,
        totalInterest: null,
      };
    }

    const estimatedLoan = weight * purityFactor * pricePerGram * (ltv / 100);
    const monthlyRate = annualRate / 12 / 100;
    const monthlyEmi =
      monthlyRate === 0
        ? estimatedLoan / tenure
        : (estimatedLoan * monthlyRate * (1 + monthlyRate) ** tenure) /
          ((1 + monthlyRate) ** tenure - 1);
    const repayment = monthlyEmi * tenure;
    return {
      eligibleLoan: estimatedLoan,
      emi: monthlyEmi,
      totalRepayment: repayment,
      totalInterest: repayment - estimatedLoan,
    };
  }, [annualRate, ltv, pricePerGram, tenure, weight]);

  const formatEstimateValue = (value: number | null) =>
    value === null ? "Not available" : formatRupees(value);

  const heroStageStyle = {
    height: `${heroStageHeight}px`,
    "--hero-sticky-top": `${heroStickyTop}px`,
  } as CSSProperties;
  const heroCopyProgress = Math.min(Math.max(heroScrollProgress, 0), 1);
  const heroCopyStyle = {
    opacity: Math.max(1 - heroCopyProgress * 1.25, 0),
    transform: `translate3d(0, ${Math.round(heroCopyProgress * 88)}px, 0) scale(${(1 - heroCopyProgress * 0.08).toFixed(3)})`,
    filter: `blur(${(heroCopyProgress * 1.3).toFixed(2)}px)`,
  } as CSSProperties;

  return (
    <div className="page-shell">
      <Script
        id="financial-service-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <header className="site-header">
        <div className="container header-content">
          <a className="brand" href="#hero">
            ITN GOLD LOAN
          </a>
          <nav className="header-nav">
            <a href="#benefits">Benefits</a>
            <a href="#calculator">EMI Calculator</a>
            <a href="#journey">How It Works</a>
          </nav>
          <div className="gold-pill" aria-live="polite">
            <span className="green-dot" />
            {loadingPrice ? (
              <div className="gold-rate-block">
                <small>Live Gold Price</small>
                <strong>Loading...</strong>
              </div>
            ) : !priceData?.pricePerGramInr ? (
              <div className="gold-rate-block">
                <small>Live Gold Price</small>
                <strong>Not available</strong>
              </div>
            ) : (
              <div className="gold-rate-block">
                <small>Live Gold Price</small>
                <strong>{formatRupees(priceData.pricePerGramInr)} / gm</strong>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        <div
          ref={heroStageRef}
          className={`hero-scroll-stage${heroStaticMode ? " is-static" : ""}`}
          style={heroStageStyle}
        >
          <section id="hero" className="hero section">
            <div className="hero-background" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="hero-bg-image"
                src={activeHeroSrc}
                alt=""
                loading="eager"
                decoding="async"
                draggable={false}
              />
            </div>
            <div className="hero-overlay" aria-hidden="true" />
            <div className="hero-glow orb-1" />
            <div className="hero-glow orb-2" />
            <div className="container hero-grid">
              <div className="hero-copy" style={heroCopyStyle}>
                <p className="eyebrow">Market-Linked Gold Loans</p>
                <h1>
                  Get premium liquidity for your gold with <span>live value protection</span>.
                </h1>
                <p>
                  Built for urgent needs and long-term trust. Walk in with jewellery, leave with a
                  transparent offer, secure custody, and same-day disbursal.
                </p>
                <div className="hero-actions">
                  <a className="btn btn-primary" href="tel:+919400081950">
                    Call Now For Instant Quote
                  </a>
                  <a className="btn btn-ghost" href="#calculator">
                    Check EMI & Eligibility
                  </a>
                </div>
              </div>
            </div>
            {!heroStaticMode && (
              <div className="hero-scroll-meter" aria-hidden="true">
                <div className="hero-scroll-track">
                  <div className="hero-scroll-fill" style={{ transform: `scaleX(${heroScrollProgress})` }} />
                </div>
              </div>
            )}
          </section>
        </div>

        <section id="benefits" className="section benefits">
          <div className="container">
            <div className="section-head reveal">
              <p className="eyebrow">Why Borrowers Choose Us</p>
              <h2>Built for speed, clarity, and confidence.</h2>
            </div>
            <div className="benefit-grid">
              <article className="benefit-card reveal">
                <h3>Live Gold Benchmarking</h3>
                <p>
                  Loan offers adjust dynamically using current market gold values for fair and
                  transparent eligibility.
                </p>
              </article>
              <article className="benefit-card reveal">
                <h3>Secure Vault & Insurance</h3>
                <p>
                  Every pledged ornament is barcoded, sealed, and covered with comprehensive vault
                  insurance.
                </p>
              </article>
              <article className="benefit-card reveal">
                <h3>Flexible Repayment</h3>
                <p>
                  Pay monthly EMI, interest-only with bullet repayment, or close early without
                  hidden foreclosure penalties.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="calculator" className="section calculator">
          <div className="container calculator-grid">
            <div className="calculator-form reveal">
              <p className="eyebrow">Gold Loan EMI Calculator</p>
              <h2>Estimate your EMI in real time</h2>

              <label>
                Gold Weight (grams)
                <input
                  type="number"
                  min={1}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value) || 1)}
                />
              </label>

              <label>
                Purity
                <div className="single-purity">24K</div>
              </label>

              <label>
                Gold Price per Gram (INR)
                <input
                  type="number"
                  min={1}
                  value={manualPrice}
                  placeholder={
                    priceData?.pricePerGramInr ? `${Math.round(priceData.pricePerGramInr)}` : "Not available"
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    setManualPrice(value === "" ? "" : Number(value));
                  }}
                />
              </label>

              <label>
                Tenure: {tenure} months
                <input
                  type="range"
                  min={3}
                  max={36}
                  step={1}
                  value={tenure}
                  onChange={(e) => setTenure(Number(e.target.value))}
                />
              </label>

              <label>
                Interest Rate: {annualRate.toFixed(1)}% p.a.
                <input
                  type="range"
                  min={8}
                  max={24}
                  step={0.1}
                  value={annualRate}
                  onChange={(e) => setAnnualRate(Number(e.target.value))}
                />
              </label>

              <label>
                Loan To Value: {ltv}%
                <input
                  type="range"
                  min={50}
                  max={75}
                  step={1}
                  value={ltv}
                  onChange={(e) => setLtv(Number(e.target.value))}
                />
              </label>
            </div>

            <aside className="result-panel reveal" aria-live="polite">
              <h3>Your Estimate</h3>
              <div className="result-row">
                <span>Eligible Loan Amount</span>
                <strong>{formatEstimateValue(eligibleLoan)}</strong>
              </div>
              <div className="result-row">
                <span>Monthly EMI</span>
                <strong>{formatEstimateValue(emi)}</strong>
              </div>
              <div className="result-row">
                <span>Total Interest</span>
                <strong>{formatEstimateValue(totalInterest)}</strong>
              </div>
              <div className="result-row">
                <span>Total Repayment</span>
                <strong>{formatEstimateValue(totalRepayment)}</strong>
              </div>

              <p className="disclaimer">
                Indicative values only. Final sanction depends on branch valuation, policy checks,
                and KYC.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="tel:+919400081950">
                  Call To Confirm Offer
                </a>
                <a className="btn btn-ghost" href="#journey">
                  View Approval Steps
                </a>
              </div>
            </aside>
          </div>
        </section>

        <section id="journey" className="section journey">
          <div className="container">
            <div className="section-head reveal">
              <p className="eyebrow">How It Works</p>
              <h2>Four steps from gold to funds.</h2>
            </div>
            <div className="timeline">
              <article className="step reveal">
                <span>01</span>
                <h3>Visit Branch</h3>
                <p>Carry basic KYC, and begin secure valuation.</p>
              </article>
              <article className="step reveal">
                <span>02</span>
                <h3>Purity & Weight Assessment</h3>
                <p>Certified appraisers evaluate purity with transparent metrics.</p>
              </article>
              <article className="step reveal">
                <span>03</span>
                <h3>Instant Offer</h3>
                <p>Receive a sanction linked to live market price and selected tenure.</p>
              </article>
              <article className="step reveal">
                <span>04</span>
                <h3>Get Money Same Day</h3>
                <p>Immediate disbursal.</p>
              </article>
            </div>
            <div className="section-head section-cta reveal">
              <p className="eyebrow">Ready To Apply</p>
              <h2>Bring your gold and complete approval in one branch visit.</h2>
              <div className="hero-actions">
                <a className="btn btn-primary" href="tel:+919400081950">
                  Call +91 9400081950
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <h3>ITN GOLD LOAN</h3>
            <p>Offline gold loan services with in-store valuation, secure storage, and same-day disbursal.</p>
          </div>
          <div>
            <h4>Visit Our Store</h4>
            <p>ITN GOLD LOAN, Perincherry, Thrissur, Kerala</p>
            <p>Mon - Sat: 9:30 AM to 6:00 PM</p>
          </div>
          <div>
            <h4>Contact</h4>
            <p>
              <a href="tel:+919400081950">Call Now: +91 9400081950</a>
            </p>
          </div>
        </div>
        <div className="container footer-bottom">
          <p>© {new Date().getFullYear()} ITN GOLD LOAN. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
