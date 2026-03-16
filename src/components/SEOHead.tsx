import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: string;
  noindex?: boolean;
  jsonLd?: Record<string, any> | Record<string, any>[];
  keywords?: string;
}

const SITE_NAME = "ELARA";
const DEFAULT_TITLE = "ELARA — Health & Beauty Store in Iraq";
const DEFAULT_DESC = "Iraq's #1 online health & beauty store. Shop original skincare, makeup, haircare, vitamins & supplements. Brands like CeraVe, The Ordinary, L'Oréal & more. Fast delivery across Iraq.";
const DEFAULT_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2aa7786f-71ce-45ec-9e23-10b076ea4ca5/id-preview-d384a627--9bdd477b-18ee-42b7-8219-b2a5905f72d1.lovable.app-1773334186955.png";
const DEFAULT_KEYWORDS = "beauty iraq, skincare iraq, makeup iraq, cosmetics iraq, health products iraq, online beauty store iraq, elara, beauty shop erbil, skincare baghdad, CeraVe iraq, The Ordinary iraq, vitamins iraq";

const SEOHead = ({
  title,
  description = DEFAULT_DESC,
  canonical,
  image = DEFAULT_IMAGE,
  type = "website",
  noindex = false,
  jsonLd,
  keywords = DEFAULT_KEYWORDS,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const url = canonical || (typeof window !== "undefined" ? window.location.href : "");

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {url && <link rel="canonical" href={url} />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:locale:alternate" content="ar_IQ" />
      <meta property="og:locale:alternate" content="ku_IQ" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;

// Reusable JSON-LD builders
export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ELARA",
  url: "https://elara-health-beauty-hub.lovable.app",
  logo: "https://elara-health-beauty-hub.lovable.app/app-icon.png",
  description: "Iraq's #1 online health & beauty marketplace. Original products, AI-powered skincare, fast delivery.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Erbil",
    addressRegion: "Kurdistan Region",
    addressCountry: "IQ",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+964-750-722-9002",
    contactType: "customer service",
    email: "info@elarastore.co",
    availableLanguage: ["English", "Arabic", "Kurdish"],
  },
  sameAs: [
    "https://instagram.com/elara.iq",
    "https://facebook.com/elara.iq",
  ],
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ELARA",
  url: "https://elara-health-beauty-hub.lovable.app",
  description: "Iraq's Smart Health & Beauty Marketplace",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://elara-health-beauty-hub.lovable.app/shop?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

export function productJsonLd(product: {
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  slug: string;
  brandName?: string;
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
}) {
  const ld: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || product.title,
    image: product.image || "",
    url: `https://elara-health-beauty-hub.lovable.app/product/${product.slug}`,
    brand: product.brandName
      ? { "@type": "Brand", name: product.brandName }
      : undefined,
    offers: {
      "@type": "Offer",
      url: `https://elara-health-beauty-hub.lovable.app/product/${product.slug}`,
      priceCurrency: "IQD",
      price: product.price,
      availability: product.inStock !== false
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "ELARA" },
    },
  };

  if (product.rating && product.reviewCount) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    };
  }

  return ld;
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
