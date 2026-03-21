import { useState, useEffect } from "react";

export const useHeadphoneDetection = () => {
  const [headphonesConnected, setHeadphonesConnected] = useState(false);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    const checkDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasHeadphones = devices.some(
          (d) =>
            d.kind === "audiooutput" &&
            (d.label.toLowerCase().includes("headphone") ||
              d.label.toLowerCase().includes("kopfhörer") ||
              d.label.toLowerCase().includes("airpod") ||
              d.label.toLowerCase().includes("earphone") ||
              d.label.toLowerCase().includes("bluetooth") ||
              d.label.toLowerCase().includes("wireless") ||
              d.label.toLowerCase().includes("buds"))
        );
        setHeadphonesConnected(hasHeadphones);
      } catch {
        setHeadphonesConnected(false);
      }
    };

    checkDevices();
    navigator.mediaDevices.addEventListener("devicechange", checkDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", checkDevices);
  }, []);

  return headphonesConnected;
};
