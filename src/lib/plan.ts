// Plan rules. Free = 1 month at up to 3 posts/day. Boost plans last 30 days per payment.
export const LIMITS = { free: 3, starter: 6, professional: 10 } as const;
export type PlanName = keyof typeof LIMITS;

export function effectivePlan(plan: string | null, expiresAt: string | null): PlanName {
  if ((plan === "starter" || plan === "professional") && expiresAt && new Date(expiresAt) > new Date()) return plan;
  return "free";
}
