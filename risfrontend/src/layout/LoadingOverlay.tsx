import * as React from "react";
import { cn } from "../lib/utils";

interface LoadingOverlayProps {
  message?: string;
  fullscreen?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = "Loading...",
  fullscreen = true,
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-white/80 z-50",
        fullscreen ? "fixed inset-0" : "absolute inset-0"
      )}
    >
      <div className="flex flex-col items-center space-y-2">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
        <p className="text-sm text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;

