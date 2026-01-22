import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { ArrowLeft, Settings as SettingsIcon, Cloud, TestTube, Save, Check, X, Clock, HardDrive } from "lucide-react"

interface BackupSettings {
  interval_hours: number
  backup_on_new_item: boolean
  local_backup_enabled: boolean
  s3_enabled: boolean
  s3_bucket_name: string
  s3_access_key: string
  s3_secret_key: string
  s3_region: string
  s3_endpoint: string
  last_backup_at: string | null
  last_item_count: number
}

interface BackupLog {
  id: string
  status: string
  message: string
  items_backed_up: number
  files_backed_up: number
  created_at: string
}

const INTERVAL_OPTIONS = [
  { value: 1, label: "Every hour" },
  { value: 6, label: "Every 6 hours" },
  { value: 12, label: "Every 12 hours" },
  { value: 24, label: "Daily" },
  { value: 168, label: "Weekly" },
  { value: 720, label: "Monthly" },
]

export function SettingsPage() {
  const queryClient = useQueryClient()
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch backup settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["backup-settings"],
    queryFn: async () => {
      const response = await api.get("/backup/settings/")
      return response.data.data.settings as BackupSettings
    },
  })

  // Fetch backup logs
  const { data: logsData } = useQuery({
    queryKey: ["backup-logs"],
    queryFn: async () => {
      const response = await api.get("/backup/logs/")
      return response.data.data.logs as BackupLog[]
    },
  })

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<BackupSettings>) => {
      const response = await api.put("/backup/settings/", settings)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-settings"] })
      setHasChanges(false)
    },
  })

  // Manual backup mutation
  const manualBackup = useMutation({
    mutationFn: async () => {
      const response = await api.post("/backup/manual/")
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-settings"] })
      queryClient.invalidateQueries({ queryKey: ["backup-logs"] })
    },
  })

  // Test S3 connection mutation
  const testS3 = useMutation({
    mutationFn: async (testSettings?: Partial<BackupSettings>) => {
      const response = await api.post("/backup/test-s3/", {
        s3_bucket_name: testSettings?.s3_bucket_name || settings.s3_bucket_name,
        s3_access_key: testSettings?.s3_access_key || settings.s3_access_key,
        s3_secret_key: testSettings?.s3_secret_key || settings.s3_secret_key,
        s3_region: testSettings?.s3_region || settings.s3_region,
        s3_endpoint: testSettings?.s3_endpoint || settings.s3_endpoint,
      })
      return response.data
    },
  })

  const [settings, setSettings] = useState<Partial<BackupSettings>>({})

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData)
    }
  }, [settingsData])

  const handleSaveSettings = () => {
    updateSettings.mutate(settings)
  }

  const handleTestConnection = () => {
    testS3.mutate()
  }

  const handleSaveS3Settings = () => {
    updateSettings.mutate(settings)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never"
    return new Date(dateStr).toLocaleString()
  }

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">Settings</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage your backup preferences</p>
        </div>
      </div>

      {/* Backup Settings */}
      <div className="card mb-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-white">Backup Configuration</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Configure automatic backups to S3 storage</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Schedule */}
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              <Clock className="mr-1 inline h-4 w-4" />
              Backup Schedule
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {INTERVAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSettings({ ...settings, interval_hours: option.value })
                    setHasChanges(true)
                  }}
                  className={`
                    rounded-lg px-3 py-2 text-sm transition-colors
                    ${settings.interval_hours === option.value
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20"
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Backup on new item */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-white/5">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Only backup if new items added</span>
              <p className="text-xs text-gray-500 mt-1">Skip backup if no new items since last backup</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSettings({ ...settings, backup_on_new_item: !settings.backup_on_new_item })
                setHasChanges(true)
              }}
              className={`
                relative h-6 w-11 flex-shrink-0 rounded-full transition-colors
                ${settings.backup_on_new_item ? "bg-black dark:bg-white" : "bg-gray-300 dark:bg-gray-600"}
              `}
            >
              <span
                className={`
                  absolute top-0.5 left-0 h-5 w-5 rounded-full shadow-sm transition-all
                  ${settings.backup_on_new_item
                    ? "bg-neutral-900 translate-x-5"
                    : "bg-white translate-x-1"
                  }
                `}
              />
            </button>
          </div>

          {/* Local backup toggle */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-white/5">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                <HardDrive className="mr-1 inline h-4 w-4" />
                Local Backup
              </span>
              <p className="text-xs text-gray-500 mt-1">Save backups to server directory (last 6 kept)</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSettings({ ...settings, local_backup_enabled: !settings.local_backup_enabled })
                setHasChanges(true)
              }}
              className={`
                relative h-6 w-11 flex-shrink-0 rounded-full transition-colors
                ${settings.local_backup_enabled ? "bg-black dark:bg-white" : "bg-gray-300 dark:bg-gray-600"}
              `}
            >
              <span
                className={`
                  absolute top-0.5 left-0 h-5 w-5 rounded-full shadow-sm transition-all
                  ${settings.local_backup_enabled
                    ? "bg-neutral-900 translate-x-5"
                    : "bg-white translate-x-1"
                  }
                `}
              />
            </button>
          </div>

          {/* Last backup info */}
          {settingsData && (
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-white/5">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Last backup: <span className="font-medium">{formatDate(settingsData.last_backup_at)}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {settingsData.last_item_count} items backed up
              </p>
            </div>
          )}
        </div>

        {hasChanges && (
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => {
                setSettings(settingsData || {})
                setHasChanges(false)
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={updateSettings.isPending}
              className="btn-primary"
            >
              {updateSettings.isPending ? "Saving..." : <><Save className="mr-1 h-4 w-4 inline" /> Save</>}
            </button>
          </div>
        )}
      </div>

      {/* S3 Settings */}
      <div className="card mb-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-white">S3 Storage</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Configure your S3-compatible storage</p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable S3 Backup</span>
          <button
            type="button"
            onClick={() => {
              setSettings({ ...settings, s3_enabled: !settings.s3_enabled })
              setHasChanges(true)
            }}
            className={`
              relative h-6 w-11 flex-shrink-0 rounded-full transition-colors
              ${settings.s3_enabled ? "bg-black dark:bg-white" : "bg-gray-300 dark:bg-gray-600"}
            `}
          >
            <span
              className={`
                absolute top-0.5 left-0 h-5 w-5 rounded-full shadow-sm transition-all
                ${settings.s3_enabled
                  ? "bg-neutral-900 translate-x-5"
                  : "bg-white translate-x-1"
                }
              `}
            />
          </button>
        </div>

        {settings.s3_enabled && (
          <div className="space-y-4">
            <div>
              <label htmlFor="bucket" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bucket Name
              </label>
              <input
                id="bucket"
                type="text"
                value={settings.s3_bucket_name || ""}
                onChange={(e) => {
                  setSettings({ ...settings, s3_bucket_name: e.target.value })
                }}
                className="input"
                placeholder="my-backup-bucket"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="access-key" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Access Key
                </label>
                <input
                  id="access-key"
                  type="text"
                  value={settings.s3_access_key || ""}
                  onChange={(e) => {
                    setSettings({ ...settings, s3_access_key: e.target.value })
                  }}
                  className="input"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                />
              </div>

              <div>
                <label htmlFor="secret-key" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Secret Key
                </label>
                <div className="relative">
                  <input
                    id="secret-key"
                    type="password"
                    value={settings.s3_secret_key === "********" ? "" : settings.s3_secret_key || ""}
                    onChange={(e) => {
                      setSettings({ ...settings, s3_secret_key: e.target.value })
                    }}
                    className="input pr-10"
                    placeholder={settingsData?.s3_secret_key ? "Enter new value to change" : "••••••••••••••••"}
                  />
                  {settingsData?.s3_secret_key && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                      <span className="text-xs text-gray-400 mr-2">Key set</span>
                    </div>
                  )}
                </div>
                {settingsData?.s3_secret_key && (
                  <p className="mt-1 text-xs text-gray-500">For security, the existing secret key cannot be viewed. Enter a new value to change it.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="region" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Region
                </label>
                <input
                  id="region"
                  type="text"
                  value={settings.s3_region || ""}
                  onChange={(e) => {
                    setSettings({ ...settings, s3_region: e.target.value })
                  }}
                  className="input"
                  placeholder="us-east-1"
                />
              </div>

              <div>
                <label htmlFor="endpoint" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Endpoint <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="endpoint"
                  type="text"
                  value={settings.s3_endpoint || ""}
                  onChange={(e) => {
                    setSettings({ ...settings, s3_endpoint: e.target.value })
                  }}
                  className="input"
                  placeholder="https://s3.wasabisys.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testS3.isPending}
                className="btn-secondary w-full"
              >
                {testS3.isPending ? "Testing..." : <><TestTube className="mr-1 h-4 w-4 inline" /> Test Connection</>}
              </button>

              <button
                type="button"
                onClick={handleSaveS3Settings}
                disabled={updateSettings.isPending}
                className="btn-primary w-full"
              >
                {updateSettings.isPending ? "Saving..." : <><Save className="mr-1 h-4 w-4 inline" /> Save S3 Settings</>}
              </button>
            </div>

            {testS3.data && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                <Check className="mr-1 inline h-4 w-4" />
                {testS3.data.data.message}
              </div>
            )}

            {testS3.error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                <X className="mr-1 inline h-4 w-4" />
                Connection failed. Please check your settings.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Backup */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-white">Manual Backup</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Trigger a backup immediately</p>
          </div>
          <button
            onClick={() => manualBackup.mutate()}
            disabled={manualBackup.isPending || (!settings.local_backup_enabled && !settings.s3_enabled)}
            className="btn-primary"
          >
            {manualBackup.isPending ? "Backing up..." : "Backup Now"}
          </button>
        </div>

        {manualBackup.data && (
          <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
            <Check className="mr-1 inline h-4 w-4" />
            {manualBackup.data.data.message}
          </div>
        )}

        {manualBackup.error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            <X className="mr-1 inline h-4 w-4" />
            Backup failed. Please check your settings.
          </div>
        )}
      </div>

      {/* Backup Logs */}
      {logsData && logsData.length > 0 && (
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-black dark:text-white">Backup History</h2>
          <div className="space-y-2">
            {logsData.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  {log.status === "success" && <Check className="h-4 w-4 text-green-600" />}
                  {log.status === "failed" && <X className="h-4 w-4 text-red-600" />}
                  {log.status === "skipped" && <Clock className="h-4 w-4 text-gray-600" />}
                  <span className="text-sm text-gray-700 dark:text-gray-300">{log.message}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {log.items_backed_up} items • {log.files_backed_up} files
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
