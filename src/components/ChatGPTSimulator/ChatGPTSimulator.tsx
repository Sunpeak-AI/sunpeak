import { useEffect, useState, type ReactNode } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  IconButton,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import type { DisplayMode, Theme, ChatGPTGlobals } from '../../types';
import { SET_GLOBALS_EVENT_TYPE, SetGlobalsEvent } from '../../types/chatgpt';
import { getTheme } from '../../themes';

export interface ChatGPTSimulatorProps {
  /**
   * The component to render in the ChatGPT message
   * Can be a function that receives the selected App UI
   */
  children: ReactNode | ((uiSimulation: string) => ReactNode);

  /**
   * Initial display mode
   */
  displayMode?: DisplayMode;

  /**
   * Initial color scheme
   */
  colorScheme?: Theme;

  /**
   * Initial tool input
   */
  toolInput?: Record<string, unknown>;

  /**
   * Initial tool output
   */
  toolOutput?: Record<string, unknown> | null;

  /**
   * Initial widget state
   */
  widgetState?: Record<string, unknown> | null;

  /**
   * User message to display above the component
   */
  userMessage?: string;

  /**
   * Show simulator controls
   */
  showControls?: boolean;

  /**
   * App UIs for the App UI selector
   */
  uiSimulations?: string[];

  /**
   * Initial App UI
   */
  initialUISimulation?: string;
}

/**
 * ChatGPT Simulator Component
 *
 * Emulates the ChatGPT environment for testing components locally.
 * Provides window.openai API and renders components in a ChatGPT-like UI.
 */
