"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Upload,
  Mail,
  FileSpreadsheet,
  Send,
  CheckCircle2,
  AlertCircle,
  Eye,
  Plus,
  LucideIcon,
  FileText,
  Image as ImageIcon,
  X,
  Link,
  CloudDownload,
  LogOut,
  User,
} from "lucide-react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/auth-context";

const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import("react-quill-new");
    // eslint-disable-next-line react/display-name
    return ({ forwardedRef, ...props }: any) => <RQ ref={forwardedRef} {...props} />;
  },
  { ssr: false }
);
import "react-quill-new/dist/quill.snow.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://email-automation-wz8k.vercel.app";

type Tab = "upload" | "editor" | "preview";

interface RecipientData {
  email?: string;
  Email?: string;
  Status?: 'workable' | 'dropped' | 'closable';
  Remarks?: string;
  [key: string]: any;
}

interface SendResult {
  email: string;
  status: 'sent' | 'failed';
  remarks?: string;
}

interface TabItem {
  id: Tab;
  icon: LucideIcon;
  label: string;
}

const TABS: TabItem[] = [
  { id: "upload", icon: FileSpreadsheet, label: "1. Data Source" },
  { id: "editor", icon: Mail, label: "2. Compose" },
  { id: "preview", icon: Eye, label: "3. Results" },
];

