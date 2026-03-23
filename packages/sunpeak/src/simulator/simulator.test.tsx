import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Simulator } from './simulator';
import type { Simulation } from '../types/simulation';

// Mock fetch for useMcpConnection
let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch');
  // Default: health check succeeds (for inspect mode tests)
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
  describe('Tool Result visibility', () => {
    it('shows Tool Result section in simulation mode (no prod-tools)', () => {
      render(
        <Simulator
          simulations={{
            test: createSim({ toolResult: { content: [], structuredContent: { foo: 1 } } }),
          }}
        />
      );

      // Tool Result should be visible and expanded in simulation mode
      expect(screen.getByTestId('tool-result-section')).toBeInTheDocument();
    });

    it('shows Tool Result section in prod-tools mode (always visible now)', () => {
      const onCallTool = vi.fn();
      render(
        <Simulator
          simulations={{ test: createSim() }}
          onCallTool={onCallTool}
          defaultProdTools={true}
        />
      );

      // Tool Result should be present even in prod-tools mode
      expect(screen.getByTestId('tool-result-section')).toBeInTheDocument();
    });

    it('clears Tool Result when switching to prod-tools mode', async () => {
      const user = userEvent.setup();
      const onCallTool = vi.fn();

      render(
        <Simulator
          simulations={{
            test: createSim({
              toolResult: { content: [], structuredContent: { data: 'mock' } },
            }),
          }}
          onCallTool={onCallTool}
        />
      );

      // Initially in simulation mode, Tool Result has content
      const initialValue = (screen.getByTestId('tool-result-textarea') as HTMLTextAreaElement)
        .value;
      expect(initialValue).toContain('mock');

      // Toggle prod-tools on
      const checkbox = screen.getByRole('checkbox', { name: /prod tools/i });
      await user.click(checkbox);

      // After toggling, the Tool Result is collapsed — expand it
      await user.click(screen.getByText('Tool Result (JSON)'));

      // The tool result textarea should now be empty
      expect(screen.getByTestId('tool-result-textarea')).toHaveValue('');
    });
  });

  describe('Inspect mode (mcpServerUrl)', () => {
    it('shows MCP Server input when mcpServerUrl is set', async () => {
      render(
        <Simulator
          simulations={{ test: createSim() }}
          mcpServerUrl="http://localhost:8000/mcp"
          onCallTool={vi.fn()}
        />
      );

      // Wait for useMcpConnection's async fetch to settle
      await waitFor(() => {
        expect(screen.getByTestId('inspect-server-url')).toBeInTheDocument();
      });
      expect(screen.getByPlaceholderText('http://localhost:8000/mcp')).toBeInTheDocument();
    });

    it('hides Prod Tools and Prod Resources checkboxes when mcpServerUrl is set', async () => {
      render(
        <Simulator
          simulations={{ test: createSim() }}
          mcpServerUrl="http://localhost:8000/mcp"
          onCallTool={vi.fn()}
        />
      );

      // Wait for useMcpConnection's async fetch to settle
      await waitFor(() => {
        expect(screen.queryByRole('checkbox', { name: /prod tools/i })).not.toBeInTheDocument();
      });
      expect(screen.queryByRole('checkbox', { name: /prod resources/i })).not.toBeInTheDocument();
    });

    it('shows Prod Tools and Prod Resources checkboxes when mcpServerUrl is NOT set', () => {
      render(<Simulator simulations={{ test: createSim() }} onCallTool={vi.fn()} />);

      expect(screen.getByRole('checkbox', { name: /prod tools/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /prod resources/i })).toBeInTheDocument();
    });

    it('shows Run button in inspect mode', () => {
      render(
        <Simulator
          simulations={{ test: createSim() }}
          mcpServerUrl="http://localhost:8000/mcp"
          onCallTool={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
    });

    it('shows connection status indicator', async () => {
      render(
        <Simulator
          simulations={{ test: createSim() }}
          mcpServerUrl="http://localhost:8000/mcp"
          onCallTool={vi.fn()}
        />
      );

      expect(screen.getByTestId('inspect-connection-status')).toBeInTheDocument();
    });

    it('uses mock toolResult when simulation has one (no server call)', async () => {
      const user = userEvent.setup();
      const onCallTool = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'real result' }],
      });

      const mockResult = { content: [], structuredContent: { mocked: true } };

      render(
        <Simulator
          simulations={{
            test: createSim({ toolResult: mockResult }),
          }}
          mcpServerUrl="http://localhost:8000/mcp"
          onCallTool={onCallTool}
        />
      );

      // Click Run
      const runButton = screen.getByRole('button', { name: /run/i });
      await user.click(runButton);

      // onCallTool should NOT have been called — mock result used instead
      expect(onCallTool).not.toHaveBeenCalled();
    });

    it('calls onCallTool when simulation has no toolResult', async () => {
      const user = userEvent.setup();
      const onCallTool = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'real result' }],
      });

      render(
        <Simulator
          simulations={{
            test: createSim({ toolResult: undefined }),
          }}
          mcpServerUrl="http://localhost:8000/mcp"
          onCallTool={onCallTool}
        />
      );

      // Click Run
      const runButton = screen.getByRole('button', { name: /run/i });
      await user.click(runButton);

      await waitFor(() => {
        expect(onCallTool).toHaveBeenCalledWith({
          name: 'test-tool',
          arguments: expect.any(Object),
        });
      });
    });

    it('excludes backend-only simulations (no resource)', () => {
      const backendOnlySim = createSim({
        name: 'backend-tool',
        tool: { name: 'backend-tool', inputSchema: { type: 'object' } },
        resource: undefined,
        resourceUrl: undefined,
      });

      render(
        <Simulator
          simulations={{
            'backend-tool': backendOnlySim,
            'ui-tool': createSim(),
          }}
          mcpServerUrl="http://localhost:8000/mcp"
          onCallTool={vi.fn()}
        />
      );

      // Backend-only tools should be filtered out — nothing to render in the iframe.
      const allOptions = screen.getAllByRole('option');
      const backendOption = allOptions.find((o) => o.textContent?.includes('backend-tool'));
      expect(backendOption).toBeUndefined();
    });
  });

  describe('Framework prod-tools mode', () => {
    it('always calls onCallTool even when simulation has toolResult', async () => {
      const user = userEvent.setup();
      const onCallTool = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'real handler result' }],
      });

      const mockResult = { content: [], structuredContent: { mocked: true } };

      render(
        <Simulator
          simulations={{
            test: createSim({ toolResult: mockResult }),
          }}
          onCallTool={onCallTool}
          defaultProdTools={true}
        />
      );

      // Click Run — in framework prod-tools mode, onCallTool should ALWAYS be called
      // regardless of whether the simulation has a pre-filled toolResult.
      const runButton = screen.getByRole('button', { name: /run/i });
      await user.click(runButton);

      await waitFor(() => {
        expect(onCallTool).toHaveBeenCalledWith({
          name: 'test-tool',
          arguments: expect.any(Object),
        });
      });
    });
  });
});
