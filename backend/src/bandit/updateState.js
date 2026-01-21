export async function updateBanditState(state, reward) {
  if (typeof reward !== "number") {
    throw new Error("Reward must be a number");
  }

  state.pulls += 1;
  state.totalReward += reward;
  state.avgReward = state.totalReward / state.pulls;

  return state;
}
