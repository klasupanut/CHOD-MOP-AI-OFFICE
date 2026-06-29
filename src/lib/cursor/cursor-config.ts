export type CursorState =
  | "default"
  | "hover"
  | "focus"
  | "text"
  | "link"
  | "click"
  | "loading"
  | "processing"
  | "drag"
  | "resize"
  | "unavailable";

export const cursorConfig = {
  enabled: true,
  magneticHover: true,
  disableOnTouch: true,
  disableOnReducedMotion: true,
  smoothness: 0.24,
  magneticStrength: 0.14,
  maxMagneticOffset: 10,
} as const;

export const cursorAssets: Record<CursorState, string> = {
  default: "/cursors/chod-cursor-default.svg",
  hover: "/cursors/chod-cursor-hover.svg",
  focus: "/cursors/chod-cursor-focus.svg",
  text: "/cursors/chod-cursor-text.svg",
  link: "/cursors/chod-cursor-link.svg",
  click: "/cursors/chod-cursor-click.svg",
  loading: "/cursors/chod-cursor-loading.svg",
  processing: "/cursors/chod-cursor-processing.svg",
  drag: "/cursors/chod-cursor-drag.svg",
  resize: "/cursors/chod-cursor-resize.svg",
  unavailable: "/cursors/chod-cursor-unavailable.svg",
};

export const cursorSelectors = {
  text: [
    "input:not([type='button']):not([type='submit']):not([type='checkbox']):not([type='radio'])",
    "textarea",
    "[contenteditable='true']",
  ].join(","),
  disabled: [
    "button:disabled",
    "[aria-disabled='true']",
    "[data-disabled='true']",
    ".disabled",
  ].join(","),
  loading: [
    "[aria-busy='true']",
    "[data-loading='true']",
    ".is-loading",
    ".loading",
  ].join(","),
  drag: [
    "[draggable='true']",
    ".drag-handle",
    "[data-cursor='drag']",
  ].join(","),
  resize: [
    ".resize-handle",
    "[data-cursor='resize']",
  ].join(","),
  interactive: [
    "a[href]",
    "button",
    "summary",
    "select",
    "[role='button']",
    "[role='tab']",
    "[role='menuitem']",
    "[tabindex]:not([tabindex='-1'])",
    ".workspace-table tbody tr",
    ".project-card",
    ".agent-card",
    ".character-info",
    ".quick-action",
    ".task-card",
    ".notification-item",
  ].join(","),
  magnetic: [
    "a[href]",
    "button:not(:disabled)",
    "[role='button']",
    "[role='tab']",
    ".sidebar a",
    ".sidebar button",
    ".workspace-table tbody tr",
    ".project-card",
    ".agent-card",
    ".character-info",
    ".quick-action",
    ".task-card",
    ".notification-item",
    ".approval-actions a",
    ".approval-actions button:not(:disabled)",
  ].join(","),
  noMagnetic: [
    "input",
    "textarea",
    "select",
    "[contenteditable='true']",
    ".quotation-document",
    ".approval-preview-frame",
    "iframe",
  ].join(","),
} as const;
