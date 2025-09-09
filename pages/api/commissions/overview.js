import { prisma } from '../../../lib/prisma';
import shopify from '../../../lib/shopify';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop } = req.query;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter required' });
    }

    // Check if we have a valid access token
    const shopRecord = await prisma.shop.findUnique({
      where: { id: shop }
    });

    if (!shopRecord || !shopRecord.accessToken || shopRecord.accessToken === 'temp_token') {
      return res.status(401).json({ 
        error: 'Shopify authentication required',
        authUrl: `/api/auth?shop=${shop}` 
      });
    }

    // Get all commission data (only product commissions now)
    const productCommissions = await prisma.productCommission.findMany({
      where: { shopId: shop },
      orderBy: { createdAt: 'desc' }
    });

    // Create GraphQL client to fetch additional data
    const client = new shopify.clients.Graphql({
      session: {
        shop: shopRecord.domain,
        accessToken: shopRecord.accessToken,
      },
    });

    let totalPotentialEarnings = 0;
    let totalCommissions = productCommissions.length;
    let percentageCommissions = [];
    let fixedAmountCommissions = [];
    let productsWithCommissions = 0;
    let totalProducts = 0;

    // Get all products to calculate total count and products without commissions
    const allProductsQuery = `
      query getAllProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    `;

    let allProducts = [];
    let hasNextPage = true;
    let cursor = null;

    // Fetch all products with pagination
    try {
      while (hasNextPage) {
        const productResponse = await client.query({
          data: {
            query: allProductsQuery,
            variables: { first: 250, after: cursor }
          }
        });

        const data = productResponse.body.data;
        allProducts = allProducts.concat(data.products.nodes);
        hasNextPage = data.products.pageInfo.hasNextPage;
        cursor = data.products.pageInfo.endCursor;
      }

      totalProducts = allProducts.length;

      // Calculate potential earnings from product commissions
      if (productCommissions.length > 0) {
        productCommissions.forEach(commission => {
          const product = allProducts.find(p => p.id === commission.productId);
          if (product && product.priceRangeV2) {
            let commissionAmount;
            if (commission.commissionType === 'amount') {
              // For fixed amount, use the commission value directly
              commissionAmount = commission.commissionValue;
            } else {
              // For percentage, calculate as before
              const price = parseFloat(product.priceRangeV2.minVariantPrice.amount);
              commissionAmount = (price * commission.commissionValue) / 100;
            }
            totalPotentialEarnings += commissionAmount;
          }
          
          // Separate percentage and fixed amount commissions
          if (commission.commissionType === 'percentage') {
            percentageCommissions.push(commission.commissionValue);
          } else {
            fixedAmountCommissions.push(commission.commissionValue);
          }
        });
        
        productsWithCommissions = productCommissions.length;
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
    }

    // Collections/categories don't have separate records anymore

    // Calculate average commission (only for percentage commissions)
    const averageCommission = percentageCommissions.length > 0 
      ? percentageCommissions.reduce((sum, rate) => sum + rate, 0) / percentageCommissions.length
      : 0;

    // Find highest commission (separate for percentage and fixed amount)
    let highestCommission = null;
    
    if (percentageCommissions.length > 0) {
      const maxPercentageRate = Math.max(...percentageCommissions);
      highestCommission = {
        commission: maxPercentageRate,
        type: 'Product',
        commissionType: 'percentage'
      };
    }
    
    // If we also have fixed amount commissions and want to show the highest overall
    if (fixedAmountCommissions.length > 0) {
      const maxFixedAmount = Math.max(...fixedAmountCommissions);
      
      // If we don't have any percentage commissions, or if we want to show fixed amount as highest
      if (!highestCommission) {
        highestCommission = {
          commission: maxFixedAmount,
          type: 'Product',
          commissionType: 'amount'
        };
      }
      // You could add logic here to compare which is actually "higher" 
      // by converting fixed amounts to equivalent percentages based on product prices
    }

    const productsWithoutCommissions = totalProducts - productsWithCommissions;

    const stats = {
      totalCommissions,
      productCommissions: productCommissions.length,
      productsWithoutCommissions,
      collectionCommissions: 0,
      totalPotentialEarnings,
      averageCommission,
      highestCommission,
      percentageCommissionsCount: percentageCommissions.length,
      fixedAmountCommissionsCount: fixedAmountCommissions.length,
      summary: {
        hasCommissions: totalCommissions > 0,
        lastUpdated: new Date().toISOString()
      }
    };

    return res.json(stats);
  } catch (error) {
    console.error('Overview API error:', error);
    return res.status(500).json({ error: 'Failed to fetch overview data' });
  }
}