import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlbumCarousel } from './album-carousel';

const mockUseDisplayMode = vi.fn(() => 'inline');

// Mock sunpeak hooks
vi.mock('sunpeak', () => ({
  useWidgetState: vi.fn(() => [{ currentIndex: 0 }, vi.fn()]),
  useDisplayMode: () => mockUseDisplayMode(),
}));

// Mock embla-carousel-react
vi.mock('embla-carousel-react', () => ({
  default: vi.fn(() => [vi.fn(), null]),
}));

// Mock embla-carousel-wheel-gestures
vi.mock('embla-carousel-wheel-gestures', () => ({
  WheelGesturesPlugin: vi.fn(() => ({})),
}));

describe('AlbumCarousel', () => {
  beforeEach(() => {
    mockUseDisplayMode.mockReturnValue('inline');
  });

  it('renders all children with correct card width', () => {
    const { container } = render(
      <AlbumCarousel cardWidth={300}>
        <div>Card 1</div>
        <div>Card 2</div>
        <div>Card 3</div>
      </AlbumCarousel>
    );

    const cardContainers = container.querySelectorAll('.flex-none');
    expect(cardContainers).toHaveLength(3);

    cardContainers.forEach((cardContainer) => {
      const element = cardContainer as HTMLElement;
      expect(element.style.minWidth).toBe('300px');
      expect(element.style.maxWidth).toBe('300px');
    });
  });

  it('handles cardWidth object with inline/fullscreen modes', () => {
    // Test inline mode
    mockUseDisplayMode.mockReturnValue('inline');
    const { container: inlineContainer } = render(
      <AlbumCarousel cardWidth={{ inline: 250, fullscreen: 400 }}>
        <div>Card 1</div>
      </AlbumCarousel>
    );

    let cardContainer = inlineContainer.querySelector('.flex-none') as HTMLElement;
    expect(cardContainer.style.minWidth).toBe('250px');

    // Test fullscreen mode
    mockUseDisplayMode.mockReturnValue('fullscreen');
    const { container: fullscreenContainer } = render(
      <AlbumCarousel cardWidth={{ inline: 250, fullscreen: 400 }}>
        <div>Card 1</div>
      </AlbumCarousel>
    );

    cardContainer = fullscreenContainer.querySelector('.flex-none') as HTMLElement;
    expect(cardContainer.style.minWidth).toBe('400px');
  });

  it('applies custom gap between cards', () => {
    const { container } = render(
      <AlbumCarousel gap={24}>
        <div>Card 1</div>
        <div>Card 2</div>
      </AlbumCarousel>
    );

    const carouselTrack = container.querySelector('.flex.touch-pan-y') as HTMLElement;
    expect(carouselTrack.style.gap).toBe('24px');
    expect(carouselTrack.style.marginLeft).toBe('-24px');
    expect(carouselTrack.style.paddingLeft).toBe('24px');
  });
});
