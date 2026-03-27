import { createFlags, memoryAdapter, runWithContext } from "featurekit";

// In a real app, use fileAdapter or envAdapter and extract session from cookies/headers
const flags = createFlags({
  source: memoryAdapter({
    betaFeature: { enabled: true, percentage: 50 },
  }),
  defaults: { betaFeature: false },
});

export default async function Page() {
  // Simulate getting user from session
  const user = { userId: "usr_123", groups: ["beta"] as string[] };

  const showBeta = await runWithContext(user, () =>
    flags.isEnabled("betaFeature"),
  );

  return (
    <main>
      <h1>featurekit + Next.js</h1>
      {showBeta ? (
        <p>You are seeing the beta feature.</p>
      ) : (
        <p>Standard experience.</p>
      )}
    </main>
  );
}
