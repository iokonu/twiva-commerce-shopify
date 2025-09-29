import crypto from 'crypto';
import { storeAccessTokenInBackend } from '../../../lib/shopify-helpers';

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
    
    // Store access token in backend API
    try {
      await storeAccessTokenInBackend(shop, tokenData.access_token, {
        domain: shop,
        name: shop, // We can get actual shop name later if needed
      });
      console.log(`Stored access token for shop: ${shop}`);
    } catch (error) {
      console.error('Failed to store access token in backend:', error);
      throw error; // This is critical - if we can't store the token, auth fails
    }

    const redirectUrl = `/?shop=${shop}&host=${host || ''}`;
    res.writeHead(302, { Location: redirectUrl });
    res.end();
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({ error: 'Authentication callback failed' });
  }
}