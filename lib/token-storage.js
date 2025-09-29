/**
 * In-memory token storage for Shopify access tokens
 * This replaces the Prisma database for storing access tokens
 * Note: In production, you might want to use Redis or another persistent store
 */

// In-memory storage for access tokens
const tokenStore = new Map();

export function storeAccessToken(shopId, accessToken) {
  tokenStore.set(shopId, {
    accessToken,
    updatedAt: new Date()
  });
  console.log(`Stored access token for shop: ${shopId}`);
}

export function getAccessToken(shopId) {
  const tokenData = tokenStore.get(shopId);
  if (tokenData) {
    console.log(`Retrieved access token for shop: ${shopId}`);
    return tokenData.accessToken;
  }
  console.log(`No access token found for shop: ${shopId}`);
  return null;
}

export function removeAccessToken(shopId) {
  const removed = tokenStore.delete(shopId);
  if (removed) {
    console.log(`Removed access token for shop: ${shopId}`);
  }
  return removed;
}

export function getAllShops() {
  return Array.from(tokenStore.keys());
}

export function hasValidToken(shopId) {
  return tokenStore.has(shopId);
}