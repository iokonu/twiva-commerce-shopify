/**
 * Commission Calculator
 * Calculates commission rates based on product categories using JSON configuration
 */

import commissionRates from '../data/commission-rates.json';

const DEFAULT_COMMISSION_RATE = 15; // Default 15% for uncategorized products

class CommissionCalculator {
  constructor() {
    this.rates = commissionRates.commission_rates;
  }

  /**
   * Get commission rate for a product based on its category
   */
  getCommissionRate(productType, subCategory = null) {
    // If no product type, return default
    if (!productType || productType.trim() === '') {
      return {
        rate: DEFAULT_COMMISSION_RATE,
        source: 'default',
        category: 'Uncategorized',
        subCategory: null,
        needsCategorization: true
      };
    }

    // Normalize category names for matching
    const normalizedProductType = this.normalizeCategory(productType);

    // Try to find exact match first
    for (const [mainCategory, subCategories] of Object.entries(this.rates)) {
      const normalizedMainCategory = this.normalizeCategory(mainCategory);

      // Check if productType matches main category
      if (normalizedMainCategory === normalizedProductType) {
        // If there's only one subcategory or no specific subcategory requested
        const subCategoryKeys = Object.keys(subCategories);
        if (subCategoryKeys.length === 1) {
          return {
            rate: subCategories[subCategoryKeys[0]],
            source: 'category',
            category: mainCategory,
            subCategory: subCategoryKeys[0],
            needsCategorization: false
          };
        }

        // Multiple subcategories - return first one as default or try to match
        if (subCategory) {
          const normalizedSubCategory = this.normalizeCategory(subCategory);
          for (const [subCat, rate] of Object.entries(subCategories)) {
            if (this.normalizeCategory(subCat) === normalizedSubCategory) {
              return {
                rate: rate,
                source: 'subcategory',
                category: mainCategory,
                subCategory: subCat,
                needsCategorization: false
              };
            }
          }
        }

        // Return first subcategory as default
        return {
          rate: subCategories[subCategoryKeys[0]],
          source: 'category',
          category: mainCategory,
          subCategory: subCategoryKeys[0],
          needsCategorization: false
        };
      }

      // Check if productType matches any subcategory
      for (const [subCat, rate] of Object.entries(subCategories)) {
        const normalizedSubCategory = this.normalizeCategory(subCat);
        if (normalizedSubCategory === normalizedProductType) {
          return {
            rate: rate,
            source: 'subcategory',
            category: mainCategory,
            subCategory: subCat,
            needsCategorization: false
          };
        }
      }
    }

    // No match found - return default with suggestion to categorize
    return {
      rate: DEFAULT_COMMISSION_RATE,
      source: 'default',
      category: 'Uncategorized',
      subCategory: null,
      needsCategorization: true,
      originalCategory: productType
    };
  }

  /**
   * Get all available categories for display
   */
  getAllCategories() {
    const categories = [];

    for (const [mainCategory, subCategories] of Object.entries(this.rates)) {
      categories.push({
        mainCategory,
        subCategories: Object.keys(subCategories).map(subCat => ({
          name: subCat,
          rate: subCategories[subCat]
        }))
      });
    }

    return categories;
  }

  /**
   * Find suggested category for a product
   */
  suggestCategory(productTitle, productType) {
    const searchText = `${productTitle} ${productType}`.toLowerCase();

    // Simple keyword matching for suggestions
    const suggestions = [];

    for (const [mainCategory, subCategories] of Object.entries(this.rates)) {
      for (const subCat of Object.keys(subCategories)) {
        // Check if any keywords match
        const keywords = this.getCategoryKeywords(mainCategory, subCat);
        const matchCount = keywords.filter(keyword =>
          searchText.includes(keyword.toLowerCase())
        ).length;

        if (matchCount > 0) {
          suggestions.push({
            mainCategory,
            subCategory: subCat,
            rate: subCategories[subCat],
            matchCount
          });
        }
      }
    }

    // Sort by match count and return top suggestions
    return suggestions
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 3);
  }

  /**
   * Get keywords for category matching
   */
  getCategoryKeywords(mainCategory, subCategory) {
    const keywords = [mainCategory, subCategory];

    // Add specific keywords for better matching
    const keywordMap = {
      'Phones': ['phone', 'mobile', 'smartphone', 'iphone', 'android'],
      'Electronics': ['electronic', 'device', 'gadget'],
      'Fashion': ['clothing', 'wear', 'apparel', 'fashion'],
      'Beauty': ['beauty', 'cosmetic', 'makeup', 'skincare'],
      'Home': ['home', 'house', 'living', 'furniture'],
      // Add more as needed
    };

    for (const [key, words] of Object.entries(keywordMap)) {
      if (mainCategory.toLowerCase().includes(key.toLowerCase()) ||
          subCategory.toLowerCase().includes(key.toLowerCase())) {
        keywords.push(...words);
      }
    }

    return keywords;
  }

  /**
   * Normalize category name for matching
   */
  normalizeCategory(category) {
    return category
      .toLowerCase()
      .trim()
      .replace(/[&\s]+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Calculate commission amount
   */
  calculateCommissionAmount(price, rate) {
    return (parseFloat(price) * rate) / 100;
  }

  /**
   * Format commission display
   */
  formatCommissionDisplay(commissionInfo, price) {
    const amount = this.calculateCommissionAmount(price, commissionInfo.rate);

    return {
      ...commissionInfo,
      displayRate: `${commissionInfo.rate}%`,
      commissionAmount: amount.toFixed(2),
      formattedAmount: `$${amount.toFixed(2)}`
    };
  }
}

// Create singleton instance
const commissionCalculator = new CommissionCalculator();

export default commissionCalculator;

// Helper functions
export const getCommissionRate = (productType, subCategory) =>
  commissionCalculator.getCommissionRate(productType, subCategory);

export const getAllCategories = () =>
  commissionCalculator.getAllCategories();

export const suggestCategory = (productTitle, productType) =>
  commissionCalculator.suggestCategory(productTitle, productType);

export const calculateCommissionAmount = (price, rate) =>
  commissionCalculator.calculateCommissionAmount(price, rate);

export const formatCommissionDisplay = (commissionInfo, price) =>
  commissionCalculator.formatCommissionDisplay(commissionInfo, price);