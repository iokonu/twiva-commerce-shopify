/**
 * Product Sync API endpoint
 * Simple endpoint to test product sync functionality
 */

import { getShopifyClient } from '../../lib/shopify-helpers';
import { getAccessToken } from '../../lib/token-storage';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop, force = false } = req.query;

    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter required' });
    }

    console.log(`Starting simple product sync for shop: ${shop}`);

    // Check if we have a token
    const token = getAccessToken(shop);
    if (!token) {
      return res.status(401).json({ error: 'No access token found for shop' });
    }

    // Get Shopify client
    const client = await getShopifyClient(shop);
    if (!client) {
      return res.status(500).json({ error: 'Could not create Shopify client' });
    }

    // Simple GraphQL query to test connection and get products
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
              variants(first: 3) {
                edges {
                  node {
                    id
                    price
                    sku
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
        query,
        variables: { first: 10 }
      }
    });

    if (response.body.errors) {
      throw new Error(`Shopify GraphQL errors: ${JSON.stringify(response.body.errors)}`);
    }

    const products = response.body.data.products.edges.map(edge => edge.node);

    console.log(`Successfully fetched ${products.length} products from Shopify`);

    res.status(200).json({
      success: true,
      shop: shop,
      productsCount: products.length,
      products: products,
      message: 'Products fetched successfully from Shopify'
    });

  } catch (error) {
    console.error('Product sync API error:', error);
    res.status(500).json({
      error: 'Product sync failed',
      message: error.message,
      details: error.stack
    });
  }
}