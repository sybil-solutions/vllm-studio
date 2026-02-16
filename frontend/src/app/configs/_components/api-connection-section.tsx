// CRITICAL
import { Activity, Check, Eye, EyeOff, Link, Loader2, X } from "lucide-react";
import type { ApiConnectionSettings, ConnectionStatus } from "../hooks/use-configs";

export function ApiConnectionSection({
  apiSettingsLoading,
  apiSettings,
  showApiKey,
  testing,
  saving,
  connectionStatus,
  statusMessage,
  onApiSettingsChange,
  onToggleApiKey,
  onTestConnection,
  onSave,
}: {
  apiSettingsLoading: boolean;
  apiSettings: ApiConnectionSettings;
  showApiKey: boolean;
  testing: boolean;
  saving: boolean;
  connectionStatus: ConnectionStatus;
  statusMessage: string;
  onApiSettingsChange: (nextSettings: ApiConnectionSettings) => void;
  onToggleApiKey: () => void;
  onTestConnection: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="text-xs text-(--dim) uppercase tracking-wider mb-3">API Connection</div>
      <div className="bg-(--surface) rounded-lg p-4 sm:p-6">
        {apiSettingsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Activity className="h-5 w-5 text-(--dim) animate-pulse" />
          </div>
        ) : (
          <div className="space-y-4">
            <ApiField
              label="API URL"
              value={apiSettings.backendUrl}
              placeholder="https://api.example.com"
              onChange={(backendUrl) => onApiSettingsChange({ ...apiSettings, backendUrl })}
            />

            <ApiKeyField
              apiKey={apiSettings.apiKey}
              hasApiKey={apiSettings.hasApiKey}
              showApiKey={showApiKey}
              onToggle={onToggleApiKey}
              onChange={(apiKey) => onApiSettingsChange({ ...apiSettings, apiKey })}
            />

            <ApiField
              label="Voice URL"
              value={apiSettings.voiceUrl}
              placeholder="https://voice.example.com"
              onChange={(voiceUrl) => onApiSettingsChange({ ...apiSettings, voiceUrl })}
            />

            <ApiField
              label="Voice Model"
              value={apiSettings.voiceModel}
              placeholder="whisper-large-v3-turbo"
              onChange={(voiceModel) => onApiSettingsChange({ ...apiSettings, voiceModel })}
            />

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={onTestConnection}
                  disabled={testing}
                  className="px-3 py-1.5 bg-(--border) rounded-lg text-xs text-(--fg) hover:bg-(--surface) disabled:opacity-50 flex items-center gap-1.5"
                >
                  {testing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Link className="h-3 w-3" />
                  )}
                  Test
                </button>
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="px-3 py-1.5 bg-(--hl1) rounded-lg text-xs text-(--fg) hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  Save
                </button>
              </div>
              {statusMessage && <ApiStatus status={connectionStatus} message={statusMessage} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ApiField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-(--dim) mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-(--surface) border border-(--border) rounded-lg text-sm text-(--fg) placeholder-(--dim)/50 focus:outline-none focus:border-(--hl1)"
      />
    </div>
  );
}

function ApiKeyField({
  apiKey,
  hasApiKey,
  showApiKey,
  onToggle,
  onChange,
}: {
  apiKey: string;
  hasApiKey: boolean;
  showApiKey: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-(--dim) mb-1.5">API Key</label>
      <div className="relative">
        <input
          type={showApiKey ? "text" : "password"}
          value={apiKey}
          onChange={(event) => onChange(event.target.value)}
          placeholder={hasApiKey ? "••••••••" : "Optional"}
          className="w-full px-3 py-2 pr-10 bg-(--surface) border border-(--border) rounded-lg text-sm text-(--fg) placeholder-(--dim)/50 focus:outline-none focus:border-(--hl1)"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-(--dim) hover:text-(--fg)"
        >
          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function ApiStatus({
  status,
  message,
}: {
  status: ConnectionStatus;
  message: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${
        status === "connected"
          ? "text-(--hl2)"
          : status === "error"
            ? "text-(--err)"
            : "text-(--dim)"
      }`}
    >
      {status === "connected" && <div className="w-2 h-2 rounded-full bg-(--hl2)" />}
      {status === "error" && <X className="h-3 w-3" />}
      {message}
    </div>
  );
}

