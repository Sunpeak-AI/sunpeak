# GenAI Component

Create platform-aware genAI Apps with automatic theming and constraints. Works across ChatGPT, Gemini, Claude, and other platforms.

## Usage

```tsx
import { GenAI } from 'sunpeak';

export const MyApp = GenAI(({ maxHeight, colorScheme }) => (
  <div style={{ padding: '20px' }}>
    <h2>Hello GenAI!</h2>
    <p>Theme: {colorScheme}</p>
    <p>Available height: {maxHeight}px</p>
  </div>
));
```

That's it! GenAI automatically provides:
- ✅ MUI theming (light/dark mode from platform)
- ✅ Platform constraints (`maxHeight`)
- ✅ Color scheme information
- ✅ 800px max width constraint (configurable)
- ✅ Base styling classes

## Customizing maxWidth

By default, Apps have a max width of 800px. You can customize this:

```tsx
// Custom max width
export const NarrowApp = GenAI(() => (
  <div>Narrow content</div>
));

// Use it with custom maxWidth
<NarrowApp maxWidth={500} />
```

## API

### GenAI(renderFn)

Creates a platform-aware App component.

**Parameters:**
- `renderFn: (props: { maxHeight, colorScheme }) => ReactNode` - Function that receives platform state and returns your UI

**Returns:** A React component that accepts optional props:
- `maxWidth?: number` (default: 800) - Maximum width in pixels
- `className?: string` - Additional CSS classes

### Render Props

Your render function receives:

- `maxHeight: number | null` - Platform's max height constraint (in pixels)
- `colorScheme: 'light' | 'dark' | null` - Current theme

## Examples

### Weather App

```tsx
import { GenAI } from 'sunpeak';

export const WeatherApp = GenAI(() => (
  <div style={{ padding: '20px' }}>
    <h2>Weather</h2>
    <p>Sunny, 72°F</p>
  </div>
));

// Use with custom width
<WeatherApp maxWidth={500} />
```

### Theme-Aware App

```tsx
import { GenAI } from 'sunpeak';
import { useTheme } from '@mui/material';

export const AdaptiveApp = GenAI(({ maxHeight, colorScheme }) => {
  const theme = useTheme();

  return (
    <div style={{
      padding: '20px',
      backgroundColor: theme.palette.background.default,
      color: theme.palette.text.primary,
      minHeight: maxHeight ? `${maxHeight - 100}px` : '400px'
    }}>
      <h2>Adaptive Content</h2>
      <p>Theme: {colorScheme}</p>
    </div>
  );
});
```

## Best Practices

1. **Use the default 800px width**: Matches ChatGPT's content width
2. **Respect maxHeight**: Use it to avoid clipping content
3. **Support both themes**: Test in light and dark modes
4. **Keep it simple**: Let GenAI handle the platform integration

## Related

- [Card Component](../Card/) - Built on GenAI
- [Carousel Component](../Carousel/) - Built on GenAI
- [Platform Hooks](../../hooks/) - useMaxHeight, useColorScheme, etc.
