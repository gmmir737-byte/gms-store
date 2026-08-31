import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const handler: Handler = async (event) => {
  try {
    const domain = event.headers.host ? `https://${event.headers.host}` : 'https://gms-store.netlify.app';

    // Fetch categories
    const { data: categories } = await supabase
      .from('categories')
      .select('slug');

    // Fetch active products
    const { data: products } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('status', 'active');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    const staticPages = [
      { url: '/', priority: '1.0' },
      { url: '/shop', priority: '0.9' },
      { url: '/categories', priority: '0.8' },
      { url: '/about', priority: '0.7' },
      { url: '/contact', priority: '0.7' },
    ];

    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${domain}${page.url}</loc>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Category pages
    if (categories) {
      for (const cat of categories) {
        xml += `  <url>\n`;
        xml += `    <loc>${domain}/shop?category=${cat.slug}</loc>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    // Product pages
    if (products) {
      for (const product of products) {
        xml += `  <url>\n`;
        xml += `    <loc>${domain}/product/${product.slug}</loc>\n`;
        xml += `    <lastmod>${new Date(product.updated_at).toISOString()}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    xml += `</urlset>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
      body: xml,
    };
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return {
      statusCode: 500,
      body: 'Error generating sitemap',
    };
  }
};
