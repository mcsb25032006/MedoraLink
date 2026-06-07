"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

type AnimatedProgressProps = {
  value: number; // 0-100
  className?: string;
  height?: number; // px
  rounded?: string; // tailwind rounded classes
  colorClassName?: string; // e.g., "bg-primary"
};

export function AnimatedProgress({
  value,
  className,
  height = 10,
  rounded = "rounded-full",
  colorClassName = "bg-primary",
}: AnimatedProgressProps) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

  return (
    <div
      className={clsx(
        "relative w-full max-w-md bg-gray-200/80 overflow-hidden",
        rounded,
        className
      )}
      style={{ height }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${safe}%` }}
        transition={{ type: "spring", stiffness: 140, damping: 18 }}
        className={clsx("h-full", colorClassName, rounded)}
      />
    </div>
  );
}
