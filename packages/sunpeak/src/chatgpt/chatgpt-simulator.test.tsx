import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ChatGPTSimulator } from './chatgpt-simulator';
import type { Simulation } from '../types/simulation';

const mockSimulation: Simulation = {
  name: 'test-sim',
  tool: { name: 'test-tool', description: 'A test tool', inputSchema: { type: 'object' as const } },
  resource: { name: 'test-resource', uri: 'test://resource', mimeType: 'text/html' },
  resourceUrl: 'http://localhost:5173/test',
  toolInput: { query: 'hello' },
  toolResult: { content: [], structuredContent: { result: 'ok' } },
};

describe('ChatGPTSimulator', () => {
  it('renders children in the conversation area', () => {
    render(
      <ChatGPTSimulator>
        <div data-testid="app-content">My App Content</div>
      </ChatGPTSimulator>
    );

    expect(screen.getByTestId('app-content')).toBeInTheDocument();
    expect(screen.getByText('My App Content')).toBeInTheDocument();
  });

  it('renders sidebar with all control labels', () => {
    render(
      <ChatGPTSimulator>
        <div>Content</div>
      </ChatGPTSimulator>
    );

    expect(screen.getByText('Controls')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Display Mode')).toBeInTheDocument();
    expect(screen.getByText('Width')).toBeInTheDocument();
  });

  it('does not use window.openai (uses McpAppHost instead)', () => {
    render(
      <ChatGPTSimulator>
        <div>Content</div>
      </ChatGPTSimulator>
    );

    const openai = (window as unknown as { openai?: unknown }).openai;
    expect(openai).toBeUndefined();
  });

  describe('Live mode', () => {
    const onCallTool = vi.fn().mockResolvedValue({ content: [], structuredContent: { ok: true } });

    it('shows Live checkbox when onCallTool is provided', () => {
      render(
        <ChatGPTSimulator simulations={{ 'test-sim': mockSimulation }} onCallTool={onCallTool}>
          <div>Content</div>
        </ChatGPTSimulator>
      );

      expect(screen.getByText('Live')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /live/i })).toBeInTheDocument();
    });

    it('does not show Live checkbox without onCallTool', () => {
      render(
        <ChatGPTSimulator simulations={{ 'test-sim': mockSimulation }}>
          <div>Content</div>
        </ChatGPTSimulator>
      );

      expect(screen.queryByText('Live')).not.toBeInTheDocument();
    });

    it('hides Live checkbox when hideLiveToggle is true', () => {
      render(
        <ChatGPTSimulator
          simulations={{ 'test-sim': mockSimulation }}
          onCallTool={onCallTool}
          hideLiveToggle
        >
          <div>Content</div>
        </ChatGPTSimulator>
      );

      expect(screen.queryByRole('checkbox', { name: /live/i })).not.toBeInTheDocument();
    });

    it('starts with Live checked when defaultLive is true', () => {
      render(
        <ChatGPTSimulator
          simulations={{ 'test-sim': mockSimulation }}
          onCallTool={onCallTool}
          defaultLive
        >
          <div>Content</div>
        </ChatGPTSimulator>
      );

      expect(screen.getByRole('checkbox', { name: /live/i })).toBeChecked();
    });

    it('shows empty state placeholder in Live mode before running', () => {
      render(
        <ChatGPTSimulator
          simulations={{ 'test-sim': mockSimulation }}
          onCallTool={onCallTool}
          defaultLive
        >
          <div>Content</div>
        </ChatGPTSimulator>
      );

      expect(screen.getByText(/press.*to call the tool/i)).toBeInTheDocument();
    });

    it('shows Run button in Live mode', () => {
      render(
        <ChatGPTSimulator
          simulations={{ 'test-sim': mockSimulation }}
          onCallTool={onCallTool}
          defaultLive
        >
          <div>Content</div>
        </ChatGPTSimulator>
      );

      const runButton = screen.getByRole('button', { name: /run/i });
      expect(runButton).toBeInTheDocument();
    });

    it('calls onCallTool when Run is clicked', async () => {
      const callTool = vi.fn().mockResolvedValue({ content: [], structuredContent: { ok: true } });
      const user = userEvent.setup();

      render(
        <ChatGPTSimulator
          simulations={{ 'test-sim': mockSimulation }}
          onCallTool={callTool}
          defaultLive
        >
          <div>Content</div>
        </ChatGPTSimulator>
      );

      const runButton = screen.getByRole('button', { name: /run/i });
      await user.click(runButton);

      expect(callTool).toHaveBeenCalledWith({
        name: 'test-tool',
        arguments: { query: 'hello' },
      });
    });

    it('hides Tool Result section in Live mode', () => {
      render(
        <ChatGPTSimulator
          simulations={{ 'test-sim': mockSimulation }}
          onCallTool={onCallTool}
          defaultLive
        >
          <div>Content</div>
        </ChatGPTSimulator>
      );

      expect(screen.queryByText('Tool Result (JSON)')).not.toBeInTheDocument();
    });

    it('toggles Live mode on and off', async () => {
      const user = userEvent.setup();

      render(
        <ChatGPTSimulator simulations={{ 'test-sim': mockSimulation }} onCallTool={onCallTool}>
          <div>Content</div>
        </ChatGPTSimulator>
      );

      const checkbox = screen.getByRole('checkbox', { name: /live/i });
      expect(checkbox).not.toBeChecked();

      // Tool Result visible when not live
      expect(screen.getByText('Tool Result (JSON)')).toBeInTheDocument();

      // Toggle live on
      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      // Tool Result hidden in live mode
      expect(screen.queryByText('Tool Result (JSON)')).not.toBeInTheDocument();

      // Toggle live off
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();

      // Tool Result visible again
      expect(screen.getByText('Tool Result (JSON)')).toBeInTheDocument();
    });
  });
});
