import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IframeResource, _testExports } from './iframe-resource';

const { escapeHtml, isAllowedScriptSrc, generateCSP, generateScriptHtml, ALLOWED_SCRIPT_ORIGINS } =
  _testExports;

describe('IframeResource', () => {
  it('renders an iframe with srcDoc', () => {
    render(<IframeResource scriptSrc="/dist/carousel/carousel.js" />);

    const iframe = screen.getByTitle('Resource Preview');
    expect(iframe).toBeInTheDocument();
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe.getAttribute('srcDoc')).not.toBeNull();
  });

  it('generates HTML wrapper with script tag (absolute URL)', () => {
    render(<IframeResource scriptSrc="/dist/carousel/carousel.js" />);

    const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
    const srcDoc = iframe.getAttribute('srcDoc') ?? '';

    // Relative paths are converted to absolute for srcdoc iframe compatibility
    expect(srcDoc).toContain(
      '<script src="http://localhost:3000/dist/carousel/carousel.js"></script>'
    );
    expect(srcDoc).toContain('<div id="root"></div>');
    expect(srcDoc).toContain('<!DOCTYPE html>');
  });

  it('does not inject a bridge script (MCP Apps SDK handles communication)', () => {
    render(<IframeResource scriptSrc="/dist/carousel/carousel.js" />);

    const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
    const srcDoc = iframe.getAttribute('srcDoc') ?? '';

    // No window.openai bridge script — the app uses MCP Apps SDK directly
    expect(srcDoc).not.toContain('window.openai');
  });

  it('sets appropriate sandbox attributes', () => {
    render(<IframeResource scriptSrc="/dist/carousel/carousel.js" />);

    const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toBe(
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'
    );
  });

  it('sets permissions policy matching ChatGPT iframe model', () => {
    render(<IframeResource scriptSrc="/dist/carousel/carousel.js" />);

    const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
    const allow = iframe.getAttribute('allow');
    expect(allow).toContain('local-network-access *');
    expect(allow).toContain('microphone *');
    expect(allow).toContain('midi *');
    expect(allow).toContain("camera 'none'");
    expect(allow).toContain("geolocation 'none'");
    expect(allow).toContain("usb 'none'");
  });

  it('applies custom className and style', () => {
    render(
      <IframeResource
        scriptSrc="/dist/carousel/carousel.js"
        className="custom-class"
        style={{ maxHeight: '500px' }}
      />
    );

    const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
    expect(iframe.className).toContain('custom-class');
    expect(iframe.style.maxHeight).toBe('500px');
  });

  it('sets default iframe styles', () => {
    render(<IframeResource scriptSrc="/dist/carousel/carousel.js" />);

    const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
    expect(iframe.style.width).toBe('100%');
    // Uses minHeight instead of height to allow auto-resize based on content
    expect(iframe.style.minHeight).toBe('200px');
  });

  it('includes theme in generated HTML', () => {
    render(
      <IframeResource scriptSrc="/dist/carousel/carousel.js" hostContext={{ theme: 'dark' }} />
    );

    const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
    const srcDoc = iframe.getAttribute('srcDoc') ?? '';

    expect(srcDoc).toContain('data-theme="dark"');
  });

  it('includes transparent background style', () => {
    render(<IframeResource scriptSrc="/dist/carousel/carousel.js" />);

    const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
    const srcDoc = iframe.getAttribute('srcDoc') ?? '';

    expect(srcDoc).toContain('background: transparent');
  });
});

