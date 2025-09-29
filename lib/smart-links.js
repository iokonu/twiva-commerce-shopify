/**
 * Smart Link System for Shopify
 * Mirrors the WooCommerce smart link functionality
 * Handles affiliate link generation, tracking, and commission attribution
 */

import apiClient from './api-client';
import salesTracker from './sales-tracker';

class ShopifySmartLinks {
  constructor() {
    this.baseTrackingUrl = process.env.SHOPIFY_APP_URL || 'https://twiva-commerce-shopify.vercel.app';
  }

  /**
   * Generate smart link for a product
   */
  async generateSmartLink(shopId, productId, affiliateId, options = {}) {
    try {
      const linkData = {
        shopId,
        productId,
        affiliateId,
        linkType: options.linkType || 'product',
        customDomain: options.customDomain,
        expiresAt: options.expiresAt,
        trackingParams: options.trackingParams || {}
      };

      // Create smart link in backend
      const response = await apiClient.request('POST', '/api/smartlinks/create', linkData);

      if (response.success) {
        const trackId = response.data.trackId;
        const smartLinkUrl = this.buildTrackingUrl(shopId, productId, trackId, options);

        return {
          success: true,
          smartLink: {
            id: response.data.id,
            trackId: trackId,
            url: smartLinkUrl,
            shortUrl: response.data.shortUrl,
            affiliateId: affiliateId,
            productId: productId,
            shopId: shopId,
            createdAt: response.data.createdAt,
            expiresAt: response.data.expiresAt,
            isActive: response.data.isActive
          }
        };
      }

      return { success: false, error: response.error };
    } catch (error) {
      console.error('Error generating smart link:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Build tracking URL that redirects through our system
   */
  buildTrackingUrl(shopId, productId, trackId, options = {}) {
    const params = new URLSearchParams({
      shop: shopId,
      product: productId,
      track: trackId
    });

    // Add custom tracking parameters
    if (options.trackingParams) {
      Object.entries(options.trackingParams).forEach(([key, value]) => {
        params.append(key, value);
      });
    }

    // Add UTM parameters if provided
    if (options.utm) {
      Object.entries(options.utm).forEach(([key, value]) => {
        params.append(`utm_${key}`, value);
      });
    }

    return `${this.baseTrackingUrl}/api/track/${trackId}?${params.toString()}`;
  }

  /**
   * Handle smart link click (for tracking page)
   */
  async handleSmartLinkClick(trackId, shopId, productId, affiliateId, request) {
    try {
      // Record the click
      const clickData = {
        track_id: trackId,
        shop_id: shopId,
        product_id: productId,
        influencer_id: affiliateId,
        ip_address: this.getClientIP(request),
        user_agent: request.headers['user-agent'] || '',
        referrer: request.headers['referer'] || '',
        clicked_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        device_info: this.getDeviceInfoFromRequest(request)
      };

      await apiClient.trackClick(clickData);

      // Initialize frontend tracking
      const trackingScript = this.generateTrackingScript(trackId, affiliateId, productId, shopId);

      // Get shop domain for redirect
      const shopDomain = await this.getShopDomain(shopId);
      const redirectUrl = await this.buildShopifyProductUrl(shopDomain, productId);

      return {
        success: true,
        redirectUrl,
        trackingScript
      };
    } catch (error) {
      console.error('Error handling smart link click:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate tracking script to inject into product page
   */
  generateTrackingScript(trackId, affiliateId, productId, shopId) {
    return `
      <script>
        (function() {
          // Initialize Shopify commission tracking
          if (typeof window !== 'undefined') {
            const trackingData = {
              track_id: '${trackId}',
              affiliate_id: '${affiliateId}',
              product_id: '${productId}',
              shop_id: '${shopId}',
              timestamp: Date.now(),
              expires_at: Date.now() + (24 * 60 * 60 * 1000)
            };

            // Set tracking cookie
            const expires = new Date(trackingData.expires_at);
            const cookieValue = JSON.stringify(trackingData);
            document.cookie = 'shopify_commission_track=' + encodeURIComponent(cookieValue) +
              '; expires=' + expires.toUTCString() + '; path=/; SameSite=Lax';

            // Set session storage
            try {
              sessionStorage.setItem('shopify_commission_tracking', JSON.stringify(trackingData));
            } catch (e) {
              console.log('Session storage not available');
            }

            // Track page view
            console.log('Shopify commission tracking initialized:', trackingData);
          }
        })();
      </script>
    `;
  }

  /**
   * Get smart link performance data
   */
  async getSmartLinkPerformance(linkId, dateRange = {}) {
    try {
      const params = new URLSearchParams({
        linkId,
        ...dateRange
      });

      const response = await apiClient.request('GET', `/api/smartlinks/performance?${params}`);

      if (response.success) {
        return {
          success: true,
          data: {
            linkId: linkId,
            totalClicks: response.data.totalClicks,
            uniqueClicks: response.data.uniqueClicks,
            conversions: response.data.conversions,
            conversionRate: response.data.conversionRate,
            totalEarnings: response.data.totalEarnings,
            averageOrderValue: response.data.averageOrderValue,
            clicksByDate: response.data.clicksByDate,
            conversionsByDate: response.data.conversionsByDate
          }
        };
      }

      return { success: false, error: response.error };
    } catch (error) {
      console.error('Error fetching smart link performance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all smart links for an affiliate
   */
  async getAffiliateSmartLinks(affiliateId, filters = {}) {
    try {
      const params = new URLSearchParams({
        affiliateId,
        ...filters
      });

      const response = await apiClient.request('GET', `/api/smartlinks/affiliate?${params}`);

      if (response.success) {
        return {
          success: true,
          data: response.data.map(link => ({
            id: link.id,
            trackId: link.trackId,
            url: link.url,
            productId: link.productId,
            productName: link.productName,
            shopId: link.shopId,
            shopName: link.shopName,
            totalClicks: link.totalClicks,
            totalEarnings: link.totalEarnings,
            conversionRate: link.conversionRate,
            isActive: link.isActive,
            createdAt: link.createdAt,
            expiresAt: link.expiresAt
          }))
        };
      }

      return { success: false, error: response.error };
    } catch (error) {
      console.error('Error fetching affiliate smart links:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update smart link status
   */
  async updateSmartLinkStatus(linkId, status) {
    try {
      const response = await apiClient.request('PUT', `/api/smartlinks/${linkId}/status`, {
        status
      });

      return response;
    } catch (error) {
      console.error('Error updating smart link status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete smart link
   */
  async deleteSmartLink(linkId) {
    try {
      const response = await apiClient.request('DELETE', `/api/smartlinks/${linkId}`);
      return response;
    } catch (error) {
      console.error('Error deleting smart link:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Build Shopify product URL
   */
  async buildShopifyProductUrl(shopDomain, productId) {
    try {
      // For now, build a simple product URL
      // In a real implementation, you might fetch the product handle from Shopify
      return `https://${shopDomain}/products/${productId}`;
    } catch (error) {
      console.error('Error building Shopify product URL:', error);
      return `https://${shopDomain}`;
    }
  }

  /**
   * Get shop domain from shop ID
   */
  async getShopDomain(shopId) {
    try {
      // This should query your shop data
      // For now, assume the shopId is the subdomain
      if (shopId.includes('.')) {
        return shopId;
      }
      return `${shopId}.myshopify.com`;
    } catch (error) {
      console.error('Error getting shop domain:', error);
      return `${shopId}.myshopify.com`;
    }
  }

  /**
   * Get client IP from request
   */
  getClientIP(request) {
    return request.headers['x-forwarded-for']?.split(',')[0] ||
           request.headers['x-real-ip'] ||
           request.connection?.remoteAddress ||
           '0.0.0.0';
  }

  /**
   * Get device info from request
   */
  getDeviceInfoFromRequest(request) {
    return {
      userAgent: request.headers['user-agent'] || '',
      acceptLanguage: request.headers['accept-language'] || '',
      referer: request.headers['referer'] || '',
      timestamp: Date.now()
    };
  }
}

// Create singleton instance
const smartLinks = new ShopifySmartLinks();

export default smartLinks;

// Helper functions
export const generateSmartLink = (shopId, productId, affiliateId, options) =>
  smartLinks.generateSmartLink(shopId, productId, affiliateId, options);

export const handleSmartLinkClick = (trackId, shopId, productId, affiliateId, request) =>
  smartLinks.handleSmartLinkClick(trackId, shopId, productId, affiliateId, request);

export const getSmartLinkPerformance = (linkId, dateRange) =>
  smartLinks.getSmartLinkPerformance(linkId, dateRange);

export const getAffiliateSmartLinks = (affiliateId, filters) =>
  smartLinks.getAffiliateSmartLinks(affiliateId, filters);