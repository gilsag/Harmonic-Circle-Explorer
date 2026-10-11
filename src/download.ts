function cloneSvgWithEmbeddedStyles(svgElement: SVGSVGElement) {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.querySelectorAll("[data-export-ignore='true']").forEach((element) => element.remove());
  clone.querySelectorAll(".selected-chord, .selected-reference").forEach((element) => {
    element.classList.remove("selected-chord", "selected-reference");
  });

  let cssText = "";
  Array.from(document.styleSheets).forEach((styleSheet) => {
    try {
      Array.from(styleSheet.cssRules).forEach((rule) => {
        cssText += `${rule.cssText}\n`;
      });
    } catch {
      // Cross-origin stylesheets may not expose cssRules.
    }
  });

  const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleElement.textContent = cssText;
  clone.insertBefore(styleElement, clone.firstChild);
  return clone;
}

function serializeSvg(svgElement: SVGSVGElement) {
  return new XMLSerializer().serializeToString(cloneSvgWithEmbeddedStyles(svgElement));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadSvg(svgElement: SVGSVGElement, filename: string) {
  const blob = new Blob([serializeSvg(svgElement)], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, filename);
}

export function downloadPng(svgElement: SVGSVGElement, filename: string) {
  const source = serializeSvg(svgElement);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  const viewBox = svgElement.viewBox.baseVal;
  const width = Math.max(1, Math.ceil(viewBox.width || svgElement.clientWidth || 1200));
  const height = Math.max(1, Math.ceil(viewBox.height || svgElement.clientHeight || 800));

  image.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(url);
      return;
    }
    context.scale(scale, scale);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(url);
    canvas.toBlob((pngBlob) => {
      if (pngBlob) downloadBlob(pngBlob, filename);
    }, "image/png");
  };

  image.onerror = () => URL.revokeObjectURL(url);
  image.src = url;
}
