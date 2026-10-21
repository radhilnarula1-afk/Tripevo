"use client";

import { useEffect, useState } from "react";

export function AgentationWrapper() {
  const [isMounted, setIsMounted] = useState(false);
  const [AgentationComponent, setAgentationComponent] = useState<any>(null);

  useEffect(() => {
    console.log("[AgentationWrapper] Mounted. NODE_ENV:", process.env.NODE_ENV);
    
    // Only load and render Agentation in development environment
    if (process.env.NODE_ENV === "development") {
      console.log("[AgentationWrapper] Attempting to dynamically import 'agentation'...");
      import("agentation")
        .then((mod) => {
          console.log("[AgentationWrapper] Successfully imported module:", mod);
          if (mod && mod.Agentation) {
            setAgentationComponent(() => mod.Agentation);
            setIsMounted(true);
          } else {
            console.warn("[AgentationWrapper] 'Agentation' component not found in module exports:", mod);
          }
        })
        .catch((err) => {
          console.error("[AgentationWrapper] Failed to load agentation package:", err);
        });
    } else {
      console.log("[AgentationWrapper] Skipping import because NODE_ENV is not 'development'");
    }
  }, []);

  if (!isMounted || !AgentationComponent) {
    return null;
  }

  const Component = AgentationComponent;
  return <Component />;
}
