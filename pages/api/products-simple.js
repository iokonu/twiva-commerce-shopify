/**
 * Products API - Get from Shopify, sync to backend, return from backend
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

    // Get token for THIS shop
    const accessToken = getAccessToken(shop);
    if (!accessToken) {
      // Try different format
      const shopAlt = shop.includes('.') ? shop.replace('.myshopify.com', '') : `${shop}.myshopify.com`;
      const altToken = getAccessToken(shopAlt);

      if (!altToken) {
        return res.status(401).json({
          success: false,
          error: `No access token found for shop: ${shop}`
        });
      }
    }

    const finalToken = accessToken || getAccessToken(shop.includes('.') ? shop.replace('.myshopify.com', '') : `${shop}.myshopify.com`);

    // Get products from THIS shop's Shopify
    const shopDomain = shop.includes('.') ? shop : `${shop}.myshopify.com`;
    const shopifyUrl = `https://${shopDomain}/admin/api/2024-07/products.json?limit=50`;

    const shopifyResponse = await fetch(shopifyUrl, {
      headers: {
        'X-Shopify-Access-Token': finalToken,
        'Content-Type': 'application/json',
      },
    });

    if (!shopifyResponse.ok) {
      return res.status(shopifyResponse.status).json({
        success: false,
        error: `Shopify API error: ${shopifyResponse.status}`,
        shop: shop
      });
    }

    const shopifyData = await shopifyResponse.json();
    const shopifyProducts = shopifyData.products || [];

    // Sync each product to backend
    for (const product of shopifyProducts) {
      const productData = {
        id: product.id.toString(),
        title: product.title,
        handle: product.handle,
        status: product.status,
        productType: product.product_type,
        vendor: product.vendor,
        tags: product.tags || [],
        variants: product.variants?.map(variant => ({
          id: variant.id.toString(),
          price: parseFloat(variant.price),
          sku: variant.sku,
          inventoryQuantity: variant.inventory_quantity || 0
        })) || [],
        createdAt: product.created_at,
        updatedAt: product.updated_at
      };

      await apiClient.syncProduct(shop, productData);
    }

    // Get products from backend
    const backendResponse = await apiClient.getProducts(shop);

    res.status(200).json({
      success: true,
      shop: shop,
      products: backendResponse.data || [],
      syncedCount: shopifyProducts.length,
      message: `Synced ${shopifyProducts.length} products from Shopify to backend`
    });

  } catch (error) {
    console.error('Products sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      shop: req.query.shop
    });
  }
}