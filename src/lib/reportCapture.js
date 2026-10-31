// Card reports: the screenshot and the report's context. Loaded only when a student first taps a
// report flag (a dynamic import in ReportFlag.jsx), so modern-screenshot is never part of the
// normal app download.
import { domToCanvas } from 'modern-screenshot';
import { fitWithin, SCREENSHOT_QUALITY, CAPTURE_TIMEOUT_MS } from './cardReports';
import { loadThemeCache } from './settings';
import { getLang } from '../i18n';

// Font files take part of the 2 s at most; after that the screenshot uses the device's fonts.
const FONT_TIMEOUT_MS = 900;

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// The page's fonts come from Google Fonts. The screenshot is drawn as a picture, which can't load
// fonts itself, so the font files must be put inside it. Japanese fonts come in ~100 small files
// (one per group of characters): only the ones the page has already loaded (document.fonts) are
// used, so this stays fast. The stylesheet and the files are kept for the next screenshot.

// One @font-face's identity: family, weight, style and characters ("U+0-FF" and "U+0000-00FF" alike).
function faceKey(family, weight, style, range) {
  const ranges = String(range || "U+0-10FFFF").split(",").map((part) => {
    const [a, b = a] = part.trim().replace(/^U\+/i, "").split("-");
    return `${parseInt(a, 16)}-${parseInt(b, 16)}`;
  });
  return [String(family).replace(/["']/g, "").trim(), weight, style, ranges.join(",")].join("|");
}

const cssProp = (face, name) => face.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim();

let googleCss = null;
const fontData = new Map();
async function fontCss() {
  const link = document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis.com"]');
  if (!link || !document.fonts) return null;
  const loaded = new Set();
  document.fonts.forEach((f) => { if (f.status === "loaded") loaded.add(faceKey(f.family, f.weight, f.style, f.unicodeRange)); });
  googleCss ??= await (await fetch(link.href, { cache: "force-cache" })).text();
  const faces = (googleCss.match(/@font-face\s*{[^}]*}/g) || []).filter((face) =>
    loaded.has(faceKey(cssProp(face, "font-family"), cssProp(face, "font-weight") || "400", cssProp(face, "font-style") || "normal", cssProp(face, "unicode-range"))));
  const embedded = await Promise.all(faces.map(async (face) => {
    const url = face.match(/url\(([^)]+)\)/)?.[1]?.replace(/["']/g, "");
    if (!url) return "";
    if (!fontData.has(url)) {
      const blob = await (await fetch(url, { cache: "force-cache" })).blob();
      fontData.set(url, await blobToDataUrl(blob));
    }
    return face.replace(/url\([^)]+\)/, `url(${fontData.get(url)})`);
  }));
  return embedded.join("\n") || null;
}

// The study card is turned in 3D, which screenshots draw badly (mirrored or both faces). In the
// copy that becomes the screenshot, show only the face the student sees, flat.
function flattenFlipCards(root) {
  if (!(root instanceof Element)) return;
  root.querySelectorAll("[data-flip-inner]").forEach((inner) => {
    const flipped = inner.getAttribute("data-flip-inner") === "back";
    inner.style.setProperty("transform", "none", "important");
    inner.style.setProperty("transition", "none", "important");
    inner.querySelectorAll("[data-face]").forEach((face) => {
      if ((face.getAttribute("data-face") === "back") === flipped) face.style.setProperty("transform", "none", "important");
      else face.style.setProperty("display", "none", "important"); // its children carry their own visibility
    });
  });
}

// Pop-ups (the report sheet itself, which may open while this runs) and the report toast are
// never in the screenshot.
function keep(node) {
  if (!(node instanceof Element)) return true;
  return !node.classList.contains("review-plan-backdrop") && !node.hasAttribute("data-report-ui");
}

function canvasToJpeg(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/jpeg", SCREENSHOT_QUALITY);
  });
}

// A JPEG of what is on screen now (at most 1200 px wide), or null if it fails or takes longer
// than CAPTURE_TIMEOUT_MS. Never throws.
export async function captureScreen() {
  const width = window.innerWidth, height = window.innerHeight, scrollY = window.scrollY;
  const work = (async () => {
    const css = await withTimeout(fontCss(), FONT_TIMEOUT_MS).catch(() => null);
    const size = fitWithin(width, height);
    const canvas = await domToCanvas(document.body, {
      width, height, scale: size.width / width,
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      // The page is cut to the visible part: shift it up by the scroll position.
      style: { position: "relative", top: `${-scrollY}px`, margin: "0" },
      filter: keep,
      onCloneNode: flattenFlipCards,
      font: css ? { cssText: css } : false,
      timeout: CAPTURE_TIMEOUT_MS,
    });
    return canvasToJpeg(canvas);
  })();
  try {
    return await withTimeout(work, CAPTURE_TIMEOUT_MS);
  } catch (error) {
    console.warn("Report screenshot skipped:", error?.message || error);
    return null;
  }
}

async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall back to an <img> below (some browsers can only decode some formats that way)
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Any picture the browser can show (a photo from the iPad's Photos app is often HEIC) → a JPEG at
// most 1200 px wide, because the screenshot bucket only accepts JPEG. Throws if it can't be read.
export async function compressImage(file) {
  const image = await decodeImage(file);
  const size = fitWithin(image.width, image.height);
  if (!size.width) throw new Error("empty image");
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext("2d").drawImage(image, 0, 0, size.width, size.height);
  image.close?.();
  return canvasToJpeg(canvas);
}

// Sent with each report, so a display problem can be reproduced. page: where it was sent from.
export function reportContext(page) {
  let theme = null;
  try { theme = loadThemeCache(window.localStorage); } catch { /* no storage */ }
  return {
    theme,
    lang: getLang(),
    viewport: `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio || 1}`,
    userAgent: navigator.userAgent,
    commit: import.meta.env.VITE_APP_COMMIT || null,
    page,
  };
}
