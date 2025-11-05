import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Mindefender Logo Component
 * 
 * Brand Guidelines:
 * - Icon minimum size: 24px
 * - Lockup minimum width: 140px
 * - Clear space: icon width / 2 around the logo
 * - Never alter the gradient colors
 * - Never distort aspect ratio
 * 
 * Gradient: #00F0FF (cyan) → #0066FF (blue)
 */

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Logo variant
   * - icon: Just the shield with M
   * - lockup: Icon + Mindefender text
   */
  variant?: "icon" | "lockup";
  /**
   * Size preset
   * - sm: icon=24px, lockup=140px
   * - md: icon=32px, lockup=180px
   * - lg: icon=48px, lockup=260px
   * - xl: icon=64px, lockup=340px
   */
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  icon: {
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64,
  },
  lockup: {
    sm: 140,
    md: 180,
    lg: 260,
    xl: 340,
  },
};

const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({ variant = "lockup", size = "md", className, ...props }, ref) => {
    const iconSize = sizeMap.icon[size];
    const lockupWidth = sizeMap.lockup[size];
    const clearSpace = iconSize / 2;

    if (variant === "icon") {
      return (
        <div
          ref={ref}
          className={cn("inline-flex items-center justify-center", className)}
          style={{
            minWidth: iconSize,
            minHeight: iconSize,
            padding: clearSpace,
          }}
          {...props}
        >
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Mindefender"
            role="img"
            style={{ flexShrink: 0 }}
          >
            <defs>
              <linearGradient
                id="mindefender-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#00F0FF" />
                <stop offset="100%" stopColor="#0066FF" />
              </linearGradient>
            </defs>
            {/* Shield shape */}
            <path
              d="M50 5 L85 20 L85 50 Q85 80, 50 95 Q15 80, 15 50 L15 20 Z"
              fill="url(#mindefender-gradient)"
            />
            {/* M letter */}
            <path
              d="M32 35 L32 65 L38 65 L38 48 L50 60 L62 48 L62 65 L68 65 L68 35 L62 35 L50 50 L38 35 Z"
              fill="white"
            />
          </svg>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn("inline-flex items-center gap-3", className)}
        style={{
          minWidth: lockupWidth,
          padding: clearSpace,
        }}
        {...props}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <defs>
            <linearGradient
              id="mindefender-gradient-lockup"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="100%" stopColor="#0066FF" />
            </linearGradient>
          </defs>
          {/* Shield shape */}
          <path
            d="M50 5 L85 20 L85 50 Q85 80, 50 95 Q15 80, 15 50 L15 20 Z"
            fill="url(#mindefender-gradient-lockup)"
          />
          {/* M letter */}
          <path
            d="M32 35 L32 65 L38 65 L38 48 L50 60 L62 48 L62 65 L68 65 L68 35 L62 35 L50 50 L38 35 Z"
            fill="white"
          />
        </svg>
        <span
          className="text-gradient-primary font-semibold tracking-tight"
          style={{
            fontSize: iconSize * 0.5,
            lineHeight: 1,
          }}
        >
          Mindefender
        </span>
      </div>
    );
  }
);

Logo.displayName = "Logo";

export { Logo };
