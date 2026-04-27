export type CandidateSource = "REFERRAL" | "BOSS_ZHIPIN" | "JOB51" | "SHIXISENG" | "OTHER";

export const SOURCE_OPTIONS: { value: CandidateSource; label: string }[] = [
  { value: "REFERRAL", label: "内推" },
  { value: "BOSS_ZHIPIN", label: "Boss直聘" },
  { value: "JOB51", label: "前程无忧" },
  { value: "SHIXISENG", label: "实习僧" },
  { value: "OTHER", label: "其他" },
];

export function sourceLabel(s: string): string {
  return SOURCE_OPTIONS.find((o) => o.value === s)?.label ?? "其他";
}
