import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  CalendarClock,
  Globe2,
  LayoutDashboard,
  Newspaper,
  NotebookPen,
  Send,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Executive Daily Brief", url: "/daily", icon: Newspaper },
  { title: "Stakeholder Comms", url: "/comms", icon: Send },
  { title: "Executive Briefing", url: "/briefing", icon: NotebookPen },
  { title: "Strategic Planner", url: "/planner", icon: CalendarClock },
  { title: "Market & Competitor Briefs", url: "/briefs", icon: Globe2 },
] as const;

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({
    select: (router) => router.location.pathname,
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          to="/"
          className="flex items-center gap-2.5 px-2 py-2"
          onClick={() => isMobile && setOpenMobile(false)}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Activity className="h-4 w-4" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-bold tracking-tight text-sidebar-foreground">
                ExecPulse AI
              </span>
              <span className="block truncate text-[10px] uppercase tracking-widest text-sidebar-foreground/60">
                CEO Productivity Suite
              </span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Executive Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === item.url}
                    tooltip={item.title}
                  >
                    <Link
                      to={item.url}
                      onClick={() => isMobile && setOpenMobile(false)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border pb-12">
        {!collapsed && (
          <p className="px-2 py-1.5 text-[10px] leading-relaxed text-sidebar-foreground/50">
            Executive drafts, briefings, and plans — always review before
            sending.
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
