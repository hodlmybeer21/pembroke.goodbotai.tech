// app/property-values/page.tsx — Recent Pembroke home sales compared to the
// town's assessed (tax) value.
//
// The data comes from the town's own property database: recorded sale prices
// from the deed, and the assessed value the town bills property tax against.
// Tyler noticed that some homes were selling under the town's appraised
// value; this page lets anyone check that for themselves.

import { loadPropertyListings, loadPropertyTrends, loadPropertyValues, loadRawListingCount } from "@/lib/property-values";
import { estimatesByAddress, loadPropertyEstimates } from "@/lib/property-estimates";
import { PropertyValueTable } from "@/components/PropertyValueTable";
import { ForSaleListings } from "@/components/ForSaleListings";
import { formatEt } from "@/lib/dates";
import { PropertyTrends } from "@/components/PropertyTrends";
import { ShareButton } from "@/components/ShareButton";

export const revalidate = 86400;

export const metadata = {
  title: "Home sales vs. town assessed value — Pembroke, NH",
  description:
    "Recent Pembroke home sales and current listings compared to the town's assessed property value. See which homes sold under the assessed value the town bills tax against.",
  openGraph: {
    title: "Did it sell under the assessed value? — Pembroke, NH",
    description:
      "Every recent Pembroke home sale next to the town's assessed value, on a map.",
    images: [{ url: "/og-property-values.png", width: 1200, height: 630, alt: "Pembroke home sales vs assessed value" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Home sales vs. town assessed value — Pembroke, NH",
    images: ["/og-property-values.png"],
  },
};

export default function PropertyValuesPage() {
  const data = loadPropertyValues();
  const listings = loadPropertyListings();
  const trends = loadPropertyTrends();

  if (!data || !data.sales?.length) {
    return (
      <div className="container-page">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Home sales vs. town assessed value
        </h1>
        <p className="mt-3 text-stone-600">
          This data hasn&apos;t been loaded yet. The numbers come straight from the{" "}
          <a
            href="https://www.axisgis.com/PembrokeNH/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            town&apos;s property database
          </a>
          .
        </p>
      </div>
    );
  }

  const market = data.sales.filter((s) => s.market_sale);
  const below = market.filter((s) => s.below_assessment);
  const ratios = market
    .map((s) => s.sale_price / s.assessed)
    .sort((a, b) => a - b);
  const medianRatio = ratios.length ? ratios[Math.floor(ratios.length / 2)] : null;
  const biggest = below.length
    ? [...below].sort((a, b) => (a.pct_of_assessed ?? 0) - (b.pct_of_assessed ?? 0))[0]
    : null;

  return (
    <div className="container-page">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Home sales vs. town assessed value
        </h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          {data.sales.length} recent Pembroke home sales, each next to the assessed value the town
          bills property tax against. Tap any row to find it on the map.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ShareButton
            url="/property-values"
            title="Pembroke home sales vs. assessed value"
            body="Recent Pembroke home sales compared to the town's assessed property value — see which sold under the tax assessment."
          />
        </div>
      </header>

      {/* The headline finding, stated plainly. */}
      <div className="mb-6 rounded-lg border border-stone-300 bg-white p-4">
        <p className="text-sm leading-relaxed text-stone-700">
          Of the <strong>{market.length}</strong> arm&apos;s-length sales in the last{" "}
          {data.years_shown} years,{" "}
          <strong className={below.length ? "text-red-700" : "text-green-700"}>
            {below.length} sold for less than the town&apos;s assessed value
          </strong>
          {medianRatio !== null && (
            <>
              . The typical home sold for{" "}
              <strong>{Math.round(medianRatio * 100)}%</strong> of its assessed value.
            </>
          )}
        </p>
        {biggest && (
          <p className="mt-2 text-sm leading-relaxed text-stone-700">
            The furthest under was <strong>{biggest.address}</strong> — sold for{" "}
            {money(biggest.sale_price)} on {fmtDate(biggest.sale_date)} against an assessed value of{" "}
            {money(biggest.assessed)}, {Math.abs(biggest.pct_of_assessed ?? 0).toFixed(0)}% lower.
          </p>
        )}
      </div>

      {trends && <PropertyTrends trends={trends} />}

      <PropertyValueTable
        sales={data.sales}
        generatedAt={new Date(data.generated_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        sourceUrl={data.source_url}
        taxRate={trends?.tax_rate}
        estimates={estimatesByAddress()}
      />

      {(() => {
        const est = loadPropertyEstimates();
        if (!est) return null;
        return (
          <section className="mt-8 rounded-lg border border-stone-200 bg-stone-50 p-5">
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              How the &ldquo;estimated value today&rdquo; column is built
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-700">
              There is no Zestimate on this page. Zillow blocks automated access
              outright, and the only official route to its estimates for a
              public-interest project is an application to their Bridge
              program &mdash; which nobody has applied for.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-700">
              So the estimate is built from the town&apos;s own recorded sales
              instead, and the comparable sales it used are published with
              it. Tap <span className="font-medium">comps</span> on any row to
              see them. {est.method}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-700">
              The pool is {est.pool_size} recent arm&apos;s-length sales in
              Pembroke, the same records the rest of this page uses and for
              the same reason &mdash; a third of recorded sales are family
              transfers, court sales or land deals, and including them
              poisons the market. The median spread between the lowest and
              highest comparable is {est.median_spread_pct}% of the estimate,
              which is wide, and that width is shown on every row rather
              than hidden.
            </p>
            <p className="mt-2 text-xs text-stone-500">
              This is an estimate, not an appraisal, and it is not Zillow&apos;s
              number. For a formal valuation, talk to a licensed appraiser.
              Estimates as of {formatEt(est.generated_at)}.
            </p>
          </section>
        );
      })()}

      <ForSaleListings
        listings={listings?.listings ?? []}
        unmatched={listings?.unmatched_listings ?? []}
        taxRate={trends?.tax_rate}
        generatedAt={listings ? formatEt(listings.generated_at) : ""}
        rawCount={loadRawListingCount()}
        stale={
          listings
            ? Date.now() - new Date(listings.generated_at).getTime() > 3 * 24 * 3600 * 1000
            : false
        }
      />

      <section className="mt-10 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-lg font-semibold text-stone-900">How to read this</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-stone-700">
          <p>
            <strong>Assessed value</strong> is the number the town&apos;s assessor puts on the
            property record. It&apos;s what your property tax is calculated from. It is not a
            prediction of what your house would sell for today, and it only changes when the town
            does its periodic re-assessment.
          </p>
          <p>
            <strong>That&apos;s why this page only shows recent sales.</strong> A house that sold
            in 2005 for $120,000 and is assessed today at $400,000 hasn&apos;t been
            &quot;over-assessed&quot; — the house appreciated and the town finally caught up. Compare
            a sale from the last few years to the current assessment and you&apos;re comparing
            apples to apples.
          </p>
          <p>
            <strong>Some sales aren&apos;t market sales.</strong> Rows marked{" "}
            <span className="tag-pill">transfer</span> were transactions the town&apos;s assessor
            didn&apos;t qualify as arm&apos;s-length — family transfers, court sales, or
            foreclosure. Those aren&apos;t a reflection of what the market will pay, so they&apos;re
            labelled separately.
          </p>
          <p>
            So a house selling below its assessed value isn&apos;t automatically a bargain — and a
            house selling well above it isn&apos;t automatically overvalued. If you&apos; thinking
            about buying or selling, talk to the assessor at the town office (603-485-4747) or a
            local real estate agent for your specific property.
          </p>
        </div>
      </section>
    </div>
  );
}

function money(n: number) {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${months[Number(m) - 1] ?? m} ${Number(d)}, ${y}`;
}
