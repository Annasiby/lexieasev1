export function selectNextState(states, epsilon = 0.3) {
  if (!states || states.length === 0) {
    throw new Error("No states available for selection");
  }

  // Exploration
  if (Math.random() < epsilon) {
    return states[Math.floor(Math.random() * states.length)];
  }

  // Exploitation: lowest avgReward = hardest
  return states.reduce((a, b) =>
    a.avgReward < b.avgReward ? a : b
  );
}