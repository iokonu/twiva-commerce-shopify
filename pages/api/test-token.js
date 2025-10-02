/**
 * Token Storage Test API endpoint
 * Test token storage and retrieval
 */

import { getAccessToken, storeAccessToken } from '../../lib/token-storage';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop } = req.query;

    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter required' });
    }

    // Test different shop ID formats
    const shopFormats = [
      shop,
      shop.replace('.myshopify.com', ''),
      shop.includes('.') ? shop : `${shop}.myshopify.com`
    ];

    const tokenResults = {};

    for (const format of shopFormats) {
      const token = getAccessToken(format);
      tokenResults[format] = token ? 'Found' : 'Not found';
    }

    res.status(200).json({
      success: true,
      shop: shop,
      tokenResults: tokenResults,
      message: 'Token storage test completed'
    });

  } catch (error) {
    console.error('Token test API error:', error);
    res.status(500).json({
      error: 'Token test failed',
      message: error.message
    });
  }
}