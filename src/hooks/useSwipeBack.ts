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
    // Only trigger from left edge (first 30px)
    if (touch.clientX <= 30) {
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      swiping.current = true;
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swiping.current) return;
    swiping.current = false;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX.current;
    const dy = Math.abs(touch.clientY - touchStartY.current);

    // Swipe right from left edge, more horizontal than vertical
    if (dx > threshold && dy < dx * 0.5) {
      navigate(fallbackPath);
    }
  }, [navigate, threshold, fallbackPath]);

  return { onTouchStart, onTouchEnd };
}
