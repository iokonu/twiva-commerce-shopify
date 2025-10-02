/**
 * Product Sync Manager
 * Core functionality to fetch products from Shopify, sync to backend, then display from backend
 */

import { getShopifyClient, formatProductForBackend } from './shopify-helpers';
import apiClient from './api-client';

class ProductSyncManager {
  constructor() {
    this.syncInProgress = new Map(); // Track ongoing syncs per shop
    this.lastSyncTime = new Map(); // Track last sync time per shop
  }

  /**
   * Main sync method: Get products from Shopify → Sync to backend → Return backend data
   */
  async syncAndFetchProducts(shopId, options = {}) {
    const {
      forceRefresh = false,
      limit = 250,
      syncTimeout = 30000
    } = options;

    // Prevent duplicate syncs for the same shop
    if (this.syncInProgress.get(shopId) && !forceRefresh) {
      console.log(`Sync already in progress for shop: ${shopId}`);
      return this.getProductsFromBackend(shopId);
    }

    try {
      this.syncInProgress.set(shopId, true);

      // Check if we need to sync (skip if recent sync and not forced)
      if (!forceRefresh && this.isRecentSync(shopId)) {
        console.log(`Using cached data for shop: ${shopId}`);
        return this.getProductsFromBackend(shopId);
      }

      console.log(`Starting product sync for shop: ${shopId}`);

      // Step 1: Fetch products from Shopify
      const shopifyProducts = await this.fetchShopifyProducts(shopId, limit);

      if (!shopifyProducts || shopifyProducts.length === 0) {
        console.log(`No products found in Shopify for shop: ${shopId}`);
        return [];
      }

      // Step 2: Sync each product to backend
      const syncResults = await this.syncProductsToBackend(shopId, shopifyProducts);

      // Step 3: Fetch synchronized products from backend
      const backendProducts = await this.getProductsFromBackend(shopId);

      // Update last sync time
      this.lastSyncTime.set(shopId, Date.now());

      console.log(`Product sync completed for shop: ${shopId}. Synced: ${syncResults.successful}, Failed: ${syncResults.failed}`);

      return backendProducts;

    } catch (error) {
      console.error(`Product sync failed for shop: ${shopId}`, error);
      throw error;
    } finally {
      this.syncInProgress.set(shopId, false);
    }
  }

  /**
   * Fetch products from Shopify using GraphQL
   */
  async fetchShopifyProducts(shopId, limit = 250) {
    const client = await getShopifyClient(shopId);
    if (!client) {
      throw new Error('Could not create Shopify client');
    }

    const query = `
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              status
              productType
              vendor
              tags
              createdAt
              updatedAt
              variants(first: 10) {
                edges {
                  node {
                    id
                    price
                    sku
                    inventoryQuantity
                  }
                }
              }
              images(first: 5) {
                edges {
                  node {
                    id
                    url
                    altText
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    try {
      const response = await client.query({
        data: {
          query,
          variables: { first: limit }
        }
      });

      if (response.body.errors) {
        throw new Error(`Shopify GraphQL errors: ${JSON.stringify(response.body.errors)}`);
      }

      const products = response.body.data.products.edges.map(edge => edge.node);
      console.log(`Fetched ${products.length} products from Shopify for shop: ${shopId}`);

      return products;
    } catch (error) {
      console.error('Error fetching products from Shopify:', error);
      throw error;
    }
  }

  /**
   * Sync products to backend API
   */
  async syncProductsToBackend(shopId, shopifyProducts) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    // Process products in batches to avoid overwhelming the backend
    const batchSize = 10;
    for (let i = 0; i < shopifyProducts.length; i += batchSize) {
      const batch = shopifyProducts.slice(i, i + batchSize);

      const batchPromises = batch.map(async (shopifyProduct) => {
        try {
          const formattedProduct = formatProductForBackend(shopifyProduct);
          await apiClient.syncProduct(shopId, formattedProduct);
          results.successful++;
          return { success: true, productId: formattedProduct.id };
        } catch (error) {
          results.failed++;
          results.errors.push({
            productId: shopifyProduct.id,
            error: error.message
          });
          console.error(`Failed to sync product ${shopifyProduct.id}:`, error);
          return { success: false, productId: shopifyProduct.id, error: error.message };
        }
      });

      // Wait for batch to complete before proceeding
      await Promise.allSettled(batchPromises);
    }

    return results;
  }

  /**
   * Fetch products from backend (the source of truth for display)
   */
  async getProductsFromBackend(shopId) {
    try {
      const response = await apiClient.getProducts(shopId);

      if (response.success && response.data) {
        return Array.isArray(response.data) ? response.data : [response.data];
      }

      return [];
    } catch (error) {
      console.error(`Error fetching products from backend for shop: ${shopId}`, error);
      return [];
    }
  }

  /**
   * Force resync of specific product
   */
  async resyncProduct(shopId, productId) {
    try {
      const client = await getShopifyClient(shopId);
      if (!client) {
        throw new Error('Could not create Shopify client');
      }

      // Fetch specific product from Shopify
      const query = `
        query getProduct($id: ID!) {
          product(id: $id) {
            id
            title
            handle
            status
            productType
            vendor
            tags
            createdAt
            updatedAt
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  sku
                  inventoryQuantity
                }
              }
            }
            images(first: 5) {
              edges {
                node {
                  id
                  url
                  altText
                }
              }
            }
          }
        }
      `;

      const response = await client.query({
        data: {
          query,
          variables: { id: `gid://shopify/Product/${productId}` }
        }
      });

      if (response.body.errors) {
        throw new Error(`Shopify GraphQL errors: ${JSON.stringify(response.body.errors)}`);
      }

      const shopifyProduct = response.body.data.product;
      if (!shopifyProduct) {
        throw new Error(`Product ${productId} not found in Shopify`);
      }

      // Sync to backend
      const formattedProduct = formatProductForBackend(shopifyProduct);
      await apiClient.syncProduct(shopId, formattedProduct);

      // Return updated product from backend
      const backendResponse = await apiClient.getProducts(shopId, productId);
      return backendResponse.data;

    } catch (error) {
      console.error(`Error resyncing product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Check if recent sync exists (within last 5 minutes)
   */
  isRecentSync(shopId, maxAgeMinutes = 5) {
    const lastSync = this.lastSyncTime.get(shopId);
    if (!lastSync) return false;

    const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
    return (Date.now() - lastSync) < maxAge;
  }

  /**
   * Get sync status for a shop
   */
  getSyncStatus(shopId) {
    return {
      inProgress: this.syncInProgress.get(shopId) || false,
      lastSync: this.lastSyncTime.get(shopId),
      isRecent: this.isRecentSync(shopId)
    };
  }

  /**
   * Clear sync data for a shop (useful for testing)
   */
  clearSyncData(shopId) {
    this.syncInProgress.delete(shopId);
    this.lastSyncTime.delete(shopId);
  }
}

// Create singleton instance
const productSyncManager = new ProductSyncManager();

export default productSyncManager;

// Helper functions for easy access
export const syncProducts = (shopId, options) => productSyncManager.syncAndFetchProducts(shopId, options);
export const getProducts = (shopId) => productSyncManager.getProductsFromBackend(shopId);
export const resyncProduct = (shopId, productId) => productSyncManager.resyncProduct(shopId, productId);
export const getSyncStatus = (shopId) => productSyncManager.getSyncStatus(shopId);