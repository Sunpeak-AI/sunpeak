import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
  HelpIcon,
  SimpleSidebar,
  SidebarControl,
  SidebarCollapsibleControl,
  SidebarSelect,
  SidebarInput,
  SidebarCheckbox,
  SidebarTextarea,
  SidebarToggle,
} from './simple-sidebar';

describe('SimpleSidebar', () => {
  it('renders children and controls in correct structure', () => {
    render(
      <SimpleSidebar controls={<div data-testid="controls-content">Control Panel</div>}>
        <div data-testid="main-content">Main Content</div>
      </SimpleSidebar>
    );

    // Verify main content is rendered
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();

    expect(screen.queryByRole('heading', { name: 'Controls' })).not.toBeInTheDocument();
    expect(screen.getByTestId('controls-content')).toBeInTheDocument();
    expect(screen.getByText('Control Panel')).toBeInTheDocument();
  });

  it('renders headerRight content in the sidebar header row', () => {
    render(
      <SimpleSidebar
        controls={<div>Controls</div>}
        headerRight={<span data-testid="header-right">Live Toggle</span>}
      >
        <div>Content</div>
      </SimpleSidebar>
    );

    expect(screen.getByTestId('header-right')).toBeInTheDocument();
    expect(screen.getByText('Live Toggle')).toBeInTheDocument();
  });

  it('renders optional right controls beside the main content', () => {
    render(
      <SimpleSidebar
        controls={<div data-testid="left-controls">Left</div>}
        rightControls={<div data-testid="right-controls">Right</div>}
      >
        <div data-testid="main-content">Main Content</div>
      </SimpleSidebar>
    );

    expect(screen.getByTestId('left-controls')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    expect(screen.getByTestId('right-controls')).toBeInTheDocument();
  });

  it('uses controlled sidebar widths when provided', () => {
    render(
      <SimpleSidebar
        controls={<div data-testid="left-controls">Left</div>}
        rightControls={<div data-testid="right-controls">Right</div>}
        sidebarWidth={320}
        rightSidebarWidth={360}
      >
        <div data-testid="main-content">Main Content</div>
      </SimpleSidebar>
    );

    expect(screen.getByTestId('left-controls').closest('aside')).toHaveStyle({ width: '320px' });
    expect(screen.getByTestId('right-controls').closest('aside')).toHaveStyle({ width: '360px' });
  });

  it('keeps resized sidebar widths at or above the minimum', () => {
    const onSidebarWidthChange = vi.fn();
    const onRightSidebarWidthChange = vi.fn();
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 768 });
    try {
      render(
        <SimpleSidebar
          controls={<div data-testid="left-controls">Left</div>}
          rightControls={<div data-testid="right-controls">Right</div>}
          onSidebarWidthChange={onSidebarWidthChange}
          onRightSidebarWidthChange={onRightSidebarWidthChange}
        >
          <div data-testid="main-content">Main Content</div>
        </SimpleSidebar>
      );

      const resizeHandles = document.querySelectorAll('.cursor-col-resize');
      fireEvent.mouseDown(resizeHandles[0]);
      fireEvent.mouseMove(document, { clientX: 100 });
      expect(onSidebarWidthChange).toHaveBeenLastCalledWith(260);
      fireEvent.mouseUp(document);

      fireEvent.mouseDown(resizeHandles[1]);
      fireEvent.mouseMove(document, { clientX: 760 });
      expect(onRightSidebarWidthChange).toHaveBeenLastCalledWith(260);
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('does not render headerRight when not provided', () => {
    render(
      <SimpleSidebar controls={<div>Controls</div>}>
        <div>Content</div>
      </SimpleSidebar>
    );

    expect(screen.queryByTestId('header-right')).not.toBeInTheDocument();
  });
});

describe('HelpIcon', () => {
  it('positions the tooltip immediately to the right of the cursor', () => {
    render(<HelpIcon tooltip="Helpful context" docsPath="testing/evals" />);

    const link = screen.getByRole('link', { name: 'Helpful context' });
    fireEvent.mouseEnter(link, { clientX: 40, clientY: 50 });

    expect(link).toHaveAttribute('href', 'https://sunpeak.ai/docs/testing/evals');
    expect(screen.getByText('Helpful context')).toHaveClass('fixed', 'block');
    expect(screen.getByText('Helpful context')).toHaveStyle({
      left: '48px',
      top: '50px',
      transform: 'translateY(-50%)',
    });
  });

  it('can position the tooltip to the left of the cursor', () => {
    render(<HelpIcon tooltip="Helpful context" docsPath="testing/evals" placement="left" />);

    const link = screen.getByRole('link', { name: 'Helpful context' });
    fireEvent.mouseEnter(link, { clientX: 40, clientY: 50 });

    expect(screen.getByText('Helpful context')).toHaveClass('fixed', 'block');
    expect(screen.getByText('Helpful context')).toHaveStyle({
      left: '32px',
      top: '50px',
      transform: 'translate(-100%, -50%)',
    });
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

  it('calls onChange when an option is selected', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<SidebarSelect value="option1" onChange={handleChange} options={options} />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'option2');

    expect(handleChange).toHaveBeenCalledWith('option2');
    expect(handleChange).toHaveBeenCalledTimes(1);
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

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('option2');

    // Test with no selected value — placeholder is a disabled option
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

describe('SidebarCollapsibleControl', () => {
  it('renders label and toggles visibility', async () => {
    const user = userEvent.setup();
    render(
      <SidebarCollapsibleControl label="Collapsible Section" defaultCollapsed={true}>
        <div data-testid="collapsible-content">Hidden Content</div>
      </SidebarCollapsibleControl>
    );

    expect(screen.getByText('Collapsible Section')).toBeInTheDocument();

    // Content should be hidden initially
    expect(screen.queryByTestId('collapsible-content')).not.toBeInTheDocument();

    // Click to expand
    const button = screen.getByRole('button', { name: /Collapsible Section/i });
    await user.click(button);

    // Content should now be visible
    expect(screen.getByTestId('collapsible-content')).toBeInTheDocument();
    expect(screen.getByText('Hidden Content')).toBeInTheDocument();

    // Click to collapse again
    await user.click(button);

    // Content should be hidden again
    expect(screen.queryByTestId('collapsible-content')).not.toBeInTheDocument();
  });

  it('starts expanded when defaultCollapsed is false', () => {
    render(
      <SidebarCollapsibleControl label="Expanded Section" defaultCollapsed={false}>
        <div data-testid="collapsible-content">Visible Content</div>
      </SidebarCollapsibleControl>
    );

    // Content should be visible initially
    expect(screen.getByTestId('collapsible-content')).toBeInTheDocument();
    expect(screen.getByText('Visible Content')).toBeInTheDocument();
  });
});

describe('SidebarInput', () => {
  it('renders input and calls onChange when value changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<SidebarInput value="" onChange={handleChange} placeholder="Enter text" />);

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();

    await user.type(input, 'test');

    // onChange should be called multiple times as user types
    expect(handleChange).toHaveBeenCalled();
    expect(handleChange.mock.calls.length).toBeGreaterThan(0);
  });

  it('handles number input type', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<SidebarInput value="" onChange={handleChange} type="number" />);

    const input = screen.getByRole('spinbutton');
    expect(input).toBeInTheDocument();

    await user.type(input, '42');

    // onChange should be called as user types numbers
    expect(handleChange).toHaveBeenCalled();
    expect(handleChange.mock.calls.length).toBeGreaterThan(0);
  });
});

describe('SidebarCheckbox', () => {
  it('renders checkbox and calls onChange when toggled', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<SidebarCheckbox checked={false} onChange={handleChange} label="Enable Feature" />);

    expect(screen.getByText('Enable Feature')).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalledWith(true);
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('renders as checked when checked prop is true', () => {
    const handleChange = vi.fn();
    render(<SidebarCheckbox checked={true} onChange={handleChange} label="Enabled" />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('keeps the help link outside the checkbox label', () => {
    const handleChange = vi.fn();
    render(
      <SidebarCheckbox
        checked={false}
        onChange={handleChange}
        label="Prod Resources"
        tooltip="Load resources from dist/ builds instead of HMR"
        docsPath="app-framework/cli/dev#prod-tools-and-prod-resources-flags"
      />
    );

    const helpLink = screen.getByRole('link', {
      name: /Load resources from dist\/ builds instead of HMR/i,
    });
    expect(helpLink.closest('label')).not.toBeInTheDocument();
  });
});

describe('SidebarTextarea', () => {
  it('renders textarea and calls onChange when value changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SidebarTextarea value="" onChange={handleChange} placeholder="Enter JSON" maxRows={4} />
    );

    const textarea = screen.getByPlaceholderText('Enter JSON');
    expect(textarea).toBeInTheDocument();

    await user.type(textarea, 'test content');

    // onChange should be called multiple times as user types
    expect(handleChange).toHaveBeenCalled();
    expect(handleChange.mock.calls.length).toBeGreaterThan(0);
  });

  it('displays error message when error prop is provided', () => {
    const handleChange = vi.fn();
    render(<SidebarTextarea value="" onChange={handleChange} error="Invalid JSON" />);

    expect(screen.getByText('Invalid JSON')).toBeInTheDocument();
  });

  it('calls onFocus and onBlur callbacks', async () => {
    const handleChange = vi.fn();
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    const user = userEvent.setup();
    render(
      <SidebarTextarea
        value=""
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Test"
      />
    );

    const textarea = screen.getByPlaceholderText('Test');

    await user.click(textarea);
    expect(handleFocus).toHaveBeenCalledTimes(1);

    await user.tab(); // Move focus away
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });
});

describe('SidebarToggle', () => {
  const options = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  it('renders toggle options and calls onChange when option is selected', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<SidebarToggle value="light" onChange={handleChange} options={options} />);

    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();

    const darkOption = screen.getByText('Dark');
    await user.click(darkOption);

    expect(handleChange).toHaveBeenCalledWith('dark');
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('displays currently selected value', () => {
    const handleChange = vi.fn();
    render(<SidebarToggle value="dark" onChange={handleChange} options={options} />);

    // The selected option should be rendered
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });
});
