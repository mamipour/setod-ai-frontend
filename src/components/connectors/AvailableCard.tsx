"use client"

/**
 * AvailableCard — the "Connect" card shown for unconnected connector types.
 *
 * Extracted from app/(dashboard)/connectors/page.tsx (R1 refactor).
 */
import { Lock } from "lucide-react"
import { connectors } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { type CatalogueEntry } from "./catalogue"
import { ConnectorIcon } from "./ConnectorCard"
import {
  GmailConnectorModal,
  TelegramBotModal,
  TelegramClientModal,
  TwilioModal,
  WebhookModal,
  SlackWebhookModal,
  WhatsAppModal,
  InstagramOAuthButton,
  HubSpotModal,
  PipedriveModal,
  AirtableModal,
  ShopifyModal,
  CalendlyModal,
  McpConnectorModal,
  McpOauthAppModal,
} from "./ConnectorModals"

export function AvailableCard({ type, catalogKey, label, description, icon, iconSrc, authMethod, defaultUrl, urlRequired, available, orgId, existingCount, onSaved }: CatalogueEntry & {
  orgId: string; existingCount: number; onSaved: () => void
}) {
  const buttonLabel = existingCount > 0 ? "Add another" : "Connect"

  function renderAction() {
    if (!available) return null
    if (type === "gmail") return <GmailConnectorModal orgId={orgId} onSaved={onSaved} />
    if (type === "telegram_bot") return <TelegramBotModal orgId={orgId} onSaved={onSaved} />
    if (type === "telegram_client") return <TelegramClientModal orgId={orgId} onSaved={onSaved} />
    if (type === "twilio") return <TwilioModal orgId={orgId} onSaved={onSaved} />
    if (type === "webhook") return <WebhookModal orgId={orgId} onSaved={onSaved} />
    if (type === "slack_webhook") return <SlackWebhookModal orgId={orgId} onSaved={onSaved} />
    // if (type === "google_sheets") return <GoogleSheetsModal orgId={orgId} onSaved={onSaved} />
    if (type === "whatsapp") return <WhatsAppModal orgId={orgId} onSaved={onSaved} />
    if (type === "instagram") return <InstagramOAuthButton orgId={orgId} />
    if (type === "hubspot") return <HubSpotModal orgId={orgId} onSaved={onSaved} />
    if (type === "pipedrive") return <PipedriveModal orgId={orgId} onSaved={onSaved} />
    if (type === "airtable") return <AirtableModal orgId={orgId} onSaved={onSaved} />
    if (type === "shopify") return <ShopifyModal orgId={orgId} onSaved={onSaved} />
    if (type === "google_business_profile") {
      const url = connectors.gbpOAuthStartUrl(orgId)
      return <a href={url}><Button size="sm" variant="outline" className="text-xs">Connect with Google</Button></a>
    }
    if (type === "calendly") return <CalendlyModal orgId={orgId} onSaved={onSaved} />
    if (type === "mcp" && authMethod === "mcp_oauth") return (
      <McpOauthAppModal
        orgId={orgId}
        catalogKey={catalogKey ?? "custom"}
        label={label}
        defaultUrl={defaultUrl}
        buttonLabel={buttonLabel}
      />
    )
    if (type === "mcp") return (
      <McpConnectorModal
        orgId={orgId}
        catalogKey={catalogKey ?? "custom"}
        label={label}
        defaultUrl={defaultUrl}
        urlRequired={urlRequired}
        allowOauth={catalogKey === "custom" || catalogKey === "linear"}
        onSaved={onSaved}
      />
    )
    return null
  }

  return (
    <Card className={cn("relative flex flex-col min-h-[120px]", !available && "opacity-55")}>
      {!available && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Lock className="size-3" /> Soon
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <ConnectorIcon iconSrc={iconSrc} icon={icon} />
          <div>
            <CardTitle className="text-sm font-semibold">{label}</CardTitle>
            <CardDescription className="text-xs mt-0.5 leading-snug">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex items-end">
        {renderAction()}
      </CardContent>
    </Card>
  )
}
