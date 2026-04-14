import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Smart back navigation: uses browser history if available,
 * otherwise falls back to a logical parent route.
 * Also provides swipe-back touch handlers (right-edge swipe left).
 */
export function useSmartBack(fallbackPath = "/chats") {
  const navigate = useNavigate();

  const goBack = useCallback(() => {
    // window.history.length > 2 means there's a real previous page
    // (1 = initial blank, 2 = first navigation)
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallbackPath, { replace: true });
    }
  }, [navigate, fallbackPath]);

  // Swipe-back from right edge (right→left gesture)
  const touchRef = { startX: 0, startY: 0, active: false };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch.clientX >= window.innerWidth - 30) {
      touchRef.startX = touch.clientX;
      touchRef.startY = touch.clientY;
      touchRef.active = true;
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.active) return;
    touchRef.active = false;
    const touch = e.changedTouches[0];
    const dx = touchRef.startX - touch.clientX;
    const dy = Math.abs(touch.clientY - touchRef.startY);
    if (dx > 80 && dy < dx * 0.5) {
      goBack();
    }
  }, [goBack]);

  return { goBack, swipeHandlers: { onTouchStart, onTouchEnd } };
}
