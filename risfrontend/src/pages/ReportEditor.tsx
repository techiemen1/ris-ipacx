// src/pages/ReportEditor.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import ImageExtension from "@tiptap/extension-image";
import { SlashCommand } from '../lib/suggestionConfig';

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Save,
  Lock,
  Mic,
  MicOff,
  AlignLeft,
  AlignCenter,
  List,
  ListOrdered,
  X,
  Stethoscope,
  ImagePlus,
  Pencil
} from "lucide-react";
import { Button } from "../components/ui/button";
import "./ReportEditor.css";

// Premium Components
import { SmartTemplateSelector } from "../components/report/SmartTemplateSelector";
import { KeyImage } from "../components/report/KeyImagesPanel"; // Re-using for types, but panel is custom

type WorkflowStatus = "draft" | "final";

type PatientMeta = {
  patientName?: string;
  patientID?: string;
  modality?: string;
  accessionNumber?: string;
  studyDate?: string;
  patientSex?: string;
  patientAge?: string;
  referringPhysician?: string;
  bodyPart?: string;
  created_at?: string;
};

export default function ReportEditor({
  studyUID: propStudyUID,
  initialPatient,
  onClose,
}: {
  studyUID?: string;
  initialPatient?: PatientMeta;
  onClose?: () => void;
}) {
  const params = useParams();
  const studyUID = propStudyUID || params.studyId || "";

  const [status, setStatus] = useState<WorkflowStatus>("draft");
  const [patient, setPatient] = useState<PatientMeta | null>(initialPatient ?? null);
  const [keyImages, setKeyImages] = useState<KeyImage[]>([]);
  const [loading, setLoading] = useState(!initialPatient);

  // Sync patient if initialPatient changes (Split View switching)
  useEffect(() => {
    if (initialPatient) {
      setPatient(initialPatient);
    }
  }, [initialPatient]);

  // Settings
  const [orgSettings, setOrgSettings] = useState<{ name?: string, address?: string, logo?: string }>({});
  const [showKeyImages, setShowKeyImages] = useState(false); // Toggle for key images panel

  // UI State
  const [zoom] = useState(100);






  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Underline,
        Placeholder.configure({
          placeholder: "Type report content here…",
        }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TextStyle,
        FontFamily,
        Color,
        Highlight.configure({ multicolor: true }),
        Highlight.configure({ multicolor: true }),
        ImageExtension,
        SlashCommand,
      ],
      editable: status !== "final",
      editorProps: {
        attributes: {
          class: "print-content focus:outline-none min-h-[500px] prose max-w-none",
        },
      },
    },
    []
  );

  // Unified Data Fetching
  const [reportContent, setReportContent] = useState<string | null>(null);

  // 1. Fetch Data (Only re-run if studyUID changes)
  useEffect(() => {
    if (!studyUID) return;

    // If we already have patient data, no need to refetch meta
    const needsMeta = !patient || !patient.patientName;

    const load = async () => {
      try {
        if (needsMeta) setLoading(true);

        const promises: Promise<any>[] = [];

        // 1. Fetch Meta
        if (needsMeta) {
          promises.push(
            axiosInstance.get(`/studies/${studyUID}/meta`).then((r) => {
              if (r.data?.success) {
                setPatient((prev) => ({ ...prev, ...r.data.data }));
              }
            }).catch(err => console.warn("Meta fetch failed", err))
          );
        }

        // 2. Fetch Report Content
        promises.push(
          axiosInstance.get(`/reports/${encodeURIComponent(studyUID)}`).then((r) => {
            const d = r.data?.data;
            if (d) {
              setStatus(d.status || "draft");
              if (d.content) setReportContent(d.content);
            }
          }).catch(() => { /* Report might not exist yet */ })
        );

        // 3. Fetch Organization Settings
        promises.push(
          axiosInstance.get("/settings").then((r) => {
            if (r.data?.data?.org) {
              setOrgSettings(r.data.data.org);
            }
          }).catch(() => { })
        );

        await Promise.all(promises);
      } catch (e) {
        console.error("Context Load Error", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [studyUID, initialPatient]);

  // 2. Update Editor Content (Only when editor is ready and content is fetched)
  useEffect(() => {
    if (editor && reportContent && editor.isEmpty) {
      editor.commands.setContent(reportContent);
    }
  }, [editor, reportContent]);


  // Helper to format DICOM date (YYYYMMDD) or ISO date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    // DICOM format YYYYMMDD
    if (/^\d{8}$/.test(dateStr)) {
      const y = dateStr.slice(0, 4);
      const m = dateStr.slice(4, 6);
      const d = dateStr.slice(6, 8);
      return `${d}/${m}/${y}`;
    }
    // Try standard date
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr; // Return raw if invalid
      return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
    } catch {
      return dateStr;
    }
  };

  const header = useMemo(
    () => ({
      patientName: patient?.patientName || "—",
      patientID: patient?.patientID || "—",
      modality: patient?.modality || "—",
      accession: patient?.accessionNumber || "—",
      date: formatDate(patient?.studyDate || patient?.created_at),
      gender: patient?.patientSex || "—",
      age: patient?.patientAge || "—",
      refPhys: patient?.referringPhysician || "—",
      bodyPart: patient?.bodyPart || "",
      reportDate: new Date().toLocaleDateString(),
    }),
    [patient]
  );

  // Effect to update title when Body Part changes
  useEffect(() => {
    const titleInput = document.getElementById('report-title-input') as HTMLInputElement;
    if (titleInput && header.bodyPart) {
      const modalityPrefix = header.modality ? `${header.modality} ` : "";
      // Simplified title format as requested: [BODYPART] [MODALITY] RADIOLOGY REPORT
      titleInput.value = `${header.bodyPart.toUpperCase()} ${modalityPrefix}RADIOLOGY REPORT`.trim();
    }
  }, [header.bodyPart, header.modality]);

  // 3. Key Images
  const loadKeyImages = React.useCallback(async () => {
    try {
      const r = await axiosInstance.get(
        `/reports/${encodeURIComponent(studyUID)}/keyimages`
      );
      setKeyImages(r.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [studyUID]);

  useEffect(() => {
    if (studyUID) loadKeyImages();
  }, [loadKeyImages, studyUID]);

  const uploadKeyImage = async (file: File) => {
    try {
      const fd = new FormData();
      fd.append("image", file);
      await axiosInstance.post(
        `/reports/${encodeURIComponent(studyUID)}/keyimage/upload`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      loadKeyImages();
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(`Upload failed: ${err.response?.data?.message || err.message || "Unknown error"}`);
    }
  };

  const deleteKeyImage = async (id: string) => {
    if (window.confirm("Remove?")) {
      await axiosInstance.delete(`/reports/keyimage/${id}`);
      loadKeyImages();
    }
  };

  const insertKeyImageToEditor = (img: KeyImage) => {
    // Insert with inline-block for proper flow
    const html = `<img src="/api/uploads/keyimages/${img.file_path}" width="220" style="width: 220px; height: auto; display: inline-block; vertical-align: top; margin: 4px;" />`;
    editor?.chain().focus().insertContent(html).run();
  };



  // 4. Dictation
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        let transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          // --- CORE COMMANDS ---
          const lower = transcript.toLowerCase().trim();

          // 1. Control
          if (lower.includes("stop listening") || lower.includes("stop dictation")) {
            setListening(false);
            recognitionRef.current?.stop();
            return;
          }

          // 2. Editing
          if (lower.includes("clear report") || lower.includes("delete all")) {
            if (window.confirm("Voice Command: Clear entire report?")) {
              editor?.commands.clearContent();
            }
            return;
          }

          // 3. Navigation (Next Field)
          if (lower.includes("next field") || lower.includes("next placeholder")) {
            // Simple logic: Find next occurrence of '['
            const { from } = editor?.state.selection || { from: 0 };
            // We need full text to search. 
            // Ideally we write a custom TipTap extension for this, but for now we scan text.
            // This is a basic implementation.
            try {
              const docText = editor?.getText();
              if (docText) {
                const nextIndex = docText.indexOf('[', from);
                if (nextIndex !== -1) {
                  editor?.commands.setTextSelection(nextIndex + 1); // Jump inside [
                  return;
                }
              }
            } catch (e) { }
            return;
          }

          // --- FORMATTING ---
          transcript = transcript.replace(/new paragraph|next paragraph/gi, '<br/><br/>');
          transcript = transcript.replace(/next line/gi, '<br/>');
          transcript = transcript.replace(/ comma/gi, ',');
          transcript = transcript.replace(/ period| full stop/gi, '.');

          // --- TEMPLATES ---
          if (transcript.toLowerCase().includes("normal finding")) {
            transcript = "<strong>IMPRESSION:</strong><br/>Study is within normal limits. No acute abnormality detected.<br/><br/>";
          }
        }
        text += transcript;
      }

      // Only insert if it wasn't a command that returned early
      if (text) {
        editor?.chain().focus().insertContent(text + " ").run();
      }
    };
    recognitionRef.current = rec;
  }, [editor]);

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      alert("Speech Recognition not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    if (listening) recognitionRef.current?.stop();
    else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Mic Error:", e);
        setListening(false);
      }
    }
  };

  // 5. Actions
  const save = async (finalize = false) => {
    if (!editor) return;
    try {
      await axiosInstance.post(finalize ? "/reports/finalize" : "/reports/save", {
        studyUID,
        content: editor.getHTML(),
      });
      if (finalize) {
        setStatus("final");
        onClose?.();
      }
    } catch (err) {
      alert("Save failed");
    }
  };

  // Drag State
  const [isDragging, setIsDragging] = useState(false);
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        uploadKeyImage(file);
      }
    }
  };

  if (!editor) return null;

  return (
    <div
      className={`flex h-full w-full bg-[#1e293b] text-slate-100 font-sans overflow-hidden transition-colors ${isDragging ? 'ring-4 ring-blue-500 ring-inset bg-blue-900/20' : ''}`}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
    >
      {loading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 p-6 bg-slate-800 rounded-xl shadow-2xl border border-slate-700">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-slate-300">Loading Study Data...</span>
          </div>
        </div>
      )}

      {/* 1. VERTICAL TOOLBAR (Left) */}
      <div className="w-14 bg-[#0f172a] flex flex-col items-center py-4 gap-4 shrink-0 z-40 border-r border-slate-800">
        <div className="bg-blue-600 p-2 rounded-lg mb-2 shadow-lg shadow-blue-500/20">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>

        <div className="w-8 h-px bg-slate-800 my-1" />

        {/* Formatting Group */}
        <div className="flex flex-col gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md" onClick={() => editor.chain().focus().toggleBold().run()} data-active={editor.isActive('bold')} title="Bold (Ctrl+B)"><Bold size={18} /></Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md" onClick={() => editor.chain().focus().toggleItalic().run()} data-active={editor.isActive('italic')} title="Italic (Ctrl+I)"><Italic size={18} /></Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md" onClick={() => editor.chain().focus().toggleUnderline().run()} data-active={editor.isActive('underline')}><UnderlineIcon size={18} /></Button>
        </div>

        <div className="w-8 h-px bg-slate-800 my-1" />

        <div className="flex flex-col gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md" onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={18} /></Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md" onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={18} /></Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md" onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={18} /></Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={18} /></Button>

          {/* Key Images Toggle */}
          <div className="w-8 h-px bg-slate-800 my-1" />
          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 rounded-md ${showKeyImages ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            onClick={() => setShowKeyImages(!showKeyImages)}
            title="Toggle Key Images Panel"
          >
            <ImagePlus size={18} />
          </Button>
        </div>

        <div className="flex-1" />

        {/* Voice & Actions */}
        <div className="flex flex-col gap-4 mb-4">
          <Button
            onClick={toggleDictation}
            variant="ghost"
            size="icon"
            className={`h-10 w-10 rounded-xl transition-all ${listening ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            title="Voice Dictation"
          >
            {listening ? <MicOff size={20} /> : <Mic size={20} />}
          </Button>

          <Button variant="ghost" size="icon" onClick={() => save(false)} className="h-10 w-10 text-slate-400 hover:text-emerald-400 hover:bg-slate-800" title="Save Draft">
            <Save size={20} />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => save(true)} disabled={status === 'final'} className="h-10 w-10 text-slate-400 hover:text-blue-400 hover:bg-slate-800" title="Finalize Report">
            <Lock size={20} />
          </Button>

          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 text-slate-500 hover:text-red-400 hover:bg-slate-800 mt-2">
              <X size={22} />
            </Button>
          )}
        </div>
      </div>




      {/* 3. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#334155]">

        {/* Top Info Bar (Minimal) */}
        <div className="h-10 bg-[#1e293b] border-b border-slate-700 flex items-center justify-between px-4 shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-3 text-xs">
            <span className={`px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider ${status === 'final' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/50' : 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/50'}`}>
              {status}
            </span>
            <span className="text-slate-400 font-medium">
              {header.patientName}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">{header.date}</span>
          </div>

          <div className="flex items-center gap-2">
            <SmartTemplateSelector
              modality={header.modality}
              bodyPart=""
              onSelect={(html) => editor.chain().focus().insertContent(html).run()}
            />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative">

          {/* EDITOR CANVAS */}
          <div className="flex-1 overflow-y-auto overflow-x-auto p-8 flex flex-col items-center custom-scrollbar bg-slate-100/50">
            <div
              className="bg-white shadow-2xl ring-1 ring-black/50 print:shadow-none print:ring-0 mb-20 transition-transform origin-top"
              style={{
                width: '190mm', // Slightly reduced for sidebar safety
                minHeight: '297mm',
                transform: `scale(${zoom / 100})`,
                padding: '10mm 12mm',
              }}
            >
              <div className="flex flex-col items-center border-b-2 border-slate-900 pb-4 mb-4">
                {orgSettings.logo && (
                  <img src={orgSettings.logo} alt="Logo" className="h-16 mb-2 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                )}
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase text-center">
                  {orgSettings.name || "City General Hospital"}
                </h1>
              </div>


              {/* Patient Grid (Small & Decent - User Request) */}
              <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-xs mb-6 text-slate-800 font-medium bg-slate-50/50 border border-slate-200 p-3 rounded-lg relative group/info shadow-sm">
                {/* Reusable Inline Edit Component */}
                {[
                  // Row 1: Patient Name, ID, Age/Sex (Split)
                  { label: "Patient", key: "patientName", val: header.patientName, col: "col-span-2", font: "font-bold text-sm uppercase" },
                  { label: "ID", key: "patientID", val: header.patientID, font: "font-mono font-bold", col: "col-span-1" },
                  { label: "Age", key: "patientAge", val: header.age, col: "col-span-1" },

                  // Row 2: Modality, Accession, Ref By
                  { label: "Sex", key: "patientSex", val: header.gender, col: "col-span-1" },
                  { label: "Acc No", key: "accessionNumber", val: header.accession, font: "font-mono", col: "col-span-1" },
                  { label: "Ref. By", key: "referringPhysician", val: header.refPhys, col: "col-span-2", font: "font-semibold" },

                  // Row 3: Dates and Body Part
                  { label: "Date", key: "studyDate", val: header.date, col: "col-span-1" },
                  { label: "Reported", key: "reportDate", val: header.reportDate, readOnly: true, col: "col-span-1" },
                  { label: "Modality", key: "modality", val: header.modality, font: "font-black text-blue-700", col: "col-span-2" },

                  // Row 4
                  { label: "Body Part", key: "bodyPart", val: header.bodyPart, col: "col-span-4", font: "font-bold" }

                ].map((field) => (
                  <div key={field.key + (field.val || "")} className={`flex gap-2 items-baseline group/field cursor-pointer has-[:focus]:cursor-text ${field.col || ""}`} onClick={(e) => {
                    const input = e.currentTarget.querySelector('input');
                    if (input) input.focus();
                  }}>
                    <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wide select-none min-w-fit">{field.label}:</span>
                    <div className="relative flex-1 min-w-0 border-b border-transparent group-hover/field:border-slate-300 transition-colors">
                      <input
                        className={`bg-transparent border-none focus:ring-0 p-0 w-full transition-colors ${field.font || "uppercase font-semibold text-slate-700"} truncate`}
                        defaultValue={field.val}
                        readOnly={field.readOnly}
                        onBlur={(e) => {
                          if (field.readOnly) return;
                          const newVal = e.target.value;
                          if (newVal !== field.val) {
                            // Update State
                            setPatient((prev: any) => ({ ...prev, [field.key]: newVal }));
                            // Update Backend
                            axiosInstance.post(`/studies/${studyUID}/meta`, { ...patient, [field.key]: newVal }).catch(() => alert("Failed to save"));

                            // 3. SPECIAL LOGIC: If Body Part changed, update title
                            if (field.key === 'bodyPart') {
                              const titleInput = document.getElementById('report-title-input') as HTMLInputElement;
                              if (titleInput) {
                                titleInput.value = `${newVal} ${header.modality} REPORT`.toUpperCase();
                              }
                            }
                          }
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      />
                      {!field.readOnly && <Pencil size={10} className="absolute right-0 top-0.5 text-slate-400 opacity-0 group-hover/field:opacity-100 transition-opacity" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Editable Report Title */}
              <div className="mb-6 text-center group/title cursor-pointer relative" onClick={() => (document.getElementById('report-title-input') as HTMLInputElement)?.focus()}>
                <input
                  id="report-title-input"
                  type="text"
                  defaultValue={(`${header.bodyPart.toUpperCase()} ${header.modality ? header.modality + ' ' : ''}RADIOLOGY REPORT`).trim()}
                  className="w-full text-center font-bold tracking-tight text-slate-900 border-none focus:ring-0 bg-transparent uppercase placeholder:text-slate-300 text-lg py-1"
                  placeholder="REPORT TITLE..."
                />

                <div className="text-[10px] text-slate-300 mt-1 opacity-0 group-hover/title:opacity-100 transition-opacity">Editable Title</div>
              </div>

              <div className="min-h-[600px] text-slate-900 leading-relaxed report-content text-justify pb-16">
                <EditorContent editor={editor} />
              </div>

              {/* Footer - Dynamic Address - Pushed to bottom */}
              <div className="mt-auto">
                <div className="flex justify-between items-end mb-8">
                  <div className="text-center min-w-[200px]">
                    <div className="h-12 w-48 border-b border-dotted border-slate-300 mx-auto mb-2"></div>
                    <p className="font-bold text-xs text-slate-500 uppercase">Referring Physician</p>
                  </div>

                  <div className="text-center min-w-[200px]">
                    {status === 'final' && (
                      <div className="h-16 mb-2 flex items-end justify-center">
                        <span className="font-cursive text-2xl text-blue-700/80 transform -rotate-6">Signed Digitally</span>
                      </div>
                    )}
                    <div className="h-px w-48 bg-slate-900 mx-auto mb-2"></div>
                    <p className="font-bold text-sm text-slate-900">Dr. Result Consultant</p>
                    <p className="text-xs text-slate-500">MD, Radiodiagnosis</p>
                  </div>
                </div>

                {/* Smart Footer Layout (Line 1: Address, Line 2: Contacts) */}
                <div className="border-t border-slate-300 pt-3 text-center text-xs text-slate-500 font-medium pb-4">
                  {/* Line 1 */}
                  <div className="mb-1 text-slate-700 font-bold">
                    {orgSettings.address || "123 Medical Drive, Health City"}
                  </div>

                  {/* Line 2 - Compact Single Line (Increased Font) */}
                  {/* Line 2 - Compact Wrapped Line */}
                  <div className="flex justify-center items-center gap-x-3 text-[11px] text-slate-600 px-4 whitespace-nowrap overflow-hidden text-ellipsis">
                    {(orgSettings as any).enquiryPhone && <span>📞 {(orgSettings as any).enquiryPhone}</span>}
                    {(orgSettings as any).contactPhone && (
                      <>
                        <span className="text-slate-400">|</span>
                        <span>🚨 {(orgSettings as any).contactPhone}</span>
                      </>
                    )}
                    {(orgSettings as any).email && (
                      <>
                        <span className="text-slate-400">|</span>
                        <span>✉️ {(orgSettings as any).email}</span>
                      </>
                    )}
                    {(orgSettings as any).website && (
                      <>
                        <span className="text-slate-400">|</span>
                        <span>🌐 {(orgSettings as any).website}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* 3. KEY IMAGES POP-UP PANEL (Draggable & Fixed Grid) */}
          {(showKeyImages || keyImages.length > 0) && (
            <DraggablePanel onClose={() => setShowKeyImages(false)}>
              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {/* Drag Hint */}
                <div className="text-center p-2 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50 mb-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Drag Image to Report</p>
                </div>

                <div className="grid grid-cols-2 gap-2 content-start">
                  {keyImages.map((img) => (
                    <div key={img.id} className="relative group bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all overflow-hidden flex flex-col w-full min-w-0"
                      draggable
                      onDragStart={(e) => {
                        // FIX: Use inline-block with vertical-align for reliable side-by-side in Tiptap
                        const html = `<img src="/api/uploads/keyimages/${img.file_path}" alt="Key Image" width="220" style="width: 220px; height: auto; display: inline-block; vertical-align: top; margin: 4px;" />`;
                        e.dataTransfer.setData("text/html", html);
                        e.dataTransfer.setData("text/plain", html);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                    >
                      <div className="aspect-square w-full relative cursor-grab active:cursor-grabbing bg-slate-100">
                        <img src={`/api/uploads/keyimages/${img.file_path}`} className="w-full h-full object-cover pointer-events-none" alt="Key" />
                        <button className="absolute top-1 right-1 p-1 bg-red-500 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity rounded shadow-sm z-10" onClick={(e) => { e.stopPropagation(); deleteKeyImage(img.id); }}>
                          <X size={10} />
                        </button>
                      </div>
                      <div className="border-t border-slate-100 bg-white shrink-0">
                        <Button size="sm" variant="ghost" className="w-full text-[10px] h-6 text-blue-600 hover:bg-blue-50 font-medium rounded-none" onClick={() => insertKeyImageToEditor(img)}>
                          Insert
                        </Button>
                      </div>
                    </div>
                  ))}

                  <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-50 cursor-pointer bg-slate-50 transition-all group w-full min-w-0">
                    <ImagePlus size={20} className="mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-bold uppercase">Upload</span>
                    <input type="file" hidden accept="image/*" onChange={(e) => e.target.files?.[0] && uploadKeyImage(e.target.files[0])} />
                  </label>
                </div>
              </div>
            </DraggablePanel>
          )}

        </div>
      </div>
    </div >
  );
}

// Helper Component for Draggable Floating Panel
function DraggablePanel({ children, onClose }: { children: React.ReactNode, onClose: () => void }) {
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };
    const onMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      className="absolute z-50 flex flex-col transition-shadow duration-300"
      style={{ left: position.x, top: position.y }}
    >
      <div className="w-72 bg-white/95 backdrop-blur shadow-2xl rounded-xl border border-slate-200 flex flex-col h-[500px] overflow-hidden ring-1 ring-black/5">
        {/* Header - Draggable Area */}
        <div
          className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-100 cursor-move select-none"
          onMouseDown={onMouseDown}
        >
          <div className="flex items-center gap-2 pointer-events-none">
            <div className="bg-blue-100 p-1.5 rounded-md text-blue-600"><ImagePlus size={14} /></div>
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Key Images</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-slate-200 rounded-full" onClick={onClose}><X size={14} /></Button>
        </div>

        {children}
      </div>
    </div>
  );
}
