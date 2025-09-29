import { processOrderWebhook } from '../../../../lib/sales-tracker';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook (you should add proper Shopify webhook verification)
    const webhookPayload = req.body;

    console.log('Order created webhook received:', webhookPayload.id);

    // Extract shop ID from headers or payload
    const shopDomain = req.headers['x-shopify-shop-domain'];
    const shopId = shopDomain ? shopDomain.replace('.myshopify.com', '') : null;

    if (!shopId) {
      console.error('Shop ID not found in webhook');
      return res.status(400).json({ error: 'Shop ID required' });
    }

    // Add shop_id to order data
    const orderData = {
      ...webhookPayload,
      shop_id: shopId
    };

    // Process the order for commission tracking
    const result = await processOrderWebhook(orderData);

    if (result) {
      console.log('Order processed successfully for commission tracking');
    } else {
      console.log('Order could not be attributed to any affiliate');
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing order webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Disable body parser for webhook
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}