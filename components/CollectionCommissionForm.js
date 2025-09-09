import { useState } from 'react';
import { Card, FormLayout, TextField, Button, BlockStack, InlineStack, Text, Badge, Thumbnail } from '@shopify/polaris';

export function CollectionCommissionForm({ collection, onSave, onRemove }) {
  const [commission, setCommission] = useState(
    collection.commission?.commission?.toString() || ''
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!commission || isNaN(commission)) return;
    
    setLoading(true);
    try {
      await onSave(collection.id, parseFloat(commission));
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!collection.commission) return;
    
    setLoading(true);
    try {
      await onRemove('collection', collection.commission.id);
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
              {collection.image && (
                <Thumbnail
                  source={collection.image.url}
                  alt={collection.image.altText || collection.title}
                  size="small"
                />
              )}
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">{collection.title}</Text>
                <Text as="p" tone="subdued">{collection.productsCount} products</Text>
                {collection.description && (
                  <Text as="p" tone="subdued" truncate>
                    {collection.description.substring(0, 100)}{collection.description.length > 100 ? '...' : ''}
                  </Text>
                )}
              </BlockStack>
            </InlineStack>
            {collection.commission && (
              <Badge tone="success">
                {collection.commission.commission}% Commission
              </Badge>
            )}
          </InlineStack>
          
          <FormLayout>
            <TextField
              label="Commission (%)"
              type="number"
              value={commission}
              onChange={setCommission}
              placeholder="e.g., 15.0"
              helpText="This commission will apply to all products in this collection"
            />
            
            <InlineStack gap="200">
              <Button
                variant="primary"
                onClick={handleSave}
                loading={loading}
                disabled={!commission || isNaN(commission)}
              >
                Set Collection Commission
              </Button>
              
              {collection.commission && (
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