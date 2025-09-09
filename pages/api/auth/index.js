import shopify from '../../../lib/shopify';

export default async function handler(req, res) {
  try {
    const { shop, host } = req.query;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter required' });
    }

    const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
    
    const scopes = process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_collections';
    const redirectUri = `${process.env.SHOPIFY_APP_URL}/api/auth/callback`;
    const state = Math.random().toString(36).substring(2, 15);
    
    const authUrl = `https://${sanitizedShop}/admin/oauth/authorize?` +
      `client_id=${process.env.SHOPIFY_API_KEY}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;

    if (req.headers.accept?.includes('application/json')) {
      return res.json({ authUrl });
    }

    res.writeHead(302, { Location: authUrl });
    res.end();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
}