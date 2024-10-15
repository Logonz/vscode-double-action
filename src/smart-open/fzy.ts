

// const SCORE_GAP_LEADING = -0.005;
// const SCORE_GAP_TRAILING = -0.005;
// const SCORE_GAP_INNER = -0.01;
// const SCORE_MATCH_CONSECUTIVE = 1.0;
// const SCORE_MATCH_SLASH = 0.9;
// const SCORE_MATCH_WORD = 0.8;
// const SCORE_MATCH_CAPITAL = 0.7;
// const SCORE_MATCH_DOT = 0.6;
// const SCORE_MAX = Number.POSITIVE_INFINITY;
// const SCORE_MIN = Number.NEGATIVE_INFINITY;
// const MATCH_MAX_LENGTH = 1024;

// export const SCALE_FACTOR = 1000;

// const SCORE_GAP_LEADING = -5; // -0.005 * 1000
// const SCORE_GAP_TRAILING = -5; // -0.005 * 1000
// const SCORE_GAP_INNER = -10; // -0.01 * 1000
// const SCORE_MATCH_CONSECUTIVE = 1000; // 1.0 * 1000
// const SCORE_MATCH_SLASH = 900; // 0.9 * 1000
// const SCORE_MATCH_WORD = 800; // 0.8 * 1000
// const SCORE_MATCH_CAPITAL = 700; // 0.7 * 1000
// const SCORE_MATCH_DOT = 600; // 0.6 * 1000
// const SCORE_MAX = Number.POSITIVE_INFINITY;
// // export const SCORE_MAX = 10000000000000;
// // export const SCORE_MAX = Number.MAX_SAFE_INTEGER;
// const SCORE_MIN = Number.NEGATIVE_INFINITY;
// // export const SCORE_MIN = -10000000000000;
// // export const SCORE_MIN = Number.MIN_SAFE_INTEGER;
// const MATCH_MAX_LENGTH = 1024;


export const SCALE_FACTOR = 1000;

const SCORE_GAP_LEADING = -5; // -0.005 * 1000
const SCORE_GAP_TRAILING = -5; // -0.005 * 1000
const SCORE_GAP_INNER = -10; // -0.01 * 1000
const SCORE_MATCH_CONSECUTIVE = 1000; // 1.0 * 1000
const SCORE_MATCH_SLASH = 900; // 0.9 * 1000
const SCORE_MATCH_WORD = 800; // 0.8 * 1000
const SCORE_MATCH_CAPITAL = 700; // 0.7 * 1000
const SCORE_MATCH_DOT = 600; // 0.6 * 1000
const SCORE_MAX = Number.POSITIVE_INFINITY;
// export const SCORE_MAX = 10000000000000;
// export const SCORE_MAX = Number.MAX_SAFE_INTEGER;
const SCORE_MIN = Number.NEGATIVE_INFINITY;
// export const SCORE_MIN = -10000000000000;
// export const SCORE_MIN = Number.MIN_SAFE_INTEGER;
const MATCH_MAX_LENGTH = 1024;
const pathSep = "/";

function hasMatch(needle: string, haystack: string): boolean {
  needle = needle.toLowerCase();
  haystack = haystack.toLowerCase();

  let j = 0;
  for (let i = 0; i < needle.length; i++) {
    j = haystack.indexOf(needle.charAt(i), j);
    if (j === -1) {
      return false;
    } else {
      j += 1;
    }
  }

  return true;
}

function isLower(c: string): boolean {
  return /[a-z]/.test(c);
}

function isUpper(c: string): boolean {
  return /[A-Z]/.test(c);
}

