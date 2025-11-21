import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/select';
import { Label } from '../components/label';
import type { Theme, DisplayMode } from '../types';
import type { ScreenWidth } from '../types/simulator';

interface SidebarProps {
  theme: Theme;
  displayMode: DisplayMode;
  screenWidth: ScreenWidth;
  onThemeChange: (theme: Theme) => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onScreenWidthChange: (width: ScreenWidth) => void;
}

export function Sidebar({
  theme,
  displayMode,
  screenWidth,
  onThemeChange,
  onDisplayModeChange,
  onScreenWidthChange,
}: SidebarProps) {
  return (
    <div className="w-64 border-r border-[var(--sp-color-border)] bg-[var(--sp-color-bg-secondary)] p-6 space-y-6">
      <div>
        <h6 className="text-sm font-semibold mb-4 text-[var(--sp-color-text-primary)]">
          Controls
        </h6>
      </div>

      <div className="space-y-2">
        <Label htmlFor="app-ui-select" className="text-xs">App UI</Label>
        <Select value="carousel" onValueChange={() => {}}>
          <SelectTrigger id="app-ui-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="carousel">Carousel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="theme-select" className="text-xs">Color Scheme</Label>
        <Select value={theme} onValueChange={onThemeChange}>
          <SelectTrigger id="theme-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display-mode-select" className="text-xs">Display Mode</Label>
        <Select value={displayMode} onValueChange={onDisplayModeChange}>
          <SelectTrigger id="display-mode-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inline">Inline</SelectItem>
            <SelectItem value="pip">Picture in Picture</SelectItem>
            <SelectItem value="fullscreen">Fullscreen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="screen-width-select" className="text-xs">Body Width</Label>
        <Select value={screenWidth} onValueChange={onScreenWidthChange}>
          <SelectTrigger id="screen-width-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mobile-s">Mobile S (375px)</SelectItem>
            <SelectItem value="mobile-l">Mobile L (425px)</SelectItem>
            <SelectItem value="tablet">Tablet (768px)</SelectItem>
            <SelectItem value="full">100% (Full)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
