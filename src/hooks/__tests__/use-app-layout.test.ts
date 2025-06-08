import { renderHook, act } from '@testing-library/react';
import { useAppLayout } from '../use-app-layout';

describe('useAppLayout', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAppLayout(false, false, false));

    expect(result.current.sidebarOpen).toBe(false);
    expect(result.current.allowSidebarClose).toBe(false);
    expect(result.current.isSidebarBusy).toBe(false);
  });

  it('should toggle sidebar open state', () => {
    const { result } = renderHook(() => useAppLayout(false, false, false));

    // Initially closed
    expect(result.current.sidebarOpen).toBe(false);

    // Toggle to open
    act(() => {
      result.current.handleSidebarToggle(true);
    });

    expect(result.current.sidebarOpen).toBe(true);

    // Close sidebar
    act(() => {
      result.current.handleSidebarClose();
    });

    expect(result.current.sidebarOpen).toBe(false);
  });

  it('should set sidebar open state directly', () => {
    const { result } = renderHook(() => useAppLayout(false, false, false));

    act(() => {
      result.current.setSidebarOpen(true);
    });

    expect(result.current.sidebarOpen).toBe(true);

    act(() => {
      result.current.setSidebarOpen(false);
    });

    expect(result.current.sidebarOpen).toBe(false);
  });

  it('should control allowSidebarClose', () => {
    const { result } = renderHook(() => useAppLayout(false, false, false));

    // Initially allowed
    expect(result.current.allowSidebarClose).toBe(false);

    act(() => {
      result.current.setAllowSidebarClose(false);
    });

    expect(result.current.allowSidebarClose).toBe(false);

    act(() => {
      result.current.setAllowSidebarClose(true);
    });

    expect(result.current.allowSidebarClose).toBe(true);
  });

  it('should close sidebar when handleSidebarClose is called, regardless of allow flag', () => {
    const { result } = renderHook(() => useAppLayout(false, false, false));

    // Open sidebar and disallow closing via toggle
    act(() => {
      result.current.setSidebarOpen(true);
      result.current.setAllowSidebarClose(false);
    });

    expect(result.current.sidebarOpen).toBe(true);
    expect(result.current.allowSidebarClose).toBe(false);

    // handleSidebarClose should close sidebar
    act(() => {
      result.current.handleSidebarClose();
    });

    expect(result.current.sidebarOpen).toBe(false);
    expect(result.current.allowSidebarClose).toBe(true);
  });

  it('should calculate isSidebarBusy based on loading states', () => {
    const { result } = renderHook(() => useAppLayout(true, false, false));

    expect(result.current.isSidebarBusy).toBe(true);
  });

  it('should calculate isSidebarBusy as false when no loading states are active', () => {
    const { result } = renderHook(() => useAppLayout(false, false, false));

    expect(result.current.isSidebarBusy).toBe(false);
  });

  it('should calculate isSidebarBusy with multiple loading states', () => {
    const { result } = renderHook(() => useAppLayout(true, true, false));

    expect(result.current.isSidebarBusy).toBe(true);
  });

  it('should work without loading states parameter', () => {
    const { result } = renderHook(() => useAppLayout(false, false, false));

    expect(result.current.isSidebarBusy).toBe(false);
    expect(result.current.sidebarOpen).toBe(false);
    expect(result.current.allowSidebarClose).toBe(false);
  });
}); 