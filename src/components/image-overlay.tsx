import { useEffect, useRef, useState } from "react";
import type { ReadResult } from "zxing-wasm";
import { resultKey } from "../lib/result-data";

type Viewport = { width: number; height: number };
const viewports = new WeakMap<SVGSVGElement, Viewport>();
export function observeLiveOverlay(
  svg: SVGSVGElement,
  onResize?: (size: Viewport) => void,
) {
  const observer = new ResizeObserver(([entry]) => {
    const size = {
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    };
    viewports.set(svg, size);
    onResize?.(size);
  });
  observer.observe(svg);
  return () => {
    observer.disconnect();
    viewports.delete(svg);
  };
}
function points(result: ReadResult) {
  const p = result.position;
  return [p.topLeft, p.topRight, p.bottomRight, p.bottomLeft];
}
function labelTransform(
  result: ReadResult,
  width: number,
  height: number,
  viewport?: Viewport,
) {
  const scale = viewport
    ? Math.min(viewport.width / width, viewport.height / height)
    : 1;
  const unit = scale > 0 ? 1 / scale : 1;
  const vertices = points(result);
  const x = Math.max(
    0,
    Math.min(width - 22 * unit, Math.min(...vertices.map((p) => p.x))),
  );
  const y = Math.max(
    0,
    Math.min(
      height - 22 * unit,
      Math.min(...vertices.map((p) => p.y)) - 26 * unit,
    ),
  );
  return `translate(${x} ${y}) scale(${unit})`;
}
export function ImageOverlay({
  results,
  width,
  height,
  active = -1,
}: {
  results: ReadResult[];
  width: number;
  height: number;
  active?: number;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [viewport, setViewport] = useState<Viewport>();
  const numbered = results.length > 1;
  useEffect(
    () =>
      svg.current && numbered
        ? observeLiveOverlay(svg.current, setViewport)
        : undefined,
    [numbered],
  );
  if (!width || !height) return null;
  return (
    <svg
      ref={svg}
      className="image-overlay"
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      {results.map((result, index) => {
        const outline = points(result)
          .map(({ x, y }) => `${x},${y}`)
          .join(" ");
        const selected = active < 0 || index === active;
        return (
          <g key={resultKey(result)} data-active={selected}>
            <polygon
              points={outline}
              opacity={selected ? 1 : 0.65}
              fill="none"
              stroke="var(--detection-edge)"
              strokeWidth="6"
              vectorEffect="non-scaling-stroke"
            />
            <polygon
              points={outline}
              opacity={selected ? 1 : 0.65}
              fill="none"
              stroke="var(--detection-line)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
            {numbered && (
              <g
                className="overlay-index"
                transform={labelTransform(result, width, height, viewport)}
              >
                <rect
                  width="22"
                  height="22"
                  rx="5"
                  fill="var(--detection-edge)"
                />
                <text
                  x="11"
                  y="11"
                  dy="0.35em"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill="var(--detection-label)"
                >
                  {index + 1}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Camera geometry reuses SVG nodes. Viewport scale is observed outside the frame loop. */
export function updateLiveOverlay(
  svg: SVGSVGElement,
  results: ReadResult[],
  width: number,
  height: number,
  active = -1,
) {
  const viewBox = `0 0 ${width} ${height}`;
  if (svg.getAttribute("viewBox") !== viewBox)
    svg.setAttribute("viewBox", viewBox);
  while (svg.children.length > results.length) svg.lastElementChild?.remove();
  results.forEach((result, index) => {
    let group = svg.children[index];
    if (!group) {
      group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      for (const [stroke, strokeWidth] of [
        ["var(--detection-edge)", "6"],
        ["var(--detection-line)", "3"],
      ]) {
        const polygon = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "polygon",
        );
        polygon.setAttribute("fill", "none");
        polygon.setAttribute("stroke", stroke);
        polygon.setAttribute("stroke-width", strokeWidth);
        polygon.setAttribute("vector-effect", "non-scaling-stroke");
        group.append(polygon);
      }
      svg.append(group);
    }
    const selected = active < 0 || index === active;
    const opacity = selected ? "1" : "0.65";
    if (group.getAttribute("data-active") !== String(selected))
      group.setAttribute("data-active", String(selected));
    const outline = points(result)
      .map(({ x, y }) => `${x},${y}`)
      .join(" ");
    for (const polygon of [group.children[0], group.children[1]]) {
      if (polygon.getAttribute("points") !== outline)
        polygon.setAttribute("points", outline);
      if (polygon.getAttribute("opacity") !== opacity)
        polygon.setAttribute("opacity", opacity);
    }
    let label = group.querySelector(".overlay-index");
    if (results.length < 2) {
      label?.remove();
      return;
    }
    if (!label) {
      label = document.createElementNS("http://www.w3.org/2000/svg", "g");
      label.setAttribute("class", "overlay-index");
      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      for (const [name, value] of Object.entries({
        width: "22",
        height: "22",
        rx: "5",
        fill: "var(--detection-edge)",
      }))
        rect.setAttribute(name, value);
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      for (const [name, value] of Object.entries({
        x: "11",
        y: "11",
        dy: "0.35em",
        "text-anchor": "middle",
        "font-size": "12",
        "font-weight": "600",
        fill: "var(--detection-label)",
      }))
        text.setAttribute(name, value);
      label.append(rect, text);
      group.append(label);
    }
    const transform = labelTransform(result, width, height, viewports.get(svg));
    if (label.getAttribute("transform") !== transform)
      label.setAttribute("transform", transform);
    const text = String(index + 1);
    if (label.lastElementChild!.textContent !== text)
      label.lastElementChild!.textContent = text;
  });
}
