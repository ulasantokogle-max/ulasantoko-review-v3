// Dark rainbow stops retain contrast against the white QR quiet zone.
const stops = [[185, 28, 28], [154, 52, 18], [133, 77, 14], [22, 101, 52], [15, 118, 110], [29, 78, 216], [109, 40, 217]];

export function rainbowQrPng(modules: { size: number; get: (row: number, column: number) => number }) {
  const scale = 32, margin = 4;
  const width = (modules.size + margin * 2) * scale;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = width;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("QR canvas unavailable");
  const pixels = context.createImageData(width, width);
  const colors = Array.from({ length: width * 2 - 1 }, (_, diagonal) => {
    const position = diagonal / (width * 2 - 2) * (stops.length - 1);
    const index = Math.min(stops.length - 2, Math.floor(position));
    const fraction = position - index;
    return stops[index].map((value, channel) => Math.round(value + (stops[index + 1][channel] - value) * fraction));
  });
  for (let y = 0; y < width; y++) {
    const row = Math.floor(y / scale) - margin;
    for (let x = 0; x < width; x++) {
      const column = Math.floor(x / scale) - margin;
      const dark = row >= 0 && column >= 0 && row < modules.size && column < modules.size && modules.get(row, column);
      const offset = (y * width + x) * 4;
      const color = dark ? colors[x + y] : [255, 255, 255];
      pixels.data[offset] = color[0];
      pixels.data[offset + 1] = color[1];
      pixels.data[offset + 2] = color[2];
      pixels.data[offset + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  return canvas.toDataURL("image/png");
}
