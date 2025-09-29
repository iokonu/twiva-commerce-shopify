import { PRODUCTS_QUERY } from '../../lib/graphql';
import { getShopifyClient } from '../../lib/shopify-helpers';
import { getProductCommission } from '../../lib/backend-commissions';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop } = req.query;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter required' });
    }

    const client = await getShopifyClient(shop);

    if (!client) {
      return res.status(401).json({
        error: 'Shopify authentication required',
        authUrl: `/api/auth?shop=${shop}`
      });
    }

    const response = await client.query({
      data: {
        query: PRODUCTS_QUERY,
        variables: {
          first: 50,
          after: req.query.after || null,
          query: req.query.search || null,
        },
      },
    });

    const products = response.body.data.products.edges.map(edge => edge.node);
    
    // Only enrich with commission data, don't save all products to database
    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        const productLink = `https://${shop}/products/${product.handle}`;
        const commissionData = await getProductCommission(shop, product.id);

        return {
          ...product,
          link: productLink,
          commission: commissionData,
        };
      })
    );

    return res.json({
      products: enrichedProducts,
      pageInfo: response.body.data.products.pageInfo,
    });
  } catch (error) {
    console.error('Products API error:', error);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
}
