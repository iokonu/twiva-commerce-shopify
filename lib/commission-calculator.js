/**
 * Commission Calculator
 * Uses JSON rates for automatic commission calculation based on product categories
 */

import commissionRatesData from '../data/commission-rates.json';

class CommissionCalculator {
  constructor() {
    this.commissionRates = commissionRatesData.commission_rates;
    this.defaultRate = 15; // 15% for uncategorized products
  }

  /**
   * Calculate commission rate for a product
   */
  calculateCommissionRate(product) {
    try {
      // Try to match product category
      const category = this.matchProductCategory(product);

      if (category) {
        return {
          rate: category.rate,
          category: category.category,
          subcategory: category.subcategory,
          isDefault: false
        };
      }

      // Return default rate for uncategorized
      return {
        rate: this.defaultRate,
        category: 'Other',
        subcategory: 'Uncategorized',
        isDefault: true
      };
    } catch (error) {
      console.error('Error calculating commission rate:', error);
      return {
        rate: this.defaultRate,
        category: 'Other',
        subcategory: 'Error',
        isDefault: true
      };
    }
  }

  /**
   * Calculate commission value for a product
   */
  calculateCommissionValue(product, price = null) {
    const productPrice = price || this.extractProductPrice(product);
    const rateInfo = this.calculateCommissionRate(product);

    const value = (productPrice * rateInfo.rate) / 100;

    return {
      ...rateInfo,
      price: productPrice,
      value: parseFloat(value.toFixed(2))
    };
  }

  /**
   * Match product to category based on product type, tags, and title
   */
  matchProductCategory(product) {
    const productType = (product.productType || '').toLowerCase().trim();
    const tags = (product.tags || []).map(tag => tag.toLowerCase().trim());
    const title = (product.title || '').toLowerCase().trim();
    const vendor = (product.vendor || '').toLowerCase().trim();

    // Search through all categories and subcategories
    for (const [categoryName, subcategories] of Object.entries(this.commissionRates)) {
      for (const [subcategoryName, rate] of Object.entries(subcategories)) {

        // Check exact matches first
        if (this.isExactMatch(productType, categoryName, subcategoryName) ||
            this.isTagMatch(tags, categoryName, subcategoryName) ||
            this.isTitleMatch(title, categoryName, subcategoryName) ||
            this.isVendorMatch(vendor, categoryName, subcategoryName)) {

          return {
            rate: rate,
            category: categoryName,
            subcategory: subcategoryName
          };
        }
      }
    }

    // Try fuzzy matching if no exact match
    for (const [categoryName, subcategories] of Object.entries(this.commissionRates)) {
      for (const [subcategoryName, rate] of Object.entries(subcategories)) {

        if (this.isFuzzyMatch(productType, title, tags, categoryName, subcategoryName)) {
          return {
            rate: rate,
            category: categoryName,
            subcategory: subcategoryName
          };
        }
      }
    }

    return null; // No match found
  }

  /**
   * Check for exact matches in product type
   */
  isExactMatch(productType, category, subcategory) {
    const categoryLower = category.toLowerCase();
    const subcategoryLower = subcategory.toLowerCase();

    return productType === categoryLower ||
           productType === subcategoryLower ||
           productType.includes(categoryLower) ||
           productType.includes(subcategoryLower);
  }

  /**
   * Check for matches in product tags
   */
  isTagMatch(tags, category, subcategory) {
    const categoryLower = category.toLowerCase();
    const subcategoryLower = subcategory.toLowerCase();

    return tags.some(tag =>
      tag === categoryLower ||
      tag === subcategoryLower ||
      tag.includes(categoryLower) ||
      tag.includes(subcategoryLower)
    );
  }

  /**
   * Check for matches in product title
   */
  isTitleMatch(title, category, subcategory) {
    const categoryLower = category.toLowerCase();
    const subcategoryLower = subcategory.toLowerCase();

    return title.includes(categoryLower) || title.includes(subcategoryLower);
  }

  /**
   * Check for matches in vendor name
   */
  isVendorMatch(vendor, category, subcategory) {
    const categoryLower = category.toLowerCase();
    const subcategoryLower = subcategory.toLowerCase();

    return vendor.includes(categoryLower) || vendor.includes(subcategoryLower);
  }

