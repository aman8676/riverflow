/**
 * The rules behind a personal practice sheet.
 *
 * A sheet is (skill level x DSA topic) -> the twenty problems worth doing next.
 * Skill level decides HOW HARD the problems are; the topic decides WHICH ones.
 * Both platforms are queried so a sheet mixes Codeforces' rating-graded problems
 * with LeetCode's interview-shaped ones.
 */

import type { LeetCodeDifficulty } from "@/lib/leetcode";

export type TierId = "beginner" | "intermediate" | "advanced";

export interface Tier {
  id: TierId;
  label: string;
  /** How the band is described back to the user, e.g. "under 800". */
  ratingLabel: string;
  /** What this tier is optimising for, shown under the heading. */
  blurb: string;
  /** Inclusive Codeforces rating band to draw problems from. */
  codeforces: { minRating: number; maxRating: number };
  /** LeetCode difficulties to draw from. */
  leetcode: LeetCodeDifficulty[];
}

/**
 * Ordered by rating floor, ascending.
 *
 * The Codeforces bands deliberately reach below each tier's floor: a
 * 1400-rated competitor still gets 1200-rated problems in the mix, because a
 * sheet made entirely of problems at your ceiling is one you bounce off.
 */
export const TIERS: Tier[] = [
  {
    id: "beginner",
    label: "Beginner",
    ratingLabel: "under 800",
    blurb:
      "Build the basics - easy problems only, so you finish them and keep going.",
    codeforces: { minRating: 800, maxRating: 1000 },
    leetcode: ["EASY"],
  },
  {
    id: "intermediate",
    label: "Intermediate",
    ratingLabel: "800 - 1400",
    blurb:
      "Easy and medium mixed, so most sets are winnable and a few make you think.",
    codeforces: { minRating: 800, maxRating: 1400 },
    leetcode: ["EASY", "MEDIUM"],
  },
  {
    id: "advanced",
    label: "Advanced",
    ratingLabel: "1400+",
    blurb:
      "Medium and hard problems - the band where contest ratings actually move.",
    codeforces: { minRating: 1400, maxRating: 2200 },
    leetcode: ["MEDIUM", "HARD"],
  },
];

/** The rating each tier starts at, aligned with `TIERS`. */
const TIER_FLOORS: Record<TierId, number> = {
  beginner: 0,
  intermediate: 800,
  advanced: 1400,
};

/**
 * The tier a rating belongs to.
 *
 * An unrated account (`null`) is a beginner: on Codeforces you are unrated until
 * your first contest, which is exactly the person the beginner sheet is for.
 */
export function resolveTier(rating: number | null | undefined): Tier {
  const value = Number(rating);

  if (!Number.isFinite(value) || value < TIER_FLOORS.intermediate) {
    return TIERS[0];
  }

  return value < TIER_FLOORS.advanced ? TIERS[1] : TIERS[2];
}

export function tierById(id: unknown): Tier | undefined {
  return TIERS.find((tier) => tier.id === id);
}

export interface DsaTopic {
  id: string;
  label: string;
  /** One line on what the topic is. */
  summary: string;
  /** The handful of ideas a sheet on this topic is meant to drill. */
  keyIdeas: string[];
  /** Codeforces problem tags, matched as an OR. */
  codeforcesTags: string[];
  /** LeetCode topic slugs, each queried separately and merged. */
  leetcodeSlugs: string[];
}

/**
 * The topic menu, ordered roughly the way a DSA course sequences them: the
 * prerequisites for a topic sit above it.
 *
 * Tags are not one-to-one between the platforms. Codeforces tags describe the
 * technique that solves a problem ("dp", "two pointers"), while LeetCode tags
 * describe the data structure in play ("linked-list", "stack") - so a topic maps
 * to whichever tags on each side land on the same practice material.
 */
