# Graph Report - /home/farhad/projects/OIBC/platform-ui  (2026-10-04)

## Corpus Check
- 143 files · ~91,888 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 799 nodes · 1904 edges · 65 communities (51 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Help Documentation Pages
- Approvals & Members Pages
- Map & Approvals View
- Connectors Dashboard
- Tables & Billing Dialogs
- Table Detail View
- TypeScript Config & Refs
- UI Component Library
- Agent Sessions Tab
- API Client Layer
- Component Aliases & Icons
- Agent Tab Components
- Templates & Agent Creation
- Agent Detail Page
- Plan Settings Page
- NPM Runtime Dependencies
- Dev Dependencies
- Auth & Homepage
- Agent Cards UI
- Dashboard Home Page
- Module Group 20
- Module Group 21
- Module Group 22
- Module Group 23
- Module Group 24
- Module Group 25
- Module Group 26
- Module Group 27
- Module Group 28
- Module Group 29
- Module Group 30
- Module Group 31
- Module Group 32
- Module Group 33
- Module Group 34
- Module Group 35
- Module Group 36
- Module Group 37
- Module Group 38
- Module Group 39
- Module Group 40
- Module Group 41
- Module Group 42
- Module Group 43
- Module Group 44
- Module Group 45
- Module Group 46
- Module Group 47
- Module Group 48
- Module Group 49
- Module Group 50
- Module Group 51
- Module Group 52
- Module Group 53
- Module Group 54

## God Nodes (most connected - your core abstractions)
1. `cn()` - 216 edges
2. `Button()` - 35 edges
3. `useActiveOrg()` - 35 edges
4. `nextPage()` - 34 edges
5. `useUser()` - 23 edges
6. `Callout()` - 19 edges
7. `DocHeader()` - 18 edges
8. `Section()` - 18 edges
9. `P()` - 18 edges
10. `connectorIconSrc()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `useSidebar()` --references--> `react`  [EXTRACTED]
  src/components/ui/sidebar.tsx → package.json
- `SidebarMenuSkeleton()` --references--> `react`  [EXTRACTED]
  src/components/ui/sidebar.tsx → package.json
- `SidebarProvider()` --references--> `react`  [EXTRACTED]
  src/components/ui/sidebar.tsx → package.json
- `useIsMobile()` --references--> `react`  [EXTRACTED]
  src/hooks/use-mobile.ts → package.json
- `Section()` --calls--> `cn()`  [EXTRACTED]
  src/app/(dashboard)/agents/page.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (65 total, 14 thin omitted)

### Community 0 - "Help Documentation Pages"
Cohesion: 0.10
Nodes (48): AgentCallsHelp(), metadata, ApprovalsHelp(), metadata, ConnectorsHelp(), metadata, ConversationsHelp(), metadata (+40 more)

### Community 1 - "Approvals & Members Pages"
Cohesion: 0.06
Nodes (39): Invitation, Member, agentLabel(), isExpired(), isLive(), isResolved(), NoteCard(), NotesPage() (+31 more)

### Community 2 - "Map & Approvals View"
Cohesion: 0.07
Nodes (36): ApprovalCard(), ResolvedRow(), edgeTypes, MapInner(), nodeTypes, AgentIcon(), timeAgo(), GraphEdge (+28 more)

### Community 3 - "Connectors Dashboard"
Cohesion: 0.06
Nodes (19): AdminInfo, AvailableCard(), BotInfo, CATALOGUE, CatalogueEntry, catalogueFor(), CATEGORIES, CATEGORY_LABEL (+11 more)

### Community 4 - "Tables & Billing Dialogs"
Cohesion: 0.15
Nodes (20): PresetCard(), AutoRechargeDialog(), fmt(), bullets(), ChangePlanDialog(), fmt(), PLAN_NAMES, UpgradeDialogProps (+12 more)

### Community 5 - "Table Detail View"
Cohesion: 0.09
Nodes (20): DraftRow, EditingCell, InlineCellSelect(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel() (+12 more)

### Community 6 - "TypeScript Config & Refs"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 7 - "UI Component Library"
Cohesion: 0.08
Nodes (24): Separator(), SidebarContent(), SidebarContext, SidebarContextProps, SidebarFooter(), SidebarGroup(), SidebarGroupAction(), SidebarGroupContent() (+16 more)

### Community 8 - "Agent Sessions Tab"
Cohesion: 0.12
Nodes (21): MessageRow(), PillGroup(), SessionRow(), SessionsTab(), StatusFilter, TriggerFilter, approxCost(), CONNECTOR_ICON (+13 more)

### Community 9 - "API Client Layer"
Cohesion: 0.09
Nodes (21): AddonPreview, ApiError, ApprovalStatus, BillingCatalog, ConnectorStatus, ConversationAttachment, DataTable, ImportPreview (+13 more)

### Community 10 - "Component Aliases & Icons"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 11 - "Agent Tab Components"
Cohesion: 0.11
Nodes (17): AgentTab(), SaveHint(), Snapshot, SnapshotRow(), TablesToolGroup(), TOOL_TYPES, TriggerEditor(), useAutosave() (+9 more)

### Community 12 - "Templates & Agent Creation"
Cohesion: 0.15
Nodes (14): BUDGETS, CONNECTOR_LABEL, PickTemplate(), Props, SetupAgent(), Step, BrainPicker(), managedBrainId() (+6 more)

### Community 13 - "Agent Detail Page"
Cohesion: 0.14
Nodes (13): AgentDetailPage(), extractSummary(), Tab, TABS, TRIGGER_ICON, TRIGGER_LABEL, FileRow(), formatSize() (+5 more)

### Community 14 - "Plan Settings Page"
Cohesion: 0.15
Nodes (15): formatPrice(), METER_LABEL, PLAN_RANK, PlanBadge(), planBullets(), PlanPageInner(), UsageBar(), AddonDialog() (+7 more)

### Community 15 - "NPM Runtime Dependencies"
Cohesion: 0.12
Nodes (17): axios, @base-ui/react, clsx, lucide-react, next, dependencies, axios, @base-ui/react (+9 more)

### Community 16 - "Dev Dependencies"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 17 - "Auth & Homepage"
Cohesion: 0.16
Nodes (7): SignInCard(), FeedEvent, Hero(), SCENARIOS, MarketingShell(), Navbar(), buttonVariants

### Community 18 - "Agent Cards UI"
Cohesion: 0.13
Nodes (15): HeaderIdentityStrip(), ConnectorIcons(), AgentCard(), extractSummary(), HealthPill(), MiniConnectors(), TRIGGER_ICON, TRIGGER_LABEL (+7 more)

### Community 19 - "Dashboard Home Page"
Cohesion: 0.14
Nodes (10): ActivityChart(), AgentHealthGrid(), DashboardPage(), diff(), greeting(), StatCard(), Trend, weekday() (+2 more)

### Community 20 - "Module Group 20"
Cohesion: 0.22
Nodes (15): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), Table(), TableBody() (+7 more)

### Community 21 - "Module Group 21"
Cohesion: 0.21
Nodes (13): ApprovalsPage(), ConnectorsPageInner(), MembersPage(), NAV_ITEMS, SettingsPageInner(), WorkspaceNameRow(), SkillsPage(), TableDetailPage() (+5 more)

### Community 22 - "Module Group 22"
Cohesion: 0.19
Nodes (11): CHANNEL_LABEL, ConversationsPage(), MessageBubble(), StatusBadge(), timeAgo(), Badge(), badgeVariants, ConversationMessageOut (+3 more)

### Community 23 - "Module Group 23"
Cohesion: 0.15
Nodes (7): toast, ToastAction(), ToastClose(), ToastContent(), ToastDescription(), ToastTitle(), ToastViewport()

### Community 24 - "Module Group 24"
Cohesion: 0.25
Nodes (7): AgentsPage(), Section(), CreateAgentFlow(), UseAgentResult, useAgents(), UseAgentsResult, Agent

### Community 25 - "Module Group 25"
Cohesion: 0.33
Nodes (10): AddColumnDialog(), COLUMN_TYPES, SpreadsheetGrid(), CreateTableDialog(), deriveSlug(), isValidKey(), KEY_RE, KEY_RULE_MSG (+2 more)

### Community 26 - "Module Group 26"
Cohesion: 0.22
Nodes (8): BUDGETS, SETTINGS_DEFAULTS, SettingsTab(), tokensForBudget(), Switch(), AgentSettings, DEFAULT_MEDIA_POLICY, MediaKindPolicy

### Community 27 - "Module Group 27"
Cohesion: 0.18
Nodes (7): Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetTitle()

### Community 28 - "Module Group 28"
Cohesion: 0.20
Nodes (6): AssistantTab(), ChatMessage, CONNECTOR_ICON, ModelSelect(), Connector, connectors

### Community 29 - "Module Group 29"
Cohesion: 0.27
Nodes (7): EntryRow(), formatValue(), MemoryTab(), NewEntryRow(), previewValue(), relTime(), MemoryEntry

### Community 30 - "Module Group 30"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 31 - "Module Group 31"
Cohesion: 0.28
Nodes (5): AppSidebar(), ActiveOrgContext, ActiveOrgContextValue, ActiveOrgProvider(), OrgMembership

### Community 32 - "Module Group 32"
Cohesion: 0.22
Nodes (6): CATEGORIES, CATEGORY_COLORS, CategoryBadge(), Skill, SkillCategory, skills

### Community 33 - "Module Group 33"
Cohesion: 0.22
Nodes (7): NAV_MAIN, NAV_WORKSPACE, NavLink(), THEMES, ThemeSegment(), UserMenu(), approvals

### Community 34 - "Module Group 34"
Cohesion: 0.40
Nodes (5): react, react, SidebarMenuSkeleton(), SidebarProvider(), useIsMobile()

### Community 35 - "Module Group 35"
Cohesion: 0.33
Nodes (3): Preview, State, tokenInvitations

### Community 36 - "Module Group 36"
Cohesion: 0.40
Nodes (3): UseUserResult, auth, CurrentUser

### Community 37 - "Module Group 37"
Cohesion: 0.33
Nodes (6): Sidebar(), SidebarMenuButton(), sidebarMenuButtonVariants, SidebarRail(), SidebarTrigger(), useSidebar()

### Community 38 - "Module Group 38"
Cohesion: 0.40
Nodes (5): Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger()

### Community 39 - "Module Group 39"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 40 - "Module Group 40"
Cohesion: 0.60
Nodes (4): config, proxy(), PUBLIC_PATHS, UNRESTRICTED_PATHS

## Knowledge Gaps
- **179 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+174 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Module Group 20` to `Help Documentation Pages`, `Approvals & Members Pages`, `Map & Approvals View`, `Connectors Dashboard`, `Tables & Billing Dialogs`, `Table Detail View`, `UI Component Library`, `Agent Sessions Tab`, `Agent Tab Components`, `Templates & Agent Creation`, `Agent Detail Page`, `Plan Settings Page`, `Auth & Homepage`, `Agent Cards UI`, `Dashboard Home Page`, `Module Group 21`, `Module Group 22`, `Module Group 23`, `Module Group 24`, `Module Group 25`, `Module Group 26`, `Module Group 27`, `Module Group 28`, `Module Group 29`, `Module Group 31`, `Module Group 32`, `Module Group 33`, `Module Group 34`, `Module Group 36`, `Module Group 37`, `Module Group 38`?**
  _High betweenness centrality (0.456) - this node is a cross-community bridge._
- **Why does `dependencies` connect `NPM Runtime Dependencies` to `Module Group 34`, `Module Group 43`, `Module Group 44`, `Module Group 47`, `Module Group 48`, `Module Group 49`, `Module Group 50`, `Module Group 51`, `Module Group 52`, `Module Group 30`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `react` connect `Module Group 34` to `Module Group 37`, `NPM Runtime Dependencies`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _179 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Help Documentation Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.09778672032193159 - nodes in this community are weakly interconnected._
- **Should `Approvals & Members Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.06429070580013976 - nodes in this community are weakly interconnected._
- **Should `Map & Approvals View` be split into smaller, more focused modules?**
  _Cohesion score 0.07123034227567067 - nodes in this community are weakly interconnected._