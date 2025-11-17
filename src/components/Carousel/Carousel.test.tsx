import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Carousel } from './Carousel';

describe('Carousel', () => {
  it('renders children correctly', () => {
    render(
      <Carousel>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </Carousel>
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <Carousel className="custom-carousel">
        <div>Item</div>
      </Carousel>
    );
    const carousel = container.querySelector('.sp-carousel');
    expect(carousel).toHaveClass('custom-carousel');
  });

  it('applies custom gap', () => {
    const { container } = render(
      <Carousel gap={24}>
        <div>Item</div>
      </Carousel>
    );
    const scroll = container.querySelector('.sp-carousel-scroll');
    expect(scroll).toHaveStyle({ gap: '24px' });
  });

  it('hides arrows when showArrows is false', () => {
    render(
      <Carousel showArrows={false}>
        <div>Item</div>
      </Carousel>
    );
    expect(screen.queryByLabelText('Previous')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Next')).not.toBeInTheDocument();
  });

  it('has expected CSS classes', () => {
    const { container } = render(
      <Carousel>
        <div>Item</div>
      </Carousel>
    );
    const carousel = container.querySelector('.sp-carousel');
    expect(carousel).toHaveClass('sp-carousel', 'sp-antialiased');
    const scroll = container.querySelector('.sp-carousel-scroll');
    expect(scroll).toHaveClass('sp-carousel-scroll');
  });
});
