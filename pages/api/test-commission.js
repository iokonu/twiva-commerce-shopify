/**
 * Commission Calculator Test API endpoint
 */

import commissionCalculator from '../../lib/commission-calculator';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test product data
    const testProducts = [
      {
        id: '1',
        title: 'iPhone 15 Pro',
        productType: 'Phones',
        vendor: 'Apple',
        price: 999,
        tags: ['smartphone', 'apple']
      },
      {
        id: '2',
        title: 'Gaming Chair',
        productType: 'Furniture',
        vendor: 'Unknown',
        price: 199,
        tags: ['chair', 'gaming']
      },
      {
        id: '3',
        title: 'Random Product',
        productType: 'Unknown',
        vendor: 'Unknown',
        price: 50,
        tags: []
      }
    ];

    const results = testProducts.map(product => {
      const commission = commissionCalculator.calculateCommissionValue(product);
      return {
        product: product.title,
        ...commission
      };
    });

    const allCategories = commissionCalculator.getAllCategories();

    res.status(200).json({
      success: true,
      testResults: results,
      allCategories: allCategories.length,
      sampleCategories: allCategories.slice(0, 10)
    });

  } catch (error) {
    console.error('Commission test API error:', error);
    res.status(500).json({
      error: 'Commission test failed',
      message: error.message
    });
  }
}