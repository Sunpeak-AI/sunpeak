# Design System & Theming Guide

Sunpeak adheres to the design systems described in each genAI App platform.

## Quick Start

### Default Usage

```tsx
import 'sunpeak/dist/index.css';
import { Card, Carousel } from 'sunpeak';
```

This provides:
- ✅ OpenAI ChatGPT design system compliance
- ✅ Automatic light/dark mode (follows system preference)
- ✅ All component styles

### Custom Styles

Update [themes.css](./src/styles/themes.css)

## Light/Dark Mode

### Automatic (Default)

Automatically adapts to system preferences via `@media (prefers-color-scheme: dark)`.

### Force Specific Mode

```tsx
<div className="sp-theme-light">
  <Card>Always light</Card>
</div>

<div className="sp-theme-dark">
  <Card>Always dark</Card>
</div>
```

## Architecture

```
┌─────────────────────────────────────┐
│   components.css                    │  ← Generic component styles
├─────────────────────────────────────┤
│   design-systems/chatgpt.css        │  ← App platform design system
├─────────────────────────────────────┤
│   themes.css                        │  ← Imports + customization
└─────────────────────────────────────┘
```

## OpenAI ChatGPT Design System

Follows [OpenAI ChatGPT App Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines).

### What You Can Customize

✅ Accent colors (buttons, CTAs)

### What You CANNOT Customize

Per OpenAI guidelines:

❌ Typography (system fonts: SF Pro, Roboto, Segoe UI)
❌ Font sizes (12px, 14px, 16px, 18px, 20px)
❌ System colors (backgrounds, text, borders)
❌ Spacing (4px grid: 4, 8, 12, 16, 20, 24, 32px)
❌ Border radius (6, 8, 12, 16, 24px)
❌ Shadows
❌ Component dimensions (cards are 220px)

**Why?** To ensure consistent UX, accessibility, and platform-native feel across all ChatGPT apps.

## Creating Custom Design Systems

Define all required `--sp-*` variables in a CSS file. Use [chatgpt.css](./src/styles/design-systems/chatgpt.css) as a template.

Then import it:

```tsx
import { Card, InlineCarousel } from 'sunpeak';
import 'sunpeak/dist/components.css';
import './design-systems/custom.css';
```

## CSS Variable Reference

**Typography:** `--sp-font-family`, `--sp-font-size-{xs,sm,base,lg,xl}`, `--sp-font-weight-{normal,medium,semibold,bold}`, `--sp-line-height-{tight,normal,relaxed}`

**Colors (Light):** `--sp-light-color-bg-{primary,secondary,tertiary}`, `--sp-light-color-text-{primary,secondary,tertiary}`, `--sp-light-accent{,-hover,-active}`, `--sp-light-color-border{,-subtle}`

**Colors (Dark):** `--sp-dark-color-bg-{primary,secondary,tertiary}`, `--sp-dark-color-text-{primary,secondary,tertiary}`, `--sp-dark-accent{,-hover,-active}`, `--sp-dark-color-border{,-subtle}`

**Colors (Active):** `--sp-color-bg-{primary,secondary,tertiary}`, `--sp-color-text-{primary,secondary,tertiary}`, `--sp-accent{,-hover,-active}`, `--sp-color-border{,-subtle}` (auto-switches based on mode)

**Spacing:** `--sp-spacing-{1,2,3,4,5,6,8}`

**Border Radius:** `--sp-radius-{sm,md,lg,xl,2xl,full}`

**Shadows:** `--sp-shadow-{sm,md,lg,xl}`

**Components:** `--sp-card-width`, `--sp-card-gap`, `--sp-button-padding-{x,y,x-sm,y-sm}`

## Resources

- [OpenAI ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
- [README.md](./README.md) - General usage guide
