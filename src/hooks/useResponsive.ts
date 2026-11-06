import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl';

export const breakpoints = {
  sm: 360,
  md: 640,
  lg: 1024,
  xl: 1280,
} as const;

export function getBreakpointName(width: number): Breakpoint {
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'base';
}

type ValuesByBreakpoint<T> = Partial<Record<Breakpoint, T>> & { base?: T };

export function useResponsiveValue<T>(values: ValuesByBreakpoint<T>): T {
  const { width } = useWindowDimensions();
  const bp = getBreakpointName(width);
  // Priority: exact -> fallback chain
  if (values[bp] !== undefined) return values[bp] as T;
  if (bp === 'xl') {
    if (values.lg !== undefined) return values.lg as T;
    if (values.md !== undefined) return values.md as T;
    if (values.sm !== undefined) return values.sm as T;
  }
  if (bp === 'lg') {
    if (values.md !== undefined) return values.md as T;
    if (values.sm !== undefined) return values.sm as T;
  }
  if (bp === 'md') {
    if (values.sm !== undefined) return values.sm as T;
  }
  return (values.base as T) ?? (values.sm as T) ?? (values.md as T) ?? (values.lg as T) ?? (values.xl as T);
}


