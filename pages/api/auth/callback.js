import { prisma } from '../../../lib/prisma';
import crypto from 'crypto';

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
    
    await prisma.shop.upsert({
      where: { id: shop },
      update: {
        accessToken: tokenData.access_token,
      },
      create: {
        id: shop,
        domain: shop,
        accessToken: tokenData.access_token,
      },
    });

    const redirectUrl = `/?shop=${shop}&host=${host || ''}`;
    res.writeHead(302, { Location: redirectUrl });
    res.end();
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({ error: 'Authentication callback failed' });
  }
}