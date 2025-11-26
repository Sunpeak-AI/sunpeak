import '../../styles/globals.css';

import { useWidgetState } from 'sunpeak';
import { Button } from '@openai/apps-sdk-ui/components/Button';

interface CounterState extends Record<string, unknown> {
  count?: number;
}

/**
 * Welcome to your Sunpeak App!
 *
 * This is a simple counter app to get you started.
 * Try building your own app here!
 *
 * Tips:
 * - Use the Component dropdown in the sidebar to see example apps
 * - Check out the components folder for reusable components
 * - Use sunpeak hooks for state management and display modes
 * - Edit this file and see your changes live
 * - Edit ../../simulations/app-simulation.tsx to customize your simulation
 */
export function App() {
  const [widgetState, setWidgetState] = useWidgetState<CounterState>(() => ({
    count: 0,
  }));

  const count = widgetState?.count ?? 0;

  const increment = () => {
    setWidgetState({ count: count + 1 });
  };

  const decrement = () => {
    setWidgetState({ count: count - 1 });
  };

  const reset = () => {
    setWidgetState({ count: 0 });
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-primary">
          Welcome to Sunpeak!
        </h1>
        <p className="text-secondary">
          Build your ChatGPT app here
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4 p-8 border border-subtle rounded-2xl bg-surface shadow-sm">
        <div className="text-6xl font-bold text-primary">
          {count}
        </div>

        <div className="flex gap-2">
          <Button
            variant="soft"
            color="secondary"
            onClick={decrement}
            aria-label="Decrement"
          >
            −
          </Button>
          <Button
            variant="solid"
            color="primary"
            onClick={increment}
            aria-label="Increment"
          >
            +
          </Button>
        </div>

        <Button
          variant="outline"
          color="secondary"
          onClick={reset}
          size="sm"
        >
          Reset
        </Button>
      </div>

      <div className="text-center text-sm text-secondary max-w-md space-y-2">
        <p>
          This counter persists its state using <code className="px-1.5 py-0.5 rounded bg-surface-secondary text-primary">useWidgetState</code>
        </p>
        <p>
          Try switching between examples in the sidebar!
        </p>
      </div>
    </div>
  );
}