export const DSA_TOPICS: DsaTopic[] = [
  {
    id: "arrays",
    label: "Arrays & Hashing",
    summary:
      "Scanning, counting and indexing - the operations underneath almost every other topic.",
    keyIdeas: [
      "Prefix sums and difference arrays",
      "Frequency maps and set lookups",
      "Trading memory for a second pass",
    ],
    codeforcesTags: ["implementation", "brute force"],
    leetcodeSlugs: ["array", "hash-table"],
  },
  {
    id: "strings",
    label: "Strings",
    summary:
      "Pattern matching, parsing and character counting over sequences of text.",
    keyIdeas: [
      "Anagram and palindrome checks by counting",
      "Building results with a buffer, not repeated concatenation",
      "Prefix functions and hashing for matching",
    ],
    codeforcesTags: ["strings", "hashing"],
    leetcodeSlugs: ["string"],
  },
  {
    id: "two-pointers",
    label: "Two Pointers & Sliding Window",
    summary:
      "Two indices moving over one sequence to replace a nested loop with a single pass.",
    keyIdeas: [
      "Opposite-end pointers on sorted input",
      "Growing and shrinking a window on a constraint",
      "Why monotonicity is what makes the window valid",
    ],
    codeforcesTags: ["two pointers"],
    leetcodeSlugs: ["two-pointers", "sliding-window"],
  },
  {
    id: "binary-search",
    label: "Binary Search",
    summary: "Halving a search space - over an array, or over the answer itself.",
    keyIdeas: [
      "Getting the loop bounds right, once",
      "Binary searching the answer on a monotone predicate",
      "Lower bound vs upper bound",
    ],
    codeforcesTags: ["binary search", "ternary search"],
    leetcodeSlugs: ["binary-search"],
  },
  {
    id: "sorting",
    label: "Sorting & Intervals",
    summary:
      "Ordering data so the answer becomes a single sweep, especially over ranges.",
    keyIdeas: [
      "Custom comparators",
      "Merging and sweeping overlapping intervals",
      "Sorting as the preprocessing step that exposes a greedy",
    ],
    codeforcesTags: ["sortings"],
    leetcodeSlugs: ["sorting", "interval"],
  },
  {
    id: "stacks-queues",
    label: "Stacks & Queues",
    summary:
      "LIFO and FIFO structures, and the monotonic variants that answer next-greater questions.",
    keyIdeas: [
      "Matching brackets and nested structure",
      "Monotonic stacks for next greater / smaller",
      "Deques for sliding-window extremes",
    ],
    codeforcesTags: ["data structures"],
    leetcodeSlugs: ["stack", "monotonic-stack", "queue"],
  },
  {
    id: "linked-lists",
    label: "Linked Lists",
    summary: "Pointer surgery on nodes that have no random access.",
    keyIdeas: [
      "Dummy heads to avoid special-casing the first node",
      "Fast and slow pointers for cycles and midpoints",
      "Reversing in place",
    ],
    codeforcesTags: ["data structures", "implementation"],
    leetcodeSlugs: ["linked-list"],
  },
  {
    id: "trees",
    label: "Trees & BSTs",
    summary:
      "Recursive structure - traversal orders, and the ordering invariant a BST adds.",
    keyIdeas: [
      "Pre / in / post order, and when each one is the right one",
      "Depth, diameter and other post-order accumulations",
      "The BST invariant, and validating it with bounds",
    ],
    codeforcesTags: ["trees", "dfs and similar"],
    leetcodeSlugs: ["tree", "binary-tree", "binary-search-tree"],
  },
  {
    id: "heaps",
    label: "Heaps & Priority Queues",
    summary: "Keeping the best element to hand while the set keeps changing.",
    keyIdeas: [
      "Top-k with a bounded heap",
      "Two heaps for a running median",
      "Heaps as the engine inside Dijkstra and scheduling",
    ],
    codeforcesTags: ["data structures", "greedy"],
    leetcodeSlugs: ["heap-priority-queue"],
  },
  {
    id: "graphs",
    label: "Graphs - BFS & DFS",
    summary:
      "Traversal over nodes and edges: connectivity, components and reachability.",
    keyIdeas: [
      "Adjacency lists over matrices",
      "BFS for fewest edges, DFS for structure",
      "Grids as implicit graphs",
    ],
    codeforcesTags: ["graphs", "dfs and similar"],
    leetcodeSlugs: ["graph", "depth-first-search", "breadth-first-search"],
  },
  {
    id: "shortest-paths",
    label: "Shortest Paths & Topological Sort",
    summary: "Weighted graphs, ordering constraints and cycle detection.",
    keyIdeas: [
      "Dijkstra, and why it needs non-negative weights",
      "Topological order on a DAG",
      "DP along a topological order",
    ],
    codeforcesTags: ["shortest paths", "graphs"],
    leetcodeSlugs: ["shortest-path", "topological-sort"],
  },
  {
    id: "dsu",
    label: "Union-Find (DSU)",
    summary: "Merging sets and asking whether two things are already connected.",
    keyIdeas: [
      "Path compression and union by rank",
      "Connectivity without rebuilding a traversal",
      "Kruskal's MST on top of DSU",
    ],
    codeforcesTags: ["dsu", "trees"],
    leetcodeSlugs: ["union-find"],
  },
  {
    id: "backtracking",
    label: "Recursion & Backtracking",
    summary:
      "Searching a space of choices, and pruning the branches that cannot work.",
    keyIdeas: [
      "Choose / explore / un-choose",
      "Deduplicating permutations and subsets",
      "Pruning as the difference between feasible and not",
    ],
    codeforcesTags: [
      "brute force",
      "dfs and similar",
      "constructive algorithms",
    ],
    leetcodeSlugs: ["backtracking", "recursion"],
  },
  {
    id: "dp",
    label: "Dynamic Programming",
    summary:
      "Overlapping subproblems solved once - the topic that decides most contest outcomes.",
    keyIdeas: [
      "Defining the state before writing any code",
      "Top-down memo vs bottom-up table",
      "The knapsack, LIS and grid-path families",
    ],
    codeforcesTags: ["dp"],
    leetcodeSlugs: ["dynamic-programming"],
  },
  {
    id: "greedy",
    label: "Greedy",
    summary:
      "Taking the locally best choice - and being able to argue that it stays optimal.",
    keyIdeas: [
      "Exchange arguments",
      "Sorting to expose the greedy order",
      "Spotting when greedy fails and DP is required",
    ],
    codeforcesTags: ["greedy"],
    leetcodeSlugs: ["greedy"],
  },
  {
    id: "math",
    label: "Math & Number Theory",
    summary: "Divisibility, primes, modular arithmetic and counting.",
    keyIdeas: [
      "GCD, LCM and the sieve",
      "Modular arithmetic and fast exponentiation",
      "Combinatorics: choosing, arranging, counting",
    ],
    codeforcesTags: ["math", "number theory", "combinatorics"],
    leetcodeSlugs: ["math", "number-theory", "combinatorics"],
  },
  {
    id: "bits",
    label: "Bit Manipulation",
    summary: "Treating an integer as a set of flags.",
    keyIdeas: [
      "AND / OR / XOR identities",
      "Isolating and clearing the lowest set bit",
      "Subset enumeration with bitmasks",
    ],
    codeforcesTags: ["bitmasks"],
    leetcodeSlugs: ["bit-manipulation"],
  },
  {
    id: "tries",
    label: "Tries",
    summary: "Prefix trees for word lookups and XOR-maximisation tricks.",
    keyIdeas: [
      "Node-per-character layout",
      "Prefix search and autocomplete",
      "Binary tries for maximum XOR",
    ],
    codeforcesTags: ["strings", "data structures"],
    leetcodeSlugs: ["trie"],
  },
];

export function topicById(id: unknown): DsaTopic | undefined {
  return DSA_TOPICS.find((topic) => topic.id === id);
}

/** How many problems a generated sheet holds. */
export const SHEET_SIZE = 20;
