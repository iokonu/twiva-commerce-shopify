/**
 * Commission Management - Deprecated
 * This file is kept for backward compatibility.
 * All new code should use lib/backend-commissions.js instead.
 */

// Re-export functions from backend-commissions.js
export {
  getProductCommission,
  setProductCommission,
  setCollectionCommission,
  setCategoryCommission,
  removeCommission
} from './backend-commissions';