# Carousel Component

MUI-based carousel for displaying cards side-by-side with horizontal scrolling.

## Features

- Horizontal scroll with mouse drag
- Navigation arrows (show/hide when scrollable)
- Edge gradients indicating more content
- Responsive to platform maxHeight
- Customizable gap between items
- Full MUI theming support
- Equal card sizing in fullscreen mode (340px width)

## Usage

```tsx
import { GenAI, Carousel, Card } from 'sunpeak';

export const MyCarousel = GenAI(() => (
  <Carousel gap={16} showArrows={true} showEdgeGradients={true}>
    <Card image="image1.jpg" imageAlt="Item 1" />
    <Card image="image2.jpg" imageAlt="Item 2" />
    <Card image="image3.jpg" imageAlt="Item 3" />
  </Carousel>
));
```

**Note:** Always wrap components in GenAI for automatic theming.

## Props

- `children` - Carousel items (typically Card components)
- `gap` - Gap between items in pixels (default: 16)
- `maxWidth` - Maximum width in pixels (default: 800)
- `showArrows` - Show navigation arrows (default: true)
- `showEdgeGradients` - Show edge gradients (default: true)

## MUI Components Used

- `Box` - Container and scroll areas
- `IconButton` - Navigation buttons
- `useTheme` - Access to theme colors and spacing

The component automatically adapts to the current MUI theme.
