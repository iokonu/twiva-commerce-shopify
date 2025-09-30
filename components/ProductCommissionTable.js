import { useState, useEffect } from 'react';
import {
  Card,
  DataTable,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Button,
  TextField,
  Banner,
  Tooltip,
  Icon
} from '@shopify/polaris';
import { AlertTriangleIcon, InfoIcon } from '@shopify/polaris-icons';
import commissionCalculator from '../lib/commission-calculator';

export default function ProductCommissionTable({ products, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);

  useEffect(() => {
    if (!products) return;

    // Filter products based on search term
    const filtered = products.filter(product =>
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.productType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.vendor || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  // Calculate commission info for each product
  const getProductCommissionInfo = (product) => {
    const commissionInfo = commissionCalculator.getCommissionRate(product.productType);
    const price = product.variants?.edges?.[0]?.node?.price || product.priceRange?.minVariantPrice?.amount || 0;
    return commissionCalculator.formatCommissionDisplay(commissionInfo, price);
  };

  const productRows = filteredProducts.map((product) => {
    const commissionInfo = getProductCommissionInfo(product);
    const price = product.variants?.edges?.[0]?.node?.price || product.priceRange?.minVariantPrice?.amount || 0;

    return [
      // Product Image & Title
      <div key={`title-${product.id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {product.images?.edges?.[0] && (
          <img
            src={product.images.edges[0].node.url}
            alt={product.title}
            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
          />
        )}
        <div>
          <Text variant="bodyMd" fontWeight="medium">
            {product.title}
          </Text>
          <Text variant="bodySm" tone="subdued">
            {product.vendor || 'No vendor'}
          </Text>
        </div>
      </div>,

      // Product Type/Category
      <div key={`category-${product.id}`}>
        {commissionInfo.needsCategorization ? (
          <InlineStack gap="200" blockAlign="center">
            <Badge tone="attention">Uncategorized</Badge>
            <Tooltip content="This product needs to be categorized for proper commission rates">
              <Icon source={AlertTriangleIcon} tone="caution" />
            </Tooltip>
          </InlineStack>
        ) : (
          <div>
            <Text variant="bodyMd">
              {commissionInfo.category}
            </Text>
            {commissionInfo.subCategory && (
              <Text variant="bodySm" tone="subdued">
                {commissionInfo.subCategory}
              </Text>
            )}
          </div>
        )}
      </div>,

      // Price
      <Text key={`price-${product.id}`} variant="bodyMd">
        ${parseFloat(price).toFixed(2)}
      </Text>,

      // Commission Rate
      <div key={`rate-${product.id}`}>
        <InlineStack gap="200" blockAlign="center">
          <Badge tone={commissionInfo.needsCategorization ? 'attention' : 'success'}>
            {commissionInfo.displayRate}
          </Badge>
          {commissionInfo.source === 'default' && (
            <Tooltip content="Default rate applied. Categorize product for specific commission rate.">
              <Icon source={InfoIcon} tone="base" />
            </Tooltip>
          )}
        </InlineStack>
      </div>,

      // Commission Amount
      <Text key={`amount-${product.id}`} variant="bodyMd" fontWeight="medium">
        {commissionInfo.formattedAmount}
      </Text>,

      // Status/Action
      <div key={`status-${product.id}`}>
        {commissionInfo.needsCategorization ? (
          <Badge tone="attention">Needs Categorization</Badge>
        ) : (
          <Badge tone="success">Configured</Badge>
        )}
      </div>
    ];
  });

  const uncategorizedCount = filteredProducts.filter(product => {
    const commissionInfo = commissionCalculator.getCommissionRate(product.productType);
    return commissionInfo.needsCategorization;
  }).length;

  if (loading) {
    return (
      <Card>
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <Text variant="bodyMd" tone="subdued">
            Loading products...
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <BlockStack gap="400">
      {/* Summary Banner */}
      {uncategorizedCount > 0 && (
        <Banner status="warning">
          <Text variant="bodyMd">
            <strong>{uncategorizedCount} product{uncategorizedCount !== 1 ? 's' : ''}</strong> {uncategorizedCount !== 1 ? 'are' : 'is'} uncategorized and {uncategorizedCount !== 1 ? 'are' : 'is'} using the default 15% commission rate.
            Categorize these products in your Shopify admin to apply the correct commission rates.
          </Text>
        </Banner>
      )}

      <Card>
        <BlockStack gap="400">
          {/* Header and Search */}
          <InlineStack distribution="spaceBetween" blockAlign="center">
            <div>
              <Text variant="headingMd" as="h3">
                Product Commission Overview
              </Text>
              <Text variant="bodySm" tone="subdued">
                Commission rates are automatically calculated based on product categories
              </Text>
            </div>
          </InlineStack>

          {/* Search */}
          <div style={{ maxWidth: '400px' }}>
            <TextField
              placeholder="Search products..."
              value={searchTerm}
              onChange={setSearchTerm}
              clearButton
              onClearButtonClick={() => setSearchTerm('')}
            />
          </div>

          {/* Products Table */}
          {filteredProducts.length > 0 ? (
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
              headings={[
                'Product',
                'Category',
                'Price',
                'Commission Rate',
                'Commission Amount',
                'Status'
              ]}
              rows={productRows}
              pagination={{
                hasNext: false,
                hasPrevious: false,
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <Text variant="bodyMd" tone="subdued">
                {searchTerm ? 'No products found matching your search.' : 'No products found.'}
              </Text>
            </div>
          )}

          {/* Commission Rates Information */}
          <Card background="bg-surface-secondary">
            <BlockStack gap="200">
              <Text variant="bodyMd" fontWeight="medium">
                How Commission Rates Work:
              </Text>
              <div style={{ marginLeft: '16px' }}>
                <Text variant="bodySm" tone="subdued">
                  • Commission rates are automatically applied based on product categories (productType in Shopify)
                </Text>
                <Text variant="bodySm" tone="subdued">
                  • Uncategorized products receive a default 15% commission rate
                </Text>
                <Text variant="bodySm" tone="subdued">
                  • To change commission rates, update the product's category in your Shopify admin
                </Text>
                <Text variant="bodySm" tone="subdued">
                  • Commission rates range from 4% to 15% depending on the product category
                </Text>
              </div>
            </BlockStack>
          </Card>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}