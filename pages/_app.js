import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import '@shopify/polaris/build/esm/styles.css';

function MyApp({ Component, pageProps }) {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
    host: pageProps.host,
    forceRedirect: true,
  };

  return (
    <AppBridgeProvider config={config}>
      <AppProvider i18n={{}}>
        <Component {...pageProps} />
      </AppProvider>
    </AppBridgeProvider>
  );
}

export default MyApp;