<div align="center">
  <a href="https://sunpeak.ai">
    <picture>
      <img alt="Sunpeak logo" src="https://sunpeak.ai/images/sunpeak_github.svg">
    </picture>
  </a>
</div>

# sunpeak

[![npm version](https://img.shields.io/npm/v/sunpeak.svg?style=flat-square)](https://www.npmjs.com/package/sunpeak)
[![npm downloads](https://img.shields.io/npm/dm/sunpeak.svg?style=flat-square)](https://www.npmjs.com/package/sunpeak)
[![CI](https://img.shields.io/github/actions/workflow/status/Sunpeak-AI/sunpeak/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Sunpeak-AI/sunpeak/actions)
[![License](https://img.shields.io/npm/l/sunpeak.svg?style=flat-square)](https://github.com/Sunpeak-AI/sunpeak/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18%20%7C%2019-blue?style=flat-square&logo=react)](https://reactjs.org/)

React library for ChatGPT Apps. Build and test ChatGPT Apps locally with approved components.

![ChatGPT Simulator](https://sunpeak.ai/images/chatgpt-simulator.png)

**Key Features:**
- 📺 ChatGPT simulator for rapid UI component development.
- 📱 Interface for cross-platform custom components.
- 🤝 [Material UI](https://mui.com/material-ui/)-based components compliant with the OpenAI design system.
- 📚 Library of approved Apps.
- 🧪 Testing framework that replicates advanced platform behavior locally.

## Quickstart

Requirements: Node (20+), pnpm (10+)

Use our `create-sunpeak` utility to scaffold your own sunpeak app:

```bash
pnpm dlx create-sunpeak my-app
cd my-app && pnpm dev
```

## Building Apps

### Use library components

```tsx
import { GenAI, Carousel, Card } from 'sunpeak';

export const MyCarousel = GenAI(() => (
  <Carousel>
    <Card
      image="https://sunpeak.ai/images/sun.svg"
      imageAlt="Sunpeak logo"
      imageMaxWidth={400}
      imageMaxHeight={400}
      header="Card Title"
    >
      Card content
    </Card>
  </Carousel>
));
```

### Create a custom App

```tsx
import { GenAI } from 'sunpeak';
import { Box, Typography } from '@mui/material';

export const MyApp = GenAI(({ maxHeight, colorScheme }) => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h5" gutterBottom>
      Hello GenAI!
    </Typography>
    <Typography variant="body1" color="text.secondary">
      Theme: {colorScheme}
    </Typography>
    <Typography variant="body2">
      Max height: {maxHeight}px
    </Typography>
  </Box>
));
```

## Supported Platforms

- ✅ **OpenAI ChatGPT** - Fully supported ([design guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines))
- 🔄 **Google Gemini** - Design system available (SDK support coming soon)
- 🔄 **Anthropic Claude** - Design system available (SDK support coming soon)
- 🔧 **Custom platforms** - Implement your own platform adapter

## What's Included

### Components
- **GenAI** - Single interface for building Apps, all Apps must use this wrapper
  - Automatic MUI theming (light/dark mode)
  - Platform constraints (maxHeight)
- **Card** - Responsive card component
- **Carousel** - Horizontal scrolling carousel
- **ChatGPTSimulator** - Local development & testing environment

### Hooks
- **usePlatformGlobal** - Platform-agnostic global state access
- **useDisplayMode** - Get current display mode
- **useRequestDisplayMode** - Request a specific display mode (e.g., fullscreen)
- **useWidgetProps** - Access tool output data
- **useWidgetState** - Manage persistent widget state
- **useMaxHeight** - Get height constraints
- **useColorScheme** - Get current color scheme (light/dark)

### Design Systems
- **ChatGPT** - MUI theme following OpenAI Apps SDK guidelines
- **Custom** - Build your own MUI theme

## Contributing

We welcome your contributions!

For development quickstart on this package, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## Resources

- [OpenAI ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
- [OpenAI ChatGPT Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
