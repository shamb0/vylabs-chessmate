import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __REACT_ERROR__: any;
    __UNHANDLED_REJECTION__: any;
    __GLOBAL_ERROR__: any;
    __MOUNT_TIMEOUT__: any;
    __REACT_MOUNTED__: any;
    __CONSOLE_ERRORS__: any;
    __vite__: any;
    __WEBSOCKET_ERROR__: any;
  }
}

test('Debug React mounting with enhanced observability', async ({ page }) => {
  // Listen to all console messages
  page.on('console', msg => {
    console.log(`Browser console [${msg.type()}]:`, msg.text());
  });

  // Listen to page errors
  page.on('pageerror', error => {
    console.log('Page error:', error.message);
    console.log('Stack:', error.stack);
  });

  // Add global error handlers before navigation
  await page.addInitScript(() => {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', event => {
      console.error('Unhandled promise rejection:', event.reason);
      window.__UNHANDLED_REJECTION__ = {
        reason: event.reason.toString(),
        stack: event.reason.stack,
        timestamp: new Date().toISOString()
      };
    });

    // Catch global errors
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('Global error:', { message, source, lineno, colno, error });
      window.__GLOBAL_ERROR__ = {
        message,
        source,
        lineno,
        colno,
        error: error ? error.toString() : null,
        stack: error ? error.stack : null,
        timestamp: new Date().toISOString()
      };
    };

    // Monitor React mounting
    let mountingTimeout = setTimeout(() => {
      console.error('React mounting timeout - no render detected after 5s');
      window.__MOUNT_TIMEOUT__ = true;
    }, 5000);

    // Check for React mounting completion
    const checkMount = () => {
      const root = document.getElementById('root');
      if (root && root.children.length > 0) {
        clearTimeout(mountingTimeout);
        console.log('React mounting detected');
        window.__REACT_MOUNTED__ = true;
      } else {
        setTimeout(checkMount, 100);
      }
    };
    
    // Start checking after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkMount);
    } else {
      checkMount();
    }
  });

  // Navigate to your app
  await page.goto('http://frontend-dev:3000');

  // Wait for initial HTML load
  await page.waitForSelector('#root', { timeout: 10000 });

  // Give React time to mount
  await page.waitForTimeout(3000);

  // Check for various error conditions
  const errorState = await page.evaluate(() => {
    return {
      reactError: window.__REACT_ERROR__ || null,
      globalError: window.__GLOBAL_ERROR__ || null,
      unhandledRejection: window.__UNHANDLED_REJECTION__ || null,
      mountTimeout: window.__MOUNT_TIMEOUT__ || false,
      reactMounted: window.__REACT_MOUNTED__ || false,
      rootHtml: document.getElementById('root')!.innerHTML,
      rootChildren: document.getElementById('root')!.children.length,
      consoleErrors: window.__CONSOLE_ERRORS__ || [],
      viteReady: window.__vite__ ? 'Vite detected' : 'Vite not detected'
    };
  });

  console.log('Error state analysis:', JSON.stringify(errorState, null, 2));

  // Take screenshot for visual debugging
  await page.screenshot({ path: 'debug-mount-failure.png', fullPage: true });

  // Check if we have any content in root
  if (errorState.rootChildren === 0) {
    // Try to get more details about what's preventing mounting
    const detailedAnalysis = await page.evaluate(() => {
      const scripts = Array.from(document.scripts).map(s => ({
        src: s.src,
        loaded: s.readyState || 'unknown',
        hasError: s.onerror ? 'has error handler' : 'no error handler'
      }));

      return {
        scripts,
        documentReady: document.readyState,
        bodyChildren: document.body.children.length,
        headChildren: document.head.children.length,
        reactDevTools: !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__,
        errors: {
          reactError: window.__REACT_ERROR__,
          globalError: window.__GLOBAL_ERROR__,
          unhandledRejection: window.__UNHANDLED_REJECTION__
        }
      };
    });

    console.log('Detailed analysis:', JSON.stringify(detailedAnalysis, null, 2));
  }

  // Fail the test with detailed information if mounting failed
  if (errorState.rootChildren === 0 && !errorState.reactMounted) {
    throw new Error(`React failed to mount. Analysis: ${JSON.stringify(errorState, null, 2)}`);
  }

  // If we get here, check for your expected content
  await expect(page.locator('#root > *')).toBeVisible({ timeout: 5000 });
});