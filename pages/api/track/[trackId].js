/**
 * Smart Link Tracking Handler
 * Handles affiliate link clicks and redirects to product pages
 * Similar to WooCommerce smart link functionality
 */

import { handleSmartLinkClick } from '../../../lib/smart-links';
import apiClient from '../../../lib/api-client';

export default async function handler(req, res) {
  const { trackId } = req.query;
  const { shop, product, redirect_to } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get smart link data from backend
    const linkResponse = await apiClient.getSmartlinkData(trackId);

    if (!linkResponse.success) {
      console.error('Smart link not found:', trackId);
      // Redirect to shop homepage as fallback
      const fallbackUrl = shop ? `https://${shop}.myshopify.com` : 'https://twiva.com';
      return res.redirect(302, fallbackUrl);
    }

    const linkData = linkResponse.data;
    const shopId = linkData.shopId;
    const productId = linkData.productId || product;
    const affiliateId = linkData.affiliateId;

    // Handle the click tracking
    const clickResult = await handleSmartLinkClick(
      trackId,
      shopId,
      productId,
      affiliateId,
      req
    );

    if (!clickResult.success) {
      console.error('Failed to handle smart link click:', clickResult.error);
    }

    // Determine redirect URL
    let redirectUrl;

    if (redirect_to) {
      // Custom redirect URL provided
      redirectUrl = decodeURIComponent(redirect_to);
    } else if (clickResult.redirectUrl) {
      // Built redirect URL from click handler
      redirectUrl = clickResult.redirectUrl;
    } else {
      // Fallback to shop homepage
      const shopDomain = shopId.includes('.') ? shopId : `${shopId}.myshopify.com`;
      redirectUrl = `https://${shopDomain}`;
    }

    // Add tracking script injection if it's a product page
    if (productId && redirectUrl.includes('/products/')) {
      // For Shopify, we need to inject tracking via URL parameters
      // The product page will need to handle these parameters
      const url = new URL(redirectUrl);
      url.searchParams.set('twiva_track', trackId);
      url.searchParams.set('twiva_affiliate', affiliateId);
      url.searchParams.set('twiva_product', productId);
      redirectUrl = url.toString();
    }

    console.log('Redirecting smart link click:', {
      trackId,
      shopId,
      productId,
      affiliateId,
      redirectUrl
    });

    // Perform the redirect
    return res.redirect(302, redirectUrl);

  } catch (error) {
    console.error('Error processing smart link click:', error);

    // Fallback redirect on error
    const fallbackUrl = shop ? `https://${shop}.myshopify.com` : 'https://twiva.com';
    return res.redirect(302, fallbackUrl);
  }
}

// Add CORS headers for tracking
export const config = {
  api: {
    externalResolver: true,
  },
}