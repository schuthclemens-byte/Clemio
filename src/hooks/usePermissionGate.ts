import { useState, useCallback, useEffect } from "react";

type PermissionName = "microphone" | "camera";

const SEEN_KEY_PREFIX = "clemix_permission_seen_";

/**
 * Hook that gates a browser permission request behind a pre-permission dialog.
 * Returns whether to show the dialog, and functions to proceed or cancel.
 *
 * On first use → shows custom dialog, then requests real permission.
 * On subsequent uses → if permission is "granted", skips dialog.
 * If permission is "denied" → signals denied state for fallback UI.
 */
export const usePermissionGate = (permissionName: PermissionName) => {
  const [showDialog, setShowDialog] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState | "unknown">("unknown");
  const [onProceed, setOnProceed] = useState<(() => void) | null>(null);

  // Check current permission state
  useEffect(() => {
    if (!navigator.permissions) return;

    const name = permissionName === "microphone" ? "microphone" : "camera";
    navigator.permissions
      .query({ name: name as PermissionName })
      .then((result) => {
        setPermissionState(result.state);
        result.addEventListener("change", () => {
          setPermissionState(result.state);
        });
      })
      .catch(() => {
        // Safari doesn't support querying mic/camera permissions
        setPermissionState("unknown");
      });
  }, [permissionName]);

  /**
   * Call this instead of directly requesting getUserMedia.
   * If permission is already granted, calls `proceed` immediately.
   * If not, shows the pre-permission dialog first.
   */
  const gate = useCallback(
    (proceed: () => void) => {
      // Already granted → skip dialog
      if (permissionState === "granted") {
        proceed();
        return;
      }

      // Denied → still try (browser may show settings hint)
      if (permissionState === "denied") {
        proceed();
        return;
      }

      // First time or unknown → check if user already saw dialog this session
      const seenKey = SEEN_KEY_PREFIX + permissionName;
      if (sessionStorage.getItem(seenKey) === "true") {
        proceed();
        return;
      }

      // Show pre-permission dialog
      setOnProceed(() => proceed);
      setShowDialog(true);
    },
    [permissionState, permissionName]
  );

  const handleAllow = useCallback(() => {
    const seenKey = SEEN_KEY_PREFIX + permissionName;
    sessionStorage.setItem(seenKey, "true");
    setShowDialog(false);
    onProceed?.();
    setOnProceed(null);
  }, [onProceed, permissionName]);

  const handleCancel = useCallback(() => {
    setShowDialog(false);
    setOnProceed(null);
  }, []);

  return {
    showDialog,
    permissionState,
    gate,
    handleAllow,
    handleCancel,
    isDenied: permissionState === "denied",
  };
};
