import { useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface UseSwipeBackOptions {
  threshold?: number;
  fallbackPath?: string;
}

export function useSwipeBack({ threshold = 80, fallbackPath = "/chats" }: UseSwipeBackOptions = {}) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swiping = useRef(false);
  const navigate = useNavigate();

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    // Trigger from left edge (first 25px)
    if (touch.clientX <= 25) {
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      swiping.current = true;
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swiping.current) return;
    swiping.current = false;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX.current; // left→right = positive
    const dy = Math.abs(touch.clientY - touchStartY.current);

    if (dx > threshold && dy < dx * 0.5) {
      if (window.history.length > 2) {
        navigate(-1);
      } else {
        navigate(fallbackPath);
      }
    }
  }, [navigate, threshold, fallbackPath]);

  return { onTouchStart, onTouchEnd };
}
