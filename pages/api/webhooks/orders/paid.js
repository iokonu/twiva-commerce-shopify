import { processOrderWebhook } from '../../../../lib/sales-tracker';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const webhookPayload = req.body;
    const shopDomain = req.headers['x-shopify-shop-domain'];
    const shopId = shopDomain ? shopDomain.replace('.myshopify.com', '') : null;

    if (!shopId) {
      console.error('Shop ID not found in webhook');
      return res.status(400).json({ error: 'Shop ID required' });
    }

    console.log('Order paid webhook received:', webhookPayload.id);

    // Add shop_id to order data
    const orderData = {
      ...webhookPayload,
      shop_id: shopId
    };

    // Process the order for commission tracking
    // This is crucial as it's when payment is confirmed
    const result = await processOrderWebhook(orderData);

    if (result) {
      console.log('Paid order processed successfully for commission tracking');
    } else {
      console.log('Paid order could not be attributed to any affiliate');
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing order paid webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}