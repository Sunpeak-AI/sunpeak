import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useApp,
  useHostContext,
  useToolData,
  useHostInfo,
  useTheme,
  useLocale,
  useTimeZone,
  useUserAgent,
  usePlatform,
  useDisplayMode,
  useDeviceCapabilities,
  useSafeArea,
  useViewport,
  useStyles,
  useIsMobile,
  useRequestDisplayMode,
  useOpenLink,
  useSendMessage,
  useDownloadFile,
  useSendLog,
  useUpdateModelContext,
  useCallServerTool,
  useListServerResources,
  useReadServerResource,
  SafeArea,
} from 'sunpeak';
import type { ResourceConfig } from 'sunpeak';

export const resource: ResourceConfig = {
  title: 'Host Inspector',
  description: 'Inspect every detail of the host runtime environment',
  mimeType: 'text/html;profile=mcp-app',
};

// ============================================================================
// Collapsible Section
// ============================================================================

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: '1px solid var(--color-border-secondary)',
        borderRadius: 'var(--border-radius-md)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 12px',
          background: 'var(--color-background-secondary)',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          textAlign: 'left',
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
          {open ? '\u25B2' : '\u25BC'}
        </span>
      </button>
      {open && <div style={{ padding: '8px 12px' }}>{children}</div>}
    </div>
  );
}

// ============================================================================
// Key-Value Table
// ============================================================================

function KVTable({ data }: { data: [string, unknown][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
      <tbody>
        {data.map(([key, value], i) => (
          <tr key={key + i} style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
            <td
              style={{
                padding: '4px 8px 4px 0',
                fontFamily: 'monospace',
                color: 'var(--color-text-secondary)',
                whiteSpace: 'nowrap',
                verticalAlign: 'top',
                fontWeight: 500,
              }}
            >
              {key}
            </td>
            <td
              style={{
                padding: '4px 0',
                fontFamily: 'monospace',
                color: 'var(--color-text-primary)',
                wordBreak: 'break-all',
              }}
            >
              {renderValue(value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined)
    return <span style={{ color: 'var(--color-text-tertiary)' }}>{String(value)}</span>;
  if (typeof value === 'boolean')
    return (
      <span style={{ color: value ? 'var(--color-text-success)' : 'var(--color-text-danger)' }}>
        {String(value)}
      </span>
    );
  if (typeof value === 'object')
    return (
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 'inherit' }}>
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  return String(value);
}

// ============================================================================
// Color Swatch
// ============================================================================

function ColorSwatch({ name, value }: { name: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }}>
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '4px',
          border: '1px solid var(--color-border-secondary)',
          backgroundColor: value,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          color: 'var(--color-text-secondary)',
          flexShrink: 0,
        }}
      >
        {name}
      </span>
      <span
        style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-text-tertiary)' }}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// Action Button
// ============================================================================

function ActionButton({
  label,
  onClick,
  disabled,
  variant = 'default',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary';
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        borderRadius: 'var(--border-radius-md)',
        border: variant === 'primary' ? 'none' : '1px solid var(--color-border-primary)',
        background:
          variant === 'primary' ? 'var(--color-ring-primary)' : 'var(--color-background-secondary)',
        color: variant === 'primary' ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
        fontSize: '11px',
        fontWeight: 500,
      }}
    >
      {label}
    </button>
  );
}

// ============================================================================
// CSS Variable Groups — names match DEFAULT_STYLE_VARIABLES exactly
// ============================================================================

