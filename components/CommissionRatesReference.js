import { useState } from 'react';
import {
  Card,
  DataTable,
  Text,
  BlockStack,
  TextField,
  Badge,
  Collapsible,
  Button,
  InlineStack
} from '@shopify/polaris';
import { ChevronDownIcon, ChevronUpIcon } from '@shopify/polaris-icons';
import commissionCalculator from '../lib/commission-calculator';

export default function CommissionRatesReference() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  const categories = commissionCalculator.getAllCategories();

  // Filter categories based on search
  const filteredCategories = categories.filter(category =>
    category.mainCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.subCategories.some(sub =>
      sub.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const getCommissionColor = (rate) => {
    if (rate <= 6) return 'critical';
    if (rate <= 10) return 'warning';
    if (rate <= 12) return 'attention';
    return 'success';
  };

  return (
    <Card>
      <BlockStack gap="400">
        <div>
          <Text variant="headingMd" as="h3">
            Commission Rates Reference
          </Text>
          <Text variant="bodySm" tone="subdued">
            View all available commission rates by product category
          </Text>
        </div>

        {/* Search */}
        <div style={{ maxWidth: '400px' }}>
          <TextField
            placeholder="Search categories..."
            value={searchTerm}
            onChange={setSearchTerm}
            clearButton
            onClearButtonClick={() => setSearchTerm('')}
          />
        </div>

        {/* Default Rate Banner */}
        <Card background="bg-surface-secondary">
          <BlockStack gap="200">
            <InlineStack gap="200" blockAlign="center">
              <Badge tone="attention">Default Rate</Badge>
              <Text variant="bodyMd" fontWeight="medium">
                15% for Uncategorized Products
              </Text>
            </InlineStack>
            <Text variant="bodySm" tone="subdued">
              Products without a category or with unrecognized categories will receive the default 15% commission rate.
            </Text>
          </BlockStack>
        </Card>

        {/* Categories List */}
        <BlockStack gap="300">
          {filteredCategories.map((category) => (
            <Card key={category.mainCategory} background="bg-surface-secondary">
              <BlockStack gap="300">
                {/* Main Category Header */}
                <InlineStack distribution="spaceBetween" blockAlign="center">
                  <div>
                    <Text variant="bodyMd" fontWeight="medium">
                      {category.mainCategory}
                    </Text>
                    <Text variant="bodySm" tone="subdued">
                      {category.subCategories.length} subcategories
                    </Text>
                  </div>
                  <Button
                    variant="tertiary"
                    onClick={() => toggleCategory(category.mainCategory)}
                    icon={expandedCategories[category.mainCategory] ? ChevronUpIcon : ChevronDownIcon}
                  >
                    {expandedCategories[category.mainCategory] ? 'Hide' : 'Show'} Details
                  </Button>
                </InlineStack>

                {/* Subcategories Table */}
                <Collapsible
                  open={expandedCategories[category.mainCategory]}
                  id={`category-${category.mainCategory}`}
                  transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
                >
                  <div style={{ marginTop: '16px' }}>
                    <DataTable
                      columnContentTypes={['text', 'text']}
                      headings={['Subcategory', 'Commission Rate']}
                      rows={category.subCategories.map(sub => [
                        sub.name,
                        <InlineStack key={sub.name} gap="200" blockAlign="center">
                          <Badge tone={getCommissionColor(sub.rate)}>
                            {sub.rate}%
                          </Badge>
                          <Text variant="bodySm" tone="subdued">
                            ${(100 * sub.rate / 100).toFixed(2)} per $100
                          </Text>
                        </InlineStack>
                      ])}
                    />
                  </div>
                </Collapsible>
              </BlockStack>
            </Card>
          ))}
        </BlockStack>

        {filteredCategories.length === 0 && searchTerm && (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <Text variant="bodyMd" tone="subdued">
              No categories found matching "{searchTerm}"
            </Text>
          </div>
        )}

        {/* Commission Rate Legend */}
        <Card background="bg-surface-secondary">
          <BlockStack gap="300">
            <Text variant="bodyMd" fontWeight="medium">
              Commission Rate Ranges:
            </Text>
            <InlineStack gap="400" wrap>
              <InlineStack gap="200" blockAlign="center">
                <Badge tone="critical">4-6%</Badge>
                <Text variant="bodySm">Low margin categories</Text>
              </InlineStack>
              <InlineStack gap="200" blockAlign="center">
                <Badge tone="warning">7-10%</Badge>
                <Text variant="bodySm">Medium margin categories</Text>
              </InlineStack>
              <InlineStack gap="200" blockAlign="center">
                <Badge tone="attention">11-12%</Badge>
                <Text variant="bodySm">High margin categories</Text>
              </InlineStack>
              <InlineStack gap="200" blockAlign="center">
                <Badge tone="success">13-15%</Badge>
                <Text variant="bodySm">Premium categories</Text>
              </InlineStack>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Card>
  );
}