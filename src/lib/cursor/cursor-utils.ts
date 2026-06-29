import { cursorSelectors, type CursorState } from "./cursor-config";

export function isFinePointerDevice() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function closestElement(target: EventTarget | null, selector: string) {
  return target instanceof Element ? target.closest(selector) : null;
}

export function getCursorStateFromTarget(target: EventTarget | null, pressed: boolean): CursorState {
  if (pressed) return "click";
  if (closestElement(target, cursorSelectors.disabled)) return "unavailable";
  if (closestElement(target, cursorSelectors.loading)) return "loading";
  if (closestElement(target, cursorSelectors.resize)) return "resize";
  if (closestElement(target, cursorSelectors.drag)) return "drag";
  if (closestElement(target, cursorSelectors.text)) return "text";
  if (closestElement(target, "a[href]")) return "link";
  if (closestElement(target, cursorSelectors.interactive)) return "hover";
  return "default";
}

export function getMagneticTarget(target: EventTarget | null) {
  const element = closestElement(target, cursorSelectors.magnetic);
  if (!(element instanceof HTMLElement)) return null;
  if (element.closest(cursorSelectors.noMagnetic)) return null;
  return element;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
