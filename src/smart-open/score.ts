

const DECAY_RATE = 0.001;

export function calculateCompositeScore(
  matchQuality: number, // e.g., from fuzzy search
  recencyScore: number, // from exponential decay
  frequencyScore: number, // e.g., normalized open count
  closeScore: number, // e.g., from file closeness
  weights: { matchQuality: number; recency: number; frequency: number; close: number } //
): number {
  return (
    weights.matchQuality * matchQuality +
    weights.recency * recencyScore +
    weights.frequency * frequencyScore +
    weights.close * closeScore
  );
}

export function calculateRecencyScore(lastOpened: number, currentTime: number, decayRate: number = DECAY_RATE): number {
  const timeDifference = currentTime - lastOpened; // in milliseconds
  const daysDifference = timeDifference / (1000 * 60 * 60 * 24); // convert to days
  const score = Math.exp(-decayRate * daysDifference);
  // If score is NaN, return 0
  return isNaN(score) ? 0 : score;
}