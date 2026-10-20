import { useCallback, useState } from "react";
import { readCostSettings, type CostSettings } from "../utils/costSettings";

/**
 * Parámetros de coste configurables desde `SettingsModal`.
 *
 * Limitación conocida: viven en `localStorage`, así que son por dispositivo y
 * no por empresa. Persistirlos en BD queda pendiente.
 */
export function useCostSettings() {
  const [costs, setCosts] = useState<CostSettings>(readCostSettings);

  const reloadCosts = useCallback(() => {
    setCosts(readCostSettings());
  }, []);

  return { ...costs, reloadCosts };
}
