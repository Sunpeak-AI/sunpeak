import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SunpeakCarousel } from './sunpeak-carousel';

describe('SunpeakCarousel', () => {
  it('renders all children as carousel items', () => {
    render(
      <SunpeakCarousel>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </SunpeakCarousel>
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('applies custom gap spacing to carousel content', () => {
    render(
      <SunpeakCarousel gap={24} data-testid="carousel">
        <div>Item 1</div>
        <div>Item 2</div>
      </SunpeakCarousel>
    );

    const carouselContent = document.querySelector('[class*="ml-0"]');
    expect(carouselContent).toHaveStyle({ gap: '24px' });
  });

  it('applies custom card width to carousel items', () => {
    render(
      <SunpeakCarousel cardWidth={300}>
        <div>Item 1</div>
      </SunpeakCarousel>
    );

    const carouselItem = document.querySelector('[class*="pl-0"]');
    expect(carouselItem).toHaveStyle({ flexBasis: '300px', minWidth: '300px' });
  });
});
