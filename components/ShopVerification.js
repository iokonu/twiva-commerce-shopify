import { useState, useEffect } from 'react';
import { Card, Button, Text, BlockStack, InlineStack, Banner, Spinner, TextField } from '@shopify/polaris';
import apiClient from '../lib/api-client';

export default function ShopVerification({ shopId, onVerificationComplete }) {
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [oneTimeCode, setOneTimeCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [minutesRemaining, setMinutesRemaining] = useState(0);

  useEffect(() => {
    checkVerificationStatus();
  }, [shopId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (verificationStatus && !verificationStatus.is_validated && verificationStatus.minutes_remaining > 0) {
        setMinutesRemaining(prev => Math.max(0, prev - 1));
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [verificationStatus]);

  const checkVerificationStatus = async () => {
    try {
      setLoading(true);
      const status = await apiClient.getValidationStatus(shopId);

      if (status.success) {
        setVerificationStatus(status);
        setOneTimeCode(status.one_time_code || '');
        setMinutesRemaining(status.minutes_remaining || 0);

        if (status.is_validated) {
          onVerificationComplete && onVerificationComplete();
        }
      } else {
        setError(status.error || 'Failed to check verification status');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const regenerateCode = async () => {
    try {
      setRegenerating(true);
      setError(null);

      const response = await apiClient.regenerateCode(shopId);

      if (response.success) {
        setOneTimeCode(response.one_time_code);
        setMinutesRemaining(response.expires_in_minutes || 30);

        setVerificationStatus(prev => ({
          ...prev,
          one_time_code: response.one_time_code,
          code_expires_at: response.code_expires_at,
          code_valid: true,
          minutes_remaining: response.expires_in_minutes || 30
        }));
      } else {
        setError(response.error || 'Failed to regenerate code');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <Spinner size="large" />
          <Text variant="bodyMd" as="p" tone="subdued">
            Checking verification status...
          </Text>
        </div>
      </Card>
    );
  }

  if (verificationStatus?.is_validated) {
    return (
      <Card>
        <BlockStack gap="400">
          <div style={{ textAlign: 'center' }}>
            <Text variant="headingMd" as="h3" tone="success">
              ✅ Shop Verified
            </Text>
            <Text variant="bodyMd" as="p" tone="subdued">
              Your shop is successfully connected to the Twiva Commerce platform.
            </Text>
          </div>
        </BlockStack>
      </Card>
    );
  }

  return (
    <Card>
      <BlockStack gap="400">
        <div style={{ textAlign: 'center' }}>
          <Text variant="headingMd" as="h3">
            🔗 Link Your Business Account
          </Text>
          <Text variant="bodyMd" as="p" tone="subdued">
            Connect your shop to the Twiva Commerce platform to start tracking commissions.
          </Text>
        </div>

        {error && (
          <Banner status="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        {oneTimeCode ? (
          <BlockStack gap="300">
            <div style={{
              background: '#f6f6f7',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              border: '2px dashed #8c9196'
            }}>
              <Text variant="headingLg" as="h2" tone="base">
                {oneTimeCode}
              </Text>
            </div>

            <Text variant="bodyMd" as="p" tone="subdued" alignment="center">
              Enter this code in your Twiva Commerce business dashboard to link this shop.
            </Text>

            {minutesRemaining > 0 ? (
              <Text variant="bodyMd" as="p" tone="subdued" alignment="center">
                Code expires in: <strong>{minutesRemaining} minutes</strong>
              </Text>
            ) : (
              <Banner status="warning">
                <Text variant="bodyMd" as="p">
                  Your verification code has expired. Please generate a new one.
                </Text>
              </Banner>
            )}

            <InlineStack distribution="center" gap="200">
              <Button
                onClick={regenerateCode}
                loading={regenerating}
                variant="secondary"
              >
                Generate New Code
              </Button>
              <Button
                onClick={checkVerificationStatus}
                variant="primary"
              >
                Check Status
              </Button>
            </InlineStack>
          </BlockStack>
        ) : (
          <BlockStack gap="300">
            <Text variant="bodyMd" as="p" tone="subdued" alignment="center">
              No verification code available. Generate one to link your business account.
            </Text>

            <InlineStack distribution="center">
              <Button
                onClick={regenerateCode}
                loading={regenerating}
                variant="primary"
              >
                Generate Verification Code
              </Button>
            </InlineStack>
          </BlockStack>
        )}

        <div style={{
          background: '#f1f2f4',
          padding: '12px',
          borderRadius: '6px'
        }}>
          <Text variant="bodyMd" as="p" tone="subdued">
            <strong>How it works:</strong>
            <br />
            1. Generate a verification code above
            <br />
            2. Log into your Twiva Commerce business dashboard
            <br />
            3. Enter the code to link this shop
            <br />
            4. Start tracking commissions and managing affiliates
          </Text>
        </div>
      </BlockStack>
    </Card>
  );
}