import { useState, useEffect, useCallback, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useMe, useChangePassword } from "@/hooks/use-auth"
import api from "@/lib/api"
import { Settings as SettingsIcon, Cloud, TestTube, Save, Check, X, Clock, HardDrive, Download, Lock, KeyRound, Upload, Keyboard, User, Shield, Database, ArrowLeft } from "lucide-react"
import { formatShortcut } from "@/hooks/use-keyboard-shortcuts"

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

type Tab = "general" | "security" | "data" | "backup"

const TABS = [
  { id: "general" as Tab, label: "General", icon: User },
  { id: "security" as Tab, label: "Security", icon: Shield },
  { id: "data" as Tab, label: "Data", icon: Database },
  { id: "backup" as Tab, label: "Backup", icon: Cloud },
]

export function SettingsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>("general")
  const [hasChanges, setHasChanges] = useState(false)
  const [settings, setSettings] = useState<Partial<BackupSettings>>({})
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [fullImport, setFullImport] = useState(false)
  const [importStep, setImportStep] = useState<"none" | "warning" | "confirm">("none")
  const [localShortcut, setLocalShortcut] = useState("n")
  const [isRecording, setIsRecording] = useState(false)
  const [recordedShortcut, setRecordedShortcut] = useState("")

  // Update user settings mutation
  const updateUserSettings = useMutation({
    mutationFn: async (settings: { create_shortcut?: string }) => {
      const response = await api.put("/auth/me/settings/", settings)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] })
    },
  })

  // Get current user
  const { data: user } = useMe()

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
    enabled: user?.is_staff ?? false,
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

  // Export data mutation
  const exportData = useMutation({
    mutationFn: async () => {
      const response = await api.post("/export/data/", {}, { responseType: "blob" })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `keepr_export_${user?.username}_${Date.now()}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      return response.data
    },
  })

  // Import data mutation
  const importData = useMutation({
    mutationFn: async ({ file, fullImport, confirmed }: { file: File; fullImport: boolean; confirmed?: boolean }) => {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("full_import", fullImport.toString())
      if (confirmed) {
        formData.append("confirmed", "true")
      }
      const response = await api.post("/import/data/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
      queryClient.invalidateQueries({ queryKey: ["tags"] })
    },
  })

  // Change password mutation
  const changePassword = useChangePassword()

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData)
    }
  }, [settingsData])

  // Sync local shortcut when user data changes
  useEffect(() => {
    if (user?.create_shortcut) {
      setLocalShortcut(user.create_shortcut)
    }
  }, [user?.create_shortcut])

  const handleShortcutChange = (value: string) => {
    setLocalShortcut(value)
  }

  const handleSaveShortcut = () => {
    updateUserSettings.mutate({ create_shortcut: localShortcut })
  }

  // Handle key recording
  const startRecording = () => {
    setIsRecording(true)
    setRecordedShortcut("")
  }

  const cancelRecording = () => {
    setIsRecording(false)
    setRecordedShortcut("")
  }

  const applyRecordedShortcut = () => {
    if (recordedShortcut) {
      setLocalShortcut(recordedShortcut)
      updateUserSettings.mutate({ create_shortcut: recordedShortcut })
    }
    setIsRecording(false)
    setRecordedShortcut("")
  }

  useEffect(() => {
    if (!isRecording) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()

      // Escape cancels recording
      if (e.key === "Escape") {
        cancelRecording()
        return
      }

      // Build the shortcut string
      const parts: string[] = []

      if (e.ctrlKey) parts.push("ctrl")
      if (e.metaKey) parts.push("cmd")
      if (e.altKey) parts.push("alt")
      if (e.shiftKey) parts.push("shift")

      // Add the key
      let key = e.key.toLowerCase()

      // Special handling for certain keys
      if (key === " ") key = "space"
      if (key.startsWith("arrow")) key = key.toLowerCase()
      if (e.key === "+" || e.key === "=" || e.key === "-" || e.key === "_") {
        key = e.key
      }

      parts.push(key)

      setRecordedShortcut(parts.join("+"))
      setIsRecording(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isRecording])

  const handleSaveSettings = () => {
    updateSettings.mutate(settings)
  }

  const handleTestConnection = () => {
    testS3.mutate()
  }

  const handleSaveS3Settings = () => {
    updateSettings.mutate(settings)
  }

  const handleExportData = () => {
    exportData.mutate()
  }

  const handleImportData = () => {
    if (!importFile) return
    if (fullImport && importStep === "none") {
      setImportStep("warning")
      return
    }
    if (!fullImport) {
      importData.mutate({ file: importFile, fullImport: false })
    }
  }

  const handleChangePassword = () => {
    setPasswordError("")
    setPasswordSuccess(false)

    if (passwordForm.new_password.length < 8) {
      setPasswordError("New password must be at least 8 characters")
      return
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New passwords do not match")
      return
    }

    changePassword.mutate(
      {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      },
      {
        onSuccess: () => {
          setPasswordSuccess(true)
          setPasswordForm({
            current_password: "",
            new_password: "",
            confirm_password: "",
          })
        },
        onError: (err: any) => {
          setPasswordError(err.response?.data?.error?.message || "Failed to change password")
        },
      }
    )
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never"
    return new Date(dateStr).toLocaleString()
  }

  // Hide backup tab for non-staff users
  const visibleTabs = user?.is_staff ? TABS : TABS.filter(t => t.id !== "backup")

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">Settings</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage your preferences</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-black/20 dark:border-white/20 mb-6 overflow-x-auto">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${activeTab === tab.id
                  ? "border-black text-black dark:border-white dark:text-white"
                  : "border-transparent text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
                }
              `}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* General Tab */}
      {activeTab === "general" && (
        <div className="space-y-6">
          {/* Keyboard Shortcuts */}
          <div className="card">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
                <Keyboard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-black dark:text-white">Keyboard Shortcuts</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configure your quick action keys</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Create New Item Shortcut
                </label>

                {isRecording ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 rounded-lg border-2 border-dashed border-black/30 bg-gray-50 p-4 text-center dark:border-white/30 dark:bg-white/5">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Press a key combination... (Esc to cancel)
                      </p>
                    </div>
                    <button
                      onClick={cancelRecording}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 rounded-lg border border-black/20 bg-white px-4 py-2.5 dark:border-white/20 dark:bg-black">
                      <kbd className="text-sm font-medium text-black dark:text-white">
                        {formatShortcut(localShortcut)}
                      </kbd>
                    </div>
                    <button
                      onClick={startRecording}
                      className="btn-secondary"
                      title="Record new shortcut"
                    >
                      Record
                    </button>
                  </div>
                )}

                {recordedShortcut && !isRecording && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Recorded: <kbd className="ml-1 px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">{formatShortcut(recordedShortcut)}</kbd>
                    </span>
                    <button
                      onClick={applyRecordedShortcut}
                      className="btn-primary text-sm py-1 px-3"
                    >
                      Apply
                    </button>
                    <button
                      onClick={cancelRecording}
                      className="btn-ghost btn text-sm py-1 px-2"
                    >
                      Discard
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-white/5">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available shortcuts:</p>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Type anywhere when not in input → Search</li>
                  <li>• Press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700">{formatShortcut(localShortcut)}</kbd> → Create new item</li>
                  <li>• Press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700">Esc</kbd> → Go back to home</li>
                </ul>
              </div>

              {updateUserSettings.data && (
                <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <Check className="mr-1 inline h-4 w-4" />
                  Shortcut updated successfully!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Change Password */}
          <div className="card">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-black dark:text-white">Change Password</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Update your account password</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="current-password" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Password
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className="input"
                  placeholder="Enter your current password"
                />
              </div>

              <div>
                <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className="input"
                  placeholder="Enter new password (min. 8 characters)"
                  minLength={8}
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className="input"
                  placeholder="Confirm new password"
                  minLength={8}
                />
              </div>

              {passwordError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  <X className="mr-1 inline h-4 w-4" />
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <Check className="mr-1 inline h-4 w-4" />
                  Password changed successfully!
                </div>
              )}

              <button
                onClick={handleChangePassword}
                disabled={changePassword.isPending || !passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password}
                className="btn-primary w-full"
              >
                {changePassword.isPending ? "Changing..." : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Tab */}
      {activeTab === "data" && (
        <div className="space-y-6">
          {/* Export */}
          <div className="card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-black dark:text-white">Export My Data</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Download all your items and media files</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Export all your items, tags, and uploaded files as a ZIP archive.
              </p>
              <button
                onClick={handleExportData}
                disabled={exportData.isPending}
                className="btn-primary"
              >
                {exportData.isPending ? "Exporting..." : "Export"}
              </button>
            </div>
          </div>

          {/* Import */}
          <div className="card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-black dark:text-white">Import Data</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Restore from a backup file</p>
              </div>
            </div>

            <div className="space-y-4">
              {user?.is_staff && (
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-white/5">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Backup Import</span>
                    <p className="text-xs text-gray-500 mt-1">Import all users' data from a full admin backup</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFullImport(!fullImport)}
                    className={`
                      relative h-6 w-11 flex-shrink-0 rounded-full transition-colors
                      ${fullImport ? "bg-black dark:bg-white" : "bg-gray-300 dark:bg-gray-600"}
                    `}
                  >
                    <span
                      className={`
                        absolute top-0.5 left-0 h-5 w-5 rounded-full shadow-sm transition-all
                        ${fullImport
                          ? "bg-neutral-900 translate-x-5"
                          : "bg-white translate-x-1"
                        }
                      `}
                    />
                  </button>
                </div>
              )}

              <div>
                <label htmlFor="import-file" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Backup File
                </label>
                <input
                  id="import-file"
                  type="file"
                  accept=".zip"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="input"
                  disabled={importData.isPending}
                />
              </div>

              <button
                onClick={handleImportData}
                disabled={!importFile || importData.isPending}
                className="btn-primary w-full"
              >
                {importData.isPending ? "Importing..." : "Import"}
              </button>

              {importData.data && (
                <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <Check className="mr-1 inline h-4 w-4" />
                  {importData.data.data.message}
                </div>
              )}

              {importData.error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  <X className="mr-1 inline h-4 w-4" />
                  {(importData.error as any).response?.data?.error?.message || "Import failed"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Backup Tab - Staff Only */}
      {activeTab === "backup" && user?.is_staff && (
        <div className="space-y-6">
          {settingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            <>
              {/* Backup Configuration */}
              <div className="card">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-black dark:text-white">Backup Configuration</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Configure automatic backups</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-white/10 dark:text-gray-300"
                            }
                          `}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-white/5">
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Backup only on new items</span>
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

                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-white/5">
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Local Backup</span>
                      <p className="text-xs text-gray-500 mt-1">Save backups to server directory</p>
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

                  <div className="rounded-lg bg-gray-50 p-4 dark:bg-white/5">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Last backup: <span className="font-medium">{formatDate(settings.last_backup_at)}</span>
                    </p>
                  </div>

                  {hasChanges && (
                    <div className="flex justify-end gap-2">
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
                        {updateSettings.isPending ? "Saving..." : "Save"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* S3 Settings */}
              <div className="card">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
                    <Cloud className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-black dark:text-white">S3 Storage</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Configure S3-compatible storage</p>
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
                    <input
                      type="text"
                      value={settings.s3_bucket_name || ""}
                      onChange={(e) => {
                        setSettings({ ...settings, s3_bucket_name: e.target.value })
                      }}
                      className="input"
                      placeholder="Bucket Name"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={settings.s3_access_key || ""}
                        onChange={(e) => {
                          setSettings({ ...settings, s3_access_key: e.target.value })
                        }}
                        className="input"
                        placeholder="Access Key"
                      />
                      <input
                        type="password"
                        value={settings.s3_secret_key === "********" ? "" : settings.s3_secret_key || ""}
                        onChange={(e) => {
                          setSettings({ ...settings, s3_secret_key: e.target.value })
                        }}
                        className="input"
                        placeholder="Secret Key"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={settings.s3_region || ""}
                        onChange={(e) => {
                          setSettings({ ...settings, s3_region: e.target.value })
                        }}
                        className="input"
                        placeholder="Region"
                      />
                      <input
                        type="text"
                        value={settings.s3_endpoint || ""}
                        onChange={(e) => {
                          setSettings({ ...settings, s3_endpoint: e.target.value })
                        }}
                        className="input"
                        placeholder="Endpoint (optional)"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testS3.isPending}
                        className="btn-secondary"
                      >
                        {testS3.isPending ? "Testing..." : "Test Connection"}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveS3Settings}
                        disabled={updateSettings.isPending}
                        className="btn-primary"
                      >
                        {updateSettings.isPending ? "Saving..." : "Save S3 Settings"}
                      </button>
                    </div>

                    {testS3.data && (
                      <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <Check className="mr-1 inline h-4 w-4" />
                        {testS3.data.data.message}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Manual Backup */}
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-black dark:text-white">Manual Backup</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Trigger a backup immediately</p>
                  </div>
                  <button
                    onClick={() => manualBackup.mutate()}
                    disabled={manualBackup.isPending}
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
            </>
          )}
        </div>
      )}

      {/* Import Warning Modals */}
      {importStep === "warning" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card mx-4 max-w-md">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-white">Danger: Full Backup Import</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6 space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <p className="font-semibold text-red-600 dark:text-red-400">Warning: This will replace ALL data in the database!</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>All current users, items, and tags will be deleted</li>
                <li>Only data from the backup will exist after import</li>
                <li>You will be logged out and need to log in again</li>
                <li>A backup of current data will be created automatically</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setImportStep("none")}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => setImportStep("confirm")}
                className="btn-primary flex-1 bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {importStep === "confirm" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card mx-4 max-w-md">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-white">Final Confirmation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last chance to cancel</p>
              </div>
            </div>

            <div className="mb-6 space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <p className="font-semibold text-red-600 dark:text-red-400">Are you absolutely sure?</p>
              <p>After clicking "Confirm":</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>The current database will be completely replaced</li>
                <li>Any data not in the backup will be permanently lost</li>
                <li>You will need to log in again</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setImportStep("warning")}
                className="btn-secondary flex-1"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  if (importFile) {
                    importData.mutate({ file: importFile, fullImport: true, confirmed: true })
                    setImportStep("none")
                  }
                }}
                disabled={importData.isPending}
                className="btn-primary flex-1 bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              >
                {importData.isPending ? "Importing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
