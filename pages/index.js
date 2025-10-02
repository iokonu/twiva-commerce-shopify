import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Page, Layout, Card, Tabs, Spinner, Banner, BlockStack, TextField, DataTable, Badge, Button, Text, InlineStack, Icon } from '@shopify/polaris';
import { SyncIcon, AlertTriangleIcon } from '@shopify/polaris-icons';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import ShopVerification from '../components/ShopVerification';

export default function Home() {
  const router = useRouter();
  const app = useAppBridge();
  const [selectedTab, setSelectedTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [commissionRates, setCommissionRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isShopVerified, setIsShopVerified] = useState(false);
  
  const { shop, host } = router.query;

  useEffect(() => {
    if (!shop) return;
    checkAuthAndLoadData();
  }, [shop, selectedTab]);

  useEffect(() => {
    // Load commission rates on component mount
    loadCommissionRates();
  }, []);

  const loadCommissionRates = async () => {
    try {
      // For now, just set some sample commission rates
      const sampleRates = [
        { category: 'Phones & Tablets', subcategory: 'Phones', rate: 4 },
        { category: 'Phones & Tablets', subcategory: 'Accessories', rate: 4 },
        { category: 'Electronics', subcategory: 'Computing & Gaming', rate: 6 },
        { category: 'Electronics', subcategory: 'Cameras', rate: 11 },
        { category: 'Fashion', subcategory: 'Men', rate: 11 },
        { category: 'Fashion', subcategory: 'Women', rate: 11 },
        { category: 'Beauty & Health', subcategory: 'Makeup', rate: 12 },
        { category: 'Other', subcategory: 'Uncategorized', rate: 15 }
      ];
      setCommissionRates(sampleRates);
    } catch (err) {
      console.error('Failed to load commission rates:', err);
    }
  };

  const checkAuthAndLoadData = async () => {
    try {
      if (selectedTab === 1) {
        await loadProducts();
      }
    } catch (err) {
      if (err.message.includes('authentication')) {
        window.location.href = `/api/auth?shop=${shop}&host=${host}`;
        return;
      }
      setError(err.message);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use the sync-products API endpoint
      const response = await fetch(`/api/sync-products?shop=${shop}`);

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
        throw new Error(errorData.message || 'Failed to sync products');
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`/api/sync-products?shop=${shop}&force=true`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync products');
      }
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const getFilteredProducts = () => {
    if (!searchTerm) return products;

    return products.filter(product =>
      product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.handle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.productType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getFilteredCommissionRates = () => {
    if (!searchTerm) return commissionRates;

    return commissionRates.filter(rate =>
      rate.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.subcategory?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const tabs = [
    { id: 'verification', content: 'Shop Setup', panelID: 'verification-panel' },
    { id: 'products', content: 'Products & Commissions', panelID: 'products-panel' },
    { id: 'rates', content: 'Commission Rates', panelID: 'rates-panel' },
  ];

  if (!shop) {
    return (
      <Page title="Commission Manager">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <Spinner size="large" />
                <p style={{ marginTop: '16px' }}>Initializing app...</p>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page title="Commission Manager" fullWidth>
      <Layout>
        <Layout.Section>
          {error && (
            <Banner status="critical" onDismiss={() => setError(null)}>
              <p>{error}</p>
            </Banner>
          )}
          
          <Card>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <div style={{ padding: '16px' }}>
                {selectedTab > 0 && (
                  <BlockStack gap="400">
                    <InlineStack gap="400" align="space-between">
                      <TextField
                        label="Search"
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder={selectedTab === 1 ? 'Search products...' : 'Search commission rates...'}
                        clearButton
                        onClearButtonClick={() => setSearchTerm('')}
                      />
                      {selectedTab === 1 && (
                        <Button
                          loading={syncing}
                          onClick={handleForceSync}
                          icon={<Icon source={SyncIcon} />}
                        >
                          Sync Products
                        </Button>
                      )}
                    </InlineStack>
                  </BlockStack>
                )}

                {loading && selectedTab === 1 ? (
                  <div style={{ textAlign: 'center', padding: '32px' }}>
                    <Spinner size="large" />
                    <Text as="p" tone="subdued">Syncing products from Shopify...</Text>
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
                        {syncStatus.inProgress && (
                          <Banner status="info">
                            Products are currently being synced from Shopify to backend...
                          </Banner>
                        )}

                        <Card>
                          <DataTable
                            columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                            headings={['Product', 'Type', 'Vendor', 'Price', 'Commission Rate', 'Commission Value', 'Category Status']}
                            rows={getFilteredProducts().map(product => {
                              // Simple commission calculation for display
                              const price = product.variants?.edges?.[0]?.node?.price || 0;
                              const rate = 15; // Default rate for now
                              const value = (parseFloat(price) * rate) / 100;

                              return [
                                product.title || 'Untitled',
                                product.productType || 'N/A',
                                product.vendor || 'N/A',
                                `$${parseFloat(price).toFixed(2)}`,
                                `${rate}%`,
                                `$${value.toFixed(2)}`,
                                <Badge tone="attention" icon={<Icon source={AlertTriangleIcon} />}>
                                  Uncategorized (15% default)
                                </Badge>
                              ];
                            })}
                          />
                        </Card>

                        {getFilteredProducts().length > 0 && (
                          <Banner status="warning">
                            <Text as="p">
                              {getFilteredProducts().length} products are using the default 15% commission rate.
                              Please categorize your products in Shopify using product types or tags to get better commission rates.
                            </Text>
                          </Banner>
                        )}
                      </BlockStack>
                    )}

                    {selectedTab === 2 && (
                      <BlockStack gap="400">
                        <Banner status="info">
                          <Text as="p">
                            These are the commission rates automatically applied based on product categories.
                            Products that don't match any category will use the default rate of 15%.
                          </Text>
                        </Banner>

                        <Card>
                          <DataTable
                            columnContentTypes={['text', 'text', 'text']}
                            headings={['Category', 'Subcategory', 'Commission Rate']}
                            rows={getFilteredCommissionRates().map(rate => [
                              rate.category,
                              rate.subcategory,
                              `${rate.rate}%`
                            ])}
                          />
                        </Card>
                      </BlockStack>
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

export async function getServerSideProps({ query }) {
  return {
    props: {
      host: query.host || null,
    },
  };
}