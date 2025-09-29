import crypto from 'crypto';
import apiClient from '../../../lib/api-client';
import { storeAccessToken } from '../../../lib/token-storage';

export default async function handler(req, res) {
  try {
    const { code, hmac, shop, state, host } = req.query;
    
    if (!code || !shop) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const queryString = Object.keys(req.query)
      .filter(key => key !== 'hmac')
      .sort()
      .map(key => `${key}=${req.query[key]}`)
      .join('&');
      
    const computedHmac = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
      .update(queryString)
      .digest('hex');
      
    if (computedHmac !== hmac) {
      return res.status(401).json({ error: 'Invalid request signature' });
    }

    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for access token');
    }

    const tokenData = await tokenResponse.json();
    
    // Register/update shop with backend and store access token in session/memory
    try {
      await apiClient.registerShop({
        id: shop,
        domain: shop,
        name: shop, // We can get actual shop name later if needed
        accessToken: tokenData.access_token
      });
    } catch (error) {
      console.error('Failed to register shop with backend:', error);
      // Continue anyway - the shop might already be registered
    }

    // Store access token in memory for later retrieval
    storeAccessToken(shop, tokenData.access_token);

    const redirectUrl = `/?shop=${shop}&host=${host || ''}`;
    res.writeHead(302, { Location: redirectUrl });
    res.end();
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({ error: 'Authentication callback failed' });
  }
}