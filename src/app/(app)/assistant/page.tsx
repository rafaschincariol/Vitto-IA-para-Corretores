import { AssistantChat } from "./chat";

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assistente</h1>
        <p className="text-sm text-muted-foreground">
          Pergunte em linguagem natural sobre sua carteira ou sobre condições gerais de seguros.
        </p>
      </div>
      <AssistantChat />
    </div>
  );
}
