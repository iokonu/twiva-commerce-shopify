/**
 * Products API - using EXACT same pattern as verification
 * Send products to backend (like regenerateCode) then fetch them (like getValidationStatus)
 */

import { getAccessToken } from '../../lib/token-storage';
import apiClient from '../../lib/api-client';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop } = req.query;

    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter required' });
    }

    // Step 1: Get products from Shopify (like verification gets shop data)
    const accessToken = getAccessToken(shop);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'No access token found for shop'
      });
    }

    const shopDomain = shop.includes('.') ? shop : `${shop}.myshopify.com`;
    const shopifyUrl = `https://${shopDomain}/admin/api/2024-07/products.json?limit=50`;

    const shopifyResponse = await fetch(shopifyUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!shopifyResponse.ok) {
      throw new Error(`Failed to fetch from Shopify: ${shopifyResponse.status}`);
    }

    const shopifyData = await shopifyResponse.json();
    const shopifyProducts = shopifyData.products || [];

    // Step 2: Send products to backend (like regenerateCode sends code)
    for (const product of shopifyProducts) {
      const productData = {
        id: product.id.toString(),
        title: product.title,
        handle: product.handle,
        status: product.status,
        productType: product.product_type,
        vendor: product.vendor,
        tags: product.tags,
        variants: product.variants?.map(variant => ({
          id: variant.id.toString(),
          price: parseFloat(variant.price),
          sku: variant.sku,
          inventoryQuantity: variant.inventory_quantity
        })) || [],
        createdAt: product.created_at,
        updatedAt: product.updated_at
      };

      await apiClient.syncProduct(shop, productData);
    }

    // Step 3: Get products from backend (like getValidationStatus gets status)
    const response = await apiClient.getProducts(shop);

    if (response.success) {
      res.status(200).json({
        success: true,
        shop: shop,
        products: response.data || [],
        message: 'Products synced and fetched from backend'
      });
    } else {
      res.status(500).json({
        success: false,
        error: response.error || 'Failed to fetch products from backend'
      });
    }

  } catch (error) {
    console.error('Products API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync/fetch products',
      message: error.message
    });
  }
}