  /**
   * Fuzzy matching with keyword mapping
   */
  isFuzzyMatch(productType, title, tags, category, subcategory) {
    const allText = `${productType} ${title} ${tags.join(' ')}`.toLowerCase();

    // Define keyword mappings for better matching
    const keywordMappings = {
      'phones & tablets': ['phone', 'mobile', 'smartphone', 'tablet', 'ipad', 'iphone', 'android'],
      'phones': ['phone', 'mobile', 'smartphone', 'iphone', 'android'],
      'accessories': ['case', 'cover', 'charger', 'cable', 'accessory', 'screen protector'],
      'appliances': ['appliance', 'refrigerator', 'washing machine', 'dryer', 'dishwasher'],
      'electronics': ['electronic', 'gadget', 'device'],
      'computing & gaming': ['computer', 'laptop', 'desktop', 'gaming', 'console', 'pc'],
      'cameras': ['camera', 'photography', 'lens', 'dslr', 'mirrorless'],
      'tv': ['television', 'tv', 'smart tv', 'monitor', 'display'],
      'audio': ['headphones', 'speaker', 'audio', 'earbuds', 'sound'],
      'fashion': ['clothing', 'fashion', 'apparel', 'wear'],
      'men': ['men', 'mens', 'male', 'gentleman'],
      'women': ['women', 'womens', 'female', 'ladies'],
      'kids & babies': ['kids', 'children', 'baby', 'infant', 'toddler'],
      'shoes': ['shoes', 'sneakers', 'boots', 'sandals', 'footwear'],
      'beauty & health': ['beauty', 'health', 'cosmetics', 'skincare'],
      'makeup': ['makeup', 'cosmetics', 'lipstick', 'foundation'],
      'home & living': ['home', 'house', 'living', 'household'],
      'furniture': ['furniture', 'chair', 'table', 'bed', 'sofa'],
      'sports & outdoors': ['sports', 'outdoor', 'fitness', 'exercise'],
      'automotive': ['car', 'auto', 'vehicle', 'automotive'],
      'groceries': ['food', 'grocery', 'snack', 'beverage'],
      'books': ['book', 'reading', 'literature'],
      'toys & games': ['toy', 'game', 'play', 'puzzle'],
      'pet supplies': ['pet', 'dog', 'cat', 'animal']
    };

    const categoryKey = category.toLowerCase();
    const subcategoryKey = subcategory.toLowerCase();

    const categoryKeywords = keywordMappings[categoryKey] || [];
    const subcategoryKeywords = keywordMappings[subcategoryKey] || [];

    return categoryKeywords.some(keyword => allText.includes(keyword)) ||
           subcategoryKeywords.some(keyword => allText.includes(keyword));
  }

  /**
   * Extract price from product data
   */
  extractProductPrice(product) {
    if (product.price) return parseFloat(product.price);

    if (product.variants && product.variants.length > 0) {
      const variant = product.variants[0];
      return parseFloat(variant.price || 0);
    }

    return 0;
  }

  /**
   * Get all available categories and rates
   */
  getAllCategories() {
    const categories = [];

    for (const [categoryName, subcategories] of Object.entries(this.commissionRates)) {
      for (const [subcategoryName, rate] of Object.entries(subcategories)) {
        categories.push({
          category: categoryName,
          subcategory: subcategoryName,
          rate: rate
        });
      }
    }

    // Add default category
    categories.push({
      category: 'Other',
      subcategory: 'Uncategorized',
      rate: this.defaultRate
    });

    return categories.sort((a, b) => a.category.localeCompare(b.category));
  }

  /**
   * Get commission statistics for a list of products
   */
  getCommissionStats(products) {
    const stats = {
      totalProducts: products.length,
      categorized: 0,
      uncategorized: 0,
      totalCommissionValue: 0,
      averageRate: 0,
      categoryBreakdown: {}
    };

    let totalRate = 0;

    products.forEach(product => {
      const commission = this.calculateCommissionValue(product);

      if (commission.isDefault) {
        stats.uncategorized++;
      } else {
        stats.categorized++;
      }

      stats.totalCommissionValue += commission.value;
      totalRate += commission.rate;

      // Category breakdown
      const categoryKey = `${commission.category} - ${commission.subcategory}`;
      if (!stats.categoryBreakdown[categoryKey]) {
        stats.categoryBreakdown[categoryKey] = {
          count: 0,
          totalValue: 0,
          rate: commission.rate
        };
      }
      stats.categoryBreakdown[categoryKey].count++;
      stats.categoryBreakdown[categoryKey].totalValue += commission.value;
    });

    stats.averageRate = products.length > 0 ? (totalRate / products.length).toFixed(2) : 0;
    stats.totalCommissionValue = parseFloat(stats.totalCommissionValue.toFixed(2));

    return stats;
  }
}

// Create singleton instance
const commissionCalculator = new CommissionCalculator();

export default commissionCalculator;

// Helper functions for easy access
export const calculateCommission = (product, price) => commissionCalculator.calculateCommissionValue(product, price);
export const getCommissionRate = (product) => commissionCalculator.calculateCommissionRate(product);
export const getAllCategories = () => commissionCalculator.getAllCategories();
export const getCommissionStats = (products) => commissionCalculator.getCommissionStats(products);