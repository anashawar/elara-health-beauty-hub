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
  alternateLanguages?: { lang: string; url: string }[];
}

const SITE_NAME = "ELARA";
const SITE_URL = "https://elarastore.co";
const DEFAULT_TITLE = "ELARA — Iraq's #1 Health & Beauty Store | Skincare, Makeup & More";
const DEFAULT_DESC = "Shop original skincare, makeup, haircare, vitamins & supplements online in Iraq. Brands like CeraVe, The Ordinary, L'Oréal & more. Fast 24h delivery across Iraq. AI-powered skincare advice.";
const DEFAULT_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2aa7786f-71ce-45ec-9e23-10b076ea4ca5/id-preview-d384a627--9bdd477b-18ee-42b7-8219-b2a5905f72d1.lovable.app-1773334186955.png";
const DEFAULT_KEYWORDS = "beauty iraq, skincare iraq, makeup iraq, cosmetics iraq, health products iraq, online beauty store iraq, elara, beauty shop erbil, skincare baghdad, CeraVe iraq, The Ordinary iraq, vitamins iraq, beauty delivery iraq, original cosmetics iraq";

const SEOHead = ({
  title,
  description = DEFAULT_DESC,
  canonical,
  image = DEFAULT_IMAGE,
  type = "website",
  noindex = false,
  jsonLd,
  keywords = DEFAULT_KEYWORDS,
  alternateLanguages,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const url = canonical || (typeof window !== "undefined" ? window.location.href : "");

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {noindex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
      )}
      {url && <link rel="canonical" href={url} />}

      {/* Hreflang alternates */}
      {alternateLanguages?.map(({ lang, url: altUrl }) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={altUrl} />
      ))}
      {url && <link rel="alternate" hrefLang="x-default" href={url} />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
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

      {/* Additional SEO signals */}
      <meta name="author" content="ELARA" />
      <meta name="geo.region" content="IQ" />
      <meta name="geo.placename" content="Erbil, Iraq" />
      <meta name="rating" content="general" />

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

export const SITE_BASE = "https://elarastore.co";

// Reusable JSON-LD builders
export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ELARA",
  url: SITE_BASE,
  logo: `${SITE_BASE}/app-icon.png`,
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
  url: SITE_BASE,
  description: "Iraq's Smart Health & Beauty Marketplace",
  inLanguage: ["en", "ar", "ku"],
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_BASE}/shop?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export const storeJsonLd = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: "ELARA",
  url: SITE_BASE,
  logo: `${SITE_BASE}/app-icon.png`,
  description: "Iraq's premier online health & beauty store",
  currenciesAccepted: "IQD",
  paymentAccepted: "Cash on Delivery",
  areaServed: {
    "@type": "Country",
    name: "Iraq",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Erbil",
    addressRegion: "Kurdistan Region",
    addressCountry: "IQ",
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
  category?: string;
}) {
  const ld: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || product.title,
    image: product.image || "",
    url: `${SITE_BASE}/product/${product.slug}`,
    brand: product.brandName
      ? { "@type": "Brand", name: product.brandName }
      : undefined,
    category: product.category || "Health & Beauty",
    offers: {
      "@type": "Offer",
      url: `${SITE_BASE}/product/${product.slug}`,
      priceCurrency: "IQD",
      price: product.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      availability: product.inStock !== false
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "ELARA" },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "IQ",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "d" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "d" },
        },
      },
    },
  };

  if (product.rating && product.reviewCount) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
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

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function collectionJsonLd(name: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
    isPartOf: { "@type": "WebSite", name: "ELARA", url: SITE_BASE },
  };
}
