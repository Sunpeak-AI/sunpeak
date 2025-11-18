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
    const carousel = container.querySelector('.custom-carousel');
    expect(carousel).toBeInTheDocument();
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

  it('renders MUI Box component', () => {
    const { container } = render(
      <Carousel>
        <div>Item</div>
      </Carousel>
    );
    const muiBox = container.querySelector('.MuiBox-root');
    expect(muiBox).toBeInTheDocument();
  });
});
