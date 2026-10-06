import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind class merge - conflict hole pore ta jitbe. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
