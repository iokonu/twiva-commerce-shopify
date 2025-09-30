import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Page,
  Layout,
  Card,
  Tabs,
  BlockStack,
  Spinner,
  Banner,
  Text,
  InlineStack,
  Badge,
  Button
} from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import ShopVerification from '../components/ShopVerification';
import ProductCommissionTable from '../components/ProductCommissionTable';
import CommissionRatesReference from '../components/CommissionRatesReference';
import commissionCalculator from '../lib/commission-calculator';

export default function Home() {
  const router = useRouter();
  const app = useAppBridge();
  const { shop, host } = router.query;

  const [selectedTab, setSelectedTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isShopVerified, setIsShopVerified] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    categorizedProducts: 0,
    uncategorizedProducts: 0,
    averageCommissionRate: 0
  });

  useEffect(() => {
    if (shop) {
      loadData();
    }
  }, [shop, selectedTab]);

  const loadData = async () => {
    if (!shop) return;

    try {
      setLoading(true);
      setError(null);

      if (selectedTab === 0) {
        // Shop verification tab - no API calls needed
        return;
      } else if (selectedTab === 1) {
        // Load products for commission overview
        await loadProducts();
      }
      // Tab 2 is commission rates reference - no API calls needed
    } catch (err) {
      console.error('Load data error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch(`/api/products?shop=${shop}`);

      if (response.status === 401) {
        try {
          const authResponse = await fetch(`/api/auth?shop=${shop}&host=${host}`, {
            headers: { 'Accept': 'application/json' }
          });
          const { authUrl } = await authResponse.json();

          const redirect = Redirect.create(app);
          redirect.dispatch(Redirect.Action.REMOTE, authUrl);
          return;
        } catch (authError) {
          console.error('Auth redirect error:', authError);
          setError('Authentication required. Please reload the app.');
        }
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load products');
      }

      const data = await response.json();
      setProducts(data.products || []);

      // Calculate stats
      calculateStats(data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Failed to load products');
    }
  };

  const calculateStats = (productList) => {
    const totalProducts = productList.length;
    let categorizedCount = 0;
    let uncategorizedCount = 0;
    let totalCommissionRate = 0;

    productList.forEach(product => {
      const commissionInfo = commissionCalculator.getCommissionRate(product.productType);

      if (commissionInfo.needsCategorization) {
        uncategorizedCount++;
      } else {
        categorizedCount++;
      }

      totalCommissionRate += commissionInfo.rate;
    });

    setStats({
      totalProducts,
      categorizedProducts: categorizedCount,
      uncategorizedProducts: uncategorizedCount,
      averageCommissionRate: totalProducts > 0 ? (totalCommissionRate / totalProducts).toFixed(1) : 0
    });
  };

  const tabs = [
    { id: 'verification', content: 'Shop Setup', panelID: 'verification-panel' },
    { id: 'products', content: 'Product Commissions', panelID: 'products-panel' },
    { id: 'rates', content: 'Commission Rates', panelID: 'rates-panel' },
  ];

  if (!shop) {
    return (
      <Page title="Commission Manager">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <Text variant="bodyMd" tone="subdued">
                  Loading...
                </Text>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Twiva Commerce - Commission Manager"
      subtitle="View commission rates and product categorization status"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <Tabs
              tabs={tabs}
              selected={selectedTab}
              onSelect={setSelectedTab}
            >
              <div style={{ padding: '16px' }}>
                {error && (
                  <div style={{ marginBottom: '16px' }}>
                    <Banner status="critical" onDismiss={() => setError(null)}>
                      {error}
                    </Banner>
                  </div>
                )}

                {loading && selectedTab !== 0 && selectedTab !== 2 ? (
                  <div style={{ textAlign: 'center', padding: '32px' }}>
                    <Spinner size="large" />
                  </div>
                ) : (
                  <BlockStack gap="400">
                    {selectedTab === 0 && (
                      <ShopVerification
                        shopId={shop}
                        onVerificationComplete={() => setIsShopVerified(true)}
                      />
                    )}

                    {selectedTab === 1 && (
                      <BlockStack gap="400">
                        {/* Stats Overview */}
                        <Layout>
                          <Layout.Section oneThird>
                            <Card>
                              <BlockStack gap="200">
                                <Text variant="bodyMd" tone="subdued">
                                  Total Products
                                </Text>
                                <Text variant="headingXl" as="h3">
                                  {stats.totalProducts}
                                </Text>
                              </BlockStack>
                            </Card>
                          </Layout.Section>
                          <Layout.Section oneThird>
                            <Card>
                              <BlockStack gap="200">
                                <Text variant="bodyMd" tone="subdued">
                                  Categorized Products
                                </Text>
                                <InlineStack gap="200" blockAlign="center">
                                  <Text variant="headingXl" as="h3">
                                    {stats.categorizedProducts}
                                  </Text>
                                  <Badge tone="success">
                                    {stats.totalProducts > 0
                                      ? Math.round((stats.categorizedProducts / stats.totalProducts) * 100)
                                      : 0}%
                                  </Badge>
                                </InlineStack>
                              </BlockStack>
                            </Card>
                          </Layout.Section>
                          <Layout.Section oneThird>
                            <Card>
                              <BlockStack gap="200">
                                <Text variant="bodyMd" tone="subdued">
                                  Average Commission Rate
                                </Text>
                                <Text variant="headingXl" as="h3">
                                  {stats.averageCommissionRate}%
                                </Text>
                              </BlockStack>
                            </Card>
                          </Layout.Section>
                        </Layout>

                        {/* Products Table */}
                        <ProductCommissionTable
                          products={products}
                          loading={loading}
                        />
                      </BlockStack>
                    )}

                    {selectedTab === 2 && (
                      <CommissionRatesReference />
                    )}
                  </BlockStack>
                )}
              </div>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}