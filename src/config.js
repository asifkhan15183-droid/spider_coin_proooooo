export function config(env) {
  return {
    projectName: env.PROJECT_NAME || "Spider Coin",
    coinName: env.COIN_NAME || "Spider Coin",
    coinSymbol: env.COIN_SYMBOL || "SPC",
    botUsername: (env.BOT_USERNAME || "").replace(/^@/, ""),
    miningRate: Math.max(0, Number(env.MINING_RATE_PER_HOUR || 1)),
    miningCycleHours: Math.max(1, Number(env.MINING_CYCLE_HOURS || 24)),
    referralReward: Math.max(0, Number(env.REFERRAL_REWARD || 100)),
    normalPromoPrice: Number(env.PROMO_NORMAL_PRICE_USDT || 2),
    uniquePromoPrice: Number(env.PROMO_UNIQUE_PRICE_USDT || 5),
    usdtContract: (env.USDT_BSC_CONTRACT || "").toLowerCase(),
    usdtReceiver: (env.USDT_RECEIVER_ADDRESS || "").toLowerCase(),
    chainId: Number(env.USDT_BSC_CHAIN_ID || 56),
    supporterPrice: Number(env.SUPPORTER_PASS_PRICE_USDT || 5),
    withdrawalsEnabled: env.WITHDRAWALS_ENABLED === "true"
  };
}
