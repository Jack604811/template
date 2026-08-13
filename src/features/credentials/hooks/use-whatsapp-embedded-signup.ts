import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCompleteWhatsAppEmbeddedSignup } from "./use-credentials";

const SDK_SRC = "https://connect.facebook.net/en_US/sdk.js";
const GRAPH_API_VERSION = "v25.0";

declare global {
  interface Window {
    FB?: {
      init: (params: {
        appId: string;
        autoLogAppEvents?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: { code?: string };
          status?: string;
        }) => void,
        params: {
          config_id: string;
          response_type: "code";
          override_default_response_type: true;
          extras?: {
            version?: string;
            setup?: Record<string, unknown>;
            featureType?: string;
            sessionInfoVersion?: string;
          };
        },
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

let sdkPromise: Promise<void> | null = null;

function loadFacebookSdk(appId: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Facebook SDK can only be loaded in the browser"));
  }
  if (window.FB) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        autoLogAppEvents: true,
        xfbml: false,
        version: GRAPH_API_VERSION,
      });
      resolve();
    };

    const existing = document.getElementById("facebook-jssdk");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = SDK_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => reject(new Error("Failed to load the Facebook SDK"));
    document.body.appendChild(script);
  });

  return sdkPromise;
}

interface WhatsAppSessionInfo {
  phoneNumberId?: string;
  wabaId?: string;
  /**
   * True when the customer connected an existing WhatsApp Business app account
   * ("Coexistence") instead of a fresh Cloud API number. The phone number is already
   * registered in that case, so the register step must be skipped, and Meta's payload
   * may omit phone_number_id entirely (only the server-side phone lookup can recover it).
   */
  isCoexistence?: boolean;
}

const FINISH_EVENTS = new Set([
  "FINISH",
  "FINISH_ONLY_WABA",
  "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
]);

function listenForSessionInfo(): {
  promise: Promise<WhatsAppSessionInfo>;
  cleanup: () => void;
} {
  let handler: (event: MessageEvent) => void = () => undefined;

  const promise = new Promise<WhatsAppSessionInfo>((resolve) => {
    handler = (event: MessageEvent) => {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }
      try {
        const data = JSON.parse(event.data);
        if (data.type !== "WA_EMBEDDED_SIGNUP") return;
        if (FINISH_EVENTS.has(data.event)) {
          resolve({
            phoneNumberId: data.data?.phone_number_id,
            wabaId: data.data?.waba_id,
            isCoexistence: data.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
          });
        }
      } catch {
        // Ignore messages that aren't JSON (e.g. other FB postMessages).
      }
    };
    window.addEventListener("message", handler);
  });

  return {
    promise,
    cleanup: () => window.removeEventListener("message", handler),
  };
}

interface LaunchOptions {
  /** Pass the existing credential id to re-authorize instead of creating a new one. */
  existingCredentialId?: string;
  /**
   * Set to true to also offer connecting an existing WhatsApp Business app account
   * ("Coexistence") alongside the default fresh-number flow. Off by default — per
   * Meta's docs this requires "intentional customization" and is not standard behavior.
   */
  coexistence?: boolean;
}

/**
 * Drives the WhatsApp Embedded Signup popup end to end: loads the Facebook JS SDK,
 * opens FB.login with the Embedded Signup config, captures the WABA/phone number ids
 * from the WA_EMBEDDED_SIGNUP postMessage, and exchanges the resulting code for a
 * connected WHATSAPP credential.
 */
export const useWhatsAppEmbeddedSignup = (
  onConnected: (credential: { id: string; name: string }) => void,
) => {
  const [isLoading, setIsLoading] = useState(false);
  const completeSignup = useCompleteWhatsAppEmbeddedSignup();

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID;
  const isConfigured = Boolean(appId && configId);

  // Preload the SDK as soon as this hook mounts, not on click. FB.login() opens a
  // popup via window.open(), which browsers only allow when triggered synchronously
  // from a user gesture — an `await loadFacebookSdk()` right before it breaks that
  // chain and Meta silently falls back to a plain top-level login page instead of
  // the real Embedded Signup popup.
  useEffect(() => {
    if (appId) loadFacebookSdk(appId).catch(() => undefined);
  }, [appId]);

  const launch = async (options: LaunchOptions = {}) => {
    if (!appId || !configId) return;
    if (!window.FB) {
      toast.error(
        "La conexión con Meta todavía se está preparando, intenta de nuevo en unos segundos.",
      );
      loadFacebookSdk(appId).catch(() => undefined);
      return;
    }
    setIsLoading(true);
    const { promise: sessionInfoPromise, cleanup } = listenForSessionInfo();

    try {
      const authResponse = await new Promise<{ code?: string }>(
        (resolve, reject) => {
          window.FB?.login(
            (response) => {
              if (response.authResponse?.code) {
                resolve(response.authResponse);
              } else {
                reject(
                  new Error("El proceso de conexión con Meta fue cancelado."),
                );
              }
            },
            {
              config_id: configId,
              response_type: "code",
              override_default_response_type: true,
              extras: {
                version: "v4",
                sessionInfoVersion: "3",
                ...(options.coexistence
                  ? { featureType: "whatsapp_business_app_onboarding" }
                  : {}),
              },
            },
          );
        },
      );

      // The auth code above arrives as soon as basic consent is granted, but the
      // multi-step business/WABA/phone-number wizard keeps running in the same popup
      // for minutes afterward — give it realistic human-paced time to finish.
      const sessionInfo = await Promise.race([
        sessionInfoPromise,
        new Promise<WhatsAppSessionInfo>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "No se recibió la información de la cuenta de WhatsApp a tiempo. Completa todos los pasos en la ventana emergente (selección de WABA, número de teléfono y verificación) antes de que se cierre.",
                ),
              ),
            10 * 60 * 1000,
          ),
        ),
      ]);

      // Coexistence (connecting an existing WhatsApp Business app account) may omit
      // phone_number_id from the postMessage — the server looks it up via the WABA instead.
      if (
        !authResponse.code ||
        !sessionInfo.wabaId ||
        (!sessionInfo.phoneNumberId && !sessionInfo.isCoexistence)
      ) {
        throw new Error(
          "Meta no devolvió todos los datos necesarios para completar la conexión.",
        );
      }

      const credential = await completeSignup.mutateAsync({
        id: options.existingCredentialId,
        code: authResponse.code,
        wabaId: sessionInfo.wabaId,
        phoneNumberId: sessionInfo.phoneNumberId,
        skipPhoneRegistration: sessionInfo.isCoexistence,
      });

      toast.success(`WhatsApp conectado: ${credential.name}`);
      onConnected(credential);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo completar la conexión con WhatsApp.",
      );
    } finally {
      cleanup();
      setIsLoading(false);
    }
  };

  return { launch, isLoading, isConfigured };
};