export function ChatGPTSimulator({
  children,
  displayMode: initialDisplayMode = 'inline',
  colorScheme: initialColorScheme = 'dark',
  toolInput = {},
  toolOutput = null,
  widgetState: initialWidgetState = null,
  userMessage = 'Show me some recommendations',
  showControls = true,
  uiSimulations,
  initialUISimulation,
}: ChatGPTSimulatorProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(initialDisplayMode);
  const [widgetState, setWidgetStateInternal] = useState<Record<string, unknown> | null>(
    initialWidgetState
  );
  const [bodyWidth, setBodyWidth] = useState<string>('100%');
  const [selectedUISimulation, setSelectedUISimulation] = useState<string>(
    initialUISimulation || uiSimulations?.[0] || ''
  );
  const [viewportHeight, setViewportHeight] = useState<number>(window.innerHeight);

  // Sync colorScheme with window.openai.colorScheme as source of truth
  const [colorScheme, setColorScheme] = useState<Theme>(initialColorScheme);

  const theme = getTheme(colorScheme);

  // Listen to changes in window.openai.colorScheme
  useEffect(() => {
    const handleSetGlobals = (event: Event) => {
      const customEvent = event as SetGlobalsEvent;
      if (customEvent.detail?.globals?.colorScheme) {
        setColorScheme(customEvent.detail.globals.colorScheme);
      }
    };

    window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobals);
    return () => window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobals);
  }, []);

  // Track viewport height for fullscreen mode
  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize window.openai
  useEffect(() => {
    // In fullscreen, subtract input bar height (~80px) from viewport
    const inputBarHeight = 80;
    const openaiGlobals: ChatGPTGlobals = {
      colorScheme,
      displayMode,
      locale: 'en-US',
      maxHeight: displayMode === 'fullscreen' ? viewportHeight - inputBarHeight : 600,
      userAgent: {
        device: { type: 'desktop' },
        capabilities: { hover: true, touch: false },
      },
      safeArea: {
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
      },
      toolInput,
      toolOutput,
      toolResponseMetadata: null,
      widgetState,
      setWidgetState: async (state: Record<string, unknown>) => {
        console.log('[ChatGPT Simulator] setWidgetState called:', state);
        setWidgetStateInternal(state);
      },
    };

    const openaiAPI = {
      callTool: async (name: string, args: Record<string, unknown>) => {
        console.log('[ChatGPT Simulator] callTool called:', name, args);
        return { result: 'Mock tool result' };
      },
      sendFollowUpMessage: async (args: { prompt: string }) => {
        console.log('[ChatGPT Simulator] sendFollowUpMessage called:', args);
      },
      openExternal: (payload: { href: string }) => {
        console.log('[ChatGPT Simulator] openExternal called:', payload);
        window.open(payload.href, '_blank');
      },
      requestDisplayMode: async (args: { mode: DisplayMode }) => {
        console.log('[ChatGPT Simulator] requestDisplayMode called:', args);
        setDisplayMode(args.mode);
        return { mode: args.mode };
      },
    };

    window.openai = { ...openaiGlobals, ...openaiAPI };

    // Dispatch initial event
    window.dispatchEvent(
      new CustomEvent(SET_GLOBALS_EVENT_TYPE, {
        detail: { globals: openaiGlobals },
      }) as SetGlobalsEvent
    );

    return () => {
      delete window.openai;
    };
  }, [colorScheme, displayMode, toolInput, toolOutput, widgetState, viewportHeight]);

  // Update window.openai when state changes
  useEffect(() => {
    if (window.openai) {
      const inputBarHeight = 80;
      const calculatedMaxHeight = displayMode === 'fullscreen' ? viewportHeight - inputBarHeight : 600;

      window.openai.colorScheme = colorScheme;
      window.openai.displayMode = displayMode;
      window.openai.widgetState = widgetState;
      window.openai.maxHeight = calculatedMaxHeight;

      window.dispatchEvent(
        new CustomEvent(SET_GLOBALS_EVENT_TYPE, {
          detail: {
            globals: { colorScheme, displayMode, widgetState, maxHeight: calculatedMaxHeight },
          },
        }) as SetGlobalsEvent
      );
    }
  }, [colorScheme, displayMode, widgetState, viewportHeight]);

  const isFullscreen = displayMode === 'fullscreen';

  // Render children based on whether it's a function or ReactNode
  const renderChildren = () => {
    if (typeof children === 'function') {
      return children(selectedUISimulation);
    }
    return children;
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          fontFamily: theme.typography.fontFamily,
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
        }}
      >
      {showControls && (
        <Box
          sx={{
            width: '250px',
            minWidth: '250px',
            padding: theme.spacing(5),
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(5),
            overflowY: 'auto',
            backgroundColor: theme.palette.mode === 'light'
              ? theme.palette.background.paper
              : theme.palette.background.default,
            borderRight: `1px solid ${theme.palette.divider}`,
            '@media (max-width: 768px)': {
              width: '100%',
              minWidth: 'unset',
              borderRight: 'none',
              borderBottom: `1px solid ${theme.palette.divider}`,
              padding: theme.spacing(4),
            },
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Controls
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: theme.spacing(3) }}>
            {uiSimulations && uiSimulations.length > 0 && (
              <FormControl fullWidth size="small">
                <InputLabel>App UI</InputLabel>
                <Select
                  value={selectedUISimulation}
                  onChange={(e) => setSelectedUISimulation(e.target.value)}
                  label="App UI"
                >
                  {uiSimulations.map((simulation) => (
                    <MenuItem key={simulation} value={simulation}>
                      {simulation}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl fullWidth size="small">
              <InputLabel>Color Scheme</InputLabel>
              <Select
                value={colorScheme}
                onChange={(e) => setColorScheme(e.target.value as Theme)}
                label="Color Scheme"
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Display Mode</InputLabel>
              <Select
                value={displayMode}
                onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
                label="Display Mode"
              >
                <MenuItem value="inline">Inline</MenuItem>
                <MenuItem value="fullscreen">Fullscreen</MenuItem>
                <MenuItem value="pip">Picture-in-Picture</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Body Width</InputLabel>
              <Select
                value={bodyWidth}
                onChange={(e) => setBodyWidth(e.target.value)}
                label="Body Width"
              >
                <MenuItem value="100%">100% (Full)</MenuItem>
                <MenuItem value="1024px">1024px (Laptop)</MenuItem>
                <MenuItem value="768px">768px (Tablet)</MenuItem>
                <MenuItem value="425px">425px (Mobile L)</MenuItem>
                <MenuItem value="320px">320px (Mobile S)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          margin: '0 auto',
          overflowY: 'auto',
          padding: isFullscreen ? 0 : `${theme.spacing(4)} 0 ${theme.spacing(4)} ${theme.spacing(6)}`,
          position: 'relative',
          width: bodyWidth,
          maxWidth: bodyWidth,
          height: isFullscreen ? '100vh' : 'auto',
        }}
      >
        {isFullscreen && (
          <IconButton
            onClick={() => setDisplayMode('inline')}
            aria-label="Exit fullscreen"
            sx={{
              position: 'absolute',
              top: theme.spacing(4),
              left: theme.spacing(4),
              width: 40,
              height: 40,
              backgroundColor: theme.palette.background.paper,
              zIndex: 10,
              '&:hover': {
                backgroundColor: theme.palette.mode === 'light'
                  ? theme.palette.grey[200]
                  : theme.palette.grey[800],
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}

        {!isFullscreen && (
          <Box sx={{ mb: theme.spacing(4) }}>
            <Typography variant="h4" sx={{ fontWeight: 600, margin: 0 }}>
              ChatGPT
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            maxWidth: '48rem',
            mx: 'auto',
            flex: 1,
            position: 'relative',
            display: 'flex',
            width: '100%',
            minWidth: 0,
            flexDirection: 'column',
          }}
        >
          <Box sx={{ display: 'flex', maxWidth: '100%', flexDirection: 'column', flexGrow: 1 }}>
            {!isFullscreen && (
              <>
                {/* User Message */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-end',
                    marginLeft: 'auto',
                    marginRight: theme.spacing(6),
                    maxWidth: '70%',
                    '@media (max-width: 768px)': {
                      maxWidth: '85%',
                    },
                  }}
                >
                  <Box
                    sx={{
                      flex: '0 1 auto',
                      padding: `${theme.spacing(2)} ${theme.spacing(4)}`,
                      borderRadius: theme.spacing(3),
                      lineHeight: 1.5,
                      fontSize: theme.typography.body1.fontSize,
                      overflow: 'hidden',
                      minWidth: '100px',
                      backgroundColor: theme.palette.mode === 'light'
                        ? theme.palette.grey[100]
                        : theme.palette.grey[800],
                      color: theme.palette.text.primary,
                    }}
                  >
                    {userMessage}
                  </Box>
                </Box>

                {/* Assistant Message with Component */}
                <Box
                  sx={{
                    minHeight: '32px',
                    position: 'relative',
                    display: 'flex',
                    width: '100%',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: theme.spacing(2),
                    textAlign: 'start',
                    wordBreak: 'break-word',
                    whiteSpace: 'normal',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      width: '100%',
                      flexDirection: 'column',
                      gap: theme.spacing(1),
                      '&:empty': { display: 'none' },
                      '&:first-of-type': { pt: '1px' },
                    }}
                  >
                    <Box sx={{ width: '100%', wordBreak: 'break-word' }}>
                      {/* App Title */}
                      <Box
                        sx={{
                          color: theme.palette.text.secondary,
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing(2),
                          margin: `${theme.spacing(4)} 0`,
                          fontSize: theme.typography.body2.fontSize,
                          fontWeight: 500,
                          opacity: 0.7,
                        }}
                      >
                        <Box component="span" sx={{ fontSize: theme.typography.body1.fontSize, lineHeight: 1 }}>
                          ✈️
                        </Box>
                        <Box component="span" sx={{ lineHeight: 1 }}>
                          Splorin
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          overflow: 'hidden',
                          minWidth: '300px',
                          maxWidth: '100%',
                          '@media (max-width: 768px)': {
                            minWidth: '200px',
                          },
                        }}
                      >
                        {renderChildren()}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </>
            )}
            {isFullscreen && (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  height: '100%',
                  overflowY: 'auto',
                  paddingBottom: '80px',
                }}
              >
                {renderChildren()}
              </Box>
            )}
          </Box>
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              margin: `${theme.spacing(4)} 0`,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <TextField
              placeholder="Message ChatGPT"
              disabled
              sx={{
                pointerEvents: 'auto',
                width: '100%',
                maxWidth: '800px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: theme.spacing(8),
                  backgroundColor: theme.palette.mode === 'light'
                    ? theme.palette.grey[100]
                    : theme.palette.grey[800],
                  '& fieldset': {
                    borderColor: theme.palette.mode === 'light'
                      ? theme.palette.grey[300]
                      : theme.palette.grey[700],
                  },
                  '&.Mui-disabled': {
                    cursor: 'not-allowed',
                    opacity: 0.6,
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: theme.palette.text.secondary,
                  opacity: 0.7,
                },
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
    </ThemeProvider>
  );
}
