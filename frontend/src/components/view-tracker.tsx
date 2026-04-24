"use client";

import { useEffect } from "react";

interface ViewTrackerProps {
  articleId: string;
}

export function ViewTracker({ articleId }: ViewTrackerProps) {
  useEffect(() => {
    fetch(`/api/articles/${articleId}/view`, { method: "POST" }).catch(
      () => {},
    );
  }, [articleId]);

  return null;
}