describe('IframeResource Security', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // Helper to get srcDoc content from rendered iframe
  function getSrcDoc(): string {
    const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
    return iframe.getAttribute('srcDoc') ?? '';
  }

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
      expect(escaped).not.toContain('<img');
      expect(escaped).toContain('&lt;img');
      expect(escaped).toBe(
        `&quot;&gt;&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;&lt;&quot;`
      );
    });
  });

  describe('XSS Prevention - Component Integration', () => {
    it('escapes malicious scriptSrc in generated HTML', () => {
      const malicious = '/dist/"></script><script>alert("xss")</script><script x=".js';
      render(<IframeResource scriptSrc={malicious} />);

      const srcDoc = getSrcDoc();

      expect(srcDoc).not.toContain('><script>alert');
      expect(srcDoc).toContain('&lt;script&gt;');
    });

    it('blocks javascript: protocol attempts', () => {
      const malicious = 'javascript:alert(document.cookie)';
      render(<IframeResource scriptSrc={malicious} />);

      const srcDoc = getSrcDoc();

      expect(srcDoc).toContain('Script source not allowed');
    });

    it('blocks data: URL attempts', () => {
      const malicious = 'data:text/javascript,alert(1)';
      render(<IframeResource scriptSrc={malicious} />);

      const srcDoc = getSrcDoc();

      expect(srcDoc).toContain('Script source not allowed');
    });
  });

  describe('Script Origin Validation - isAllowedScriptSrc', () => {
    it('allows relative paths starting with /', () => {
      expect(isAllowedScriptSrc('/dist/carousel/carousel.js')).toBe(true);
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

    it('allows sunpeak-prod-app-storage S3 bucket', () => {
      expect(
        isAllowedScriptSrc(
          'https://sunpeak-prod-app-storage.s3.us-east-2.amazonaws.com/widgets/carousel.js'
        )
      ).toBe(true);
    });

    it('rejects arbitrary external domains', () => {
      expect(isAllowedScriptSrc('https://evil.com/malware.js')).toBe(false);
      expect(isAllowedScriptSrc('https://attacker.io/script.js')).toBe(false);
      expect(isAllowedScriptSrc('http://malicious-cdn.net/widget.js')).toBe(false);
    });

    it('rejects similar-looking domains (typosquatting)', () => {
      expect(
        isAllowedScriptSrc(
          'https://sunpeak-prod-app-storage.s3.us-east-2.amazonaws.com.evil.com/script.js'
        )
      ).toBe(false);
      expect(
        isAllowedScriptSrc('https://sunpeak-fake-app-storage.s3.us-east-2.amazonaws.com/script.js')
      ).toBe(false);
      expect(isAllowedScriptSrc('https://s3.us-east-2.amazonaws.com/script.js')).toBe(false);
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
    it('blocks scripts from disallowed origins', () => {
      render(<IframeResource scriptSrc="https://evil.com/malware.js" />);

      const srcDoc = getSrcDoc();

      expect(srcDoc).toContain('Script source not allowed');
      expect(srcDoc).not.toContain('evil.com');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[IframeResource] Script source not allowed:',
        'https://evil.com/malware.js'
      );
    });

    it('allows scripts from sunpeak-prod-app-storage S3 bucket', () => {
      render(
        <IframeResource scriptSrc="https://sunpeak-prod-app-storage.s3.us-east-2.amazonaws.com/widgets/test.js" />
      );

      const srcDoc = getSrcDoc();

      expect(srcDoc).toContain(
        'https://sunpeak-prod-app-storage.s3.us-east-2.amazonaws.com/widgets/test.js'
      );
      expect(srcDoc).not.toContain('Script source not allowed');
    });
  });

  describe('Iframe Sandbox Restrictions', () => {
    it('has sandbox permissions matching ChatGPT iframe model', () => {
      render(<IframeResource scriptSrc="/dist/carousel/carousel.js" />);

      const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
      const sandbox = iframe.getAttribute('sandbox');

      expect(sandbox).toContain('allow-scripts');
      expect(sandbox).toContain('allow-same-origin');
      expect(sandbox).toContain('allow-forms');
      expect(sandbox).toContain('allow-popups');
      expect(sandbox).toContain('allow-popups-to-escape-sandbox');
      expect(sandbox).not.toContain('allow-top-navigation');
    });

    it('allows some device APIs and denies others via permissions policy', () => {
      render(<IframeResource scriptSrc="/dist/carousel/carousel.js" />);

      const iframe = screen.getByTitle('Resource Preview') as HTMLIFrameElement;
      const allow = iframe.getAttribute('allow');

      expect(allow).toContain('local-network-access *');
      expect(allow).toContain('microphone *');
      expect(allow).toContain('midi *');

      const deniedAPIs = [
        'camera',
        'geolocation',
        'usb',
        'payment',
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
    it('ALLOWED_SCRIPT_ORIGINS contains sunpeak-prod-app-storage S3 bucket', () => {
      expect(ALLOWED_SCRIPT_ORIGINS).toContain(
        'https://sunpeak-prod-app-storage.s3.us-east-2.amazonaws.com'
      );
    });

    it('ALLOWED_SCRIPT_ORIGINS contains localhost for development', () => {
      expect(ALLOWED_SCRIPT_ORIGINS).toContain('http://localhost');
      expect(ALLOWED_SCRIPT_ORIGINS).toContain('https://localhost');
    });
  });

  describe('Content Security Policy - generateCSP', () => {
    it('generates restrictive default CSP without config', () => {
      const csp = generateCSP(
        undefined,
        'https://sunpeak-prod-app-storage.s3.us-east-2.amazonaws.com/widget.js'
      );

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' 'unsafe-inline' blob:");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("form-action 'none'");
      expect(csp).toContain("base-uri 'self'");
    });

    it('includes script origin in connect-src', () => {
      const csp = generateCSP(
        undefined,
        'https://sunpeak-prod-app-storage.s3.us-east-2.amazonaws.com/widget.js'
      );

      expect(csp).toContain('connect-src');
      expect(csp).toContain('https://sunpeak-prod-app-storage.s3.us-east-2.amazonaws.com');
    });

    it('adds custom connect domains to connect-src', () => {
      const csp = generateCSP(
        {
          connectDomains: ['https://api.mapbox.com', 'https://events.mapbox.com'],
        },
        'https://sunpeak-prod-app-storage.s3.us-east-2.amazonaws.com/widget.js'
      );

      expect(csp).toContain('https://api.mapbox.com');
      expect(csp).toContain('https://events.mapbox.com');
    });

    it('adds custom resource domains to img-src and font-src', () => {
      const csp = generateCSP(
        {
          resourceDomains: ['https://cdn.sunpeak.ai', 'https://cdn.openai.com'],
        },
        'https://sunpeak-prod-app-storage.s3.us-east-2.amazonaws.com/widget.js'
      );

      expect(csp).toContain('img-src');
      expect(csp).toContain('https://cdn.sunpeak.ai');
      expect(csp).toContain('https://cdn.openai.com');
      expect(csp).toContain('font-src');
    });

    it('includes data: and blob: in resource sources', () => {
      const csp = generateCSP(
        undefined,
        'https://sunpeak-prod-app-storage.s3.us-east-2.amazonaws.com/widget.js'
      );

      expect(csp).toContain('data:');
      expect(csp).toContain('blob:');
    });

    it('disallows nested iframes', () => {
      const csp = generateCSP(
        undefined,
        'https://sunpeak-prod-app-storage.s3.us-east-2.amazonaws.com/widget.js'
      );

      expect(csp).toContain("frame-src 'none'");
    });

    it('disallows form submissions', () => {
      const csp = generateCSP(
        undefined,
        'https://sunpeak-prod-app-storage.s3.us-east-2.amazonaws.com/widget.js'
      );

      expect(csp).toContain("form-action 'none'");
    });
  });

  describe('Content Security Policy - Component Integration', () => {
    it('includes CSP meta tag in generated HTML', () => {
      render(<IframeResource scriptSrc="/dist/carousel/carousel.js" />);

      const srcDoc = getSrcDoc();

      expect(srcDoc).toContain('http-equiv="Content-Security-Policy"');
      expect(srcDoc).toContain('default-src &#39;self&#39;');
    });

    it('applies custom CSP from props', () => {
      render(
        <IframeResource
          scriptSrc="/dist/carousel/carousel.js"
          csp={{
            connectDomains: ['https://api.example.com'],
            resourceDomains: ['https://images.example.com'],
          }}
        />
      );

      const srcDoc = getSrcDoc();

      expect(srcDoc).toContain('https://api.example.com');
      expect(srcDoc).toContain('https://images.example.com');
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
      expect(html).toContain('content="default-src &#39;self&#39;"');
    });

    it('escapes malicious CSP content', () => {
      const maliciousCSP = '"><script>alert("xss")</script>';
      const html = generateScriptHtml('https://example.com/script.js', 'dark', maliciousCSP);

      expect(html).not.toContain('><script>alert');
      expect(html).toContain('&lt;script&gt;');
    });
  });
});
