export const exportPngFromSvg = async (svg: SVGSVGElement, filename = 'project.png'): Promise<void> => {
  const data = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = svg.viewBox.baseVal.width || 1920;
  canvas.height = svg.viewBox.baseVal.height || 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  const pngUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = pngUrl;
  a.download = filename;
  a.click();
};
