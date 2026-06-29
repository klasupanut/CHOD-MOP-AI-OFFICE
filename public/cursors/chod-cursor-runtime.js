(function () {
  if (window.__chodCursorRuntimeLoaded) return;
  window.__chodCursorRuntimeLoaded = true;

  var finePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!finePointer || reducedMotion) return;

  var assets = {
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
    unavailable: "/cursors/chod-cursor-unavailable.svg"
  };

  var style = document.createElement("style");
  style.textContent = [
    "html.chod-cursor-on,html.chod-cursor-on *{cursor:none!important}",
    "html.chod-cursor-on input[type='number'],html.chod-cursor-on input[type='number']::-webkit-inner-spin-button,html.chod-cursor-on input[type='number']::-webkit-outer-spin-button{cursor:auto!important}",
    ".chod-iframe-cursor{position:fixed;left:0;top:0;z-index:2147483000;width:24px;height:24px;pointer-events:none;opacity:0;transform:translate3d(-80px,-80px,0);transform-origin:4px 4px;transition:opacity .12s ease;will-change:transform,opacity}",
    ".chod-iframe-cursor[data-visible='true']{opacity:1}",
    ".chod-iframe-cursor:before{content:'';position:absolute;inset:-3px;border-radius:999px;background:radial-gradient(circle,rgba(178,236,255,.34),rgba(127,227,255,.16) 36%,transparent 72%);filter:blur(4px);transform:translate(0,1px)}",
    ".chod-iframe-cursor img{position:relative;display:block;width:100%;height:100%;opacity:.96;filter:drop-shadow(0 2px 4px rgba(127,227,255,.72)) drop-shadow(0 0 1.5px rgba(255,255,255,.86));user-select:none}",
    ".chod-iframe-cursor[data-state='hover'] img,.chod-iframe-cursor[data-state='link'] img,.chod-iframe-cursor[data-state='focus'] img{opacity:1;filter:drop-shadow(0 2px 6px rgba(127,227,255,.92)) drop-shadow(0 0 2px rgba(255,255,255,.96))}",
    ".chod-iframe-cursor[data-state='text']{width:22px;height:31px;transform-origin:50% 50%}",
    ".chod-iframe-cursor-ring{position:absolute;inset:1px;display:none;border:1.25px solid rgba(127,227,255,.72);border-top-color:transparent;border-radius:999px}",
    ".chod-iframe-cursor[data-state='loading'] .chod-iframe-cursor-ring,.chod-iframe-cursor[data-state='processing'] .chod-iframe-cursor-ring{display:block;animation:chodIframeCursorSpin .85s linear infinite}",
    "@keyframes chodIframeCursorSpin{to{transform:rotate(360deg)}}"
  ].join("");
  document.head.appendChild(style);
  document.documentElement.classList.add("chod-cursor-on");

  var cursor = document.createElement("div");
  cursor.className = "chod-iframe-cursor";
  cursor.dataset.visible = "false";
  cursor.dataset.state = "default";
  cursor.innerHTML = '<img alt="" draggable="false" src="' + assets.default + '"><span class="chod-iframe-cursor-ring"></span>';
  document.body.appendChild(cursor);

  var img = cursor.querySelector("img");
  var pos = { x: -80, y: -80 };
  var target = { x: -80, y: -80 };
  var pressed = false;
  var magnetic = null;
  var state = "default";

  function closest(eventTarget, selector) {
    return eventTarget && eventTarget.closest ? eventTarget.closest(selector) : null;
  }

  function setState(next) {
    if (state === next) return;
    state = next;
    cursor.dataset.state = next;
    img.src = assets[next] || assets.default;
  }

  function stateFromTarget(eventTarget) {
    if (pressed) return "click";
    if (closest(eventTarget, "button:disabled,[aria-disabled='true'],[data-disabled='true'],.disabled")) return "unavailable";
    if (closest(eventTarget, "[aria-busy='true'],[data-loading='true'],.is-loading,.loading")) return "loading";
    if (closest(eventTarget, ".resize-handle,[data-cursor='resize']")) return "resize";
    if (closest(eventTarget, "[draggable='true'],.drag-handle,[data-cursor='drag']")) return "drag";
    if (closest(eventTarget, "input:not([type='button']):not([type='submit']):not([type='checkbox']):not([type='radio']),textarea,[contenteditable='true']")) return "text";
    if (closest(eventTarget, "a[href]")) return "link";
    if (closest(eventTarget, "button,select,[role='button'],[role='tab'],[tabindex]:not([tabindex='-1']),.panel,.field-input,tbody tr")) return "hover";
    return "default";
  }

  function magneticTarget(eventTarget) {
    var element = closest(eventTarget, "a[href],button:not(:disabled),[role='button'],[role='tab'],tbody tr,.panel");
    if (!element || closest(eventTarget, "input,textarea,select,[contenteditable='true'],iframe")) return null;
    return element;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function draw() {
    pos.x += (target.x - pos.x) * 0.24;
    pos.y += (target.y - pos.y) * 0.24;
    var mx = 0;
    var my = 0;
    if (magnetic) {
      var rect = magnetic.getBoundingClientRect();
      mx = clamp((rect.left + rect.width / 2 - target.x) * 0.14, -8, 8);
      my = clamp((rect.top + rect.height / 2 - target.y) * 0.14, -8, 8);
    }
    cursor.style.transform = "translate3d(" + (pos.x + mx) + "px," + (pos.y + my) + "px,0) scale(" + (pressed ? 0.88 : magnetic ? 1.05 : 1) + ")";
    requestAnimationFrame(draw);
  }

  window.addEventListener("pointermove", function (event) {
    if (event.pointerType === "touch") return;
    if (closest(event.target, "input[type='number']")) {
      target.x = event.clientX;
      target.y = event.clientY;
      magnetic = null;
      cursor.dataset.visible = "false";
      return;
    }
    target.x = event.clientX;
    target.y = event.clientY;
    cursor.dataset.visible = "true";
    magnetic = magneticTarget(event.target);
    setState(stateFromTarget(event.target));
  }, { passive: true });

  window.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "touch") return;
    pressed = true;
    setState(stateFromTarget(event.target));
  }, { passive: true });

  window.addEventListener("pointerup", function (event) {
    if (event.pointerType === "touch") return;
    pressed = false;
    setState(stateFromTarget(event.target));
  }, { passive: true });

  window.addEventListener("blur", function () {
    cursor.dataset.visible = "false";
    magnetic = null;
  });

  window.addEventListener("pointerleave", function () {
    cursor.dataset.visible = "false";
    magnetic = null;
  });

  window.addEventListener("mouseleave", function () {
    cursor.dataset.visible = "false";
    magnetic = null;
  });

  document.documentElement.addEventListener("pointerleave", function () {
    cursor.dataset.visible = "false";
    magnetic = null;
  });

  document.documentElement.addEventListener("mouseleave", function () {
    cursor.dataset.visible = "false";
    magnetic = null;
  });

  requestAnimationFrame(draw);
})();
