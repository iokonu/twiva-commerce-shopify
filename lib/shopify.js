import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';

if (typeof window === 'undefined') {
  require('@shopify/shopify-api/adapters/node');
}

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
  hostName: process.env.SHOPIFY_APP_URL?.replace(/https?:\/\//, '') || '',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
});

export default shopify;
