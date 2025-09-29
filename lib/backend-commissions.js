/**
 * Backend Commission Management
 * Replaces lib/commissions.js to use Laravel backend API instead of local Prisma
 */

import apiClient from './api-client';
import { getShopifyClient } from './shopify-helpers';

export async function getProductCommission(shopId, productId) {
  try {
    const response = await apiClient.getCommissions(shopId, {
      productId,
      type: 'product'
    });

    if (response.data && response.data.length > 0) {
      const commission = response.data[0];
      return {
        commission: commission.commissionValue,
        commissionType: commission.commissionType,
        source: 'product',
        id: commission.id,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching product commission:', error);
    return null;
  }
}

export async function setProductCommission(shopId, productId, commissionData, productDetails = null) {
  try {
    // If product details aren't provided, fetch them from Shopify
    if (!productDetails) {
      productDetails = await fetchShopifyProductDetails(shopId, productId);
    }

    // First, sync the product to backend
    await apiClient.syncProduct(shopId, {
      id: productId,
      title: productDetails?.title || 'Unknown Product',
      variants: [{ price: productDetails?.price || 0 }],
      status: 'active',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      handle: productDetails?.handle
    });

    // Handle both old format (number) and new format (object)
    const commission = typeof commissionData === 'number' ? commissionData : commissionData.commission;
    const commissionType = typeof commissionData === 'object' ? commissionData.commissionType : 'percentage';
    const currency = typeof commissionData === 'object' ? commissionData.currency : 'USD';

    // Then sync the commission
    const result = await apiClient.syncCommission(shopId, {
      productId,
      commissionValue: commission,
      commissionRate: commission,
      commissionType,
      currency,
      type: 'product',
      referenceId: productId
    });

    return {
      id: productId,
      commissionValue: commission,
      commissionType,
      productTitle: productDetails?.title || 'Unknown Product',
      success: true
    };

  } catch (error) {
    console.error('Error setting product commission:', error);
    throw error;
  }
}

export async function setCollectionCommission(shopId, collectionId, commissionData) {
  try {
    // Fetch collection details and products
    const collectionData = await fetchShopifyCollectionDetails(shopId, collectionId);

    if (!collectionData) {
      throw new Error('Collection not found');
    }

    // Sync commission for the collection type
    await apiClient.syncCommission(shopId, {
      productId: collectionId, // Use collectionId as productId for collections
      commissionValue: typeof commissionData === 'number' ? commissionData : commissionData.commission,
      commissionRate: typeof commissionData === 'number' ? commissionData : commissionData.commission,
      commissionType: typeof commissionData === 'object' ? commissionData.commissionType : 'percentage',
      currency: typeof commissionData === 'object' ? commissionData.currency : 'USD',
      type: 'collection',
      referenceId: collectionId,
      applyToProducts: true
    });

    // Apply to all products in collection
    if (collectionData.products && collectionData.products.length > 0) {
      await Promise.all(collectionData.products.map(product =>
        setProductCommission(shopId, product.id, commissionData, {
          title: product.title,
          handle: product.handle,
          price: product.variants?.[0]?.price || 0
        })
      ));
    }

    const commission = typeof commissionData === 'number' ? commissionData : commissionData.commission;
    const commissionType = typeof commissionData === 'object' ? commissionData.commissionType : 'percentage';
    const commissionDisplay = commissionType === 'percentage' ? `${commission}%` : `$${commission}`;

    return {
      message: `Applied ${commissionDisplay} commission to ${collectionData.products.length} products in collection "${collectionData.title}"`,
      updatedProducts: collectionData.products.length
    };

  } catch (error) {
    console.error('Error setting collection commission:', error);
    throw error;
  }
}

export async function setCategoryCommission(shopId, categoryName, commissionData) {
  try {
    // Fetch all products to find ones with this category
    const products = await fetchShopifyProductsByCategory(shopId, categoryName);

    // Sync commission for the category type
    await apiClient.syncCommission(shopId, {
      productId: categoryName, // Use categoryName as productId for categories
      commissionValue: typeof commissionData === 'number' ? commissionData : commissionData.commission,
      commissionRate: typeof commissionData === 'number' ? commissionData : commissionData.commission,
      commissionType: typeof commissionData === 'object' ? commissionData.commissionType : 'percentage',
      currency: typeof commissionData === 'object' ? commissionData.currency : 'USD',
      type: 'category',
      referenceId: categoryName,
      applyToProducts: true
    });

    // Apply to all products in category
    if (products.length > 0) {
      await Promise.all(products.map(product =>
        setProductCommission(shopId, product.id, commissionData, {
          title: product.title,
          handle: product.handle,
          price: product.variants?.[0]?.price || 0
        })
      ));
    }

    const commission = typeof commissionData === 'number' ? commissionData : commissionData.commission;
    const commissionType = typeof commissionData === 'object' ? commissionData.commissionType : 'percentage';
    const commissionDisplay = commissionType === 'percentage' ? `${commission}%` : `$${commission}`;

    return {
      message: `Applied ${commissionDisplay} commission to ${products.length} products in category "${categoryName}"`,
      updatedProducts: products.length
    };

  } catch (error) {
    console.error('Error setting category commission:', error);
    throw error;
  }
}

export async function removeCommission(shopId, type, id) {
  try {
    if (type === 'product') {
      return await apiClient.deleteCommission(shopId, id, 'product');
    } else if (type === 'collection') {
      return await apiClient.deleteCommission(shopId, id, 'collection');
    } else if (type === 'category') {
      return await apiClient.deleteCommission(shopId, id, 'category');
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing commission:', error);
    throw error;
  }
}

// Helper functions for Shopify data fetching
async function fetchShopifyProductDetails(shopId, productId) {
  try {
    const client = await getShopifyClient(shopId);
    if (!client) return null;

    const productQuery = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          variants(first: 1) {
            edges {
              node {
                price
              }
            }
          }
        }
      }
    `;

    const response = await client.query({
      data: {
        query: productQuery,
        variables: { id: productId }
      }
    });

    const product = response.body.data.product;
    if (product) {
      return {
        title: product.title,
        handle: product.handle,
        price: product.variants?.edges?.[0]?.node?.price || 0
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching Shopify product details:', error);
    return null;
  }
}

async function fetchShopifyCollectionDetails(shopId, collectionId) {
  try {
    const client = await getShopifyClient(shopId);
    if (!client) return null;

    const collectionQuery = `
      query getCollection($id: ID!) {
        collection(id: $id) {
          id
          title
          handle
          products(first: 100) {
            edges {
              node {
                id
                title
                handle
                variants(first: 1) {
                  edges {
                    node {
                      price
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await client.query({
      data: {
        query: collectionQuery,
        variables: { id: collectionId }
      }
    });

    const collection = response.body.data.collection;
    if (collection) {
      return {
        title: collection.title,
        handle: collection.handle,
        products: collection.products.edges.map(edge => edge.node)
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching Shopify collection details:', error);
    return null;
  }
}

async function fetchShopifyProductsByCategory(shopId, categoryName) {
  try {
    const client = await getShopifyClient(shopId);
    if (!client) return [];

    // Fetch products with the specified productType (category)
    const productsQuery = `
      query getProducts($first: Int!, $after: String, $query: String) {
        products(first: $first, after: $after, query: $query) {
          edges {
            node {
              id
              title
              handle
              productType
              variants(first: 1) {
                edges {
                  node {
                    price
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

    let allProducts = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage && allProducts.length < 500) {
      const response = await client.query({
        data: {
          query: productsQuery,
          variables: {
            first: 50,
            after: cursor,
            query: `product_type:${categoryName}`
          }
        }
      });

      const products = response.body.data.products.edges.map(edge => edge.node);
      allProducts = [...allProducts, ...products];

      const pageInfo = response.body.data.products.pageInfo;
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
    }

    return allProducts;
  } catch (error) {
    console.error('Error fetching Shopify products by category:', error);
    return [];
  }
}