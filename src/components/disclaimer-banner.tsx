import { ShieldCheck } from "lucide-react";

export function DisclaimerBanner() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-primary/20 bg-primary text-primary-foreground shadow-[0_-4px_20px_-8px_hsl(224_50%_20%/0.4)]">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2.5 px-4 py-2.5 text-center">
        <ShieldCheck className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        <p className="text-[11px] leading-snug sm:text-xs">
          <span className="font-semibold">Responsible AI:</span> AI-generated
          outputs are intended as executive drafts. Please review for
          sensitivity, accuracy, and strategic alignment before sending to
          stakeholders.
        </p>
      </div>
    </div>
  );
}
