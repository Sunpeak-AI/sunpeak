import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IframeResource, _testExports } from './iframe-resource';
import { initMockOpenAI } from './mock-openai';

const {
  escapeHtml,
  isAllowedScriptSrc,
  generateBridgeScript,
  generateCSP,
  generateScriptHtml,
  ALLOWED_SCRIPT_ORIGINS,
  ALLOWED_PARENT_ORIGINS,
} = _testExports;

describe('IframeResource', () => {
  let capturedHtml: string | null = null;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    initMockOpenAI({ theme: 'dark', displayMode: 'inline' });
    capturedHtml = null;

    // Mock URL.createObjectURL to capture the blob content
    URL.createObjectURL = vi.fn((blob: Blob) => {
      const reader = new FileReader();
      reader.onload = () => {
        capturedHtml = reader.result as string;
      };
      reader.readAsText(blob);
      return 'blob:mock-url';
    });
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    delete (window as unknown as { openai?: unknown }).openai;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('renders an iframe with a blob URL', () => {
    render(<IframeResource scriptSrc="/dist/carousel.js" />);

    const iframe = screen.getByTitle('Resource Preview');
    expect(iframe).toBeInTheDocument();
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe.getAttribute('src')).toBe('blob:mock-url');
  });

  it('generates HTML wrapper with script tag (absolute URL)', async () => {
    render(<IframeResource scriptSrc="/dist/carousel.js" />);

    // Wait for FileReader to process the blob
    await vi.waitFor(() => expect(capturedHtml).not.toBeNull());

    // Relative paths are converted to absolute for blob URL compatibility
    expect(capturedHtml).toContain(
      '<script src="http://localhost:3000/dist/carousel.js"></script>'
    );
    expect(capturedHtml).toContain('<div id="root"></div>');
    expect(capturedHtml).toContain('<!DOCTYPE html>');
  });

  it('injects bridge script into the generated HTML', async () => {
    render(<IframeResource scriptSrc="/dist/carousel.js" />);

    await vi.waitFor(() => expect(capturedHtml).not.toBeNull());

    expect(capturedHtml).toContain('window.openai');
    expect(capturedHtml).toContain('openai:ready');
    expect(capturedHtml).toContain('openai:set_globals');
  });

  it('sets appropriate sandbox attributes', () => {
    render(<IframeResource scriptSrc="/dist/carousel.js" />);

    const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
  });

  it('sets permissions policy to deny sensitive APIs', () => {
    render(<IframeResource scriptSrc="/dist/carousel.js" />);

    const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
    const allow = iframe.getAttribute('allow');
    expect(allow).toContain("camera 'none'");
    expect(allow).toContain("microphone 'none'");
    expect(allow).toContain("geolocation 'none'");
    expect(allow).toContain("usb 'none'");
  });

  it('applies custom className and style', () => {
    render(
      <IframeResource
        scriptSrc="/dist/carousel.js"
        className="custom-class"
        style={{ maxHeight: '500px' }}
      />
    );

    const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
    expect(iframe.className).toContain('custom-class');
    expect(iframe.style.maxHeight).toBe('500px');
  });

  it('sets default iframe styles', () => {
    render(<IframeResource scriptSrc="/dist/carousel.js" />);

    const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
    expect(iframe.style.width).toBe('100%');
    expect(iframe.style.height).toBe('100%');
  });

  it('includes theme in generated HTML', async () => {
    render(<IframeResource scriptSrc="/dist/carousel.js" />);

    await vi.waitFor(() => expect(capturedHtml).not.toBeNull());

    expect(capturedHtml).toContain('data-theme="dark"');
  });

  it('includes transparent background style', async () => {
    render(<IframeResource scriptSrc="/dist/carousel.js" />);

    await vi.waitFor(() => expect(capturedHtml).not.toBeNull());

    expect(capturedHtml).toContain('background: transparent');
  });

  it('cleans up blob URL on unmount', () => {
    const { unmount } = render(<IframeResource scriptSrc="/dist/carousel.js" />);

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});

describe('IframeResource Security', () => {
  let capturedHtml: string | null = null;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    initMockOpenAI({ theme: 'dark', displayMode: 'inline' });
    capturedHtml = null;

    URL.createObjectURL = vi.fn((blob: Blob) => {
      const reader = new FileReader();
      reader.onload = () => {
        capturedHtml = reader.result as string;
      };
      reader.readAsText(blob);
      return 'blob:mock-url';
    });
    URL.revokeObjectURL = vi.fn();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    delete (window as unknown as { openai?: unknown }).openai;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    consoleErrorSpy.mockRestore();
  });

  describe('XSS Prevention - escapeHtml', () => {
    it('escapes < and > to prevent script injection', () => {
      const malicious = '<script>alert("xss")</script>';
      const escaped = escapeHtml(malicious);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(escaped).not.toContain('<script>');
    });

    it('escapes double quotes to prevent attribute breakout', () => {
      const malicious = '"></script><script>evil()</script><script x="';
      const escaped = escapeHtml(malicious);
      expect(escaped).toBe(
        '&quot;&gt;&lt;/script&gt;&lt;script&gt;evil()&lt;/script&gt;&lt;script x=&quot;'
      );
      expect(escaped).not.toContain('"><');
    });

    it('escapes single quotes', () => {
      const malicious = "javascript:alert('xss')";
      const escaped = escapeHtml(malicious);
      expect(escaped).toBe('javascript:alert(&#39;xss&#39;)');
    });

    it('escapes ampersands to prevent entity injection', () => {
      const malicious = '&lt;script&gt;';
      const escaped = escapeHtml(malicious);
      expect(escaped).toBe('&amp;lt;script&amp;gt;');
    });

    it('handles combined attack vectors', () => {
      const malicious = `"><img src=x onerror="alert('xss')"><"`;
      const escaped = escapeHtml(malicious);
      // Tags are escaped so they won't be parsed as HTML
      expect(escaped).not.toContain('<img');
      expect(escaped).toContain('&lt;img');
      // The word 'onerror' is still present but as text, not an attribute
      // The important thing is the < and > are escaped so no tag is created
      expect(escaped).toBe(
        `&quot;&gt;&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;&lt;&quot;`
      );
    });
  });

  describe('XSS Prevention - Component Integration', () => {
    it('escapes malicious scriptSrc in generated HTML', async () => {
      // Use a relative path (which passes validation) with XSS payload
      const malicious = '/dist/"></script><script>alert("xss")</script><script x=".js';
      render(<IframeResource scriptSrc={malicious} />);

      await vi.waitFor(() => expect(capturedHtml).not.toBeNull());

      // The malicious script tags should be escaped, not executable
      expect(capturedHtml).not.toContain('><script>alert');
      expect(capturedHtml).toContain('&lt;script&gt;');
    });

    it('blocks javascript: protocol attempts', async () => {
      const malicious = 'javascript:alert(document.cookie)';
      render(<IframeResource scriptSrc={malicious} />);

      await vi.waitFor(() => expect(capturedHtml).not.toBeNull());

      // Should show error page for disallowed origin
      expect(capturedHtml).toContain('Script source not allowed');
    });

    it('blocks data: URL attempts', async () => {
      const malicious = 'data:text/javascript,alert(1)';
      render(<IframeResource scriptSrc={malicious} />);

      await vi.waitFor(() => expect(capturedHtml).not.toBeNull());

      expect(capturedHtml).toContain('Script source not allowed');
    });
  });

  describe('Script Origin Validation - isAllowedScriptSrc', () => {
    it('allows relative paths starting with /', () => {
      expect(isAllowedScriptSrc('/dist/carousel.js')).toBe(true);
      expect(isAllowedScriptSrc('/scripts/widget.js')).toBe(true);
    });

    it('rejects protocol-relative URLs (//)', () => {
      expect(isAllowedScriptSrc('//evil.com/malware.js')).toBe(false);
    });

    it('allows same-origin absolute URLs', () => {
      expect(isAllowedScriptSrc('http://localhost:3000/dist/widget.js')).toBe(true);
    });

    it('allows localhost with any port', () => {
      expect(isAllowedScriptSrc('http://localhost:8080/script.js')).toBe(true);
      expect(isAllowedScriptSrc('http://localhost:5173/script.js')).toBe(true);
      expect(isAllowedScriptSrc('https://localhost:3000/script.js')).toBe(true);
    });

    it('allows 127.0.0.1 with any port', () => {
      expect(isAllowedScriptSrc('http://127.0.0.1:8080/script.js')).toBe(true);
      expect(isAllowedScriptSrc('http://127.0.0.1:5173/script.js')).toBe(true);
    });

    it('allows sandbox.sunpeakai.com', () => {
      expect(isAllowedScriptSrc('https://sandbox.sunpeakai.com/widgets/carousel.js')).toBe(true);
    });

    it('rejects arbitrary external domains', () => {
      expect(isAllowedScriptSrc('https://evil.com/malware.js')).toBe(false);
      expect(isAllowedScriptSrc('https://attacker.io/script.js')).toBe(false);
      expect(isAllowedScriptSrc('http://malicious-cdn.net/widget.js')).toBe(false);
    });

    it('rejects similar-looking domains (typosquatting)', () => {
      expect(isAllowedScriptSrc('https://sandbox.sunpeakai.com.evil.com/script.js')).toBe(false);
      expect(isAllowedScriptSrc('https://sunpeakai.com.attacker.io/script.js')).toBe(false);
      expect(isAllowedScriptSrc('https://sandbox-sunpeakai.com/script.js')).toBe(false);
    });

    it('rejects data: URLs', () => {
      expect(isAllowedScriptSrc('data:text/javascript,alert(1)')).toBe(false);
    });

    it('rejects blob: URLs from other origins', () => {
      expect(isAllowedScriptSrc('blob:https://evil.com/12345')).toBe(false);
    });

    it('rejects invalid URLs', () => {
      expect(isAllowedScriptSrc('not-a-valid-url')).toBe(false);
      expect(isAllowedScriptSrc('')).toBe(false);
    });
  });

  describe('Script Origin Validation - Component Integration', () => {
    it('blocks scripts from disallowed origins', async () => {
      render(<IframeResource scriptSrc="https://evil.com/malware.js" />);

      await vi.waitFor(() => expect(capturedHtml).not.toBeNull());

      expect(capturedHtml).toContain('Script source not allowed');
      expect(capturedHtml).not.toContain('evil.com');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[IframeResource] Script source not allowed:',
        'https://evil.com/malware.js'
      );
    });

    it('allows scripts from sandbox.sunpeakai.com', async () => {
      render(<IframeResource scriptSrc="https://sandbox.sunpeakai.com/widgets/test.js" />);

      await vi.waitFor(() => expect(capturedHtml).not.toBeNull());

      expect(capturedHtml).toContain('https://sandbox.sunpeakai.com/widgets/test.js');
      expect(capturedHtml).not.toContain('Script source not allowed');
    });
  });

  describe('Message Origin Validation - Bridge Script', () => {
    it('includes origin validation in bridge script', () => {
      const bridgeScript = generateBridgeScript(['https://sunpeak.ai']);

      expect(bridgeScript).toContain('isAllowedOrigin');
      expect(bridgeScript).toContain('allowedOrigins');
      expect(bridgeScript).toContain('https://sunpeak.ai');
    });

    it('includes all allowed parent origins', () => {
      const bridgeScript = generateBridgeScript(ALLOWED_PARENT_ORIGINS);

      expect(bridgeScript).toContain('https://app.sunpeak.ai');
      expect(bridgeScript).toContain('http://localhost');
    });

    it('rejects messages from untrusted origins', () => {
      const bridgeScript = generateBridgeScript(['https://sunpeak.ai']);

      // The script should log a warning for untrusted origins
      expect(bridgeScript).toContain('Rejected message from untrusted origin');
    });

    it('rejects null origin (no longer accepted for security)', () => {
      const bridgeScript = generateBridgeScript(['https://sunpeak.ai']);

      // Null origin is no longer accepted - MessageChannel provides security instead
      expect(bridgeScript).not.toContain("origin === 'null'");
      expect(bridgeScript).toContain('We no longer accept');
    });

    it('validates message source is parent window', () => {
      const bridgeScript = generateBridgeScript(['https://sunpeak.ai']);

      // Should check that event.source === window.parent
      expect(bridgeScript).toContain('event.source !== window.parent');
      expect(bridgeScript).toContain('Rejected message from non-parent source');
    });

    it('handles localhost with any port', () => {
      const bridgeScript = generateBridgeScript(['http://localhost']);

      // Should contain port-agnostic localhost handling
      expect(bridgeScript).toContain('localhost');
      expect(bridgeScript).toContain('hostname');
    });
  });

  describe('PostMessage Security - Message Handling', () => {
    it('validates message structure before processing', async () => {
      render(<IframeResource scriptSrc="/dist/carousel.js" />);

      await vi.waitFor(() => expect(capturedHtml).not.toBeNull());

      // Bridge script should check for valid message structure (via MessagePort now)
      expect(capturedHtml).toContain('data.type');
      expect(capturedHtml).toContain("data.type === 'openai:init'");
    });

    it('only processes known message types', async () => {
      render(<IframeResource scriptSrc="/dist/carousel.js" />);

      await vi.waitFor(() => expect(capturedHtml).not.toBeNull());

      // Should only handle openai: prefixed messages
      expect(capturedHtml).toContain('openai:init');
      expect(capturedHtml).toContain('openai:update');
    });
  });

  describe('Iframe Sandbox Restrictions', () => {
    it('only allows scripts, no other capabilities', () => {
      render(<IframeResource scriptSrc="/dist/carousel.js" />);

      const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
      const sandbox = iframe.getAttribute('sandbox');

      expect(sandbox).toBe('allow-scripts');
      expect(sandbox).not.toContain('allow-same-origin');
      expect(sandbox).not.toContain('allow-forms');
      expect(sandbox).not.toContain('allow-popups');
      expect(sandbox).not.toContain('allow-top-navigation');
    });

    it('denies all sensitive device APIs via permissions policy', () => {
      render(<IframeResource scriptSrc="/dist/carousel.js" />);

      const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
      const allow = iframe.getAttribute('allow');

      const deniedAPIs = [
        'camera',
        'microphone',
        'geolocation',
        'usb',
        'payment',
        'midi',
        'gyroscope',
        'magnetometer',
        'accelerometer',
        'display-capture',
        'publickey-credentials-get',
        'xr-spatial-tracking',
        'autoplay',
      ];

      for (const api of deniedAPIs) {
        expect(allow).toContain(`${api} 'none'`);
      }
    });
  });

  describe('Allowed Origins Configuration', () => {
    it('ALLOWED_SCRIPT_ORIGINS contains sandbox.sunpeakai.com', () => {
      expect(ALLOWED_SCRIPT_ORIGINS).toContain('https://sandbox.sunpeakai.com');
    });

    it('ALLOWED_SCRIPT_ORIGINS contains localhost for development', () => {
      expect(ALLOWED_SCRIPT_ORIGINS).toContain('http://localhost');
      expect(ALLOWED_SCRIPT_ORIGINS).toContain('https://localhost');
    });

    it('ALLOWED_PARENT_ORIGINS contains app.sunpeak.ai', () => {
      expect(ALLOWED_PARENT_ORIGINS).toContain('https://app.sunpeak.ai');
    });

    it('ALLOWED_PARENT_ORIGINS contains localhost for development', () => {
      expect(ALLOWED_PARENT_ORIGINS).toContain('http://localhost');
      expect(ALLOWED_PARENT_ORIGINS).toContain('https://localhost');
    });
  });

  describe('Content Security Policy - generateCSP', () => {
    it('generates restrictive default CSP without config', () => {
      const csp = generateCSP(undefined, 'https://sandbox.sunpeakai.com/widget.js');

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' 'unsafe-inline' blob:");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("form-action 'none'");
      expect(csp).toContain("base-uri 'self'");
    });

    it('includes script origin in connect-src', () => {
      const csp = generateCSP(undefined, 'https://sandbox.sunpeakai.com/widget.js');

      expect(csp).toContain('connect-src');
      expect(csp).toContain('https://sandbox.sunpeakai.com');
    });

    it('adds custom connect domains to connect-src', () => {
      const csp = generateCSP(
        {
          connect_domains: ['https://api.mapbox.com', 'https://events.mapbox.com'],
        },
        'https://sandbox.sunpeakai.com/widget.js'
      );

      expect(csp).toContain('https://api.mapbox.com');
      expect(csp).toContain('https://events.mapbox.com');
    });

    it('adds custom resource domains to img-src and font-src', () => {
      const csp = generateCSP(
        {
          resource_domains: ['https://images.unsplash.com', 'https://cdn.openai.com'],
        },
        'https://sandbox.sunpeakai.com/widget.js'
      );

      expect(csp).toContain('img-src');
      expect(csp).toContain('https://images.unsplash.com');
      expect(csp).toContain('https://cdn.openai.com');
      expect(csp).toContain('font-src');
    });

    it('includes data: and blob: in resource sources', () => {
      const csp = generateCSP(undefined, 'https://sandbox.sunpeakai.com/widget.js');

      expect(csp).toContain('data:');
      expect(csp).toContain('blob:');
    });

    it('disallows nested iframes', () => {
      const csp = generateCSP(undefined, 'https://sandbox.sunpeakai.com/widget.js');

      expect(csp).toContain("frame-src 'none'");
    });

    it('disallows form submissions', () => {
      const csp = generateCSP(undefined, 'https://sandbox.sunpeakai.com/widget.js');

      expect(csp).toContain("form-action 'none'");
    });
  });

  describe('Content Security Policy - Component Integration', () => {
    it('includes CSP meta tag in generated HTML', async () => {
      render(<IframeResource scriptSrc="/dist/carousel.js" />);

      await vi.waitFor(() => expect(capturedHtml).not.toBeNull());

      expect(capturedHtml).toContain('http-equiv="Content-Security-Policy"');
      // Single quotes are HTML-escaped in the content attribute
      expect(capturedHtml).toContain('default-src &#39;self&#39;');
    });

    it('applies custom CSP from props', async () => {
      render(
        <IframeResource
          scriptSrc="/dist/carousel.js"
          csp={{
            connect_domains: ['https://api.example.com'],
            resource_domains: ['https://images.example.com'],
          }}
        />
      );

      await vi.waitFor(() => expect(capturedHtml).not.toBeNull());

      expect(capturedHtml).toContain('https://api.example.com');
      expect(capturedHtml).toContain('https://images.example.com');
    });
  });

  describe('MessageChannel Security', () => {
    it('uses MessageChannel for communication instead of postMessage(*)', () => {
      const bridgeScript = generateBridgeScript(['https://app.sunpeak.ai']);

      // Should use MessagePort for sending messages
      expect(bridgeScript).toContain('messagePort');
      expect(bridgeScript).toContain('sendToParent');
      expect(bridgeScript).toContain('messagePort.postMessage');
    });

    it('handles handshake with port transfer', () => {
      const bridgeScript = generateBridgeScript(['https://app.sunpeak.ai']);

      // Should listen for handshake and store transferred port
      expect(bridgeScript).toContain('openai:handshake');
      expect(bridgeScript).toContain('event.ports');
      expect(bridgeScript).toContain('messagePort = event.ports[0]');
    });

    it('queues messages until port is ready', () => {
      const bridgeScript = generateBridgeScript(['https://app.sunpeak.ai']);

      // Should queue messages if port not ready
      expect(bridgeScript).toContain('messageQueue');
      expect(bridgeScript).toContain('flushMessageQueue');
    });

    it('confirms handshake completion', () => {
      const bridgeScript = generateBridgeScript(['https://app.sunpeak.ai']);

      // Should send confirmation after handshake
      expect(bridgeScript).toContain('openai:handshake_complete');
    });

    it('only uses postMessage for ready signal and height updates', async () => {
      render(<IframeResource scriptSrc="/dist/carousel.js" />);

      await vi.waitFor(() => expect(capturedHtml).not.toBeNull());

      // postMessage to '*' is only used for:
      // 1. Initial ready signal (required for handshake)
      // 2. Height updates (for immediate responsiveness, validated on parent)
      const postMessageStarMatches = capturedHtml!.match(/postMessage\([^)]+,\s*'\*'\)/g) || [];
      expect(postMessageStarMatches.length).toBe(2);
      expect(postMessageStarMatches.some((m) => m.includes('openai:ready'))).toBe(true);
      expect(postMessageStarMatches.some((m) => m.includes('openai:notifyIntrinsicHeight'))).toBe(
        true
      );
    });
  });

  describe('generateScriptHtml', () => {
    it('includes CSP meta tag with escaped content', () => {
      const html = generateScriptHtml(
        'https://example.com/script.js',
        'dark',
        "default-src 'self'"
      );

      expect(html).toContain('http-equiv="Content-Security-Policy"');
      // Single quotes are HTML-escaped for security in the content attribute
      expect(html).toContain('content="default-src &#39;self&#39;"');
    });

    it('escapes malicious CSP content', () => {
      const maliciousCSP = '"><script>alert("xss")</script>';
      const html = generateScriptHtml('https://example.com/script.js', 'dark', maliciousCSP);

      // Should be escaped
      expect(html).not.toContain('><script>alert');
      expect(html).toContain('&lt;script&gt;');
    });
  });
});