const CSS_VARIABLE_GROUPS = {
  'Background Colors': [
    '--color-background-primary',
    '--color-background-secondary',
    '--color-background-tertiary',
    '--color-background-inverse',
    '--color-background-ghost',
    '--color-background-info',
    '--color-background-danger',
    '--color-background-success',
    '--color-background-warning',
    '--color-background-disabled',
  ],
  'Text Colors': [
    '--color-text-primary',
    '--color-text-secondary',
    '--color-text-tertiary',
    '--color-text-inverse',
    '--color-text-ghost',
    '--color-text-info',
    '--color-text-danger',
    '--color-text-success',
    '--color-text-warning',
    '--color-text-disabled',
  ],
  'Border Colors': [
    '--color-border-primary',
    '--color-border-secondary',
    '--color-border-tertiary',
    '--color-border-inverse',
    '--color-border-ghost',
    '--color-border-info',
    '--color-border-danger',
    '--color-border-success',
    '--color-border-warning',
    '--color-border-disabled',
  ],
  'Ring Colors': [
    '--color-ring-primary',
    '--color-ring-secondary',
    '--color-ring-inverse',
    '--color-ring-info',
    '--color-ring-danger',
    '--color-ring-success',
    '--color-ring-warning',
  ],
  Typography: [
    '--font-sans',
    '--font-mono',
    '--font-weight-normal',
    '--font-weight-medium',
    '--font-weight-semibold',
    '--font-weight-bold',
    '--font-text-xs-size',
    '--font-text-sm-size',
    '--font-text-md-size',
    '--font-text-lg-size',
    '--font-heading-xs-size',
    '--font-heading-sm-size',
    '--font-heading-md-size',
    '--font-heading-lg-size',
    '--font-heading-xl-size',
    '--font-heading-2xl-size',
    '--font-heading-3xl-size',
    '--font-text-xs-line-height',
    '--font-text-sm-line-height',
    '--font-text-md-line-height',
    '--font-text-lg-line-height',
    '--font-heading-xs-line-height',
    '--font-heading-sm-line-height',
    '--font-heading-md-line-height',
    '--font-heading-lg-line-height',
    '--font-heading-xl-line-height',
    '--font-heading-2xl-line-height',
    '--font-heading-3xl-line-height',
  ],
  'Border Radius': [
    '--border-radius-xs',
    '--border-radius-sm',
    '--border-radius-md',
    '--border-radius-lg',
    '--border-radius-xl',
    '--border-radius-full',
  ],
  Shadows: ['--shadow-hairline', '--shadow-sm', '--shadow-md', '--shadow-lg'],
  'Border Width': ['--border-width-regular'],
} as const;

/** All CSS variable names as a flat array */
const ALL_CSS_VARIABLES = Object.values(CSS_VARIABLE_GROUPS).flat();

