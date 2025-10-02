/**
 * Debug tokens - see what's actually stored
 */

import { getAccessToken } from '../../lib/token-storage';

export default async function handler(req, res) {
  try {
    const { shop } = req.query;

    const results = {};

    // Try all possible formats
    const formats = [
      shop,
      'twivacommercetest',
      'twivacommercetest.myshopify.com'
    ];

    for (const format of formats) {
      const token = getAccessToken(format);
      results[format] = token ? 'FOUND' : 'NOT_FOUND';
    }

    res.status(200).json({
      success: true,
      shop: shop,
      results: results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}