function precomputeBonus(haystack: string): number[] {
  const matchBonus: number[] = [];

  let lastChar = pathSep;
  for (let i = 0; i < haystack.length; i++) {
    const thisChar = haystack.charAt(i);
    if (lastChar === pathSep) {
      matchBonus[i] = SCORE_MATCH_SLASH;
    } else if (lastChar === '-' || lastChar === '_' || lastChar === ' ') {
      matchBonus[i] = SCORE_MATCH_WORD;
    } else if (lastChar === '.') {
      matchBonus[i] = SCORE_MATCH_DOT;
    } else if (isLower(lastChar) && isUpper(thisChar)) {
      matchBonus[i] = SCORE_MATCH_CAPITAL;
    } else {
      matchBonus[i] = 0;
    }

    lastChar = thisChar;
  }

  return matchBonus;
}

function compute(needle: string, haystack: string, D: number[][], M: number[][]): void {
  const matchBonus = precomputeBonus(haystack);
  const n = needle.length;
  const m = haystack.length;
  const lowerNeedle = needle.toLowerCase();
  const lowerHaystack = haystack.toLowerCase();

  const haystackChars = lowerHaystack.split('');

  for (let i = 0; i < n; i++) {
    D[i] = [];
    M[i] = [];

    let prevScore = SCORE_MIN;
    const gapScore = i === n - 1 ? SCORE_GAP_TRAILING : SCORE_GAP_INNER;
    const needleChar = lowerNeedle.charAt(i);

    for (let j = 0; j < m; j++) {
      if (needleChar === haystackChars[j]) {
        let score = SCORE_MIN;
        if (i === 0) {
          score = (j * SCORE_GAP_LEADING) + matchBonus[j];
        } else if (j > 0) {
          const a = M[i - 1][j - 1] + matchBonus[j];
          const b = D[i - 1][j - 1] + SCORE_MATCH_CONSECUTIVE;
          score = Math.max(a, b);
        }
        D[i][j] = score;
        prevScore = Math.max(score, prevScore + gapScore);
        M[i][j] = prevScore;
      } else {
        D[i][j] = SCORE_MIN;
        prevScore = prevScore + gapScore;
        M[i][j] = prevScore;
      }
    }
  }
}

function score(needle: string, haystack: string): number {
  const n = needle.length;
  const m = haystack.length;

  if (n === 0 || m === 0 || m > MATCH_MAX_LENGTH || n > MATCH_MAX_LENGTH) {
    // console.log("Returning SCORE_MIN");
    // return SCORE_MIN;
    return 0;
  } else if (n === m) {
    // console.log("Returning SCORE_MAX");
    // return SCORE_MAX;
    return 0;
  } else {
    const D: number[][] = [];
    const M: number[][] = [];
    compute(needle, haystack, D, M);
    return M[n - 1][m - 1];
  }
}

function positions(needle: string, haystack: string): number[] {
  const n = needle.length;
  const m = haystack.length;

  if (n === 0 || m === 0 || m > MATCH_MAX_LENGTH || n > MATCH_MAX_LENGTH) {
    return [];
  } else if (n === m) {
    const consecutive: number[] = [];
    for (let i = 0; i < n; i++) {
      consecutive[i] = i;
    }
    return consecutive;
  }

  const D: number[][] = [];
  const M: number[][] = [];
  compute(needle, haystack, D, M);

  const positions: number[] = [];
  let matchRequired = false;
  let j = m - 1;
  for (let i = n - 1; i >= 0; i--) {
    while (j >= 0) {
      if (D[i][j] !== SCORE_MIN && (matchRequired || D[i][j] === M[i][j])) {
        matchRequired = (i > 0) && (j > 0) && (M[i][j] === D[i - 1][j - 1] + SCORE_MATCH_CONSECUTIVE);
        positions[i] = j;
        j = j - 1;
        break;
      } else {
        j = j - 1;
      }
    }
  }

  return positions;
}

function getScoreMin(): number {
  return SCORE_MIN;
}

function getScoreMax(): number {
  return SCORE_MAX;
}

function getScoreFloor(): number {
  return (MATCH_MAX_LENGTH + 1) * SCORE_GAP_INNER;
}

export {
  hasMatch,
  score,
  positions,
  getScoreMin,
  getScoreMax,
  getScoreFloor,
};
