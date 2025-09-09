import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Page, Layout, Card, Tabs, Spinner, Banner, BlockStack, TextField, InlineStack, Pagination } from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { ProductTable } from '../components/ProductTable';
import { CategoryCommissionForm } from '../components/CategoryCommissionForm';
import { ProductCategoryForm } from '../components/ProductCategoryForm';
import { CommissionsOverview } from '../components/CommissionsOverview';

export default function Home() {
  const router = useRouter();
  const app = useAppBridge();
  const [selectedTab, setSelectedTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [pagination, setPagination] = useState({
    products: { hasNext: false, hasPrevious: false, cursor: null },
    collections: { hasNext: false, hasPrevious: false, cursor: null },
    categories: { hasNext: false, hasPrevious: false, cursor: null },
    commissions: { page: 1, totalPages: 1, limit: 20 }
  });
  
  const { shop, host } = router.query;

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!shop) return;
    
    // Check if we need authentication
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
        // Load overview/stats
        const response = await fetch(`/api/commissions/overview?shop=${shop}`);
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
          throw new Error(errorData.error || 'Failed to load overview');
        }
        const data = await response.json();
        setStats(data);
      } else if (selectedTab === 1) {
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
        setPagination(prev => ({
          ...prev,
          products: {
            hasNext: data.pageInfo?.hasNextPage || false,
            hasPrevious: data.pageInfo?.hasPreviousPage || false,
            cursor: data.pageInfo?.endCursor || null
          }
        }));
      } else if (selectedTab === 2) {
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
        setPagination(prev => ({
          ...prev,
          collections: {
            hasNext: data.pageInfo?.hasNextPage || false,
            hasPrevious: data.pageInfo?.hasPreviousPage || false,
            cursor: data.pageInfo?.endCursor || null
          }
        }));
      } else if (selectedTab === 3) {
        // Load both categories and commissions for the Categories tab
        const [categoriesResponse, commissionsResponse] = await Promise.all([
          fetch(`/api/categories?shop=${shop}${searchParam}`),
          fetch(`/api/commissions/list?shop=${shop}`)
        ]);

        if (categoriesResponse.status === 401 || commissionsResponse.status === 401) {
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

        if (!categoriesResponse.ok) {
          const errorData = await categoriesResponse.json();
          throw new Error(errorData.error || 'Failed to load categories');
        }

        if (!commissionsResponse.ok) {
          const errorData = await commissionsResponse.json();
          throw new Error(errorData.error || 'Failed to load commissions');
        }

        const categoriesData = await categoriesResponse.json();
        const commissionsData = await commissionsResponse.json();
        
        setCategories(categoriesData.categories);
        setCommissions(commissionsData.commissions);
      } else if (selectedTab === 4) {
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
        setPagination(prev => ({
          ...prev,
          commissions: {
            page: data.pagination?.page || 1,
            totalPages: data.pagination?.totalPages || 1,
            limit: data.pagination?.limit || 20
          }
        }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProductCommission = async (productId, commissionData) => {
    try {
      const response = await fetch(`/api/commissions?shop=${shop}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'product', id: productId, ...commissionData }),
      });
      
      if (!response.ok) throw new Error('Failed to save commission');
      
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveCategoryCommission = async (categoryId, commissionData, applyToProducts = false, type = 'collection') => {
    try {
      const response = await fetch(`/api/commissions?shop=${shop}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: type === 'category' ? 'category' : 'collection', 
          id: categoryId, 
          ...commissionData,
          applyToProducts 
        }),
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

  const handleNextPage = (listType) => {
    if (listType === 'products' && pagination.products.hasNext) {
      loadDataWithCursor('products', pagination.products.cursor, 'next');
    } else if (listType === 'collections' && pagination.collections.hasNext) {
      loadDataWithCursor('collections', pagination.collections.cursor, 'next');
    } else if (listType === 'commissions' && pagination.commissions.page < pagination.commissions.totalPages) {
      loadDataWithPage('commissions', pagination.commissions.page + 1);
    }
  };

  const handlePrevPage = (listType) => {
    if (listType === 'products' && pagination.products.hasPrevious) {
      loadDataWithCursor('products', null, 'prev');
    } else if (listType === 'collections' && pagination.collections.hasPrevious) {
      loadDataWithCursor('collections', null, 'prev');
    } else if (listType === 'commissions' && pagination.commissions.page > 1) {
      loadDataWithPage('commissions', pagination.commissions.page - 1);
    }
  };

  const loadDataWithCursor = async (type, cursor, direction) => {
    setLoading(true);
    try {
      const searchParam = debouncedSearchTerm ? `&search=${encodeURIComponent(debouncedSearchTerm)}` : '';
      const cursorParam = cursor ? `&${direction === 'next' ? 'after' : 'before'}=${cursor}` : '';
      
      const response = await fetch(`/api/${type}?shop=${shop}${searchParam}${cursorParam}`);
      if (!response.ok) throw new Error(`Failed to load ${type}`);
      
      const data = await response.json();
      
      if (type === 'products') {
        setProducts(data.products);
        setPagination(prev => ({
          ...prev,
          products: {
            hasNext: data.pageInfo?.hasNextPage || false,
            hasPrevious: data.pageInfo?.hasPreviousPage || false,
            cursor: data.pageInfo?.endCursor || null
          }
        }));
      } else if (type === 'collections') {
        setCollections(data.collections);
        setPagination(prev => ({
          ...prev,
          collections: {
            hasNext: data.pageInfo?.hasNextPage || false,
            hasPrevious: data.pageInfo?.hasPreviousPage || false,
            cursor: data.pageInfo?.endCursor || null
          }
        }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDataWithPage = async (type, page) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/commissions/list?shop=${shop}&page=${page}&limit=${pagination.commissions.limit}`);
      if (!response.ok) throw new Error('Failed to load commissions');
      
      const data = await response.json();
      setCommissions(data.commissions);
      setPagination(prev => ({
        ...prev,
        commissions: {
          page: data.pagination?.page || page,
          totalPages: data.pagination?.totalPages || 1,
          limit: data.pagination?.limit || 20
        }
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', content: 'Overview', panelID: 'overview-panel' },
    { id: 'products', content: 'Products', panelID: 'products-panel' },
    { id: 'collections', content: 'Collections', panelID: 'collections-panel' },
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
                {(selectedTab === 1 || selectedTab === 2 || selectedTab === 3) && (
                  <BlockStack gap="400">
                    <TextField
                      label="Search"
                      value={searchTerm}
                      onChange={setSearchTerm}
                      placeholder={
                        selectedTab === 1 ? 'Search products...' : 
                        selectedTab === 2 ? 'Search collections...' : 
                        'Search categories...'
                      }
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
                    {selectedTab === 0 && (
                      <CommissionsOverview
                        stats={stats}
                        onRefresh={loadData}
                      />
                    )}
                    
                    {selectedTab === 1 && (
                      <BlockStack gap="400">
                        <ProductTable
                          products={products}
                          onProductSelect={setSelectedProduct}
                          onSave={handleSaveProductCommission}
                          onRemove={handleRemoveCommission}
                          selectedProduct={selectedProduct}
                        />
                        {(pagination.products.hasNext || pagination.products.hasPrevious) && (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                            <Pagination
                              hasPrevious={pagination.products.hasPrevious}
                              onPrevious={() => handlePrevPage('products')}
                              hasNext={pagination.products.hasNext}
                              onNext={() => handleNextPage('products')}
                            />
                          </div>
                        )}
                      </BlockStack>
                    )}
                    
                    {selectedTab === 2 && (
                      <BlockStack gap="400">
                        {collections.map((collection) => (
                          <CategoryCommissionForm
                            key={collection.id}
                            category={collection}
                            onSave={handleSaveCategoryCommission}
                            onRemove={handleRemoveCommission}
                          />
                        ))}
                        {(pagination.collections.hasNext || pagination.collections.hasPrevious) && (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                            <Pagination
                              hasPrevious={pagination.collections.hasPrevious}
                              onPrevious={() => handlePrevPage('collections')}
                              hasNext={pagination.collections.hasNext}
                              onNext={() => handleNextPage('collections')}
                            />
                          </div>
                        )}
                      </BlockStack>
                    )}

                    {selectedTab === 3 &&
                      categories.map((category) => (
                        <ProductCategoryForm
                          key={category.name}
                          category={category}
                          onSave={handleSaveCategoryCommission}
                          appliedCommissions={commissions}
                        />
                      ))}
                      
                    {selectedTab === 4 && (
                      <BlockStack gap="400">
                        <CommissionsOverview
                          stats={stats}
                          commissions={commissions}
                          onRefresh={loadData}
                          showTable={true}
                        />
                        {pagination.commissions.totalPages > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                            <Pagination
                              hasPrevious={pagination.commissions.page > 1}
                              onPrevious={() => handlePrevPage('commissions')}
                              hasNext={pagination.commissions.page < pagination.commissions.totalPages}
                              onNext={() => handleNextPage('commissions')}
                              label={`Page ${pagination.commissions.page} of ${pagination.commissions.totalPages}`}
                            />
                          </div>
                        )}
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