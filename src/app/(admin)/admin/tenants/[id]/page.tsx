import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { listTenantsForAdmin, listTenantMembersForAdmin } from "@/lib/data/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, STATUS_VARIANT } from "../../tenants-table";
import { TenantDetail } from "./tenant-detail";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseClient();

  const [tenants, members] = await Promise.all([
    listTenantsForAdmin(supabase),
    listTenantMembersForAdmin(supabase, id),
  ]);

  const tenant = tenants.find((t) => t.tenant_id === id);
  if (!tenant) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{tenant.tenant_name}</h1>
          <p className="text-sm text-muted-foreground">
            Criada em {new Date(tenant.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[tenant.status]}>{STATUS_LABELS[tenant.status]}</Badge>
        {tenant.stripe_customer_id && (
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://dashboard.stripe.com/customers/${tenant.stripe_customer_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Stripe <ExternalLink className="size-3.5" />
            </a>
          </Button>
        )}
      </div>

      <TenantDetail tenant={tenant} members={members} />
    </div>
  );
}
