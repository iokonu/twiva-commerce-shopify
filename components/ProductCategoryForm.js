import { useState, useEffect } from 'react';
import { Card, FormLayout, TextField, Button, BlockStack, InlineStack, Badge, Text, RadioButton, DataTable, Collapsible, Icon } from '@shopify/polaris';
import { ChevronDownIcon, ChevronRightIcon } from '@shopify/polaris-icons';

export function ProductCategoryForm({ category, onSave, appliedCommissions = [] }) {
  const [commission, setCommission] = useState('');
  const [commissionType, setCommissionType] = useState('percentage');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Get applied commission info for this category
  const categoryCommissions = appliedCommissions.filter(comm => 
    comm.productType === category.name
  );

  // Calculate stats for this category
  const totalWithCommissions = categoryCommissions.length;
  const totalWithoutCommissions = category.productCount - totalWithCommissions;
  const lastUpdated = categoryCommissions.length > 0 
    ? new Date(Math.max(...categoryCommissions.map(c => new Date(c.updatedAt))))
    : null;

  // Calculate total commission value for this category
  const totalCommissionValue = categoryCommissions.reduce((sum, comm) => {
    return sum + (comm.commissionAmount || 0);
  }, 0);

  const handleSave = async () => {
    if (!commission || isNaN(commission)) return;
    
    setLoading(true);
    try {
      await onSave(category.name, {
        commission: parseFloat(commission),
        commissionType,
        currency: 'KES'
      }, true, 'category');
      setCommission('');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  // Prepare commission details for the collapsible table
  const commissionRows = categoryCommissions.map(comm => [
    comm.productTitle || 'Unknown Product',
    comm.commissionType === 'percentage' ? `${comm.commission}%` : `${comm.commission}`,
    <Badge tone={comm.commissionType === 'percentage' ? 'info' : 'warning'}>
      {comm.commissionType === 'percentage' ? 'Percentage' : 'Amount'}
    </Badge>,
    formatCurrency(comm.commissionAmount || 0),
    new Date(comm.updatedAt).toLocaleDateString()
  ]);

  const getStatusBadge = () => {
    if (totalWithCommissions === 0) {
      return <Badge tone="critical">No Commissions</Badge>;
    } else if (totalWithCommissions === category.productCount) {
      return <Badge tone="success">Fully Configured</Badge>;
    } else {
      return <Badge tone="attention">Partially Configured</Badge>;
    }
  };

  return (
    <Card>
      <div style={{ padding: '16px' }}>
        <BlockStack gap="400">
          {/* Category Header with Stats */}
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="200">
              <InlineStack gap="300" blockAlign="center">
                <Text variant="headingMd" as="h3">{category.name}</Text>
                {getStatusBadge()}
              </InlineStack>
              <InlineStack gap="400">
                <Text as="p" tone="subdued">{category.productCount} total products</Text>
                <Text as="p" tone="success">{totalWithCommissions} with commissions</Text>
                <Text as="p" tone="critical">{totalWithoutCommissions} without commissions</Text>
              </InlineStack>
              {lastUpdated && (
                <Text as="p" tone="subdued" variant="bodyXs">
                  Last updated: {lastUpdated.toLocaleDateString()}
                </Text>
              )}
            </BlockStack>
            <BlockStack gap="200" align="end">
              {totalCommissionValue > 0 && (
                <BlockStack gap="100" align="end">
                  <Text variant="headingXs" as="h4">Total Commission Value</Text>
                  <Text variant="headingMd" tone="success">{formatCurrency(totalCommissionValue)}</Text>
                </BlockStack>
              )}
            </BlockStack>
          </InlineStack>

          {/* Commission Details Toggle */}
          {categoryCommissions.length > 0 && (
            <div>
              <Button
                onClick={() => setExpanded(!expanded)}
                ariaExpanded={expanded}
                ariaControls="commission-details"
                icon={expanded ? ChevronDownIcon : ChevronRightIcon}
                variant="plain"
              >
                {expanded ? 'Hide' : 'Show'} Commission Details ({categoryCommissions.length} products)
              </Button>
              
              <Collapsible
                open={expanded}
                id="commission-details"
                transition={{ duration: '150ms', timingFunction: 'ease' }}
              >
                <div style={{ marginTop: '16px' }}>
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                    headings={['Product', 'Commission', 'Type', 'Amount', 'Applied']}
                    rows={commissionRows}
                    hoverable
                  />
                </div>
              </Collapsible>
            </div>
          )}
          
          {/* Commission Form */}
          <Card>
            <div style={{ padding: '16px' }}>
              <FormLayout>
                <Text variant="headingXs" as="h4">Apply Commission to All Products</Text>
                
                <BlockStack gap="200">
                  <RadioButton
                    label="Percentage (%)"
                    checked={commissionType === 'percentage'}
                    id={`percentage-${category.name}`}
                    name={`${category.name}CommissionType`}
                    onChange={() => setCommissionType('percentage')}
                  />
                  <RadioButton
                    label="Fixed Amount (KES)"
                    checked={commissionType === 'amount'}
                    id={`amount-${category.name}`}
                    name={`${category.name}CommissionType`}
                    onChange={() => setCommissionType('amount')}
                  />
                </BlockStack>
                
                <TextField
                  label={commissionType === 'percentage' ? 'Category Commission (%)' : 'Category Commission (KES)'}
                  type="number"
                  value={commission}
                  onChange={setCommission}
                  placeholder={commissionType === 'percentage' ? 'e.g., 12.0' : 'e.g., 1500'}
                  helpText={commissionType === 'percentage' 
                    ? 'This commission percentage will apply to all products in this category'
                    : 'This fixed commission amount (KES) will apply to all products in this category'
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
                    Apply to {category.productCount} Products
                  </Button>
                  {commission && !isNaN(commission) && (
                    <Button
                      variant="plain"
                      onClick={() => setCommission('')}
                    >
                      Clear
                    </Button>
                  )}
                </InlineStack>

                {commission && !isNaN(commission) && (
                  <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f0f8ff', borderRadius: '8px', borderLeft: '4px solid #0066cc' }}>
                    <BlockStack gap="200">
                      <Text variant="headingXs" as="h4">Bulk Action Preview</Text>
                      <Text as="p" tone="subdued">
                        This will set {commissionType === 'percentage' ? `${commission}% commission` : `KES ${commission} fixed commission`} on all {category.productCount} products in the "{category.name}" category.
                      </Text>
                      <Text as="p" tone="warning">
                        ⚠️ This will override any existing commissions on these products.
                      </Text>
                      {commissionType === 'percentage' && category.productCount > 0 && (
                        <Text as="p" tone="success">
                          📊 Estimated total commission value will vary based on individual product prices.
                        </Text>
                      )}
                      {commissionType === 'amount' && category.productCount > 0 && (
                        <Text as="p" tone="success">
                          📊 Total commission value: {formatCurrency(parseFloat(commission) * category.productCount)}
                        </Text>
                      )}
                    </BlockStack>
                  </div>
                )}
              </FormLayout>
            </div>
          </Card>
        </BlockStack>
      </div>
    </Card>
  );
}