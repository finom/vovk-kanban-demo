import { useEffect, useRef, useState } from "react";
import { DatabasePollRPC } from "vovk-client";

/**
 * Hook to manage database polling state.
 * @example const [isPollingEnabled, setIsPollingEnabled] = useDatabasePolling(false);
 */
export default function useDatabasePolling(initialValue = false) {
  const MAX_RETRIES = 5;
  const [isPollingEnabled, setIsPollingEnabled] = useState(initialValue);
  const abortRef = useRef<() => void | null>(null);

  useEffect(() => {
    const isEnabled = localStorage.getItem("isPollingEnabled");
    setIsPollingEnabled(isEnabled === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("isPollingEnabled", isPollingEnabled.toString());
    async function poll(retries = 0) {
      if (!isPollingEnabled) {
        abortRef.current?.();
        return;
      }
      try {
        while (true) {
          console.log("Polling database for updates...");
          const iterable = await DatabasePollRPC.poll();
          abortRef.current = iterable.abortWithoutError;

          for await (const iteration of iterable) {
            console.log("New DB update:", iteration);
          }

          if (iterable.abortController.signal.aborted) {
            console.log("Polling aborted with abortWithoutError");
            break;
          }
        }
      } catch (error) {
        if (retries < MAX_RETRIES) {
          console.error("Polling failed, retrying...", error);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return poll(retries + 1);
        } else {
          console.error(
            "Max polling retries reached. Stopping polling.",
            error,
          );
        }
      }
    }

    void poll();

    return () => {
      abortRef.current?.();
    };
  }, [isPollingEnabled]);

  return [isPollingEnabled, setIsPollingEnabled] as const;
}
