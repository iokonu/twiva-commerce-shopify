import { prisma } from '../../../lib/prisma';
import shopify from '../../../lib/shopify';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop, page = '1', limit = '20' } = req.query;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter required' });
    }

    const shopRecord = await prisma.shop.findUnique({
      where: { id: shop }
    });

    if (!shopRecord || !shopRecord.accessToken || shopRecord.accessToken === 'temp_token') {
      return res.status(401).json({ 
        error: 'Shopify authentication required',
        authUrl: `/api/auth?shop=${shop}` 
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const [productCommissions, totalCount] = await Promise.all([
      prisma.productCommission.findMany({
        where: { shopId: shop },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limitNum
      }),
      prisma.productCommission.count({
        where: { shopId: shop }
      })
    ]);
    
    const totalPages = Math.ceil(totalCount / limitNum);

    const client = new shopify.clients.Graphql({
      session: {
        shop: shopRecord.domain,
        accessToken: shopRecord.accessToken,
      },
    });

    const productIds = productCommissions.map(c => c.productId);

    let products = [];

    if (productIds.length > 0) {
      const productQuery = `
        query getProductsByIds($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
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

      const productResponse = await client.query({
        data: {
          query: productQuery,
          variables: { ids: productIds }
        }
      });

      products = productResponse.body.data.nodes.filter(node => node);
    }

    // Collections don't have separate records anymore

    const enrichedCommissions = productCommissions.map(commission => {
      const product = products.find(p => p.id === commission.productId);
      const price = parseFloat(product?.priceRangeV2?.minVariantPrice?.amount || 0);
      
      // Calculate commission amount based on type
      let commissionAmount = 0;
      if (commission.commissionType === 'amount') {
        commissionAmount = commission.commissionValue;
      } else {
        commissionAmount = (price * commission.commissionValue) / 100;
      }
      
      return {
        id: commission.id,
        type: 'product',
        commission: commission.commissionValue,
        commissionType: commission.commissionType,
        commissionAmount: commissionAmount,
        productId: commission.productId,
        productTitle: commission.productTitle || product?.title || 'Unknown Product',
        productPrice: price,
        currencyCode: product?.priceRangeV2?.minVariantPrice?.currencyCode || 'KES',
        createdAt: commission.createdAt,
        updatedAt: commission.updatedAt
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      commissions: enrichedCommissions,
      summary: {
        totalCommissions: totalCount,
        productCommissions: productCommissions.length,
        collectionCommissions: 0
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: totalPages,
        totalCount: totalCount
      }
    });
  } catch (error) {
    console.error('Commissions list API error:', error);
    return res.status(500).json({ error: 'Failed to fetch commissions' });
  }
}