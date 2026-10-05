import type { StrokePoint } from './contracts'

function distance(left: StrokePoint, right: StrokePoint) {
  return Math.hypot(left[0] - right[0], left[1] - right[1])
}

function pathLength(points: readonly StrokePoint[]) {
  let total = 0
  for (let index = 1; index < points.length; index += 1) total += distance(points[index - 1], points[index])
  return total
}

function distanceToSegment(point: StrokePoint, start: StrokePoint, end: StrokePoint) {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const lengthSquared = dx * dx + dy * dy
  if (!lengthSquared) return distance(point, start)
  const projection = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared))
  return distance(point, [start[0] + projection * dx, start[1] + projection * dy])
}

function distanceToPath(point: StrokePoint, path: readonly StrokePoint[]) {
  let nearest = Number.POSITIVE_INFINITY
  for (let index = 1; index < path.length; index += 1) {
    nearest = Math.min(nearest, distanceToSegment(point, path[index - 1], path[index]))
  }
  return nearest
}

export function strokeMatchesGuide(drawn: readonly StrokePoint[], guide: readonly StrokePoint[]) {
  if (drawn.length < 2 || guide.length < 2) return false
  if (distance(drawn[0], guide[0]) > 18 || distance(drawn[drawn.length - 1], guide[guide.length - 1]) > 18) return false

  const guideLength = pathLength(guide)
  const drawnLength = pathLength(drawn)
  if (!guideLength || drawnLength < guideLength * .55 || drawnLength > guideLength * 1.8) return false

  const sampleStep = Math.max(1, Math.floor(drawn.length / 18))
  let totalDeviation = 0
  let samples = 0
  for (let index = 0; index < drawn.length; index += sampleStep) {
    totalDeviation += distanceToPath(drawn[index], guide)
    samples += 1
  }
  return totalDeviation / Math.max(1, samples) <= 11
}
