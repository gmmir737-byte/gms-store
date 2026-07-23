import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import {
  StoreSettings,
  defaultStoreSettings,
} from "../types/settings";
interface SettingsContextType {
  settings: StoreSettings;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function SettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [settings, setSettings] =
    useState<StoreSettings>(defaultStoreSettings);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const refreshSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
  .from("settings")
  .select("*")
  .single();

if (error) throw error;

console.log("SETTINGS FROM SUPABASE:", data);

setSettings({
  ...defaultStoreSettings,
  ...data,
});
    } catch (err: any) {
      console.error("Failed to load store settings:", err);

      setError(err.message ?? "Failed to load settings");

      setSettings(defaultStoreSettings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        error,
        refreshSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error(
      "useSettings must be used inside SettingsProvider"
    );
  }

  return context;
}