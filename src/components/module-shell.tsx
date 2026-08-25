import type { ReactNode } from "react";
import {
  AlertTriangle,
  Copy,
  FlaskConical,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AiSource } from "@/lib/exec-types";

export function ModulePageHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex min-w-0 items-start gap-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function GenerateButton({
  loading,
  disabled,
  onClick,
  label,
}: {
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full sm:w-auto"
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating…
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}

export function OutputActions({
  source,
  editing,
  onToggleEdit,
  onRegenerate,
  copyText,
  loading,
}: {
  source: AiSource;
  editing?: boolean;
  onToggleEdit?: () => void;
  onRegenerate: () => void;
  copyText: () => string;
  loading: boolean;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyText());
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed — select and copy manually.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {source === "mock" && (
        <Badge variant="secondary" className="gap-1">
          <FlaskConical className="h-3 w-3" />
          Demo data
        </Badge>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={copy}>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </Button>
        {onToggleEdit && (
          <Button variant="outline" size="sm" onClick={onToggleEdit}>
            {editing ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
            {editing ? "Done" : "Edit"}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={loading}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Regenerate
        </Button>
      </div>
    </div>
  );
}

export function OutputEmptyState({ message }: { message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-muted">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
        </span>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

export function OutputLoadingState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="space-y-4 py-8">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {label}
        </div>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}

export function OutputError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="border-destructive/40">
      <CardContent className="flex flex-col items-start gap-3 py-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Generation failed
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

export function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 py-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold tracking-tight text-foreground">
            {title}
          </h3>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
