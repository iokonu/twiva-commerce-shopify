import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Banner,
  Spinner,
  TextField,
  DataTable,
  Badge,
  Modal,
  FormLayout,
  Select
} from '@shopify/polaris';
import apiClient from '../lib/api-client';
import { generateSmartLink, getAffiliateSmartLinks } from '../lib/smart-links';

export default function AffiliateManagement({ shopId }) {
  const [affiliates, setAffiliates] = useState([]);
  const [smartLinks, setSmartLinks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLinkData, setNewLinkData] = useState({
    affiliateId: '',
    productId: '',
    linkType: 'product',
    expiresInDays: '30'
  });

  useEffect(() => {
    loadData();
  }, [shopId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load affiliates, smart links, and products in parallel
      const [affiliatesRes, productsRes] = await Promise.all([
        apiClient.request('GET', `/api/affiliates?shopId=${shopId}`),
        apiClient.getProducts(shopId)
      ]);

      setAffiliates(affiliatesRes.data || []);
      setProducts(productsRes || []);

      // Load smart links for first affiliate if available
      if (affiliatesRes.data && affiliatesRes.data.length > 0) {
        const firstAffiliate = affiliatesRes.data[0];
        const linksRes = await getAffiliateSmartLinks(firstAffiliate.id);
        if (linksRes.success) {
          setSmartLinks(linksRes.data);
        }
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSmartLinksForAffiliate = async (affiliateId) => {
    try {
      const response = await getAffiliateSmartLinks(affiliateId);
      if (response.success) {
        setSmartLinks(response.data);
        setSelectedAffiliate(affiliateId);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateSmartLink = async () => {
    try {
      if (!newLinkData.affiliateId || !newLinkData.productId) {
        setError('Please select both an affiliate and a product');
        return;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(newLinkData.expiresInDays));

      const response = await generateSmartLink(
        shopId,
        newLinkData.productId,
        newLinkData.affiliateId,
        {
          linkType: newLinkData.linkType,
          expiresAt: expiresAt.toISOString()
        }
      );

      if (response.success) {
        setShowCreateModal(false);
        setNewLinkData({
          affiliateId: '',
          productId: '',
          linkType: 'product',
          expiresInDays: '30'
        });

        // Reload smart links
        if (selectedAffiliate) {
          await loadSmartLinksForAffiliate(selectedAffiliate);
        }
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could show a toast notification here
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
      document.body.removeChild(textArea);
    });
  };

  const affiliateRows = affiliates.map((affiliate) => [
    affiliate.name || 'Unknown',
    affiliate.email || '-',
    <Badge key={affiliate.id} status={affiliate.status === 'active' ? 'success' : 'critical'}>
      {affiliate.status || 'inactive'}
    </Badge>,
    `$${(affiliate.totalEarnings || 0).toFixed(2)}`,
    affiliate.totalClicks || 0,
    affiliate.conversionRate ? `${(affiliate.conversionRate * 100).toFixed(1)}%` : '0%',
    <Button
      key={affiliate.id}
      size="slim"
      onClick={() => loadSmartLinksForAffiliate(affiliate.id)}
    >
      View Links
    </Button>
  ]);

  const smartLinkRows = smartLinks.map((link) => [
    link.productName || `Product ${link.productId}`,
    <div key={link.id} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <Text variant="bodyMd" truncate>
        {link.url}
      </Text>
      <Button
        size="micro"
        variant="plain"
        onClick={() => copyToClipboard(link.url)}
      >
        Copy
      </Button>
    </div>,
    <Badge key={link.id} status={link.isActive ? 'success' : 'critical'}>
      {link.isActive ? 'Active' : 'Inactive'}
    </Badge>,
    link.totalClicks || 0,
    `$${(link.totalEarnings || 0).toFixed(2)}`,
    link.conversionRate ? `${(link.conversionRate * 100).toFixed(1)}%` : '0%',
    new Date(link.createdAt).toLocaleDateString()
  ]);

  const productOptions = products.map(product => ({
    label: product.title || `Product ${product.id}`,
    value: product.id
  }));

  const affiliateOptions = affiliates.map(affiliate => ({
    label: affiliate.name || affiliate.email || `Affiliate ${affiliate.id}`,
    value: affiliate.id.toString()
  }));

  if (loading) {
    return (
      <Card>
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <Spinner size="large" />
          <Text variant="bodyMd" as="p" tone="subdued">
            Loading affiliate data...
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <BlockStack gap="400">
      {error && (
        <Banner status="critical" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      {/* Affiliates Overview */}
      <Card>
        <BlockStack gap="400">
          <InlineStack distribution="spaceBetween" blockAlign="center">
            <Text variant="headingMd" as="h3">
              Affiliate Partners
            </Text>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              Create Smart Link
            </Button>
          </InlineStack>

          {affiliates.length > 0 ? (
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text', 'numeric', 'text', 'text']}
              headings={['Name', 'Email', 'Status', 'Total Earnings', 'Total Clicks', 'Conversion Rate', 'Actions']}
              rows={affiliateRows}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <Text variant="bodyMd" as="p" tone="subdued">
                No affiliates found. Affiliates will appear here once they sign up and are approved.
              </Text>
            </div>
          )}
        </BlockStack>
      </Card>

      {/* Smart Links for Selected Affiliate */}
      {selectedAffiliate && smartLinks.length > 0 && (
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h3">
              Smart Links
            </Text>

            <DataTable
              columnContentTypes={['text', 'text', 'text', 'numeric', 'text', 'text', 'text']}
              headings={['Product', 'Smart Link', 'Status', 'Clicks', 'Earnings', 'Conversion Rate', 'Created']}
              rows={smartLinkRows}
            />
          </BlockStack>
        </Card>
      )}

      {/* Create Smart Link Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Smart Link"
        primaryAction={{
          content: 'Create Link',
          onAction: handleCreateSmartLink,
          disabled: !newLinkData.affiliateId || !newLinkData.productId
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowCreateModal(false)
          }
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <Select
              label="Select Affiliate"
              options={[
                { label: 'Choose affiliate...', value: '' },
                ...affiliateOptions
              ]}
              value={newLinkData.affiliateId}
              onChange={(value) => setNewLinkData(prev => ({ ...prev, affiliateId: value }))}
            />

            <Select
              label="Select Product"
              options={[
                { label: 'Choose product...', value: '' },
                ...productOptions
              ]}
              value={newLinkData.productId}
              onChange={(value) => setNewLinkData(prev => ({ ...prev, productId: value }))}
            />

            <Select
              label="Link Type"
              options={[
                { label: 'Product Link', value: 'product' },
                { label: 'Collection Link', value: 'collection' },
                { label: 'Store Link', value: 'store' }
              ]}
              value={newLinkData.linkType}
              onChange={(value) => setNewLinkData(prev => ({ ...prev, linkType: value }))}
            />

            <TextField
              label="Expires In (Days)"
              type="number"
              value={newLinkData.expiresInDays}
              onChange={(value) => setNewLinkData(prev => ({ ...prev, expiresInDays: value }))}
              min="1"
              max="365"
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}