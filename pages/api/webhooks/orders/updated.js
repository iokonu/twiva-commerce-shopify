import { handleOrderStatusChange } from '../../../../lib/sales-tracker';

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

    console.log('Order updated webhook received:', webhookPayload.id);

    // Add shop_id to order data
    const orderData = {
      ...webhookPayload,
      shop_id: shopId
    };

    // Extract status change information
    const currentStatus = webhookPayload.financial_status;
    const fulfillmentStatus = webhookPayload.fulfillment_status;

    // Determine if this is a significant status change
    const triggerStatuses = ['pending', 'authorized', 'partially_paid'];
    const targetStatuses = ['paid', 'partially_refunded', 'refunded'];

    if (targetStatuses.includes(currentStatus) || fulfillmentStatus === 'fulfilled') {
      await handleOrderStatusChange(orderData, 'pending', currentStatus);
    }

    // Handle refunds specifically
    if (webhookPayload.refunds && webhookPayload.refunds.length > 0) {
      await handleOrderStatusChange(orderData, 'paid', 'refunded');
    }

    console.log('Order status update processed successfully');
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing order update webhook:', error);
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