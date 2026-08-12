import logo from "@/assets/resume-rocket-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt="Resume Rocket — AI Resume Builder"
      width={1024}
      height={538}
      className={cn("h-8 w-auto object-contain sm:h-9", className)}
    />
  );
}
