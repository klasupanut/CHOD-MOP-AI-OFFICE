"use client";

import { useEffect, useRef, useState } from "react";
import { cursorAssets, cursorConfig, type CursorState } from "@/lib/cursor/cursor-config";
import {
  clamp,
  getCursorStateFromTarget,
  getMagneticTarget,
  isFinePointerDevice,
  prefersReducedMotion,
} from "@/lib/cursor/cursor-utils";

type Point = { x: number; y: number };

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const positionRef = useRef<Point>({ x: -120, y: -120 });
  const targetRef = useRef<Point>({ x: -120, y: -120 });
  const pressedRef = useRef(false);
  const magneticTargetRef = useRef<HTMLElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [cursorState, setCursorState] = useState<CursorState>("default");

  useEffect(() => {
    if (!cursorConfig.enabled) return;
    if (cursorConfig.disableOnTouch && !isFinePointerDevice()) return;
    if (cursorConfig.disableOnReducedMotion && prefersReducedMotion()) return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    setEnabled(true);
    document.body.classList.add("custom-cursor-enabled");

    const setVisible = (visible: boolean) => {
      cursor.dataset.visible = visible ? "true" : "false";
    };

    const setStateFromTarget = (target: EventTarget | null) => {
      const nextState = getCursorStateFromTarget(target, pressedRef.current);
      setCursorState((current) => (current === nextState ? current : nextState));
      magneticTargetRef.current = cursorConfig.magneticHover ? getMagneticTarget(target) : null;
    };

    const draw = () => {
      const current = positionRef.current;
      const target = targetRef.current;
      current.x += (target.x - current.x) * cursorConfig.smoothness;
      current.y += (target.y - current.y) * cursorConfig.smoothness;

      let magnetX = 0;
      let magnetY = 0;
      const magneticTarget = magneticTargetRef.current;
      if (magneticTarget) {
        const rect = magneticTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        magnetX = clamp((centerX - target.x) * cursorConfig.magneticStrength, -cursorConfig.maxMagneticOffset, cursorConfig.maxMagneticOffset);
        magnetY = clamp((centerY - target.y) * cursorConfig.magneticStrength, -cursorConfig.maxMagneticOffset, cursorConfig.maxMagneticOffset);
      }

      const scale = pressedRef.current ? 0.88 : magneticTarget ? 1.08 : 1;
      cursor.style.transform = `translate3d(${current.x + magnetX}px, ${current.y + magnetY}px, 0) scale(${scale})`;
      frameRef.current = window.requestAnimationFrame(draw);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (event.target instanceof Element && event.target.closest("input[type='number']")) {
        targetRef.current = { x: event.clientX, y: event.clientY };
        magneticTargetRef.current = null;
        setVisible(false);
        return;
      }
      const isOverIframe = document
        .elementsFromPoint(event.clientX, event.clientY)
        .some((element) => element.tagName.toLowerCase() === "iframe");
      if (isOverIframe) {
        targetRef.current = { x: event.clientX, y: event.clientY };
        magneticTargetRef.current = null;
        setVisible(false);
        return;
      }
      targetRef.current = { x: event.clientX, y: event.clientY };
      setVisible(true);
      setStateFromTarget(event.target);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pressedRef.current = true;
      setStateFromTarget(event.target);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pressedRef.current = false;
      setStateFromTarget(event.target);
    };

    const handleBlur = () => setVisible(false);
    const handlePointerLeave = () => setVisible(false);
    const handlePointerEnter = () => setVisible(true);
    const handleExternalHide = () => {
      magneticTargetRef.current = null;
      setVisible(false);
    };
    const handleIframeEnter = () => {
      magneticTargetRef.current = null;
      setVisible(false);
    };
    const handleIframeLeave = () => {
      magneticTargetRef.current = null;
      setVisible(false);
    };

    const boundIframes = new WeakSet<HTMLIFrameElement>();
    const bindIframes = () => {
      document.querySelectorAll<HTMLIFrameElement>("iframe").forEach((iframe) => {
        if (boundIframes.has(iframe)) return;
        boundIframes.add(iframe);
        iframe.addEventListener("pointerenter", handleIframeEnter, { passive: true });
        iframe.addEventListener("pointerleave", handleIframeLeave, { passive: true });
        iframe.addEventListener("mouseenter", handleIframeEnter, { passive: true });
        iframe.addEventListener("mouseleave", handleIframeLeave, { passive: true });
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("blur", handleBlur);
    window.addEventListener("chod:hide-shell-cursor", handleExternalHide);
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);
    document.documentElement.addEventListener("pointerenter", handlePointerEnter);
    bindIframes();
    const observer = new MutationObserver(bindIframes);
    observer.observe(document.body, { childList: true, subtree: true });
    frameRef.current = window.requestAnimationFrame(draw);

    return () => {
      document.body.classList.remove("custom-cursor-enabled");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("chod:hide-shell-cursor", handleExternalHide);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
      document.documentElement.removeEventListener("pointerenter", handlePointerEnter);
      observer.disconnect();
      document.querySelectorAll<HTMLIFrameElement>("iframe").forEach((iframe) => {
        iframe.removeEventListener("pointerenter", handleIframeEnter);
        iframe.removeEventListener("pointerleave", handleIframeLeave);
        iframe.removeEventListener("mouseenter", handleIframeEnter);
        iframe.removeEventListener("mouseleave", handleIframeLeave);
      });
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  if (!enabled) {
    return <div ref={cursorRef} className="chod-custom-cursor" aria-hidden="true" />;
  }

  return (
    <div ref={cursorRef} className="chod-custom-cursor" data-state={cursorState} data-visible="false" aria-hidden="true">
      <img src={cursorAssets[cursorState]} alt="" draggable={false} />
      <span className="chod-custom-cursor-ring" />
    </div>
  );
}
