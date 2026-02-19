"use client";

import { useState, useRef } from "react";
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
  LucideIcon
} from "lucide-react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

const API_BASE_URL = "http://localhost:3001";

type Tab = "upload" | "editor" | "preview";

interface RecipientData {
  email?: string;
  Email?: string;
  [key: string]: any;
}

interface SendResult {
  email: string;
  status: 'sent' | 'failed';
  error?: string;
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
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RecipientData[]>([]);
  const [subject, setSubject] = useState("");
  const [template, setTemplate] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<SendResult[] | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("upload");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const response = await axios.post(`${API_BASE_URL}/email/upload`, formData);
      setHeaders(response.data.headers);
      setRows(response.data.rows);
      setActiveTab("editor");
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload and parse Excel file.");
    } finally {
      setIsUploading(false);
    }
  };

  const insertPlaceholder = (header: string) => {
    const placeholder = `{${header}}`;
    setTemplate((prev) => prev + placeholder);
  };

  const handleSendEmails = async () => {
    if (!subject || !template || rows.length === 0) {
      alert("Please ensure subject, template, and recipients are ready.");
      return;
    }

    setIsSending(true);
    setResults(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/email/send`, {
        subject,
        template,
        recipients: rows,
      });
      setResults(response.data.results);
      setActiveTab("preview");
    } catch (error) {
      console.error("Sending failed", error);
      alert("Failed to send emails.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <header className="mb-12 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-4"
        >
          Email Seeder Pro
        </motion.h1>
        <p className="text-neutral-400 text-lg">Automate your outreach with precision and style.</p>
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
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md border-2 border-dashed border-neutral-700 rounded-3xl p-12 text-center hover:border-blue-500 hover:bg-blue-500/5 cursor-pointer transition-all group"
              >
                <Upload className="w-16 h-16 mx-auto mb-6 text-neutral-600 group-hover:text-blue-400 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold mb-2">Upload Excel File</h3>
                <p className="text-neutral-500">Drag and drop your .xlsx file here, or click to browse.</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".xlsx"
                />
              </div>

              {file && (
                <div className="mt-8 flex items-center space-x-3 bg-neutral-900 px-6 py-3 rounded-2xl">
                  <FileSpreadsheet className="text-emerald-400 w-5 h-5" />
                  <span className="text-neutral-300">{file.name}</span>
                  <CheckCircle2 className="text-emerald-500 w-4 h-4" />
                </div>
              )}
              {isUploading && <p className="mt-4 text-blue-400 animate-pulse">Parsing data...</p>}
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
                        theme="snow"
                        value={template}
                        onChange={setTemplate}
                        style={{ height: '300px', background: 'transparent' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Available Placeholders</h4>
                  <div className="bg-neutral-900/50 rounded-2xl p-4 border border-neutral-800/50 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
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
                        <span>Send to {rows.length} Recipients</span>
                      </>
                    )}
                  </button>
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
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">Execution Status</h3>
                <div className="flex space-x-4">
                  <div className="bg-emerald-500/10 text-emerald-400 px-4 py-1 rounded-full border border-emerald-500/20 text-sm font-medium">
                    {results?.filter(r => r.status === 'sent').length || 0} Sent
                  </div>
                  <div className="bg-rose-500/10 text-rose-400 px-4 py-1 rounded-full border border-rose-500/20 text-sm font-medium">
                    {results?.filter(r => r.status === 'failed').length || 0} Failed
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {results ? (
                  results.map((result, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${result.status === 'sent' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {result.status === 'sent' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>
                        <span className="font-medium">{result.email}</span>
                      </div>
                      {result.error && <span className="text-xs text-rose-500 italic max-w-xs truncate">{result.error}</span>}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-neutral-600 italic">No results to show.</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-12 text-center text-neutral-600 text-sm">
        &copy; 2026 Email Seeder Pro | Powered by NestJS & Next.js
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
        .ql-snow .ql-stroke {
          stroke: #999 !important;
        }
        .ql-snow .ql-fill {
          fill: #999 !important;
        }
        .ql-snow .ql-picker {
          color: #999 !important;
        }
      `}</style>
    </div>
  );
}