export default function Dashboard() {
  const { user, loading, signOut, getIdToken, googleAccessToken } = useAuth();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RecipientData[]>([]);
  const [detectedEmailColumn, setDetectedEmailColumn] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [template, setTemplate] = useState("");
  const [remoteUrl, setRemoteUrl] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<SendResult[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [startRow, setStartRow] = useState(1);
  const [endRow, setEndRow] = useState(0);
  const [fallbackValues, setFallbackValues] = useState<Record<string, string>>({});
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sendingLogs, setSendingLogs] = useState<string[]>([]);
  const STATUS_OPTIONS: ('workable' | 'dropped' | 'closable')[] = ['workable', 'dropped', 'closable'];

  const quillRef = useRef<any>(null);

  useEffect(() => {
    // Register custom placeholder blot
    const registerPlaceholder = async () => {
      try {
        const { Quill } = await import("react-quill-new");
        const Embed = Quill.import('blots/embed') as any;
        class PlaceholderBlot extends Embed {
          static blotName = 'placeholder';
          static tagName = 'span';
          static create(value: any) {
            const node = super.create();
            node.setAttribute('data-placeholder', value.label);
            node.className = 'placeholder-pill';
            node.innerText = `{${value.label}}`;
            node.setAttribute('contenteditable', 'false');
            node.style.userSelect = 'none';
            return node;
          }
          static value(node: any) {
            return { label: node.getAttribute('data-placeholder') };
          }
        }
        Quill.register(PlaceholderBlot);
      } catch (e) {
        console.error("Failed to register Quill blot", e);
      }
    };
    registerPlaceholder();
  }, []);

  const quillModules = {
    clipboard: {
      matchVisual: false,
    },
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Route protection: redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Helper to get auth headers
  const getAuthHeaders = async () => {
    const token = await getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("files", uploadedFile);

    try {
      const token = await user?.getIdToken();
      const response = await axios.post(`${API_BASE_URL}/email/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      const dataRows: RecipientData[] = response.data.rows.map((row: any) => ({
        ...row,
        Status: row.Status || 'workable',
        Remarks: row.Remarks || ''
      }));

      setHeaders((prev) => {
        const h = response.data.headers;
        if (!h.includes("Status")) h.push("Status");
        if (!h.includes("Remarks")) h.push("Remarks");
        return [...h];
      });
      setRows(dataRows);
      setDetectedEmailColumn(response.data.emailColumn);
      setStartRow(1);
      setEndRow(response.data.rows.length);
      setActiveTab("editor");
    } catch (err: any) {
      console.error("Upload failed", err);
      if (err.response?.status === 401) {
        router.push("/login");
        return;
      }
      setUploadError(err.response?.data?.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlUpload = async () => {
    if (!remoteUrl.trim()) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const token = await user?.getIdToken();
      const response = await axios.post(
        `${API_BASE_URL}/email/upload-url`,
        { url: remoteUrl },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const dataRows: RecipientData[] = response.data.rows.map((row: any) => ({
        ...row,
        Status: row.Status || 'workable',
        Remarks: row.Remarks || ''
      }));

      setHeaders((prev) => {
        const h = response.data.headers;
        if (!h.includes("Status")) h.push("Status");
        if (!h.includes("Remarks")) h.push("Remarks");
        return [...h];
      });
      setRows(dataRows);
      setDetectedEmailColumn(response.data.emailColumn);
      setStartRow(1);
      setEndRow(response.data.rows.length);
      setRemoteUrl(""); // Clear after success
      setActiveTab("editor");
    } catch (err: any) {
      console.error("Upload failed", err);
      if (err.response?.status === 401) {
        router.push("/login");
        return;
      }
      setUploadError(err.response?.data?.message || "Failed to fetch from URL");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const insertPlaceholder = (header: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection(true);
      quill.insertEmbed(range.index, 'placeholder', { label: header });
      quill.setSelection(range.index + 1);
    } else {
      // Fallback if quill is not focused/ready
      const placeholder = `{${header}}`;
      setTemplate((prev) => prev + placeholder);
    }
  };

  // Check if a cell value is empty
  // Check if a cell value is truly empty (null, undefined, or empty string)
  // Numeric 0 is NOT empty.
  const isEmpty = (value: any) => value === undefined || value === null || String(value).trim() === "";

  // Get columns that have at least one empty cell
  const columnsWithEmptyCells = headers.filter((header) =>
    rows.some((row) => isEmpty(row[header]))
  );

  // Get the display value for a cell: original value or fallback (transparently)
  const getCellDisplay = (row: RecipientData, col: string) => {
    if (!isEmpty(row[col])) return { value: String(row[col]), isFallback: false };
    if (!isEmpty(fallbackValues[col])) return { value: fallbackValues[col], isFallback: true };
    return { value: "", isFallback: false };
  };

  // Update a specific cell value
  const updateCellValue = (rowIdx: number, col: string, value: string) => {
    setRows((prev) =>
      prev.map((row, i) => (i === rowIdx ? { ...row, [col]: value } : row))
    );
    setEditingCell(null);
  };

  // Merge fallback values into rows for sending, respecting selection range
  const getRecipientsWithFallbacks = () => {
    // Zero-based indexing for slice: startRow is inclusive, endRow is exclusive
    // But we want endRow to be inclusive as well for the user
    const selectedRows = rows.slice(startRow - 1, endRow);

    return selectedRows.map((row) => {
      const merged = { ...row };
      for (const col of headers) {
        if (isEmpty(merged[col]) && fallbackValues[col]) {
          merged[col] = fallbackValues[col];
        }
      }
      return merged;
    });
  };

  const handleSendEmails = async () => {
    if (!subject || !template || rows.length === 0) {
      alert("Please ensure subject, template, and recipients are ready.");
      return;
    }

    setIsSending(true);
    setResults([]);
    setSendingLogs(["Initializing sending process...", `Target: ${Math.max(0, endRow - startRow + 1)} recipients.`]);
    setActiveTab("preview"); // Switch to preview tab to show logs

    const allRecipients = getRecipientsWithFallbacks();
    const BATCH_SIZE = 5;
    const totalBatches = Math.ceil(allRecipients.length / BATCH_SIZE);
    let allResults: SendResult[] = [];

    try {
      const authHeaders = await getAuthHeaders();

      for (let i = 0; i < allRecipients.length; i += BATCH_SIZE) {
        const chunk = allRecipients.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;

        setSendingLogs(prev => [
          ...prev,
          `[Batch ${batchNum}/${totalBatches}] Processing ${chunk.length} emails...`,
          `DEBUG: Google Token: ${googleAccessToken ? 'OK' : 'MISSING'} | User: ${user?.email}`
        ]);

        const formData = new FormData();
        formData.append("subject", subject);
        formData.append("template", template);
        formData.append("recipients", JSON.stringify(chunk));

        attachments.forEach((file) => {
          formData.append("attachments", file);
        });

        try {
          const response = await axios.post(`${API_BASE_URL}/email/send`, formData, {
            headers: {
              ...authHeaders,
              "Content-Type": "multipart/form-data",
              ...(googleAccessToken ? { "x-google-access-token": googleAccessToken } : {}),
            },
          });

          const batchResults: SendResult[] = response.data.results;
          allResults = [...allResults, ...batchResults];
          setResults([...allResults]); // Live update results list

          batchResults.forEach(res => {
            const statusIcon = res.status === 'sent' ? '✅' : '❌';
            const logMsg = `${statusIcon} ${res.status === 'sent' ? 'Sent' : 'Failed'}: ${res.email || 'Unknown'}${res.remarks ? ` (${res.remarks})` : ''}`;
            setSendingLogs(prev => [...prev, logMsg]);

            // Update the source data (rows) table automatically
            setRows(prevRows => {
              return prevRows.map(row => {
                const rowEmail = row.email || row.Email || row.Email_Address || row.Mail;
                if (rowEmail === res.email) {
                  return {
                    ...row,
                    Status: res.status === 'sent' ? 'workable' : 'dropped',
                    Remarks: res.remarks || ''
                  };
                }
                return row;
              });
            });
          });

        } catch (batchErr: any) {
          const errorMsg = batchErr.response?.data?.message || batchErr.message;
          setSendingLogs(prev => [...prev, `❌ Batch error: ${errorMsg}`]);
          // Add dummy failures for the chunk to keep results consistent
          const failChunk = chunk.map(r => ({ email: r.email || r.Email || 'Unknown', status: 'failed' as const, error: errorMsg }));
          allResults = [...allResults, ...failChunk];
          setResults([...allResults]);
        }
      }

      setSendingLogs(prev => [...prev, "🏁 Sending process completed."]);
    } catch (error: any) {
      console.error("Bulk send failed", error);
      setSendingLogs(prev => [...prev, `🛑 Critical error: ${error.message}`]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <header className="mb-12">
        {/* User bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Avatar"
                className="w-10 h-10 rounded-full border-2 border-neutral-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-neutral-200">
                {user.displayName || "User"}
              </p>
              <p className="text-xs text-neutral-500">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-rose-400 transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-4"
          >
            Email seeder Pro
          </motion.h1>
          <p className="text-neutral-400 text-lg">Automate your outreach with precision and style.</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex justify-center space-x-4 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-full transition-all duration-300 ${activeTab === tab.id
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
              : "bg-black/40 text-neutral-500 hover:text-neutral-300"
              }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      <main className="glass rounded-3xl p-8 min-h-[500px]">
        <AnimatePresence mode="wait">
          {activeTab === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center justify-center h-full py-12"
            >
              {/* File Upload & URL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                {/* Local File */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Local Spreadsheet
                  </h3>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-40 border-2 border-dashed border-neutral-800 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6 text-neutral-400 group-hover:text-blue-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-neutral-300">Click to upload</p>
                      <p className="text-xs text-neutral-500">Excel or CSV files</p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".xlsx,.xls,.csv"
                    />
                  </div>
                </div>

                {/* Remote URL */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    Cloud Link (Google Sheets)
                  </h3>
                  <div className="h-40 border-2 border-neutral-800 rounded-2xl p-6 flex flex-col justify-center gap-4 bg-neutral-900/50">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Paste shared link here..."
                        value={remoteUrl}
                        onChange={(e) => setRemoteUrl(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-blue-500/50 transition-colors pr-12"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Link className="w-4 h-4 text-neutral-600" />
                      </div>
                    </div>
                    <button
                      onClick={handleUrlUpload}
                      disabled={isUploading || !remoteUrl.trim()}
                      className="w-full h-12 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-neutral-200 transition-all border border-neutral-700/50"
                    >
                      {isUploading ? (
                        <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CloudDownload className="w-4 h-4" />
                          Fetch Data
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {file && (
                <div className="mt-8 flex items-center space-x-3 bg-neutral-900 px-6 py-3 rounded-2xl">
                  <FileSpreadsheet className="text-emerald-400 w-5 h-5" />
                  <span className="text-neutral-300">{file.name}</span>
                  <CheckCircle2 className="text-emerald-500 w-4 h-4" />
                </div>
              )}
              {isUploading && <p className="mt-4 text-blue-400 animate-pulse">Parsing data...</p>}
              {uploadError && <p className="mt-4 text-rose-400">{uploadError}</p>}
            </motion.div>
          )}

          {activeTab === "editor" && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-6">
                {/* Fallback Values & Data Preview */}
                {rows.length > 0 && (
                  <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                        Data Preview
                        <span className="text-xs font-normal text-neutral-600">({rows.length} rows)</span>
                      </h4>
                      {columnsWithEmptyCells.length > 0 && (
                        <span className="text-xs text-amber-500">{columnsWithEmptyCells.length} column(s) have empty cells</span>
                      )}
                    </div>

                    {/* Row Scope Selection */}
                    <div className="flex items-center gap-4 bg-neutral-800/50 p-3 rounded-xl border border-neutral-700/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Row Scope:</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-neutral-500 uppercase">Start</label>
                          <input
                            type="number"
                            min={1}
                            max={endRow}
                            value={startRow}
                            onChange={(e) => setStartRow(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-blue-400 font-mono focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-neutral-500 uppercase">End</label>
                          <input
                            type="number"
                            min={startRow}
                            max={rows.length}
                            value={endRow}
                            onChange={(e) => setEndRow(Math.min(rows.length, parseInt(e.target.value) || 0))}
                            className="w-16 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-blue-400 font-mono focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <span className="text-xs text-neutral-600">
                          of {rows.length} total
                        </span>
                      </div>
                    </div>

                    <div className="max-h-[400px] overflow-auto rounded-xl border border-neutral-800 custom-scrollbar relative">
                      <table className="w-full text-sm border-separate border-spacing-0">
                        <thead className="sticky top-0 z-20">
                          <tr className="bg-neutral-900 shadow-sm">
                            <th className="sticky left-0 z-30 bg-neutral-900 px-3 py-2 text-left text-xs font-semibold text-neutral-500 border-b border-neutral-800 w-10">#</th>
                            {headers.map((h) => (
                              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-neutral-400 border-b border-neutral-800">
                                <div className="flex items-center gap-1">
                                  {h}
                                  {h === detectedEmailColumn && (
                                    <span className="bg-blue-500/20 text-blue-400 text-[8px] px-1 rounded border border-blue-500/30 uppercase tracking-tighter">Email</span>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                          {/* Fallback input row */}
                          {columnsWithEmptyCells.length > 0 && (
                            <tr className="bg-amber-500/10 backdrop-blur-sm">
                              <td className="sticky left-0 z-30 bg-amber-900/20 px-3 py-2 text-xs text-amber-500 font-medium border-b border-amber-500/20">↳</td>
                              {headers.map((h) => (
                                <td key={h} className="px-2 py-1.5 border-b border-amber-500/20">
                                  {columnsWithEmptyCells.includes(h) ? (
                                    <input
                                      type="text"
                                      value={fallbackValues[h] || ""}
                                      onChange={(e) => setFallbackValues((prev) => ({ ...prev, [h]: e.target.value }))}
                                      placeholder="Fallback"
                                      className="w-full bg-neutral-900/80 border border-amber-500/30 rounded px-2 py-1 text-xs text-amber-300 placeholder:text-neutral-700 focus:ring-1 focus:ring-amber-500/50 focus:outline-none"
                                    />
                                  ) : (
                                    <span className="text-xs text-neutral-700">—</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          )}
                        </thead>
                        <tbody className="bg-neutral-900/10">
                          {rows.map((row, idx) => (
                            <tr key={idx} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors group">
                              <td className="sticky left-0 z-10 bg-neutral-900/95 group-hover:bg-neutral-800/95 px-3 py-2 text-xs text-neutral-600 border-b border-neutral-800/50">{idx + 1}</td>
                              {headers.map((h) => {
                                const cell = getCellDisplay(row, h);
                                const isEditing = editingCell?.row === idx && editingCell?.col === h;

                                if (h === "Status") {
                                  return (
                                    <td key={h} className="px-3 py-1 border-b border-neutral-800/50">
                                      <select
                                        value={row[h] || "workable"}
                                        onChange={(e) => updateCellValue(idx, h, e.target.value)}
                                        className={`bg-neutral-900 border border-neutral-700/50 rounded px-2 py-0.5 text-[10px] focus:outline-none focus:border-blue-500 transition-colors ${row[h] === 'dropped' ? 'text-rose-400' : row[h] === 'closable' ? 'text-amber-400' : 'text-emerald-400'
                                          }`}
                                      >
                                        {STATUS_OPTIONS.map(opt => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                    </td>
                                  )
                                }

                                return (
                                  <td
                                    key={h}
                                    className={`text-xs cursor-pointer border-b border-neutral-800/50 ${isEditing
                                      ? "p-0"
                                      : `px-3 py-2 ${cell.isFallback
                                        ? "text-amber-400/70 italic bg-amber-500/5"
                                        : isEmpty(row[h])
                                          ? "text-neutral-700"
                                          : "text-neutral-300"
                                      }`
                                      }`}
                                    onDoubleClick={() => setEditingCell({ row: idx, col: h })}
                                  >
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        autoFocus
                                        defaultValue={String(row[h] ?? "")}
                                        className="w-full bg-neutral-800 border border-blue-500 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                                        onBlur={(e) => updateCellValue(idx, h, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") updateCellValue(idx, h, (e.target as HTMLInputElement).value);
                                          if (e.key === "Escape") setEditingCell(null);
                                        }}
                                      />
                                    ) : (
                                      cell.value
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-3 space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Email Subject</label>
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Hello {Name}, here is your offer!"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Email Body</label>
                      <div className="bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800">
                        <ReactQuill
                          forwardedRef={quillRef}
                          theme="snow"
                          value={template}
                          onChange={setTemplate}
                          modules={quillModules}
                          style={{ height: '300px', background: 'transparent' }}
                        />
                      </div>
                    </div>

                    {/* Attachments Section */}
                    <div className="pt-8">
                      <label className="block text-sm font-medium text-neutral-400 mb-4">Attachments</label>
                      <div className="flex flex-wrap gap-4">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center space-x-2 bg-neutral-900 px-4 py-2 rounded-xl group relative border border-neutral-800">
                            {file.type.startsWith('image/') ? (
                              <ImageIcon className="w-5 h-5 text-blue-400" />
                            ) : (
                              <FileText className="w-5 h-5 text-rose-500" />
                            )}
                            <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                            <button
                              onClick={() => removeAttachment(index)}
                              className="text-neutral-500 hover:text-rose-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => attachmentInputRef.current?.click()}
                          className="flex items-center space-x-2 bg-neutral-900/50 hover:bg-neutral-800 border-2 border-dashed border-neutral-700 hover:border-blue-500 px-4 py-2 rounded-xl text-neutral-500 hover:text-blue-400 transition-all cursor-pointer"
                        >
                          <Plus className="w-5 h-5" />
                          <span className="text-sm font-medium">Add Attachment</span>
                          <input
                            type="file"
                            ref={attachmentInputRef}
                            onChange={handleFileSelection}
                            className="hidden"
                            accept=".pdf, image/jpeg, image/png, image/gif"
                            multiple
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Available Placeholders</h4>
                    <div className="bg-neutral-900/50 rounded-2xl p-4 border border-neutral-800/50 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {headers.length > 0 ? (
                        headers.map((header) => (
                          <button
                            key={header}
                            onClick={() => insertPlaceholder(header)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm transition-colors group"
                          >
                            <span className="font-mono text-blue-400">{`{${header}}`}</span>
                            <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-neutral-600 italic">No data loaded.</p>
                      )}
                    </div>

                    <button
                      disabled={isSending || rows.length === 0}
                      onClick={handleSendEmails}
                      className="w-full mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSending ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span>Send to {Math.max(0, endRow - startRow + 1)} Recipients</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold">execution_status.log</h3>
                <div className="flex space-x-3">
                  <div className="bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-500/20 text-xs font-mono">
                    {results.filter(r => r.status === 'sent').length} SUCCESS
                  </div>
                  <div className="bg-rose-500/10 text-rose-400 px-4 py-1.5 rounded-full border border-rose-500/20 text-xs font-mono">
                    {results.filter(r => r.status === 'failed').length} ERROR
                  </div>
                </div>
              </div>

              {/* Terminal View (Visible while sending or if logs exist) */}
              {(isSending || sendingLogs.length > 0) && (
                <div className="bg-black/80 rounded-2xl border border-neutral-800 p-4 font-mono text-[11px] leading-relaxed overflow-hidden flex flex-col h-[300px]">
                  <div className="flex items-center gap-2 mb-3 border-b border-neutral-800 pb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-neutral-500 ml-2">Progress Monitor</span>
                  </div>
                  <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 space-y-1">
                    {sendingLogs.map((log, i) => (
                      <div key={i} className="text-neutral-400">
                        <span className="text-neutral-600 mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                        {log}
                      </div>
                    ))}
                    {isSending && <div className="text-blue-400 animate-pulse">_ Waiting for server response...</div>}
                    <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                  </div>
                </div>
              )}

              {/* Detailed Summary (Only after finished) */}
              {!isSending && results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sent Successfully */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Success Delivery
                    </h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                      {results.filter(r => r.status === 'sent').map((res, i) => (
                        <div key={i} className="bg-neutral-900/40 border border-neutral-800/50 p-3 rounded-xl flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500/60" />
                          <span className="text-sm text-neutral-300">{res.email}</span>
                        </div>
                      ))}
                      {results.filter(r => r.status === 'sent').length === 0 && (
                        <p className="text-xs text-neutral-600 italic">No emails sent successfully.</p>
                      )}
                    </div>
                  </div>

                  {/* Failed / Errors */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-rose-500 uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Not Found / Errors
                    </h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                      {results.filter(r => r.status === 'failed').map((res, i) => (
                        <div key={i} className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="w-4 h-4 text-rose-500/60" />
                            <span className="text-sm text-neutral-300">{res.email}</span>
                          </div>
                          {res.remarks && <span className="text-[10px] text-rose-400/70 ml-7 italic">{res.remarks}</span>}
                        </div>
                      ))}
                      {results.filter(r => r.status === 'failed').length === 0 && (
                        <p className="text-xs text-neutral-600 italic">No delivery failures reported.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!isSending && results.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-neutral-800 rounded-3xl">
                  <Eye className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
                  <p className="text-neutral-500 font-medium">No execution history found.</p>
                  <p className="text-xs text-neutral-600">Start sending emails to see real-time logs and results.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-12 text-center text-neutral-600 text-sm">
        &copy; 2026 Email Seeder Pro | Powered by NestJS &amp; Next.js
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #171717;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid #262626 !important;
          background: rgba(255,255,255,0.02) !important;
        }
        .ql-container.ql-snow {
          border: none !important;
          font-family: inherit !important;
        }
        .ql-editor {
          min-height: 200px;
          color: #e5e5e5 !important;
        }
        .ql-editor * {
          background-color: transparent !important;
          color: inherit !important;
        }
        .ql-snow .ql-stroke {
          stroke: #999 !important;
        }
        .ql-snow .ql-fill {
          fill: #999 !important;
        }
        .ql-snow .ql-picker {
          color: #999 !important;
        }
        .placeholder-pill {
          background-color: #3b82f6;
          color: white;
          padding: 2px 8px;
          border-radius: 6px;
          margin: 0 4px;
          font-weight: inherit;
          display: inline-block;
          font-size: 0.9em;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
          border: 1px solid rgba(255,255,255,0.2);
          cursor: default;
          user-select: none;
        }
      `}</style>
    </div>
  );
}
