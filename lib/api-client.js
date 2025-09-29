/**
 * API Client for connecting Shopify app to Laravel backend
 * This replaces local Prisma storage with backend API calls
 */

const API_BASE_URL = process.env.BACKEND_API_URL || 'https://commerce.dev.twiva.com/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async request(method, endpoint, data = null, headers = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Request failed: ${method} ${endpoint}`, error);
      throw error;
    }
  }

  // Shop Management
  async registerShop(shopData) {
    return this.request('POST', '/shops/register', {
      shopId: shopData.id,
      shopUrl: shopData.domain,
      shopName: shopData.name,
      platform: 'shopify'
    });
  }

  async getValidationStatus(shopId) {
    return this.request('GET', `/shops/${shopId}/validation-status`);
  }

  async regenerateCode(shopId) {
    return this.request('POST', '/shops/regenerate-code', { shopId });
  }

  async linkBusiness(oneTimeCode, userId) {
    return this.request('POST', '/shops/link-business', {
      one_time_code: oneTimeCode,
      user_id: userId
    });
  }

  async storeAccessToken(shopId, accessToken, shopData = {}) {
    return this.request('POST', '/shops/store-token', {
      shopId,
      accessToken,
      shopUrl: shopData.domain || shopId,
      shopName: shopData.name || 'Shopify Store'
    });
  }

  async getShop(shopId) {
    return this.request('GET', `/shops/${shopId}`);
  }

  // Product Management
  async syncProduct(shopId, productData) {
    return this.request('POST', '/products/sync', {
      shopId,
      productId: productData.id,
      name: productData.title,
      price: productData.variants?.[0]?.price || 0,
      currency: 'USD', // or get from shop currency
      status: productData.status,
      data: productData,
      lastModified: productData.updatedAt,
      createdAt: productData.createdAt
    });
  }

  async getProducts(shopId, productId = null) {
    const params = new URLSearchParams({ shopId });
    if (productId) params.append('productId', productId);

    return this.request('GET', `/products?${params}`);
  }

  async deleteProduct(shopId, productId) {
    return this.request('DELETE', '/products/delete', {
      shopId,
      productId
    });
  }

  // Commission Management
  async syncCommission(shopId, commissionData) {
    return this.request('POST', '/commissions/sync', {
      shopId,
      productId: commissionData.productId || commissionData.referenceId,
      commissionValue: commissionData.commissionValue,
      commissionRate: commissionData.commissionRate,
      commissionType: commissionData.commissionType || 'percentage',
      currency: commissionData.currency,
      status: commissionData.status || 'active',
      type: commissionData.type || 'product',
      referenceId: commissionData.referenceId,
      applyToProducts: commissionData.applyToProducts || false
    });
  }

  async getCommissions(shopId, filters = {}) {
    const params = new URLSearchParams({ shopId, ...filters });
    return this.request('GET', `/commissions?${params}`);
  }

  async deleteCommission(shopId, productId, type = 'product') {
    return this.request('DELETE', '/commissions', {
      shopId,
      productId,
      type
    });
  }

  // Sales Tracking
  async recordSale(saleData) {
    return this.request('POST', '/sales/record', saleData);
  }

  async updateSaleStatus(updateData) {
    return this.request('PUT', '/sales/update', updateData);
  }

  // Smart Links
  async getSmartlinkData(trackId) {
    return this.request('GET', `/smartlinks/track/${trackId}`);
  }

  async trackClick(clickData) {
    return this.request('POST', '/track-click', clickData);
  }

  // Analytics & Reporting
  async getCommissionPayouts(affiliateId, startDate = null, endDate = null) {
    const params = new URLSearchParams({ affiliateId });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return this.request('GET', `/commissions/payouts?${params}`);
  }

  async markCommissionsPaid(paymentData) {
    return this.request('POST', '/commissions/mark-paid', paymentData);
  }

  // Health & Testing
  async health() {
    return this.request('GET', '/health');
  }

  async test() {
    return this.request('GET', '/test');
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;

// Helper functions for backward compatibility
export const api = {
  // Shop management
  registerShop: (shopData) => apiClient.registerShop(shopData),
  getValidationStatus: (shopId) => apiClient.getValidationStatus(shopId),

  // Product management
  syncProduct: (shopId, productData) => apiClient.syncProduct(shopId, productData),
  getProducts: (shopId, productId) => apiClient.getProducts(shopId, productId),

  // Commission management
  syncCommission: (shopId, commissionData) => apiClient.syncCommission(shopId, commissionData),
  getCommissions: (shopId, filters) => apiClient.getCommissions(shopId, filters),

  // Sales tracking
  recordSale: (saleData) => apiClient.recordSale(saleData),

  // Smart links
  getSmartlinkData: (trackId) => apiClient.getSmartlinkData(trackId),
  trackClick: (clickData) => apiClient.trackClick(clickData)
};