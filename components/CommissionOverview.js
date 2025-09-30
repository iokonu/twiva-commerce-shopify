import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  ProgressBar
} from '@shopify/polaris';

export default function CommissionOverview({ stats, products }) {
  const categorizationProgress = stats.totalProducts > 0
    ? (stats.categorizedProducts / stats.totalProducts) * 100
    : 0;

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'success';
    if (progress >= 60) return 'attention';
    return 'critical';
  };

  const topCategories = products && products.length > 0
    ? getTopCategories(products)
    : [];

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h3">
          Commission Overview
        </Text>

        {/* Categorization Progress */}
        <BlockStack gap="200">
          <InlineStack distribution="spaceBetween">
            <Text variant="bodyMd">Product Categorization Progress</Text>
            <Text variant="bodyMd" fontWeight="medium">
              {stats.categorizedProducts}/{stats.totalProducts} products
            </Text>
          </InlineStack>
          <ProgressBar
            progress={categorizationProgress}
            tone={getProgressColor(categorizationProgress)}
          />
          <Text variant="bodySm" tone="subdued">
            {stats.uncategorizedProducts > 0
              ? `${stats.uncategorizedProducts} products need categorization to optimize commission rates`
              : 'All products are properly categorized!'}
          </Text>
        </BlockStack>

        {/* Commission Rate Distribution */}
        {topCategories.length > 0 && (
          <BlockStack gap="200">
            <Text variant="bodyMd" fontWeight="medium">
              Top Product Categories
            </Text>
            <BlockStack gap="100">
              {topCategories.map((category, index) => (
                <InlineStack key={index} distribution="spaceBetween" blockAlign="center">
                  <Text variant="bodySm">
                    {category.name}
                  </Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Text variant="bodySm" tone="subdued">
                      {category.count} products
                    </Text>
                    <Badge tone="info">
                      {category.avgRate}% avg
                    </Badge>
                  </InlineStack>
                </InlineStack>
              ))}
            </BlockStack>
          </BlockStack>
        )}

        {/* Key Metrics */}
        <div style={{
          background: '#f6f6f7',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <BlockStack gap="200">
            <Text variant="bodyMd" fontWeight="medium">
              Key Insights
            </Text>
            <BlockStack gap="100">
              <Text variant="bodySm">
                • Average commission rate: <strong>{stats.averageCommissionRate}%</strong>
              </Text>
              <Text variant="bodySm">
                • Commission rates range from 4% to 15% based on category
              </Text>
              <Text variant="bodySm">
                • Uncategorized products receive default 15% commission
              </Text>
              {stats.uncategorizedProducts > 0 && (
                <Text variant="bodySm" tone="caution">
                  • {stats.uncategorizedProducts} products could benefit from categorization
                </Text>
              )}
            </BlockStack>
          </BlockStack>
        </div>
      </BlockStack>
    </Card>
  );
}

function getTopCategories(products) {
  const categoryCount = {};
  const categoryRates = {};

  products.forEach(product => {
    const category = product.productType || 'Uncategorized';
    categoryCount[category] = (categoryCount[category] || 0) + 1;

    // You would calculate actual rates here
    // For now, using sample rates
    if (!categoryRates[category]) {
      categoryRates[category] = [];
    }
    categoryRates[category].push(15); // Default for now
  });

  return Object.entries(categoryCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      avgRate: Math.round(
        categoryRates[name].reduce((a, b) => a + b, 0) / categoryRates[name].length
      )
    }));
}