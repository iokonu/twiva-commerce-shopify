/**
 * Shopify Helper Functions
 * Utilities for interacting with Shopify API and managing shop data
 */

import apiClient from './api-client';

/**
 * Get Shopify GraphQL client for a shop
 */
export async function getShopifyClient(shopId) {
  try {
    // First check if we have shop data in backend
    const shopData = await getShopFromBackend(shopId);

    if (!shopData || !shopData.accessToken) {
      console.error('Shop access token not found for shopId:', shopId);
      return null;
    }

    const { default: shopify } = await import('./shopify.js');

    return new shopify.clients.Graphql({
      session: {
        shop: shopData.domain,
        accessToken: shopData.accessToken,
      },
    });
  } catch (error) {
    console.error('Error creating Shopify client:', error);
    return null;
  }
}

/**
 * Get shop data from backend API
 */
export async function getShopFromBackend(shopId) {
  try {
    // For now, we'll need to get this from local Prisma until we fully migrate
    // In the future, this should come from the backend API
    const { prisma } = await import('./prisma');

    const shop = await prisma.shop.findUnique({
      where: { id: shopId }
    });

    return shop;
  } catch (error) {
    console.error('Error fetching shop data:', error);
    return null;
  }
}

/**
 * Register shop with backend API
 */
export async function registerShopWithBackend(shopData) {
  try {
    const result = await apiClient.registerShop({
      id: shopData.id,
      domain: shopData.domain,
      name: shopData.name
    });

    return result;
  } catch (error) {
    console.error('Error registering shop with backend:', error);
    throw error;
  }
}

/**
 * Sync product data to backend
 */
export async function syncProductToBackend(shopId, productData) {
  try {
    return await apiClient.syncProduct(shopId, productData);
  } catch (error) {
    console.error('Error syncing product to backend:', error);
    throw error;
  }
}

/**
 * Extract Shopify product ID from GraphQL ID
 */
export function extractShopifyId(gqlId) {
  if (!gqlId) return null;

  // Extract numeric ID from GraphQL ID like "gid://shopify/Product/123456"
  const match = gqlId.match(/\/(\d+)$/);
  return match ? match[1] : gqlId;
}

/**
 * Convert Shopify product to backend format
 */
export function formatProductForBackend(shopifyProduct) {
  return {
    id: extractShopifyId(shopifyProduct.id),
    title: shopifyProduct.title,
    handle: shopifyProduct.handle,
    status: shopifyProduct.status,
    productType: shopifyProduct.productType,
    vendor: shopifyProduct.vendor,
    tags: shopifyProduct.tags,
    variants: shopifyProduct.variants?.edges?.map(edge => ({
      id: extractShopifyId(edge.node.id),
      price: parseFloat(edge.node.price),
      sku: edge.node.sku,
      inventoryQuantity: edge.node.inventoryQuantity
    })) || [],
    images: shopifyProduct.images?.edges?.map(edge => ({
      id: extractShopifyId(edge.node.id),
      url: edge.node.url,
      altText: edge.node.altText
    })) || [],
    createdAt: shopifyProduct.createdAt,
    updatedAt: shopifyProduct.updatedAt
  };
}

/**
 * Get shop domain from shop ID
 */
export function getShopDomain(shopId) {
  // If shopId is already a domain, return it
  if (shopId.includes('.')) {
    return shopId;
  }

  // Otherwise assume it needs .myshopify.com
  return `${shopId}.myshopify.com`;
}

/**
 * Validate shop access and permissions
 */
export async function validateShopAccess(shopId, requiredScopes = []) {
  try {
    const client = await getShopifyClient(shopId);
    if (!client) {
      return { valid: false, error: 'Could not create Shopify client' };
    }

    // Test with a simple shop query
    const shopQuery = `
      query {
        shop {
          id
          name
          domain
          email
        }
      }
    `;

    const response = await client.query({
      data: { query: shopQuery }
    });

    if (response.body.data.shop) {
      return { valid: true, shop: response.body.data.shop };
    }

    return { valid: false, error: 'Failed to access shop data' };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Get shop currency
 */
export async function getShopCurrency(shopId) {
  try {
    const client = await getShopifyClient(shopId);
    if (!client) return 'USD';

    const shopQuery = `
      query {
        shop {
          currencyCode
        }
      }
    `;

    const response = await client.query({
      data: { query: shopQuery }
    });

    return response.body.data.shop?.currencyCode || 'USD';
  } catch (error) {
    console.error('Error fetching shop currency:', error);
    return 'USD';
  }
}