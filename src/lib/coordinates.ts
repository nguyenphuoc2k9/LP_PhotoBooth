export interface Point { x: number; y: number }
export interface Size { width: number; height: number }
export interface Rect { x: number; y: number; width: number; height: number }
export function mirrorXCoordinate(x: number, width: number) { return width - x; }
export function normalizedToVideoCoordinates(point: Point, video: Size): Point {
  return { x: point.x * video.width, y: point.y * video.height };
}
export function coverCrop(source: Size, target: Size): Rect {
  const ratio = target.width / target.height;
  const width = Math.min(source.width, source.height * ratio);
  const height = width / ratio;
  return { x: (source.width - width) / 2, y: (source.height - height) / 2, width, height };
}
export function videoToDisplayCoordinates(point: Point, video: Size, display: Size, mirrored = false): Point {
  const crop = coverCrop(video, display);
  const x = (point.x - crop.x) * display.width / crop.width;
  return { x: mirrored ? mirrorXCoordinate(x, display.width) : x, y: (point.y - crop.y) * display.height / crop.height };
}
export function displayToCanvasCoordinates(point: Point, display: Size, canvas: Size, mirrored = false): Point {
  return { x: (mirrored ? mirrorXCoordinate(point.x, display.width) : point.x) * canvas.width / display.width, y: point.y * canvas.height / display.height };
}
export function mapSelectionToExportCanvas(rect: Rect, display: Size, canvas: Size, mirrored = true): Rect {
  const point = displayToCanvasCoordinates({ x: mirrored ? rect.x + rect.width : rect.x, y: rect.y }, display, canvas, mirrored);
  return { ...point, width: rect.width * canvas.width / display.width, height: rect.height * canvas.height / display.height };
}
