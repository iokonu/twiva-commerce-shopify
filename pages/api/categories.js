import shopify from '../../lib/shopify';
import { prisma } from '../../lib/prisma';
import { PRODUCTS_QUERY } from '../../lib/graphql';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop, search } = req.query;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter required' });
    }

    const shopRecord = await prisma.shop.upsert({
      where: { id: shop },
      update: {},
      create: {
        id: shop,
        domain: shop,
        accessToken: 'temp_token',
      },
    });

    if (!shopRecord.accessToken || shopRecord.accessToken === 'temp_token') {
      return res.status(401).json({ 
        error: 'Shopify authentication required',
        authUrl: `/api/auth?shop=${shop}` 
      });
    }

    const client = new shopify.clients.Graphql({
      session: {
        shop: shopRecord.domain,
        accessToken: shopRecord.accessToken,
      },
    });

    let allProducts = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage && allProducts.length < 500) { 
      const response = await client.query({
        data: {
          query: PRODUCTS_QUERY,
          variables: {
            first: 50,
            after: cursor,
            query: null,
          },
        },
      });

      const products = response.body.data.products.edges.map(edge => edge.node);
      allProducts = [...allProducts, ...products];
      
      const pageInfo = response.body.data.products.pageInfo;
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
    }

    const categoryMap = new Map();
    
    allProducts.forEach(product => {
      const category = product.productType || 'Uncategorized';
      
      if (category && category.trim()) {
        const categoryKey = category.toLowerCase();
        
        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, {
            name: category,
            productCount: 0,
            products: []
          });
        }
        
        const categoryData = categoryMap.get(categoryKey);
        categoryData.productCount += 1;
        categoryData.products.push(product.id);
      }
    });

    let categories = Array.from(categoryMap.values());
    
    if (search) {
      const searchLower = search.toLowerCase();
      categories = categories.filter(category => 
        category.name.toLowerCase().includes(searchLower)
      );
    }

    categories.sort((a, b) => b.productCount - a.productCount);

    return res.json({
      categories,
      totalCategories: categories.length,
    });
  } catch (error) {
    console.error('Categories API error:', error);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
}