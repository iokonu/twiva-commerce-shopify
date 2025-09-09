import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Page, Layout, Card, Tabs, Spinner, Banner, BlockStack, TextField, InlineStack } from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { ProductTable } from '../components/ProductTable';
import { CategoryCommissionForm } from '../components/CategoryCommissionForm';
import { CommissionsOverview } from '../components/CommissionsOverview';

export default function Home() {
  const router = useRouter();
  const app = useAppBridge();
  const [selectedTab, setSelectedTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const { shop, host } = router.query;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!shop) return;
    
    checkAuthAndLoadData();
  }, [shop, selectedTab, debouncedSearchTerm]);

  const checkAuthAndLoadData = async () => {
    try {
      await loadData();
    } catch (err) {
      if (err.message.includes('authentication')) {
        window.location.href = `/api/auth?shop=${shop}&host=${host}`;
        return;
      }
      setError(err.message);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const searchParam = debouncedSearchTerm ? `&search=${encodeURIComponent(debouncedSearchTerm)}` : '';
      
      if (selectedTab === 0) {
        const response = await fetch(`/api/products?shop=${shop}${searchParam}`);
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
        setProducts(data.products);
      } else if (selectedTab === 1) {
        const response = await fetch(`/api/collections?shop=${shop}${searchParam}`);
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
          throw new Error(errorData.error || 'Failed to load collections');
        }
        const data = await response.json();
        setCollections(data.collections);
      } else if (selectedTab === 2) {
        const response = await fetch(`/api/commissions/list?shop=${shop}`);
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
          throw new Error(errorData.error || 'Failed to load commissions');
        }
        const data = await response.json();
        setCommissions(data.commissions);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProductCommission = async (productId, commission) => {
    try {
      const response = await fetch(`/api/commissions?shop=${shop}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'product', id: productId, commission }),
      });
      
      if (!response.ok) throw new Error('Failed to save commission');
      
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveCategoryCommission = async (categoryId, commission, applyToProducts = false) => {
    try {
      const response = await fetch(`/api/commissions?shop=${shop}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'collection', id: categoryId, commission, applyToProducts }),
      });
      
      if (!response.ok) throw new Error('Failed to save commission');
      
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveCommission = async (type, id) => {
    try {
      const response = await fetch(`/api/commissions?shop=${shop}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      });
      
      if (!response.ok) throw new Error('Failed to remove commission');
      
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const tabs = [
    { id: 'overview', content: 'Overview', panelID: 'overview-panel' },
    { id: 'products', content: 'Products', panelID: 'products-panel' },
    { id: 'categories', content: 'Categories', panelID: 'categories-panel' },
    { id: 'commissions', content: 'Commissions', panelID: 'commissions-panel' },
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
    <Page title="Commission Manager">
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
                {(selectedTab === 0 || selectedTab === 1) && (
                  <BlockStack gap="400">
                    <TextField
                      label="Search"
                      value={searchTerm}
                      onChange={setSearchTerm}
                      placeholder={selectedTab === 0 ? 'Search products...' : 'Search collections...'}
                      clearButton
                      onClearButtonClick={() => setSearchTerm('')}
                    />
                  </BlockStack>
                )}
                
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '32px' }}>
                    <Spinner size="large" />
                  </div>
                ) : (
                  <BlockStack gap="400">
                    {selectedTab === 0 &&
                      products.map((product) => (
                        <ProductCommissionForm
                          key={product.id}
                          product={product}
                          onSave={handleSaveProductCommission}
                          onRemove={handleRemoveCommission}
                        />
                      ))}
                    
                    {selectedTab === 1 &&
                      collections.map((collection) => (
                        <CollectionCommissionForm
                          key={collection.id}
                          collection={collection}
                          onSave={handleSaveCollectionCommission}
                          onRemove={handleRemoveCommission}
                        />
                      ))}
                      
                    {selectedTab === 2 && (
                      <CommissionsView
                        commissions={commissions}
                        onUpdate={loadData}
                      />
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