import { Card, DataTable, Text, Badge, InlineStack, Grid, Button } from '@shopify/polaris';

export function CommissionsOverview({ stats, commissions, onRefresh, showTable = false }) {
  const formatCurrency = (amount, currencyCode = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const StatCard = ({ title, value, subtitle, tone = 'default' }) => (
    <Card>
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <Text variant="headingXs" as="h4" tone="subdued">{title}</Text>
        <Text variant="headingLg" as="h2" tone={tone}>{value}</Text>
        {subtitle && (
          <Text as="p" tone="subdued">{subtitle}</Text>
        )}
      </div>
    </Card>
  );

  const commissionRows = showTable && commissions ? commissions.map((commission) => {
    const isPercentage = commission.commissionType === 'percentage';
    const commissionDisplay = isPercentage 
      ? `${commission.commission}%`
      : `${commission.commission}`;
    
    const commissionAmount = commission.commissionAmount 
      ? formatCurrency(commission.commissionAmount, commission.currencyCode)
      : 'N/A';
    
    return [
      commission.type === 'product' ? commission.productTitle : commission.collectionTitle,
      <Badge tone={isPercentage ? 'info' : 'warning'}>
        {isPercentage ? 'Percentage' : 'Amount'}
      </Badge>,
      commissionDisplay,
      commission.type === 'product' 
        ? formatCurrency(commission.productPrice || 0, commission.currencyCode)
        : `${commission.productsCount || 0} products`,
      commissionAmount,
      commission.createdAt ? new Date(commission.createdAt).toLocaleDateString() : 'N/A',
    ];
  }) : [];

  return (
    <div>
      {/* Stats Overview*/}
      {!showTable && (
        <Card>
          <div style={{ padding: '16px' }}>
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="headingMd" as="h3">
                Commission Overview
              </Text>
              <Button onClick={onRefresh}>Refresh</Button>
            </InlineStack>
            
            <div style={{ marginTop: '16px' }}>
              <Grid>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <StatCard
                    title="Products with Commissions"
                    value={stats.totalCommissions || 0}
                    subtitle="Total number of products with commissions"
                  />
                </Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <StatCard
                    title="Products Without Commissions"
                    value={stats.productsWithoutCommissions || 0}
                    subtitle="Products needing commission setup"
                    tone="info"
                  />
                </Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <StatCard
                    title="Collection Commissions"
                    value={stats.collectionCommissions || 0}
                    subtitle="Collection-wide rules"
                    tone="success"
                  />
                </Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <StatCard
                    title="Total Commissions Amount"
                    value={formatCurrency(stats.totalPotentialEarnings || 0)}
                    subtitle="Based on current prices"
                    tone="warning"
                  />
                </Grid.Cell>
              </Grid>
            </div>

            {(stats.percentageCommissionsCount > 0 || stats.fixedAmountCommissionsCount > 0) && (
              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                {stats.percentageCommissionsCount > 0 && (
                  <InlineStack gap="400" align="space-between">
                    <Text variant="headingXs" as="h4">Average Percentage Commission</Text>
                    <Text fontWeight="semibold">{stats.averageCommission.toFixed(2)}%</Text>
                  </InlineStack>
                )}
                
                {/* Commission type breakdown */}
                <div style={{ marginTop: '8px' }}>
                  <InlineStack gap="400" align="space-between">
                    <Text>Percentage-based</Text>
                    <Text>{stats.percentageCommissionsCount} products</Text>
                  </InlineStack>
                  <InlineStack gap="400" align="space-between">
                    <Text>Fixed amount</Text>
                    <Text>{stats.fixedAmountCommissionsCount} products</Text>
                  </InlineStack>
                </div>

                {stats.highestCommission && (
                  <InlineStack gap="400" align="space-between" blockAlign="start">
                    <Text>Highest Commission</Text>
                    <Text>
                      {stats.highestCommission.commissionType === 'percentage' 
                        ? `${stats.highestCommission.commission}%` 
                        : `${formatCurrency(stats.highestCommission.commission)}`
                      } ({stats.highestCommission.type})
                    </Text>
                  </InlineStack>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {showTable && (stats.percentageCommissionsCount > 0 || stats.fixedAmountCommissionsCount > 0) && (
        <Card sectioned>
          {stats.percentageCommissionsCount > 0 && (
            <InlineStack gap="400" align="space-between">
              <Text variant="headingXs" as="h4">Average Percentage Commission</Text>
              <Text fontWeight="semibold">{stats.averageCommission.toFixed(2)}%</Text>
            </InlineStack>
          )}
          
          {/* Commission type breakdown */}
          <div style={{ marginTop: '8px' }}>
            <InlineStack gap="400" align="space-between">
              <Text>Percentage-based</Text>
              <Text>{stats.percentageCommissionsCount} products</Text>
            </InlineStack>
            <InlineStack gap="400" align="space-between">
              <Text>Fixed amount</Text>
              <Text>{stats.fixedAmountCommissionsCount} products</Text>
            </InlineStack>
          </div>

          {stats.highestCommission && (
            <InlineStack gap="400" align="space-between">
              <Text>Highest Commission</Text>
              <Text>
                {stats.highestCommission.commissionType === 'percentage' 
                  ? `${stats.highestCommission.commission}%` 
                  : `${formatCurrency(stats.highestCommission.commission)}`
                } ({stats.highestCommission.type})
              </Text>
            </InlineStack>
          )}
        </Card>
      )}

      {/* Commission Table */}
      {showTable && commissions && commissions.length > 0 && (
        <Card sectioned>
          <Text variant="headingMd" as="h3" style={{ marginBottom: '16px' }}>
            All Commissions
          </Text>
          <DataTable
            columnContentTypes={[
              'text',
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
              'Commission Amount',
              'Date Added',
            ]}
            rows={commissionRows}
            hoverable
          />
        </Card>
      )}

      {showTable && (!commissions || commissions.length === 0) && (
        <Card>
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <Text as="p" tone="subdued">
              No commissions set yet. Go to Products or Categories tabs to set up commissions.
            </Text>
          </div>
        </Card>
      )}
    </div>
  );
}