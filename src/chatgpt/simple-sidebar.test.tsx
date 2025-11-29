import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SimpleSidebar, SidebarControl, SidebarSelect } from './simple-sidebar';

describe('SimpleSidebar', () => {
  it('renders children and controls in correct structure', () => {
    render(
      <SimpleSidebar
        controls={<div data-testid="controls-content">Control Panel</div>}
      >
        <div data-testid="main-content">Main Content</div>
      </SimpleSidebar>
    );

    // Verify main content is rendered
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();

    // Verify controls section exists with the Controls heading
    expect(screen.getByText('Controls')).toBeInTheDocument();
    expect(screen.getByTestId('controls-content')).toBeInTheDocument();
    expect(screen.getByText('Control Panel')).toBeInTheDocument();
  });
});

describe('SidebarControl', () => {
  it('renders label and children correctly', () => {
    render(
      <SidebarControl label="Test Label">
        <input data-testid="control-input" type="text" />
      </SidebarControl>
    );

    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByTestId('control-input')).toBeInTheDocument();
  });
});

describe('SidebarSelect', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  it('calls onChange when an option is clicked', () => {
    const handleChange = vi.fn();
    render(
      <SidebarSelect
        value="option1"
        onChange={handleChange}
        options={options}
      />
    );

    // Open the dropdown
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Click the second option
    const option2 = screen.getByText('Option 2');
    fireEvent.click(option2);

    // Verify onChange was called with the correct value
    expect(handleChange).toHaveBeenCalledWith('option2');
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('navigates with keyboard (ArrowDown and Enter)', () => {
    const handleChange = vi.fn();
    render(
      <SidebarSelect
        value="option1"
        onChange={handleChange}
        options={options}
      />
    );

    // Open the dropdown
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Press ArrowDown to navigate to next option
    fireEvent.keyDown(document, { key: 'ArrowDown' });

    // Press Enter to select the highlighted option
    fireEvent.keyDown(document, { key: 'Enter' });

    // Verify onChange was called with option2 (index 1, since we started at option1 which is index 0, then moved down)
    expect(handleChange).toHaveBeenCalledWith('option2');
  });

  it('displays selected option and shows placeholder when no value selected', () => {
    const handleChange = vi.fn();

    // Test with selected value
    const { rerender } = render(
      <SidebarSelect
        value="option2"
        onChange={handleChange}
        options={options}
        placeholder="Choose an option"
      />
    );

    expect(screen.getByText('Option 2')).toBeInTheDocument();

    // Test with no selected value
    rerender(
      <SidebarSelect
        value=""
        onChange={handleChange}
        options={options}
        placeholder="Choose an option"
      />
    );

    expect(screen.getByText('Choose an option')).toBeInTheDocument();
  });
});
