import { useState } from 'react';
import { Card, FormLayout, TextField, Button, BlockStack, InlineStack, Badge, Text, Thumbnail, RadioButton } from '@shopify/polaris';

export function ProductCommissionForm({ product, onSave, onRemove }) {
  const [commission, setCommission] = useState(
    product.commission?.commission?.toString() || ''
  );
  const [commissionType, setCommissionType] = useState(
    product.commission?.commissionType || 'percentage'
  );
  const [loading, setLoading] = useState(false);

  const formatPrice = (priceRange) => {
    if (!priceRange) return 'No price available';
    
    const minPrice = parseFloat(priceRange.minVariantPrice.amount);
    const maxPrice = parseFloat(priceRange.maxVariantPrice.amount);
    const currency = priceRange.minVariantPrice.currencyCode;
    
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
      }).format(amount);
    };
    
    if (minPrice === maxPrice) {
      return formatCurrency(minPrice);
    } else {
      return `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;
    }
  };

  const handleSave = async () => {
    if (!commission || isNaN(commission)) return;
    
    setLoading(true);
    try {
      await onSave(product.id, {
        commission: parseFloat(commission),
        commissionType,
        currency: 'KES'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!product.commission) return;
    
    setLoading(true);
    try {
      await onRemove(product.commission.source, product.commission.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div style={{ padding: '16px' }}>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="start">
            <InlineStack gap="300" blockAlign="start">
              {product.featuredImage && (
                <Thumbnail
                  source={product.featuredImage.url}
                  alt={product.featuredImage.altText || product.title}
                  size="small"
                />
              )}
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">{product.title}</Text>
                <Text as="p" tone="subdued">{formatPrice(product.priceRangeV2)}</Text>
                {product.description && (
                  <Text as="p" tone="subdued" truncate>
                    {product.description.substring(0, 100)}{product.description.length > 100 ? '...' : ''}
                  </Text>
                )}
              </BlockStack>
            </InlineStack>
            {product.commission && (
              <Badge tone={product.commission.source === 'product' ? 'success' : 'info'}>
                {product.commission.source === 'product' ? 'Product Rule' : 'Collection Rule'}
              </Badge>
            )}
          </InlineStack>
          
          <FormLayout>
            <Text variant="headingXs" as="h4">Commission Type</Text>
            <BlockStack gap="200">
              <RadioButton
                label="Percentage (%)"
                checked={commissionType === 'percentage'}
                id="percentage"
                name="commissionType"
                onChange={() => setCommissionType('percentage')}
              />
              <RadioButton
                label="Fixed Amount (KES)"
                checked={commissionType === 'fixed'}
                id="fixed"
                name="commissionType"
                onChange={() => setCommissionType('fixed')}
              />
            </BlockStack>
            
            <TextField
              label={commissionType === 'percentage' ? 'Commission Percentage (%)' : 'Commission Amount (KES)'}
              type="number"
              value={commission}
              onChange={setCommission}
              placeholder={commissionType === 'percentage' ? 'e.g., 10.5' : 'e.g., 1500'}
              helpText={
                product.commission?.source === 'collection'
                  ? `Currently using collection rule: ${product.commission.commission}${product.commission.commissionType === 'percentage' ? '%' : ' KES'}`
                  : commissionType === 'percentage' 
                    ? 'Set commission percentage for this product'
                    : 'Set fixed commission amount in KES'
              }
              step={commissionType === 'percentage' ? '0.1' : '1'}
            />
            
            <InlineStack gap="200">
              <Button
                variant="primary"
                onClick={handleSave}
                loading={loading}
                disabled={!commission || isNaN(commission)}
              >
                Set Commission
              </Button>
              
              {product.commission?.source === 'product' && (
                <Button
                  tone="critical"
                  onClick={handleRemove}
                  loading={loading}
                >
                  Remove
                </Button>
              )}
            </InlineStack>
          </FormLayout>
        </BlockStack>
      </div>
    </Card>
  );
}