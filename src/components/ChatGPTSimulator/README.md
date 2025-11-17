# ChatGPT Simulator

A development tool that emulates the ChatGPT environment for testing Sunpeak components locally without deploying to ChatGPT.

## Features

- ✅ Provides `window.openai` API matching the [ChatGPT Apps SDK](https://developers.openai.com/apps-sdk)
- ✅ ChatGPT-like UI with conversation messages
- ✅ Interactive controls for testing different themes and display modes
- ✅ Support for inline, fullscreen, and picture-in-picture modes
- ✅ Light and dark theme support
- ✅ Console logging of all API calls for debugging

## Usage

### Basic Example

```tsx
import { ChatGPTSimulator } from 'sunpeak';
import { Card } from 'sunpeak';

function App() {
  return (
    <ChatGPTSimulator
      userMessage="Show me recommendations"
      displayMode="inline"
      colorScheme="light"
    >
      <Card
        header="Zilker Park"
        metadata="⭐ 4.7 · Park · Austin"
      >
        Popular park with trails and Barton Springs Pool.
      </Card>
    </ChatGPTSimulator>
  );
}
```

### With Carousel

```tsx
import { ChatGPTSimulator, Carousel, Card } from 'sunpeak';

function App() {
  const items = [/* your data */];

  return (
    <ChatGPTSimulator userMessage="Show me places to visit">
      <Carousel>
        {items.map((item) => (
          <div key={item.id} className="sp-carousel-item">
            <Card {...item} />
          </div>
        ))}
      </Carousel>
    </ChatGPTSimulator>
  );
}
```

## Props

### `children` (required)
The component to render in the ChatGPT message.

### `displayMode`
- Type: `'inline' | 'fullscreen' | 'pip'`
- Default: `'inline'`

Initial display mode for testing.

### `colorScheme`
- Type: `'light' | 'dark'`
- Default: `'dark'`

Initial color scheme for testing.

### `userMessage`
- Type: `string`
- Default: `'Show me some recommendations'`

The user message displayed above the component.

### `showControls`
- Type: `boolean`
- Default: `true`

Show/hide the simulator controls for changing color scheme and display mode.

### `toolInput`
- Type: `Record<string, unknown>`
- Default: `{}`

Initial tool input data.

### `toolOutput`
- Type: `Record<string, unknown> | null`
- Default: `null`

Initial tool output data.

### `widgetState`
- Type: `Record<string, unknown> | null`
- Default: `null`

Initial widget state.

## window.openai API

The simulator provides a complete mock of the `window.openai` API:

```typescript
window.openai = {
  // Globals
  colorScheme: 'light' | 'dark',
  displayMode: 'inline' | 'fullscreen' | 'pip',
  locale: string,
  maxHeight: number,
  userAgent: { device, capabilities },
  safeArea: { insets },
  toolInput: object,
  toolOutput: object | null,
  toolResponseMetadata: object | null,
  widgetState: object | null,

  // API methods
  setWidgetState: (state) => Promise<void>,
  callTool: (name, args) => Promise<{ result: string }>,
  sendFollowUpMessage: ({ prompt }) => Promise<void>,
  openExternal: ({ href }) => void,
  requestDisplayMode: ({ mode }) => Promise<{ mode }>,
};
```

All API calls are logged to the console for debugging.

## Testing Different States

The simulator includes a left sidebar with controls to test:

1. **Light/Dark color scheme** - Toggle between color schemes to ensure your components look good in both
2. **Display modes** - Test inline, fullscreen, and picture-in-picture layouts
3. **Widget state** - The simulator tracks widget state changes via `setWidgetState`

The sidebar can be hidden by setting `showControls={false}` for a cleaner presentation.

## Console Logging

All API calls are logged with the `[ChatGPT Simulator]` prefix:

```
[ChatGPT Simulator] callTool called: get_weather { location: "SF" }
[ChatGPT Simulator] setWidgetState called: { selectedId: "123" }
[ChatGPT Simulator] requestDisplayMode called: { mode: "fullscreen" }
```

## Related

- [ChatGPT Apps SDK Reference](https://developers.openai.com/apps-sdk/reference)
- [Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
