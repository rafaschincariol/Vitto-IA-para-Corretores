import { Suspense } from "react";
import { getDashboardData } from "@/lib/data/dashboard";
import { AssistantChat } from "./chat";

export default async function AssistantPage() {
  const { totalPolicies } = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assistente</h1>
        <p className="text-sm text-muted-foreground">
          Pergunte em linguagem natural sobre sua carteira ou sobre condições gerais de seguros.
        </p>
      </div>
      <Suspense fallback={null}>
        <AssistantChat hasPolicies={totalPolicies > 0} />
      </Suspense>
    </div>
  );
}
