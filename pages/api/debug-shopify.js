/**
 * Debug Shopify Configuration
 * Helps diagnose Shopify client creation issues
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop } = req.query;

    // Check environment variables
    const envCheck = {
      SHOPIFY_API_KEY: !!process.env.SHOPIFY_API_KEY,
      SHOPIFY_API_SECRET: !!process.env.SHOPIFY_API_SECRET,
      SHOPIFY_SCOPES: !!process.env.SHOPIFY_SCOPES,
      SHOPIFY_APP_URL: !!process.env.SHOPIFY_APP_URL,
      BACKEND_API_URL: !!process.env.BACKEND_API_URL
    };

    // Check token storage
    let tokenStatus = 'No shop provided';
    if (shop) {
      try {
        const { getAccessToken } = await import('../../lib/token-storage');
        const token = getAccessToken(shop);
        tokenStatus = token ? 'Token found' : 'No token found';
      } catch (error) {
        tokenStatus = `Token check error: ${error.message}`;
      }
    }

    // Test Shopify client creation
    let clientStatus = 'Failed to create';
    try {
      const shopify = await import('../../lib/shopify.js');
      clientStatus = 'Successfully created';
    } catch (error) {
      clientStatus = `Client creation error: ${error.message}`;
    }

    // Test shopify-helpers
    let helpersStatus = 'Failed to load';
    if (shop) {
      try {
        const { getShopifyClient } = await import('../../lib/shopify-helpers');
        const client = await getShopifyClient(shop);
        helpersStatus = client ? 'Client created successfully' : 'Client creation returned null';
      } catch (error) {
        helpersStatus = `Helpers error: ${error.message}`;
      }
    }

    res.status(200).json({
      success: true,
      shop: shop || 'not provided',
      environment: envCheck,
      tokenStorage: tokenStatus,
      shopifyClient: clientStatus,
      shopifyHelpers: helpersStatus,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      error: 'Debug failed',
      message: error.message,
      stack: error.stack
    });
  }
}