/**
 * Shared UI utility (e.g. class names merging).
 * Used by frontend; kept in backend for shared tooling if needed.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
