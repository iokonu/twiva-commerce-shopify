import { Card, DataTable, Text, Badge, InlineStack } from '@shopify/polaris';

export function CommissionsView({ commissions, onUpdate }) {
  const formatCurrency = (amount, currencyCode = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

  const rows = commissions.map((commission) => [
    commission.type === 'product' ? commission.productTitle : commission.collectionTitle,
    <Badge tone={commission.type === 'product' ? 'info' : 'success'}>
      {commission.type === 'product' ? 'Product' : 'Collection'}
    </Badge>,
    `${commission.commission}%`,
    commission.type === 'product' 
      ? formatCurrency(commission.productPrice || 0, commission.currencyCode)
      : `${commission.productsCount || 0} products`,
    commission.createdAt ? new Date(commission.createdAt).toLocaleDateString() : 'N/A',
  ]);

  return (
    <Card>
      <div style={{ padding: '16px' }}>
        <InlineStack align="space-between">
          <Text variant="headingMd" as="h3">
            Commission Overview
          </Text>
          <Badge tone="info">
            {commissions.length} commission{commissions.length !== 1 ? 's' : ''}
          </Badge>
        </InlineStack>
        
        {commissions.length > 0 ? (
          <div style={{ marginTop: '16px' }}>
            <DataTable
              columnContentTypes={[
                'text',
                'text', 
                'text',
                'text',
                'text',
              ]}
              headings={[
                'Item',
                'Type',
                'Commission',
                'Price/Count',
                'Date Added',
              ]}
              rows={rows}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <Text as="p" tone="subdued">
              No commissions set yet. Go to Products or Collections tabs to set up commissions.
            </Text>
          </div>
        )}
      </div>
    </Card>
  );
}