// CRITICAL
import type { ConfigData } from "@/lib/types";
import type { ApiConnectionSettings, ConnectionStatus } from "../hooks/use-configs";
import { ApiConnectionSection } from "./api-connection-section";
import { ConfigCards } from "./config-cards";
import { ConfigsHeader } from "./configs-header";
import { ConnectionFlow } from "./connection-flow";
import { NoBackendState } from "./no-backend-state";
import { ServiceTopology } from "./service-topology";

interface ConfigsViewProps {
  data: ConfigData | null;
  loading: boolean;
  error: string | null;
  apiSettings: ApiConnectionSettings;
  apiSettingsLoading: boolean;
  showApiKey: boolean;
  saving: boolean;
  testing: boolean;
  connectionStatus: ConnectionStatus;
  statusMessage: string;
  hasConfigData: boolean;
  isInitialLoading: boolean;
  onReload: () => void;
  onApiSettingsChange: (nextSettings: ApiConnectionSettings) => void;
  onToggleApiKey: () => void;
  onTestConnection: () => void;
  onSaveSettings: () => void;
}

export function ConfigsView({
  data,
  loading,
  error,
  apiSettings,
  apiSettingsLoading,
  showApiKey,
  saving,
  testing,
  connectionStatus,
  statusMessage,
  hasConfigData,
  isInitialLoading,
  onReload,
  onApiSettingsChange,
  onToggleApiKey,
  onTestConnection,
  onSaveSettings,
}: ConfigsViewProps) {
  return (
    <div className="min-h-full overflow-y-auto overflow-x-hidden bg-[#1b1b1b] text-[#f0ebe3]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 w-full">
        <ConfigsHeader loading={loading} onReload={onReload} />

        <ApiConnectionSection
          apiSettingsLoading={apiSettingsLoading}
          apiSettings={apiSettings}
          showApiKey={showApiKey}
          testing={testing}
          saving={saving}
          connectionStatus={connectionStatus}
          statusMessage={statusMessage}
          onApiSettingsChange={onApiSettingsChange}
          onToggleApiKey={onToggleApiKey}
          onTestConnection={onTestConnection}
          onSave={onSaveSettings}
        />

        {!hasConfigData && (
          <NoBackendState
            error={error}
            isInitialLoading={isInitialLoading}
            loading={loading}
            onRetry={onReload}
          />
        )}

        {data && (
          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <ServiceTopology services={data.services} />
              <ConnectionFlow />
            </div>
            <ConfigCards data={data} />
          </div>
        )}
      </div>
    </div>
  );
}

