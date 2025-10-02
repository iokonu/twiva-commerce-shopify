/**
 * Sales Tracker for Shopify
 * Mirrors the WooCommerce sales tracking functionality
 * Tracks orders and attributes them to affiliates via smart links
 */

import apiClient from './api-client';
import { getShopFromBackend, getShopCurrency } from './shopify-helpers';
import commissionCalculator from './commission-calculator';

class ShopifySalesTracker {
  constructor() {
    this.trackingCookieName = 'shopify_commission_track';
    this.sessionStorageKey = 'shopify_commission_tracking';
  }

  /**
   * Initialize sales tracking for frontend
   * This should be called on product pages when smart links are clicked
   */
  initializeTracking(trackId, affiliateId, productId, expiresInHours = 24) {
    if (typeof window === 'undefined') return; // Server-side check

    const trackingData = {
      track_id: trackId,
      affiliate_id: affiliateId,
      product_id: productId,
      timestamp: Date.now(),
      expires_at: Date.now() + (expiresInHours * 60 * 60 * 1000)
    };

    // Store in both cookie and sessionStorage for reliability
    this.setTrackingCookie(trackingData);
    this.setSessionTracking(trackingData);

    // Record the click
    this.recordClick(trackingData);
  }

  /**
   * Set tracking cookie
   */
  setTrackingCookie(trackingData) {
    if (typeof document === 'undefined') return;

    const expires = new Date(trackingData.expires_at);
    const cookieValue = JSON.stringify(trackingData);

    document.cookie = `${this.trackingCookieName}=${encodeURIComponent(cookieValue)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  }

  /**
   * Set session storage tracking
   */
  setSessionTracking(trackingData) {
    if (typeof window === 'undefined') return;

    try {
      window.sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(trackingData));
    } catch (error) {
      console.error('Failed to set session tracking:', error);
    }
  }

  /**
   * Get current tracking data
   */
  getTrackingData() {
    // Try session storage first
    let trackingData = this.getSessionTracking();

    // Fallback to cookie
    if (!trackingData) {
      trackingData = this.getTrackingCookie();
    }

    // Check if expired
    if (trackingData && Date.now() > trackingData.expires_at) {
      this.clearTracking();
      return null;
    }

    return trackingData;
  }

  /**
   * Get tracking from session storage
   */
  getSessionTracking() {
    if (typeof window === 'undefined') return null;

    try {
      const data = window.sessionStorage.getItem(this.sessionStorageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get tracking from cookie
   */
  getTrackingCookie() {
    if (typeof document === 'undefined') return null;

    try {
      const name = this.trackingCookieName + '=';
      const decodedCookie = decodeURIComponent(document.cookie);
      const cookies = decodedCookie.split(';');

      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(name) === 0) {
          const value = cookie.substring(name.length);
          return JSON.parse(decodeURIComponent(value));
        }
      }
    } catch (error) {
      console.error('Error reading tracking cookie:', error);
    }

    return null;
  }

  /**
   * Clear tracking data
   */
  clearTracking() {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(this.sessionStorageKey);
      } catch (error) {
        // Ignore
      }
    }

    if (typeof document !== 'undefined') {
      document.cookie = `${this.trackingCookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  }

  /**
   * Record click in backend
   */
  async recordClick(trackingData) {
    try {
      const clickData = {
        track_id: trackingData.track_id,
        shop_id: trackingData.shop_id, // Should be passed in trackingData
        product_id: trackingData.product_id,
        influencer_id: trackingData.affiliate_id,
        ip_address: await this.getClientIP(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        clicked_at: new Date(trackingData.timestamp).toISOString(),
        expires_at: new Date(trackingData.expires_at).toISOString(),
        device_info: this.getDeviceInfo()
      };

      await apiClient.trackClick(clickData);
    } catch (error) {
      console.error('Failed to record click:', error);
    }
  }

  /**
   * Process order for sales tracking (called from webhook)
   */
  async processOrder(orderData, trackingData = null) {
    try {
      // If no tracking data provided, try to get from order metadata or customer
      if (!trackingData) {
        trackingData = await this.findTrackingForOrder(orderData);
      }

      if (!trackingData) {
        console.log('No tracking data found for order:', orderData.id);
        return false;
      }

      // Get shop details
      const shopData = await getShopFromBackend(orderData.shop_id || trackingData.shop_id);
      if (!shopData) {
        console.error('Shop data not found');
        return false;
      }

      // Get shop currency
      const currency = await getShopCurrency(shopData.id);

      // Process each line item (Shopify orders can have multiple products)
      for (const lineItem of orderData.line_items || []) {
        await this.recordSaleForLineItem(orderData, lineItem, trackingData, currency);
      }

      return true;
    } catch (error) {
      console.error('Error processing order for sales tracking:', error);
      return false;
    }
  }

  /**
   * Record sale for individual line item
   */
  async recordSaleForLineItem(orderData, lineItem, trackingData, currency) {
    try {
      // Build product data for commission calculation
      const productData = {
        id: lineItem.product_id,
        title: lineItem.title || lineItem.name,
        productType: lineItem.product_type || '',
        vendor: lineItem.vendor || '',
        price: parseFloat(lineItem.price),
        tags: lineItem.properties?.tags || []
      };

      // Calculate commission using our commission calculator
      const commission = commissionCalculator.calculateCommissionValue(productData);

      const saleData = {
        shopId: trackingData.shop_id,
        orderId: orderData.id.toString(),
        orderNumber: orderData.order_number || orderData.name,
        productId: lineItem.product_id.toString(),
        variantId: lineItem.variant_id ? lineItem.variant_id.toString() : null,
        productTitle: lineItem.title || lineItem.name,
        quantity: lineItem.quantity,
        price: parseFloat(lineItem.price),
        totalAmount: parseFloat(lineItem.price) * lineItem.quantity,
        commissionRate: commission.rate,
        commissionValue: commission.value * lineItem.quantity,
        commissionCategory: commission.category,
        commissionSubcategory: commission.subcategory,
        isDefaultRate: commission.isDefault,
        currency: currency,
        customerEmail: orderData.customer?.email || orderData.email,
        orderDate: orderData.created_at,
        status: orderData.financial_status || 'pending',
        trackingData: {
          trackId: trackingData.track_id,
          affiliateId: trackingData.affiliate_id,
          referrer: null
        }
      };

      const result = await apiClient.recordSale(saleData);

      if (result.success) {
        console.log(`Sale recorded: ${lineItem.title} - $${commission.value.toFixed(2)} commission (${commission.rate}% - ${commission.isDefault ? 'default' : commission.category})`);
        return result;
      } else {
        console.error('Failed to record sale:', result);
        return null;
      }
    } catch (error) {
      console.error('Error recording sale for line item:', error);
      return null;
    }
  }

  /**
   * Handle order status updates (refunds, cancellations, etc.)
   */
  async handleOrderStatusUpdate(orderData, fromStatus, toStatus) {
    try {
      const updateData = {
        shopId: orderData.shop_id,
        orderId: orderData.id,
        fromStatus: fromStatus,
        toStatus: toStatus,
        orderTotal: parseFloat(orderData.total_price || 0)
      };

      // Handle refunds
      if (orderData.refunds && orderData.refunds.length > 0) {
        const totalRefunded = orderData.refunds.reduce((sum, refund) =>
          sum + parseFloat(refund.amount || 0), 0
        );
        updateData.refundAmount = totalRefunded;
        updateData.refundDate = new Date().toISOString();
      }

      await apiClient.updateSaleStatus(updateData);
    } catch (error) {
      console.error('Error handling order status update:', error);
    }
  }

  /**
   * Find tracking data for an order
   * This attempts to match orders with recent clicks using various methods
   */
  async findTrackingForOrder(orderData) {
    try {
      // Method 1: Check order attributes for tracking data
      if (orderData.note_attributes) {
        for (const attr of orderData.note_attributes) {
          if (attr.name === 'commission_track_id') {
            return {
              track_id: attr.value,
              shop_id: orderData.shop_id
            };
          }
        }
      }

      // Method 2: Try to match with recent smart link clicks
      // This is similar to the WooCommerce smart link matching
      const customerEmail = orderData.customer?.email || orderData.email;
      const orderDate = new Date(orderData.created_at);
      const orderTotal = parseFloat(orderData.total_price || 0);

      // Get recent clicks for this shop
      const recentClicks = await this.getRecentClicksForShop(orderData.shop_id);

      for (const click of recentClicks) {
        const clickDate = new Date(click.clicked_at);
        const timeDiff = orderDate.getTime() - clickDate.getTime();

        // Match within 24 hours and validate with product
        if (timeDiff > 0 && timeDiff < (24 * 60 * 60 * 1000)) {
          // Check if any line item matches the clicked product
          const hasMatchingProduct = orderData.line_items?.some(item =>
            item.product_id.toString() === click.productId.toString()
          );

          if (hasMatchingProduct || !click.productId) {
            return {
              track_id: click.track_id,
              shop_id: click.shopId,
              affiliate_id: click.influencer_id
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding tracking for order:', error);
      return null;
    }
  }

  /**
   * Get recent clicks for a shop (helper for smart matching)
   */
  async getRecentClicksForShop(shopId, hours = 48) {
    try {
      // This would need to be implemented in the backend API
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error fetching recent clicks:', error);
      return [];
    }
  }

  /**
   * Get client IP address
   */
  async getClientIP() {
    try {
      // In a real implementation, you might use a service to get the IP
      // For now, return a placeholder
      return '0.0.0.0';
    } catch (error) {
      return '0.0.0.0';
    }
  }

  /**
   * Get device information
   */
  getDeviceInfo() {
    if (typeof navigator === 'undefined') return {};

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      screenResolution: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
}

// Create singleton instance
const salesTracker = new ShopifySalesTracker();

export default salesTracker;

// Helper functions for webhook handlers
export const processOrderWebhook = (orderData, trackingData) =>
  salesTracker.processOrder(orderData, trackingData);

export const handleOrderStatusChange = (orderData, fromStatus, toStatus) =>
  salesTracker.handleOrderStatusUpdate(orderData, fromStatus, toStatus);

// Frontend initialization function
export const initializeTracking = (trackId, affiliateId, productId, shopId, expiresInHours) => {
  if (typeof window !== 'undefined') {
    salesTracker.initializeTracking(trackId, affiliateId, productId, shopId, expiresInHours);
  }
};

// Get current tracking for checkout
export const getCurrentTracking = () => salesTracker.getTrackingData();