function useComputedCSSVariables() {
  const theme = useTheme();

  return useMemo(() => {
    const computed = getComputedStyle(document.documentElement);
    const result: Record<string, string> = {};
    for (const name of ALL_CSS_VARIABLES) {
      result[name] = computed.getPropertyValue(name).trim() || '(not set)';
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}

// ============================================================================
// Computed Styles Reader
// ============================================================================

function useComputedElementStyles() {
  const theme = useTheme();

  return useMemo(() => {
    const computed = getComputedStyle(document.documentElement);
    return {
      'font-family': computed.fontFamily,
      'font-size': computed.fontSize,
      'line-height': computed.lineHeight,
      color: computed.color,
      'background-color': computed.backgroundColor,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}

// ============================================================================
// Window/Iframe Dimensions
// ============================================================================

function useWindowDimensions() {
  const [dims, setDims] = useState(readDims);

  useEffect(() => {
    const update = () => setDims(readDims());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return dims;
}

function readDims() {
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    devicePixelRatio: window.devicePixelRatio,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };
}

// ============================================================================
// Iframe Environment Detection
// ============================================================================

/** Detect iframe nesting, sandbox attributes, permissions, and origin info */
function useIframeEnvironment() {
  return useMemo(() => {
    const env: Record<string, unknown> = {};

    // Iframe nesting depth — count how many frames up to the top
    let depth = 0;
    let frame: Window = window;
    while (frame !== frame.parent) {
      depth++;
      try {
        frame = frame.parent;
      } catch {
        // Cross-origin — can't traverse further
        depth = -1; // unknown
        break;
      }
    }
    env.iframeDepth = depth;
    env.isIframe = window !== window.top;

    // Try to detect sandbox attributes from the inside.
    // We can't read the attribute directly, but we can probe what's allowed.
    const sandboxProbes: Record<string, boolean> = {};
    // Can we access top?
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      window.top?.location.href;
      sandboxProbes['allow-top-navigation'] = true;
    } catch {
      sandboxProbes['allow-top-navigation'] = false;
    }
    // Can we open popups?
    sandboxProbes['allow-scripts'] = true; // if this code runs, scripts are allowed
    // Same-origin check: can we access parent document?
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      window.parent.document;
      sandboxProbes['allow-same-origin (parent accessible)'] = true;
    } catch {
      sandboxProbes['allow-same-origin (parent accessible)'] = false;
    }
    env.sandboxProbes = sandboxProbes;

    // document.referrer
    env.referrer = document.referrer || '(empty)';

    // Origin info
    env.origin = window.location.origin;
    env.protocol = window.location.protocol;
    try {
      env.parentOrigin = window.parent !== window ? '(cross-origin or same)' : '(top-level)';
    } catch {
      env.parentOrigin = '(cross-origin - access denied)';
    }

    return env;
  }, []);
}

// ============================================================================
// Media Queries
// ============================================================================

function useMediaQueries() {
  const theme = useTheme();

  return useMemo(() => {
    const queries: Record<string, string> = {};
    const probe = (query: string) => {
      try {
        return window.matchMedia(query).matches;
      } catch {
        return null;
      }
    };

    queries['prefers-color-scheme: dark'] = String(probe('(prefers-color-scheme: dark)'));
    queries['prefers-color-scheme: light'] = String(probe('(prefers-color-scheme: light)'));
    queries['prefers-reduced-motion: reduce'] = String(probe('(prefers-reduced-motion: reduce)'));
    queries['prefers-contrast: more'] = String(probe('(prefers-contrast: more)'));
    queries['prefers-contrast: less'] = String(probe('(prefers-contrast: less)'));
    queries['prefers-reduced-transparency: reduce'] = String(
      probe('(prefers-reduced-transparency: reduce)')
    );
    queries['display-mode: standalone'] = String(probe('(display-mode: standalone)'));
    queries['hover: hover'] = String(probe('(hover: hover)'));
    queries['pointer: fine'] = String(probe('(pointer: fine)'));
    queries['pointer: coarse'] = String(probe('(pointer: coarse)'));
    return queries;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}

// ============================================================================
// Navigator Info
// ============================================================================

function useNavigatorInfo() {
  return useMemo(
    () => ({
      language: navigator.language,
      languages: [...navigator.languages],
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints,
      pdfViewerEnabled:
        'pdfViewerEnabled' in navigator
          ? (navigator as { pdfViewerEnabled?: boolean }).pdfViewerEnabled
          : undefined,
      userAgent: navigator.userAgent,
    }),
    []
  );
}

// ============================================================================
// Feature Detection
// ============================================================================

function useFeatureDetection() {
  // Use state + effect instead of useMemo so we capture features AFTER
  // platform runtimes (e.g., window.openai) have been injected. The mock
  // openai runtime is injected after iframe load, which happens after the
  // first React render.
  const [features, setFeatures] = useState<Record<string, boolean | string>>({});

  useEffect(() => {
    // Short delay to ensure platform script injection has completed
    const timer = setTimeout(() => {
      const f: Record<string, boolean | string> = {};

      f['window.openai'] =
        typeof (window as unknown as Record<string, unknown>).openai !== 'undefined';
      f['window.claude'] =
        typeof (window as unknown as Record<string, unknown>).claude !== 'undefined';

      // CSS @supports probes
      const cssProbes: [string, string][] = [
        ['color-mix()', 'color: color-mix(in srgb, red, blue)'],
        ['container queries', 'container-type: inline-size'],
        [':has()', 'selector(:has(*))'],
        ['light-dark()', 'color: light-dark(red, blue)'],
        ['dvh units', 'height: 100dvh'],
        ['color-scheme', 'color-scheme: light dark'],
        ['subgrid', 'grid-template-rows: subgrid'],
        ['anchor positioning', 'position-anchor: --x'],
      ];
      for (const [name, value] of cssProbes) {
        try {
          f[`CSS: ${name}`] = CSS.supports(value);
        } catch {
          f[`CSS: ${name}`] = 'unsupported';
        }
      }

      // API detection
      f['ResizeObserver'] = typeof ResizeObserver !== 'undefined';
      f['IntersectionObserver'] = typeof IntersectionObserver !== 'undefined';
      f['MutationObserver'] = typeof MutationObserver !== 'undefined';
      f['structuredClone'] = typeof structuredClone !== 'undefined';
      f['Clipboard API'] = typeof navigator.clipboard !== 'undefined';
      f['Web Audio'] =
        typeof AudioContext !== 'undefined' ||
        typeof (window as unknown as Record<string, unknown>).webkitAudioContext !== 'undefined';
      f['WebSocket'] = typeof WebSocket !== 'undefined';
      f['fetch'] = typeof fetch !== 'undefined';
      f['SharedArrayBuffer'] = typeof SharedArrayBuffer !== 'undefined';

      setFeatures(f);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return features;
}

// ============================================================================
// Scroll Container Detection
// ============================================================================

function useScrollInfo() {
  return useMemo(() => {
    const html = document.documentElement;
    const body = document.body;
    return {
      htmlOverflow: getComputedStyle(html).overflow,
      htmlOverflowY: getComputedStyle(html).overflowY,
      bodyOverflow: getComputedStyle(body).overflow,
      bodyOverflowY: getComputedStyle(body).overflowY,
      htmlScrollHeight: html.scrollHeight,
      htmlClientHeight: html.clientHeight,
      bodyScrollHeight: body.scrollHeight,
      bodyClientHeight: body.clientHeight,
      isHtmlScrollable: html.scrollHeight > html.clientHeight,
      isBodyScrollable: body.scrollHeight > body.clientHeight,
    };
  }, []);
}

// ============================================================================
// Performance Timing
// ============================================================================

function usePerformanceTiming() {
  const app = useApp();

  // Capture timing once on mount (via initializer function, not an effect).
  // performance.now() is impure but we only read it once.
  const [timing] = useState<Record<string, unknown>>(() => {
    const t: Record<string, unknown> = {};
    try {
      const nav = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      if (nav) {
        t.domContentLoaded = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
        t.loadEvent = Math.round(nav.loadEventEnd - nav.startTime);
        t.domInteractive = Math.round(nav.domInteractive - nav.startTime);
      }
      t.timeOrigin = Math.round(performance.timeOrigin);

      t.capturedAt = Math.round(performance.now());
    } catch {
      t.error = 'Performance API not available';
    }
    return t;
  });

  return useMemo(() => ({ ...timing, appConnected: !!app }), [timing, app]);
}

// ============================================================================
// Action Log
// ============================================================================

function useActionLog() {
  const [log, setLog] = useState<{ time: string; action: string; result?: string }[]>([]);

  const addLog = useCallback((action: string, result?: string) => {
    setLog((prev) => [
      { time: new Date().toISOString().slice(11, 23), action, result },
      ...prev.slice(0, 49),
    ]);
  }, []);

  return { log, addLog };
}

// ============================================================================
// Machine-Readable Data Dump
// ============================================================================

/**
 * Renders a hidden element with id="__inspector-data" containing a JSON blob
 * of all host runtime values. This enables automated extraction via:
 *
 *   appFrame.locator('#__inspector-data').textContent()
 *
 * The JSON shape is:
 * {
 *   hostInfo, hostCapabilities, theme, locale, timeZone, userAgent, platform,
 *   displayMode, availableDisplayModes, deviceCapabilities, safeArea, viewport,
 *   isMobile, styles (raw SDK), computedCssVariables, computedRootStyles,
 *   windowDimensions
 * }
 */
function InspectorDataDump({ data }: { data: Record<string, unknown> }) {
  // Escape </script> sequences to prevent premature tag termination (XSS).
  const safeJson = JSON.stringify(data).replace(/<\//g, '<\\/');
  return (
    <script
      id="__inspector-data"
      type="application/json"
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function HostInspectorResource() {
  const { isLoading } = useToolData();
  const app = useApp();
  const hostContext = useHostContext();

  // All individual hooks
  const theme = useTheme();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const userAgent = useUserAgent();
  const platform = usePlatform();
  const displayMode = useDisplayMode();
  const deviceCapabilities = useDeviceCapabilities();
  const safeArea = useSafeArea();
  const viewport = useViewport();
  const styles = useStyles();
  const isMobile = useIsMobile();
  const { hostVersion, hostCapabilities } = useHostInfo();
  const { requestDisplayMode, availableModes } = useRequestDisplayMode();

  // Action hooks
  const openLink = useOpenLink();
  const sendMessage = useSendMessage();
  const downloadFile = useDownloadFile();
  const sendLog = useSendLog();
  const updateModelContext = useUpdateModelContext();
  const callServerTool = useCallServerTool();
  const listServerResources = useListServerResources();
  const readServerResource = useReadServerResource();

  // Computed values
  const cssVars = useComputedCSSVariables();
  const computedStyles = useComputedElementStyles();
  const windowDims = useWindowDimensions();
  const { log, addLog } = useActionLog();

  // New: environment detection
  const iframeEnv = useIframeEnvironment();
  const mediaQueries = useMediaQueries();
  const navigatorInfo = useNavigatorInfo();
  const featureDetection = useFeatureDetection();
  const scrollInfo = useScrollInfo();
  const perfTiming = usePerformanceTiming();

  // Machine-readable dump
  const inspectorData = useMemo(
    () => ({
      hostVersion,
      hostCapabilities,
      theme,
      locale,
      timeZone,
      userAgent,
      platform,
      displayMode,
      availableDisplayModes: availableModes,
      deviceCapabilities,
      safeArea,
      viewport,
      isMobile,
      styles,
      computedCssVariables: cssVars,
      computedRootStyles: computedStyles,
      windowDimensions: windowDims,
      iframeEnvironment: iframeEnv,
      mediaQueries,
      navigatorInfo,
      featureDetection,
      scrollInfo,
      performanceTiming: perfTiming,
    }),
    [
      hostVersion,
      hostCapabilities,
      theme,
      locale,
      timeZone,
      userAgent,
      platform,
      displayMode,
      availableModes,
      deviceCapabilities,
      safeArea,
      viewport,
      isMobile,
      styles,
      cssVars,
      computedStyles,
      windowDims,
      iframeEnv,
      mediaQueries,
      navigatorInfo,
      featureDetection,
      scrollInfo,
      perfTiming,
    ]
  );

  if (isLoading) {
    return (
      <SafeArea
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          color: 'var(--color-text-secondary)',
        }}
      >
        Loading...
      </SafeArea>
    );
  }

  // ---- Action handlers ----

  const handleRequestDisplayMode = async (mode: 'inline' | 'pip' | 'fullscreen') => {
    try {
      await requestDisplayMode(mode);
      addLog(`requestDisplayMode("${mode}")`, 'sent');
    } catch (e) {
      addLog(`requestDisplayMode("${mode}")`, `error: ${e}`);
    }
  };

  const handleOpenLink = async () => {
    try {
      await openLink({ url: 'https://sunpeak.ai' });
      addLog('openLink("https://sunpeak.ai")', 'sent');
    } catch (e) {
      addLog('openLink', `error: ${e}`);
    }
  };

  const handleSendMessage = async () => {
    try {
      await sendMessage({
        role: 'user',
        content: [{ type: 'text', text: 'Host inspector test message' }],
      });
      addLog('sendMessage', 'sent');
    } catch (e) {
      addLog('sendMessage', `error: ${e}`);
    }
  };

  const handleDownloadFile = async () => {
    try {
      await downloadFile({
        contents: [
          {
            type: 'resource',
            resource: {
              uri: 'file:///inspector-test.txt',
              mimeType: 'text/plain',
              text: 'Host inspector test file content',
            },
          },
        ],
      });
      addLog('downloadFile', 'sent');
    } catch (e) {
      addLog('downloadFile', `error: ${e}`);
    }
  };

  const handleSendLog = async () => {
    try {
      await sendLog({
        level: 'info',
        data: { message: 'Host inspector test log', timestamp: new Date().toISOString() },
      });
      addLog('sendLog(info)', 'sent');
    } catch (e) {
      addLog('sendLog', `error: ${e}`);
    }
  };

  const handleUpdateModelContext = async () => {
    try {
      await updateModelContext({
        structuredContent: { inspector: true, timestamp: new Date().toISOString() },
      });
      addLog('updateModelContext', 'sent');
    } catch (e) {
      addLog('updateModelContext', `error: ${e}`);
    }
  };

  const handleCallServerTool = async () => {
    try {
      const result = await callServerTool({
        name: 'echo',
        arguments: { message: 'inspector test' },
      });
      addLog('callServerTool("echo")', JSON.stringify(result).slice(0, 200));
    } catch (e) {
      addLog('callServerTool', `error: ${e}`);
    }
  };

  const handleListServerResources = async () => {
    try {
      const result = await listServerResources();
      addLog('listServerResources', JSON.stringify(result).slice(0, 200));
    } catch (e) {
      addLog('listServerResources', `error: ${e}`);
    }
  };

  const handleReadServerResource = async () => {
    try {
      const result = await readServerResource({ uri: 'test://inspector' });
      addLog('readServerResource', JSON.stringify(result).slice(0, 200));
    } catch (e) {
      addLog('readServerResource', `error: ${e}`);
    }
  };

  return (
    <SafeArea style={{ overflowY: 'auto', fontSize: '13px', color: 'var(--color-text-primary)' }}>
      <InspectorDataDump data={inspectorData} />
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Host Inspector</h1>

        {/* Host Identity */}
        <Section title="Host Identity">
          <KVTable
            data={[
              ['hostVersion.name', hostVersion?.name],
              ['hostVersion.version', hostVersion?.version],
              ['userAgent', userAgent],
              ['platform', platform],
              ['isMobile', isMobile],
            ]}
          />
        </Section>

        {/* Host Capabilities */}
        <Section title="Host Capabilities">
          <KVTable
            data={[
              ['openLinks', hostCapabilities?.openLinks],
              ['downloadFile', hostCapabilities?.downloadFile],
              ['serverTools', hostCapabilities?.serverTools],
              ['serverResources', hostCapabilities?.serverResources],
              ['logging', hostCapabilities?.logging],
              ['updateModelContext', hostCapabilities?.updateModelContext],
              ['message', hostCapabilities?.message],
              ['sandbox', hostCapabilities?.sandbox],
              ['experimental', hostCapabilities?.experimental],
            ]}
          />
        </Section>

        {/* Theme & Locale */}
        <Section title="Theme & Locale">
          <KVTable
            data={[
              ['theme', theme],
              ['locale', locale],
              ['timeZone', timeZone],
              ['displayMode', displayMode],
              ['availableDisplayModes', availableModes],
            ]}
          />
        </Section>

        {/* Device & Viewport */}
        <Section title="Device & Viewport">
          <KVTable
            data={[
              ['deviceCapabilities', deviceCapabilities],
              ['viewport (host-reported)', viewport],
              ['safeArea', safeArea],
            ]}
          />
        </Section>

        {/* Window Dimensions (Iframe) */}
        <Section title="Iframe Window Dimensions">
          <KVTable data={Object.entries(windowDims)} />
        </Section>

        {/* Iframe Environment */}
        <Section title="Iframe Environment">
          <KVTable data={Object.entries(iframeEnv)} />
        </Section>

        {/* Media Queries */}
        <Section title="Media Queries">
          <KVTable data={Object.entries(mediaQueries)} />
        </Section>

        {/* Navigator */}
        <Section title="Navigator Info" defaultOpen={false}>
          <KVTable data={Object.entries(navigatorInfo)} />
        </Section>

        {/* Feature Detection */}
        <Section title="Feature Detection" defaultOpen={false}>
          <KVTable data={Object.entries(featureDetection)} />
        </Section>

        {/* Scroll Info */}
        <Section title="Scroll Container" defaultOpen={false}>
          <KVTable data={Object.entries(scrollInfo)} />
        </Section>

        {/* Performance */}
        <Section title="Performance Timing" defaultOpen={false}>
          <KVTable data={Object.entries(perfTiming)} />
        </Section>

        {/* Computed Element Styles */}
        <Section title="Computed Root Element Styles">
          <KVTable data={Object.entries(computedStyles)} />
        </Section>

        {/* CSS Variables - Colors */}
        <Section title="CSS Variables: Background Colors" defaultOpen={false}>
          {CSS_VARIABLE_GROUPS['Background Colors'].map((name) => (
            <ColorSwatch key={name} name={name} value={`var(${name})`} />
          ))}
          <div
            style={{
              marginTop: '8px',
              borderTop: '1px solid var(--color-border-tertiary)',
              paddingTop: '8px',
            }}
          >
            <KVTable
              data={CSS_VARIABLE_GROUPS['Background Colors'].map(
                (name) => [name, cssVars[name]] as [string, unknown]
              )}
            />
          </div>
        </Section>

        <Section title="CSS Variables: Text Colors" defaultOpen={false}>
          {CSS_VARIABLE_GROUPS['Text Colors'].map((name) => (
            <ColorSwatch key={name} name={name} value={`var(${name})`} />
          ))}
          <div
            style={{
              marginTop: '8px',
              borderTop: '1px solid var(--color-border-tertiary)',
              paddingTop: '8px',
            }}
          >
            <KVTable
              data={CSS_VARIABLE_GROUPS['Text Colors'].map(
                (name) => [name, cssVars[name]] as [string, unknown]
              )}
            />
          </div>
        </Section>

        <Section title="CSS Variables: Border Colors" defaultOpen={false}>
          {CSS_VARIABLE_GROUPS['Border Colors'].map((name) => (
            <ColorSwatch key={name} name={name} value={`var(${name})`} />
          ))}
          <div
            style={{
              marginTop: '8px',
              borderTop: '1px solid var(--color-border-tertiary)',
              paddingTop: '8px',
            }}
          >
            <KVTable
              data={CSS_VARIABLE_GROUPS['Border Colors'].map(
                (name) => [name, cssVars[name]] as [string, unknown]
              )}
            />
          </div>
        </Section>

        <Section title="CSS Variables: Ring Colors" defaultOpen={false}>
          {CSS_VARIABLE_GROUPS['Ring Colors'].map((name) => (
            <ColorSwatch key={name} name={name} value={`var(${name})`} />
          ))}
          <div
            style={{
              marginTop: '8px',
              borderTop: '1px solid var(--color-border-tertiary)',
              paddingTop: '8px',
            }}
          >
            <KVTable
              data={CSS_VARIABLE_GROUPS['Ring Colors'].map(
                (name) => [name, cssVars[name]] as [string, unknown]
              )}
            />
          </div>
        </Section>

        {/* CSS Variables - Typography */}
        <Section title="CSS Variables: Typography" defaultOpen={false}>
          <KVTable
            data={CSS_VARIABLE_GROUPS['Typography'].map(
              (name) => [name, cssVars[name]] as [string, unknown]
            )}
          />
        </Section>

        {/* CSS Variables - Border Radius */}
        <Section title="CSS Variables: Border Radius" defaultOpen={false}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
            {CSS_VARIABLE_GROUPS['Border Radius'].map((name) => (
              <div key={name} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: 'var(--color-ring-primary)',
                    borderRadius: `var(${name})`,
                  }}
                />
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '9px',
                    color: 'var(--color-text-secondary)',
                    marginTop: '4px',
                  }}
                >
                  {name.replace('--border-radius-', '')}
                </div>
              </div>
            ))}
          </div>
          <KVTable
            data={CSS_VARIABLE_GROUPS['Border Radius'].map(
              (name) => [name, cssVars[name]] as [string, unknown]
            )}
          />
        </Section>

        {/* CSS Variables - Shadows */}
        <Section title="CSS Variables: Shadows" defaultOpen={false}>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '8px' }}
          >
            {CSS_VARIABLE_GROUPS['Shadows'].map((name) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '30px',
                    backgroundColor: 'var(--color-background-primary)',
                    borderRadius: 'var(--border-radius-md)',
                    boxShadow: `var(${name})`,
                  }}
                />
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {name}
                </span>
              </div>
            ))}
          </div>
          <KVTable
            data={CSS_VARIABLE_GROUPS['Shadows'].map(
              (name) => [name, cssVars[name]] as [string, unknown]
            )}
          />
        </Section>

        {/* CSS Variables - Border Width */}
        <Section title="CSS Variables: Border Width" defaultOpen={false}>
          <KVTable
            data={CSS_VARIABLE_GROUPS['Border Width'].map(
              (name) => [name, cssVars[name]] as [string, unknown]
            )}
          />
        </Section>

        {/* Host Styles (raw from SDK) */}
        <Section title="Raw Host Styles (from SDK)" defaultOpen={false}>
          <KVTable data={[['styles', styles]]} />
        </Section>

        {/* Raw Host Context */}
        <Section title="Raw Host Context (full object)" defaultOpen={false}>
          <KVTable data={[['hostContext', hostContext]]} />
        </Section>

        {/* App Instance Info */}
        <Section title="App Instance" defaultOpen={false}>
          <KVTable
            data={[
              ['app connected', !!app],
              [
                'app.getHostVersion()',
                app
                  ? (() => {
                      try {
                        return app.getHostVersion();
                      } catch {
                        return 'error';
                      }
                    })()
                  : null,
              ],
              [
                'app.getHostCapabilities()',
                app
                  ? (() => {
                      try {
                        return app.getHostCapabilities();
                      } catch {
                        return 'error';
                      }
                    })()
                  : null,
              ],
            ]}
          />
        </Section>

        {/* Actions */}
        <Section title="Actions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '4px',
                  fontWeight: 600,
                }}
              >
                Display Mode
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <ActionButton
                  label="Inline"
                  onClick={() => handleRequestDisplayMode('inline')}
                  variant={displayMode === 'inline' ? 'primary' : 'default'}
                />
                <ActionButton
                  label="Fullscreen"
                  onClick={() => handleRequestDisplayMode('fullscreen')}
                />
                <ActionButton label="PiP" onClick={() => handleRequestDisplayMode('pip')} />
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '4px',
                  fontWeight: 600,
                }}
              >
                Communication
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <ActionButton label="Open Link" onClick={handleOpenLink} />
                <ActionButton label="Send Message" onClick={handleSendMessage} />
                <ActionButton label="Download File" onClick={handleDownloadFile} />
                <ActionButton label="Send Log" onClick={handleSendLog} />
                <ActionButton label="Update Model Context" onClick={handleUpdateModelContext} />
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '4px',
                  fontWeight: 600,
                }}
              >
                Server Interaction
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <ActionButton label="Call Server Tool" onClick={handleCallServerTool} />
                <ActionButton label="List Server Resources" onClick={handleListServerResources} />
                <ActionButton label="Read Server Resource" onClick={handleReadServerResource} />
              </div>
            </div>
          </div>
        </Section>

        {/* Action Log */}
        {log.length > 0 && (
          <Section title="Action Log">
            <div style={{ maxHeight: '200px', overflow: 'auto' }}>
              {log.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    padding: '2px 0',
                    borderBottom: '1px solid var(--color-border-tertiary)',
                  }}
                >
                  <span style={{ color: 'var(--color-text-tertiary)' }}>{entry.time}</span>{' '}
                  <span style={{ color: 'var(--color-text-primary)' }}>{entry.action}</span>
                  {entry.result && (
                    <>
                      {' '}
                      <span style={{ color: 'var(--color-text-secondary)' }}>{entry.result}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </SafeArea>
  );
}
