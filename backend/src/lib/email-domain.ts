// "anass@uit.ac.ma" matches "uit.ac.ma" (and its sub-domains such as
// "etu.uit.ac.ma"), but "anass@notuit.ac.ma" or "anass@uit.ac.ma.evil.com" do not.
export function emailMatchesDomains(email: string, domains: string[]) {
  const domain = email.trim().toLowerCase().split("@").pop() ?? "";

  return domains.some((allowed) => {
    const candidate = allowed.trim().toLowerCase().replace(/^@/, "");

    return (
      candidate.length > 0 &&
      (domain === candidate || domain.endsWith(`.${candidate}`))
    );
  });
}

export function formatDomains(domains: string[]) {
  return domains.map((domain) => `@${domain.replace(/^@/, "")}`).join(" or ");
}
