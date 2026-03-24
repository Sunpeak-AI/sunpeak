import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Simulator } from './simulator';
import type { Simulation } from '../types/simulation';

// Mock fetch for useMcpConnection
let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch');
  // Default: health check succeeds
  fetchSpy.mockResolvedValue(new Response('{"tools":[]}', { status: 200 }));
});

afterEach(() => {
  fetchSpy.mockRestore();
});

/**
 * Create a minimal Simulation for testing.
 */
function createSim(overrides: Partial<Simulation> = {}): Simulation {
  return {
    name: 'test-tool',
    tool: { name: 'test-tool', inputSchema: { type: 'object' } },
    resource: { uri: 'test://resource', name: 'test-resource', mimeType: 'text/html' },
    resourceUrl: '/test-resource.html',
    ...overrides,
  };
}

describe('Simulator', () => {
  describe('Tool dropdown', () => {
    it('shows Tool dropdown when tools exist', () => {
      render(<Simulator simulations={{ test: createSim() }} onCallTool={vi.fn()} />);

      expect(screen.getByTestId('tool-selector')).toBeInTheDocument();
    });

    it('does not show Tool dropdown when no tools exist', () => {
      render(<Simulator simulations={{}} />);

      expect(screen.queryByTestId('tool-selector')).not.toBeInTheDocument();
    });

    it('deduplicates tools by name', () => {
      render(
        <Simulator
          simulations={{
            'sim-a': createSim({
              name: 'sim-a',
              tool: { name: 'my-tool', inputSchema: { type: 'object' } },
            }),
            'sim-b': createSim({
              name: 'sim-b',
              tool: { name: 'my-tool', inputSchema: { type: 'object' } },
              toolResult: { content: [], structuredContent: { variant: 'b' } },
            }),
          }}
          onCallTool={vi.fn()}
        />
      );

      // Should show one tool entry, not two
      const toolOptions = screen.getAllByRole('option').filter((o) => o.textContent === 'my-tool');
      expect(toolOptions).toHaveLength(1);
    });

    it('excludes backend-only tools (no resource)', () => {
      render(
        <Simulator
          simulations={{
            'backend-tool': createSim({
              name: 'backend-tool',
              tool: { name: 'backend-tool', inputSchema: { type: 'object' } },
              resource: undefined,
              resourceUrl: undefined,
            }),
            'ui-tool': createSim(),
          }}
          onCallTool={vi.fn()}
        />
      );

      const allOptions = screen.getAllByRole('option');
      const backendOption = allOptions.find((o) => o.textContent?.includes('backend-tool'));
      expect(backendOption).toBeUndefined();
    });
  });

  describe('Simulation dropdown', () => {
    it('shows Simulation dropdown with fixture options when fixtures exist', () => {
      render(
        <Simulator
          simulations={{
            test: createSim({
              toolResult: { content: [], structuredContent: { data: 'mock' } },
            }),
          }}
          onCallTool={vi.fn()}
        />
      );

      const simSelector = screen.getByTestId('simulation-selector');
      expect(simSelector).toBeInTheDocument();
      // Should have "None (call server)" + the fixture
      const options = simSelector.querySelectorAll('option');
      expect(options.length).toBeGreaterThan(1);
    });

    it('shows Simulation dropdown with only "None" when no fixtures exist', () => {
      render(
        <Simulator
          simulations={{
            test: createSim(), // No toolInput, toolResult, or serverTools
          }}
          onCallTool={vi.fn()}
        />
      );

      const simSelector = screen.getByTestId('simulation-selector');
      expect(simSelector).toBeInTheDocument();
      // Should only have "None"
      const options = simSelector.querySelectorAll('option');
      expect(options).toHaveLength(1);
      expect(options[0].textContent).toBe('None');
    });

    it('makes "Simulation" label a link to docs when no fixtures exist', () => {
      render(<Simulator simulations={{ test: createSim() }} onCallTool={vi.fn()} />);

      const link = screen
        .getByTestId('simulation-selector')
        .closest('[data-testid]')
        ?.querySelector('a[href*="simulations"]');
      expect(link).toBeInTheDocument();
    });

    it('includes "None (call server)" option in simulation dropdown', () => {
      render(
        <Simulator
          simulations={{
            test: createSim({
              toolResult: { content: [], structuredContent: { mock: true } },
            }),
          }}
          onCallTool={vi.fn()}
        />
      );

      const noneOption = screen.getAllByRole('option').find((o) => o.textContent?.includes('None'));
      expect(noneOption).toBeDefined();
    });

    it('pre-populates mock data when simulation with toolResult is selected', () => {
      render(
        <Simulator
          simulations={{
            test: createSim({
              toolResult: { content: [], structuredContent: { data: 'mock' } },
            }),
          }}
          onCallTool={vi.fn()}
        />
      );

      const textarea = screen.getByTestId('tool-result-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toContain('mock');
    });

    it('clears mock data when "None" is selected', async () => {
      const user = userEvent.setup();

      render(
        <Simulator
          simulations={{
            test: createSim({
              toolResult: { content: [], structuredContent: { data: 'mock' } },
            }),
          }}
          onCallTool={vi.fn()}
        />
      );

      // Initially has mock data
      expect((screen.getByTestId('tool-result-textarea') as HTMLTextAreaElement).value).toContain(
        'mock'
      );

      // Select "None (call server)"
      const simSelect = screen.getByTestId('simulation-selector')!.querySelector('select')!;
      await user.selectOptions(simSelect, '__none__');

      // Mock data should be cleared
      await waitFor(() => {
        expect((screen.getByTestId('tool-result-textarea') as HTMLTextAreaElement).value).toBe('');
      });
    });
  });

  describe('Run button', () => {
    it('shows Run button when a tool is selected and onCallTool is provided', () => {
      render(<Simulator simulations={{ test: createSim() }} onCallTool={vi.fn()} />);

      expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
    });

    it('does not show Run button when no tools exist', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('{"tools":[]}', { status: 200 }));

      render(
        <Simulator simulations={{}} mcpServerUrl="http://localhost:8000/mcp" onCallTool={vi.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /run/i })).not.toBeInTheDocument();
    });

    it('calls onCallTool when Run is clicked', async () => {
      const user = userEvent.setup();
      const onCallTool = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'real result' }],
      });

      render(<Simulator simulations={{ test: createSim() }} onCallTool={onCallTool} />);

      await user.click(screen.getByRole('button', { name: /run/i }));

      await waitFor(() => {
        expect(onCallTool).toHaveBeenCalledWith({
          name: 'test-tool',
          arguments: expect.any(Object),
        });
      });
    });

    it('hides Run button when a simulation with fixture data is selected', () => {
      render(
        <Simulator
          simulations={{
            test: createSim({
              toolResult: { content: [], structuredContent: { mocked: true } },
            }),
          }}
          onCallTool={vi.fn()}
        />
      );

      // Simulation with toolResult is auto-selected → Run button hidden
      expect(screen.queryByRole('button', { name: /run/i })).not.toBeInTheDocument();
    });

    it('shows Run button after selecting "None" from simulation dropdown', async () => {
      const user = userEvent.setup();

      render(
        <Simulator
          simulations={{
            test: createSim({
              toolResult: { content: [], structuredContent: { mocked: true } },
            }),
          }}
          onCallTool={vi.fn()}
        />
      );

      // Initially hidden (simulation with fixture selected)
      expect(screen.queryByRole('button', { name: /run/i })).not.toBeInTheDocument();

      // Select "None (call server)"
      const simSelect = screen.getByTestId('simulation-selector').querySelector('select')!;
      await user.selectOptions(simSelect, '__none__');

      // Run button should now be visible
      expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
    });
  });

  describe('Prod Resources', () => {
    it('shows Prod Resources checkbox when hideSimulatorModes is false', () => {
      render(<Simulator simulations={{ test: createSim() }} onCallTool={vi.fn()} />);

      expect(screen.getByRole('checkbox', { name: /prod resources/i })).toBeInTheDocument();
    });

    it('hides Prod Resources checkbox when hideSimulatorModes is true', () => {
      render(
        <Simulator simulations={{ test: createSim() }} onCallTool={vi.fn()} hideSimulatorModes />
      );

      expect(screen.queryByRole('checkbox', { name: /prod resources/i })).not.toBeInTheDocument();
    });
  });

  describe('Demo mode', () => {
    it('shows a static example URL in a disabled input', () => {
      render(<Simulator simulations={{ test: createSim() }} onCallTool={vi.fn()} demoMode />);

      const input = screen.getByDisplayValue('http://localhost:8000/mcp');
      expect(input).toBeDisabled();
    });

    it('hides connection status indicator', () => {
      render(
        <Simulator
          simulations={{ test: createSim() }}
          mcpServerUrl="http://localhost:8000/mcp"
          onCallTool={vi.fn()}
          demoMode
        />
      );

      expect(screen.queryByTestId('connection-status')).not.toBeInTheDocument();
    });

    it('hides Prod Resources checkbox', () => {
      render(<Simulator simulations={{ test: createSim() }} onCallTool={vi.fn()} demoMode />);

      expect(screen.queryByRole('checkbox', { name: /prod resources/i })).not.toBeInTheDocument();
    });

    it('hides Run button even when no simulation is active', () => {
      render(<Simulator simulations={{ test: createSim() }} onCallTool={vi.fn()} demoMode />);

      // Without demoMode this would show the Run button (no fixture data = no active sim)
      expect(screen.queryByRole('button', { name: /run/i })).not.toBeInTheDocument();
    });

    it('still renders simulation content normally', () => {
      render(
        <Simulator
          simulations={{
            test: createSim({
              toolResult: { content: [], structuredContent: { demo: true } },
            }),
          }}
          demoMode
        />
      );

      // Tool Result section should be present with mock data
      expect(screen.getByTestId('tool-result-section')).toBeInTheDocument();
    });
  });

  describe('MCP Server URL', () => {
    it('always shows MCP Server URL input', () => {
      render(<Simulator simulations={{ test: createSim() }} onCallTool={vi.fn()} />);

      expect(screen.getByTestId('server-url')).toBeInTheDocument();
    });

    it('pre-populates server URL from mcpServerUrl prop', async () => {
      render(
        <Simulator
          simulations={{ test: createSim() }}
          mcpServerUrl="http://localhost:8000/mcp"
          onCallTool={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('http://localhost:8000/mcp')).toBeInTheDocument();
      });
    });

    it('shows connection status indicator when URL is set', async () => {
      render(
        <Simulator
          simulations={{ test: createSim() }}
          mcpServerUrl="http://localhost:8000/mcp"
          onCallTool={vi.fn()}
        />
      );

      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
  });

  describe('Server reconnection', () => {
    it('updates simulations when reconnecting to a new server', async () => {
      const user = userEvent.setup();
      const newSimulations = {
        'new-tool-a': createSim({
          name: 'new-tool-a',
          tool: { name: 'new-tool-a', inputSchema: { type: 'object' } },
          resource: { uri: 'test://res-a', name: 'res-a', mimeType: 'text/html' },
          resourceUrl: '/res-a.html',
        }),
        'new-tool-b': createSim({
          name: 'new-tool-b',
          tool: { name: 'new-tool-b', inputSchema: { type: 'object' } },
          resource: { uri: 'test://res-b', name: 'res-b', mimeType: 'text/html' },
          resourceUrl: '/res-b.html',
        }),
      };

      fetchSpy
        .mockResolvedValueOnce(new Response('{"tools":[]}', { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ status: 'ok', simulations: newSimulations }), {
            status: 200,
          })
        );

      render(
        <Simulator
          simulations={{ test: createSim() }}
          mcpServerUrl="http://localhost:8000/mcp"
          onCallTool={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      });

      const urlInput = screen.getByDisplayValue('http://localhost:8000/mcp');
      await user.clear(urlInput);
      await user.type(urlInput, 'http://localhost:9999/mcp{Enter}');

      await waitFor(() => {
        const allOptions = screen.getAllByRole('option');
        const newOption = allOptions.find((o) => o.textContent?.includes('new-tool-a'));
        expect(newOption).toBeDefined();
      });
    });

    it('shows error status and clears tools when reconnect fails', async () => {
      const user = userEvent.setup();

      fetchSpy
        .mockResolvedValueOnce(new Response('{"tools":[]}', { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: 'Connection refused' }), { status: 500 })
        );

      render(
        <Simulator
          simulations={{ test: createSim() }}
          mcpServerUrl="http://localhost:8000/mcp"
          onCallTool={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      });

      const urlInput = screen.getByDisplayValue('http://localhost:8000/mcp');
      await user.clear(urlInput);
      await user.type(urlInput, 'http://bad-server:9999/mcp{Enter}');

      await waitFor(() => {
        const statusDot = screen.getByTestId('connection-status');
        expect(statusDot).toHaveAttribute('title', 'Connection refused');
      });

      expect(screen.getByText('Could not connect to MCP server')).toBeInTheDocument();
    });

    it('preserves initial simulations when initial health check fails', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('', { status: 500 }));

      render(
        <Simulator
          simulations={{ test: createSim() }}
          mcpServerUrl="http://localhost:8000/mcp"
          onCallTool={vi.fn()}
        />
      );

      await waitFor(() => {
        const statusDot = screen.getByTestId('connection-status');
        expect(statusDot).toHaveAttribute('title', expect.stringContaining('Health check failed'));
      });

      // Simulations from props should still be present
      expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('shows "Enter an MCP server URL" when no URL and no simulations', () => {
      render(<Simulator simulations={{}} />);
      expect(screen.getByText('Enter an MCP server URL to get started')).toBeInTheDocument();
    });

    it('shows "No tools with UI resources" when connected but no simulations', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('{"tools":[]}', { status: 200 }));

      render(
        <Simulator simulations={{}} mcpServerUrl="http://localhost:8000/mcp" onCallTool={vi.fn()} />
      );

      await waitFor(() => {
        expect(
          screen.getByText('No tools with UI resources found on this server')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Tool Result visibility', () => {
    it('shows Tool Result section', () => {
      render(
        <Simulator
          simulations={{
            test: createSim({ toolResult: { content: [], structuredContent: { foo: 1 } } }),
          }}
        />
      );

      expect(screen.getByTestId('tool-result-section')).toBeInTheDocument();
    });
  });

  // ── Story 1: Framework user (sunpeak dev) ──
  describe('Framework: multi-tool workflow', () => {
    const multiToolSims = {
      'albums-default': createSim({
        name: 'albums-default',
        tool: { name: 'show-albums', inputSchema: { type: 'object' } },
        resource: { uri: 'test://albums', name: 'albums', mimeType: 'text/html' },
        resourceUrl: '/albums.html',
        toolInput: { category: 'food' },
        toolResult: { content: [], structuredContent: { albums: ['A'] } },
      }),
      'albums-empty': createSim({
        name: 'albums-empty',
        tool: { name: 'show-albums', inputSchema: { type: 'object' } },
        resource: { uri: 'test://albums', name: 'albums', mimeType: 'text/html' },
        resourceUrl: '/albums.html',
        toolInput: { category: 'none' },
        toolResult: { content: [], structuredContent: { albums: [] } },
      }),
      'map-default': createSim({
        name: 'map-default',
        tool: { name: 'show-map', inputSchema: { type: 'object' } },
        resource: { uri: 'test://map', name: 'map', mimeType: 'text/html' },
        resourceUrl: '/map.html',
        toolInput: { location: 'NYC' },
        toolResult: { content: [], structuredContent: { pins: [1] } },
      }),
    };

    it('switching tools updates the simulation dropdown', async () => {
      const user = userEvent.setup();

      render(<Simulator simulations={multiToolSims} onCallTool={vi.fn()} />);

      // albums tool selected by default (alphabetical) — should have 2 fixture sims
      const simSelector = screen.getByTestId('simulation-selector');
      const simOptions = simSelector.querySelectorAll('option');
      // "None" + "albums-default" + "albums-empty" = 3
      expect(simOptions).toHaveLength(3);

      // Switch to map tool
      const toolSelect = screen.getByTestId('tool-selector').querySelector('select')!;
      await user.selectOptions(toolSelect, 'show-map');

      // Simulation dropdown should now show map's fixtures
      const updatedSimOptions = screen
        .getByTestId('simulation-selector')
        .querySelectorAll('option');
      // "None" + "map-default" = 2
      expect(updatedSimOptions).toHaveLength(2);
    });

    it('switching simulations updates tool result', async () => {
      const user = userEvent.setup();

      render(<Simulator simulations={multiToolSims} onCallTool={vi.fn()} />);

      const resultTextarea = screen.getByTestId('tool-result-textarea') as HTMLTextAreaElement;

      // First fixture auto-selected (albums-default) — should have its mock data
      expect(resultTextarea.value).toContain('"albums"');

      // Switch to albums-empty simulation
      const simSelect = screen.getByTestId('simulation-selector').querySelector('select')!;
      await user.selectOptions(simSelect, 'albums-empty');

      // Tool result should update to the empty simulation's data
      await waitFor(() => {
        expect(resultTextarea.value).toContain('"albums": []');
      });
    });

    it('switching simulations for the same tool does not show empty state', async () => {
      const user = userEvent.setup();

      render(<Simulator simulations={multiToolSims} onCallTool={vi.fn()} />);

      // albums-default is auto-selected — should show content (mock data), not "Press Run"
      expect(screen.queryByText(/Press.*Run/)).not.toBeInTheDocument();

      // Switch to albums-empty simulation (same tool, same resource)
      const simSelect = screen.getByTestId('simulation-selector').querySelector('select')!;
      await user.selectOptions(simSelect, 'albums-empty');

      // Should still show content (new mock data), NOT "Press Run" empty state.
      // This catches the bug where the iframe key included simulationName,
      // causing a full iframe remount and permanent "Loading..." state.
      await waitFor(() => {
        expect(screen.queryByText(/Press.*Run/)).not.toBeInTheDocument();
      });
    });

    it('switching simulations does not cause iframe remount when resource URL is the same', async () => {
      const user = userEvent.setup();

      const { container } = render(<Simulator simulations={multiToolSims} onCallTool={vi.fn()} />);

      // Get a reference to the outer iframe element (if rendered).
      // Since unit tests use srcdoc fallback, we check the iframe wrapper div.
      const getIframeWrapper = () => container.querySelector('[class*="h-full w-full"]');

      const initialWrapper = getIframeWrapper();

      // Switch to albums-empty simulation (same tool, same resource URL)
      const simSelect = screen.getByTestId('simulation-selector').querySelector('select')!;
      await user.selectOptions(simSelect, 'albums-empty');

      // The wrapper should be the same DOM node (no remount)
      await waitFor(() => {
        expect(getIframeWrapper()).toBe(initialWrapper);
      });
    });

    it('switching tools changes the Tool Result to the new tool fixture', async () => {
      const user = userEvent.setup();

      render(<Simulator simulations={multiToolSims} onCallTool={vi.fn()} />);

      const resultTextarea = screen.getByTestId('tool-result-textarea') as HTMLTextAreaElement;

      // Initially albums tool — has "albums" in the result
      expect(resultTextarea.value).toContain('"albums"');

      // Switch to map tool
      const toolSelect = screen.getByTestId('tool-selector').querySelector('select')!;
      await user.selectOptions(toolSelect, 'show-map');

      // Should now have map's mock data
      await waitFor(() => {
        expect(resultTextarea.value).toContain('"pins"');
      });
    });

    it('selecting "None" then selecting a simulation restores mock data', async () => {
      const user = userEvent.setup();

      render(<Simulator simulations={multiToolSims} onCallTool={vi.fn()} />);

      const resultTextarea = screen.getByTestId('tool-result-textarea') as HTMLTextAreaElement;

      // Initially has mock data from albums-default
      expect(resultTextarea.value).toContain('"albums"');

      // Select "None"
      const simSelect = screen.getByTestId('simulation-selector').querySelector('select')!;
      await user.selectOptions(simSelect, '__none__');

      await waitFor(() => {
        expect(resultTextarea.value).toBe('');
      });

      // Select albums-default again
      await user.selectOptions(simSelect, 'albums-default');

      // Mock data should be restored
      await waitFor(() => {
        expect(resultTextarea.value).toContain('"albums"');
      });
    });

    it('prefers onCallToolDirect over onCallTool when both provided', async () => {
      const user = userEvent.setup();
      const onCallTool = vi.fn();
      const onCallToolDirect = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'direct result' }],
      });

      render(
        <Simulator
          simulations={{ test: createSim() }}
          onCallTool={onCallTool}
          onCallToolDirect={onCallToolDirect}
        />
      );

      await user.click(screen.getByRole('button', { name: /run/i }));

      await waitFor(() => {
        expect(onCallToolDirect).toHaveBeenCalled();
      });
      expect(onCallTool).not.toHaveBeenCalled();
    });
  });

  // ── Story 2: Inspect-only user ──
  describe('Inspect-only: exploring external servers', () => {
    it('starts empty, then populates after reconnect', async () => {
      const user = userEvent.setup();
      const serverSimulations = {
        'remote-tool': createSim({
          name: 'remote-tool',
          tool: { name: 'remote-tool', inputSchema: { type: 'object' } },
          resource: { uri: 'test://remote', name: 'remote', mimeType: 'text/html' },
          resourceUrl: '/remote.html',
        }),
      };

      // No initial health check — starts without URL
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'ok', simulations: serverSimulations }), {
          status: 200,
        })
      );

      render(<Simulator simulations={{}} onCallTool={vi.fn()} />);

      // Initially: no tools, shows empty state
      expect(screen.getByText('Enter an MCP server URL to get started')).toBeInTheDocument();
      expect(screen.queryByTestId('tool-selector')).not.toBeInTheDocument();

      // User enters a URL
      const urlInput = screen.getByPlaceholderText('http://localhost:8000/mcp');
      await user.type(urlInput, 'http://remote:3000/mcp{Enter}');

      // After reconnect: tools appear
      await waitFor(() => {
        expect(screen.getByTestId('tool-selector')).toBeInTheDocument();
      });
      const allOptions = screen.getAllByRole('option');
      expect(allOptions.find((o) => o.textContent === 'remote-tool')).toBeDefined();
    });

    it('shows simulation dropdown with "None" only for discovered tools without fixtures', async () => {
      const user = userEvent.setup();
      const discoveredSims = {
        'discovered-tool': createSim({
          name: 'discovered-tool',
          tool: { name: 'discovered-tool', inputSchema: { type: 'object' } },
          // No toolInput, toolResult, or serverTools — just discovered from MCP
        }),
      };

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'ok', simulations: discoveredSims }), {
          status: 200,
        })
      );

      render(<Simulator simulations={{}} onCallTool={vi.fn()} />);

      const urlInput = screen.getByPlaceholderText('http://localhost:8000/mcp');
      await user.type(urlInput, 'http://remote:3000/mcp{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('simulation-selector')).toBeInTheDocument();
      });
      // Should only have "None" (no fixture simulations)
      const options = screen.getByTestId('simulation-selector').querySelectorAll('option');
      expect(options).toHaveLength(1);
      expect(options[0].textContent).toBe('None');
    });

    it('handles network failure gracefully', async () => {
      const user = userEvent.setup();

      // Network-level failure (fetch throws, not HTTP error)
      fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      render(<Simulator simulations={{}} onCallTool={vi.fn()} />);

      const urlInput = screen.getByPlaceholderText('http://localhost:8000/mcp');
      await user.type(urlInput, 'http://unreachable:3000/mcp{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Could not connect to MCP server')).toBeInTheDocument();
      });
    });
  });

  // ── Story 3: Programmatic testing (URL params) ──
  // URL param tests are covered by E2E tests (simulator-modes.spec.ts) which
  // navigate to real URLs. Unit-testing URL params in jsdom is unreliable because
  // jsdom's window.location is read-only. The createSimulatorUrl function is
  // tested separately in simulator-url.test.ts.
  describe('Programmatic: createSimulatorUrl', () => {
    it('generates tool-only URL (no mock data)', async () => {
      // This is tested at the URL level — the Simulator reads the URL on mount.
      // The E2E test "Tool Result starts collapsed and empty when no simulation selected"
      // navigates to createSimulatorUrl({ tool: 'show-albums' }) and verifies the behavior.
      const { createSimulatorUrl } = await import('./simulator-url');
      const url = createSimulatorUrl({ tool: 'show-albums', theme: 'dark' });
      expect(url).toContain('tool=show-albums');
      expect(url).not.toContain('simulation=');
    });

    it('generates simulation URL (with mock data)', async () => {
      const { createSimulatorUrl } = await import('./simulator-url');
      const url = createSimulatorUrl({ simulation: 'show-albums', theme: 'dark' });
      expect(url).toContain('simulation=show-albums');
      expect(url).not.toContain('tool=');
    });

    it('generates combined tool + simulation URL', async () => {
      const { createSimulatorUrl } = await import('./simulator-url');
      const url = createSimulatorUrl({ tool: 'show-albums', simulation: 'show-albums' });
      expect(url).toContain('tool=show-albums');
      expect(url).toContain('simulation=show-albums');
    });

    it('does not include removed prodTools param', async () => {
      const { createSimulatorUrl } = await import('./simulator-url');
      // @ts-expect-error — prodTools was removed from the type
      const url = createSimulatorUrl({ simulation: 'test', prodTools: true });
      expect(url).not.toContain('prodTools');
    });
  });
});
