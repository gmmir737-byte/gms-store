import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useSettings } from '../../contexts/SettingsContext';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  jsonLd?: Record<string, any>;
}

export function SEO({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  noindex = false,
  jsonLd,
}: SEOProps) {
  const { settings } = useSettings();

  const storeName = settings.store_name || "Azhar's Store";
  const defaultTitle = settings.meta_title || `${storeName} - Online Shopping`;
  const defaultDescription =
    settings.meta_description ||
    `${storeName} - Your trusted destination for quality products at unbeatable prices.`;
  const defaultImage = settings.favicon_url || '/vite.svg';
  const defaultUrl = window.location.origin;

  const seo = {
    title: title ? `${title} | ${storeName}` : defaultTitle,
    description: description || defaultDescription,
    keywords: keywords || settings.meta_keywords || 'ecommerce, online shopping',
    image: image || defaultImage,
    url: url ? `${defaultUrl}${url}` : `${defaultUrl}${window.location.pathname}`,
  };

  return (
    <Helmet>
      {/* Basic HTML Meta Tags */}
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      {seo.keywords && <meta name="keywords" content={seo.keywords} />}
      <link rel="canonical" href={seo.url} />

      {/* Robots Control */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={seo.url} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:image" content={seo.image} />
      <meta property="og:site_name" content={storeName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={seo.url} />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.image} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
