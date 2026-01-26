// src/pages/ReportEditor.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import DOMPurify from "dompurify";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import ImageExtension from "@tiptap/extension-image";
import { SlashCommand } from "../lib/suggestionConfig";

import {
  Bold, Italic, Underline as UnderlineIcon, Save, Lock, Mic, MicOff,
  AlignLeft, AlignCenter, AlignJustify, List, ListOrdered, X, Stethoscope, ImagePlus, Pencil,
  Phone, Siren, Mail, Globe, Printer, Eye, Strikethrough, Type, Sigma, AlertTriangle,
  Table as TableIcon, Minus, Trash2, Info, History, Calendar, ChevronRight, ExternalLink, RefreshCcw, Command
} from "lucide-react";
import { Button } from "../components/ui/button";
import { SmartTemplateSelector } from "../components/report/SmartTemplateSelector";
import { KeyImage } from "../components/report/KeyImagesPanel";
import "./ReportEditor.css";

type WorkflowStatus = "draft" | "preliminary" | "final" | "addendum";

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

type PriorStudy = {
  studyUID: string;
  accession: string;
  modality: string;
  description: string;
  date: string;
  reportStatus: WorkflowStatus | null;
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
  const [patient, setPatient] = useState<PatientMeta | null>(initialPatient || null);
  const [keyImages, setKeyImages] = useState<KeyImage[]>([]);
  const [loading, setLoading] = useState(!initialPatient);
  const [isSaving, setIsSaving] = useState(false);
  const [workflowNote, setWorkflowNote] = useState<string>("");
  const [showWorkflowPanel, setShowWorkflowPanel] = useState(true);
  const [clinicalHistory, setClinicalHistory] = useState<string>("");
  const [orgSettings, setOrgSettings] = useState<{ name?: string; address?: string; logo?: string; enquiryPhone?: string; contactPhone?: string; email?: string; website?: string }>({});
  const [showKeyImages, setShowKeyImages] = useState(false);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [isTitleManual, setIsTitleManual] = useState(false);
  const [priors, setPriors] = useState<PriorStudy[]>([]);
  const [loadingPriors, setLoadingPriors] = useState(false);
  const [selectedPriorReport, setSelectedPriorReport] = useState<{ title: string; content: string } | null>(null);
  const [fetchingPriorReport, setFetchingPriorReport] = useState(false);
  const [modalities, setModalities] = useState<any[]>([]);
  const [dict, setDict] = useState<any>(null);
  const [isLockedMic, setIsLockedMic] = useState(false);
  const [voiceNotes, setVoiceNotes] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"context" | "notes">("context");

  // Load dictation dictionary
  useEffect(() => {
    fetch('/radiology_dictionary.json')
      .then(res => res.json())
      .then(data => setDict(data))
      .catch(err => console.error("Failed to load dictation dictionary:", err));
  }, []);

  const loadPriors = useCallback(async () => {
    if (!patient?.patientID) return;
    setLoadingPriors(true);
    try {
      const res = await axiosInstance.get(`/studies/patient/${patient.patientID}/priors?currentStudyUID=${studyUID}`);
      if (res.data?.success) {
        setPriors(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch priors:", err);
    } finally {
      setLoadingPriors(false);
    }
  }, [patient?.patientID, studyUID]);

  // Load priors and modalities
  useEffect(() => {
    loadPriors();

    axiosInstance.get("/modalities").then(r => {
      if (r.data?.data) setModalities(r.data.data);
    }).catch(console.error);
  }, [loadPriors]);

  const fetchPriorReport = async (prior: PriorStudy) => {
    setFetchingPriorReport(true);
    try {
      const res = await axiosInstance.get(`/reports/${prior.studyUID}`);
      if (res.data?.success && res.data.data) {
        setSelectedPriorReport({
          title: `${prior.modality} - ${prior.description} (${formatDate(prior.date)})`,
          content: res.data.data.content
        });
      } else {
        alert("Report content not found or study not finalized.");
      }
    } catch (err) {
      console.error("Failed to fetch prior report:", err);
      alert("Error loading report content.");
    } finally {
      setFetchingPriorReport(false);
    }
  };

  const getModalityColor = (modalityName?: string) => {
    const mod = (modalityName || "").toUpperCase();
    // 1. Try to find a exact match in user settings
    const settingColor = modalities.find(m => m.name.toUpperCase() === mod || m.ae_title.toUpperCase() === mod)?.color;
    if (settingColor) return settingColor;

    // 2. Fallback to hardcoded clinical colors (Tailwind class names or hex)
    if (mod.includes("CT")) return "#f59e0b"; // amber-500
    if (mod.includes("MR")) return "#3b82f6"; // blue-500
    if (mod.includes("US")) return "#a855f7"; // purple-500
    if (mod.includes("XR") || mod.includes("CR") || mod.includes("DX")) return "#64748b"; // slate-500
    return "#94a3b8"; // slate-400
  };

  // Auto-calculated title based on Modality + Body Part
  const calculatedTitle = useMemo(() => {
    if (isTitleManual && customTitle) return customTitle;
    const parts = [];
    if (patient?.modality) parts.push(patient.modality);
    if (patient?.bodyPart && !patient.bodyPart.includes("(")) parts.push(patient.bodyPart);
    parts.push("RADIOLOGY REPORT");
    return parts.join(" ");
  }, [patient?.modality, patient?.bodyPart, isTitleManual, customTitle]);

  // Sync customTitle if not manual
  useEffect(() => {
    if (!isTitleManual) {
      setCustomTitle(calculatedTitle);
    }
  }, [calculatedTitle, isTitleManual]);

  // Auto-Recovery key
  const DRAFT_KEY = `report_draft_${studyUID}`;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: "Type report content here..." }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      ImageExtension,
      SlashCommand,
    ],
    editorProps: {
      attributes: {
        class: "print-content focus:outline-none min-h-[300px] prose max-w-none text-slate-800 leading-relaxed font-sans",
        'data-modality': patient?.modality || "",
      },
    },
    onUpdate: ({ editor }) => {
      // Auto-save to LocalStorage every keystroke
      localStorage.setItem(DRAFT_KEY, editor.getHTML());
    }
  });

  // Sync modality to editor for contextual suggestions
  useEffect(() => {
    if (editor && patient?.modality) {
      editor.setOptions({
        editorProps: {
          attributes: {
            ...editor.options.editorProps.attributes,
            'data-modality': patient.modality,
          }
        }
      });
    }
  }, [editor, patient?.modality]);

  const safeAxios = async (fn: () => Promise<any>, fallback?: any) => {
    try {
      return await fn();
    } catch (err) {
      console.warn("API Error:", err);
      return fallback;
    }
  };

  // Expert Data Normalization & Cleaning
  const normalizePatient = useCallback((raw: any): PatientMeta => {
    const data = raw || {};
    const cleanMod = (val: any) => {
      if (!val) return "";
      const s = String(val).trim();
      // Expert cleaning of messy PACS placeholders
      if (/^[-_.]+$/.test(s)) return ""; // "---" or "..."
      if (["undefined", "null", "pending", "unknown"].includes(s.toLowerCase())) return "";
      return s;
    };
    return {
      patientName: cleanMod(data.patientName || data.patient_name || data.PatientName),
      patientID: cleanMod(data.patientID || data.patient_id || data.PatientID),
      modality: cleanMod(data.modality || data.Modality || (Array.isArray(data.ModalitiesInStudy) ? data.ModalitiesInStudy[0] : data.ModalitiesInStudy)),
      accessionNumber: cleanMod(data.accessionNumber || data.accession_number || data.AccessionNumber),
      studyDate: cleanMod(data.studyDate || data.study_date || data.StudyDate),
      patientSex: cleanMod(data.patientSex || data.patient_sex || data.PatientSex),
      patientAge: cleanMod(data.patientAge || data.patient_age || data.PatientAge),
      referringPhysician: cleanMod(data.referringPhysician || data.referring_physician || data.ReferringPhysicianName),
      bodyPart: cleanMod(data.bodyPart || data.body_part || data.BodyPartExamined),
    };
  }, []);

  // 4-Layer Waterfall Fetching
  useEffect(() => {
    if (!studyUID) return;

    const loadData = async () => {
      // NUCLEAR STATE RESET: Prevent ALL Bleeding from previous studies
      setLoading(true);
      setStatus("draft");          // Reset to draft (fixes "Final" status persistence)
      setKeyImages([]);            // Clear images
      setReportContent(null);      // Clear editor content
      setPartialText("");          // Clear dictation buffer
      setPatient(null);            // Clear patient meta temporary
      setCustomTitle("");          // Clear title
      setIsTitleManual(false);     // Reset manual flag

      // Layer 1: Existing Saved Report (Highest Authority)
      let reportData: any = null;
      await safeAxios(async () => {
        const r = await axiosInstance.get(`/reports/${encodeURIComponent(studyUID)}`);
        if (r.data?.success && r.data.data) {
          reportData = r.data.data;
          setStatus(reportData.status || "draft");
          if (reportData.reportTitle) {
            setCustomTitle(reportData.reportTitle);
            setIsTitleManual(true);
          }
          if (reportData.content) {
            setReportContent(reportData.content);
            if (reportData.workflowNote) {
              setWorkflowNote(reportData.workflowNote);
            }
          }
        }
      });

      // Layer 2: Local DB Meta
      let dbMeta: any = {};
      await safeAxios(async () => {
        const r = await axiosInstance.get(`/studies/${studyUID}/meta`);
        if (r.data?.success) dbMeta = normalizePatient(r.data.data);
      });

      // Layer 3: Deep PACS Tags (Source of Truth)
      let pacsMeta: any = {};
      await safeAxios(async () => {
        const r = await axiosInstance.get(`/studies/${studyUID}/dicom-tags`);
        if (r.data?.tags) pacsMeta = normalizePatient(r.data.tags);
      });

      // Layer 4: Local Storage Recovery (Safety Net)
      const localDraft = localStorage.getItem(DRAFT_KEY);
      if (!reportData?.content && localDraft) {
        console.log("♻️ Recovered Draft from LocalStorage");
        setReportContent(localDraft);
      }

      // MERGE: Report(High) > PACS(Mid) > DB(Low)
      const merged = {
        ...dbMeta,
        ...pacsMeta,          // PACS overrides DB
        ...(reportData || {}), // Saved Report overrides all
      };

      // INTELLIGENT PARSING: Extract Age/Sex from Name if missing
      // Pattern: "Name 34Y/M" or "Name 34Y M" or "Name (34Y/M)"
      if (merged.patientName && (!merged.patientAge || !merged.patientSex)) {
        const name = merged.patientName;
        const ageMatch = name.match(/(\d{1,3})[Yy]/);
        const sexMatch = name.match(/\b([MFmf])\b/) || name.match(/\/([MFmf])/);

        if (ageMatch && !merged.patientAge) merged.patientAge = ageMatch[1];
        if (sexMatch && !merged.patientSex) merged.patientSex = sexMatch[1].toUpperCase();

        // Optional: Clean the name? usually medical legal requires keeping original string
        // but we can offer a cleaned version if user asks. For now, keep as is.
      }

      setPatient(merged); // STRICT OVERWRITE - Fixes "Previous Patient Cache" issue
      setLoading(false);
    };

    // Parallel Org Settings - Always fetch fresh
    safeAxios(async () => {
      const r = await axiosInstance.get("/settings");
      if (r.data?.data?.org) setOrgSettings(r.data.data.org);
    });

    loadData();

    // Cleanup: Reset state when studyUID changes to prevent flash of old data
    return () => {
      setPatient(null);
      setReportContent(null);
    };
  }, [studyUID]);

  useEffect(() => {
    if (editor && reportContent && editor.isEmpty) {
      editor.commands.setContent(reportContent);
    }
  }, [editor, reportContent]);

  // Initial Format of Date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    let d = dateStr;
    if (d.includes("T")) d = d.split("T")[0]; // Handle ISO
    if (d.includes("-")) {
      const parts = d.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`; // YYYY-MM-DD -> DD/MM/YYYY
    }
    if (/^\d{8}$/.test(d)) return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
    return d;
  }

  // Effect to populate formatted dates once
  useEffect(() => {
    if (patient?.studyDate && !patient.studyDate.includes("-") && !patient.studyDate.includes("/")) {
      setPatient(p => p ? ({ ...p, studyDate: formatDate(p.studyDate) }) : null);
    }
  }, [patient?.studyDate]);

  // Auto-Title Logic
  useEffect(() => {
    if (!isTitleManual) {
      const autoTitle = patient?.modality || patient?.bodyPart
        ? `${patient.modality || ""} ${patient.bodyPart || ""} RADIOLOGY REPORT`.replace(/\s+/g, ' ').trim()
        : "RADIOLOGY REPORT";
      setCustomTitle(autoTitle);
    }
  }, [patient?.modality, patient?.bodyPart, isTitleManual]);

  // Report Date State (Editable)
  const [reportDate, setReportDate] = useState(new Date().toLocaleDateString('en-GB'));

  const header = useMemo(() => ({
    reportDate: reportDate,
  }), [reportDate]);

  const loadKeyImages = async () => {
    const r = await safeAxios(() => axiosInstance.get(`/reports/${encodeURIComponent(studyUID)}/keyimages`));
    setKeyImages(r?.data?.data || []);
  };
  useEffect(() => { if (studyUID) loadKeyImages(); }, [studyUID]);

  const uploadKeyImage = async (file: File) => {
    const fd = new FormData(); fd.append("image", file);
    await safeAxios(async () => {
      await axiosInstance.post(`/reports/${encodeURIComponent(studyUID)}/keyimage/upload`, fd);
      loadKeyImages();
    });
  };

  const deleteKeyImage = async (id: string) => {
    if (confirm("Delete image?")) {
      await safeAxios(() => axiosInstance.delete(`/reports/keyimage/${id}`));
      loadKeyImages();
    }
  };

  const insertKeyImageToEditor = (img: KeyImage) => {
    editor?.chain().focus().insertContent(`<img src="/api/uploads/keyimages/${img.file_path}" width="220" style="display:inline-block; margin:4px; border:1px solid #ddd;"/>`).run();
  };

  // -------------------------
  // SAVE / FINALIZE LOGIC
  // -------------------------
  const save = async (finalize = false) => {
    if (!editor) return;
    const content = editor.getHTML();

    // SAFETY CHECK
    if (finalize) {
      const text = editor.getText().trim();
      if (!text || text.length < 10) {
        alert("⚠️ Empty Report");
        return;
      }
      if (!patient?.patientID) {
        alert("⚠️ Missing Patient ID");
        return;
      }
    }

    setIsSaving(true);
    await safeAxios(async () => {
      await axiosInstance.post("/reports/save", {
        studyUID,
        content,
        // We save the *EDITED* patient values
        patientName: patient?.patientName,
        patientID: patient?.patientID,
        modality: patient?.modality,
        accessionNumber: patient?.accessionNumber,
        studyDate: patient?.studyDate,
        reportTitle: customTitle,
        workflow_note: workflowNote,
        workflow_status: finalize ? (status === 'addendum' ? 'addendum' : 'final') : status
      });

      localStorage.removeItem(DRAFT_KEY); // Clear draft on success

      if (finalize) {
        if (status !== 'addendum') setStatus("final");
        editor.setEditable(false);
        alert(`✅ Verified & Signed!`);
        onClose?.();
      } else {
        // Pulse effect handled by UI state
        setTimeout(() => setIsSaving(false), 500);
      }
    });
    setIsSaving(false);
  };

  const handlePrint = () => {
    // Set dynamic filename for browser print dialog
    const oldTitle = document.title;
    const cleanName = (patient?.patientName || "Report").replace(/[^a-z0-9]/gi, '_');
    const acc = patient?.accessionNumber || "000";
    document.title = `${cleanName}_${acc}`;

    document.body.classList.add('is-printing-report');
    window.print();

    // Restore original title
    setTimeout(() => {
      document.body.classList.remove('is-printing-report');
      document.title = oldTitle;
    }, 500);
  };

  // Dictation V3 (WebSocket)
  const [listening, setListening] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [partialText, setPartialText] = useState("");

  const startDictation = async (target: "editor" | "notes" = "editor") => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Microphone API Missing. Ensure HTTPS is active.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch (err: any) {
      alert(`Microphone access denied: ${err.name}`);
      return;
    }

    let audioContext: AudioContext;
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      if (audioContext.state === 'suspended') await audioContext.resume();
    } catch (err: any) {
      alert(`Audio Engine Error: ${err.name}`);
      return;
    }

    try {
      const source = audioContext.createMediaStreamSource(stream);
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/vosk`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ config: { sampleRate: audioContext.sampleRate } }));
        setIsSaving(false); // Reuse saving indicator or add new one? For now just silent success
      };

      ws.onerror = (e) => {
        console.error("Vosk WebSocket Error:", e);
        alert("Dictation Error: WebSocket connection failed. Verify server is running.");
        stopDictation();
      };

      ws.onmessage = (event) => {
        const result = JSON.parse(event.data);
        if (result.final && result.text) {
          // Smart Formatting for Medical Grade Dictation
          let text = result.text;

          // capitalization
          if (text.length > 0) text = text.charAt(0).toUpperCase() + text.slice(1);

          // Dynamic Expansion & Autocorrect from Dictionary
          if (dict) {
            // 1. Voice Variants (e.g. "calc" -> "calcification")
            if (dict.voice_variants) {
              Object.entries(dict.voice_variants).forEach(([shortcut, full]: [string, any]) => {
                const regex = new RegExp(`\\b${shortcut}\\b`, 'gi');
                text = text.replace(regex, full);
              });
            }

            // 2. Expansions & Abbreviations (e.g. "nad" -> "NAD (No Abnormality Detected)")
            if (dict.expansions) {
              Object.entries(dict.expansions).forEach(([shortcut, full]: [string, any]) => {
                const regex = new RegExp(`\\b${shortcut}\\b`, 'gi');
                text = text.replace(regex, full);
              });
            }

            // 3. Indian Terminology / Common Phrasings (Ensure correct casing)
            if (dict.indian_specific) {
              dict.indian_specific.forEach((phrase: string) => {
                const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
                text = text.replace(regex, phrase);
              });
            }
          }

          // punctuation replacement
          text = text.replace(/ period/g, ".")
            .replace(/ full stop/g, ".")
            .replace(/ comma/g, ",")
            .replace(/ question mark/g, "?")
            .replace(/ new line/g, "\n")
            .replace(/ paragraph/g, "\n\n");

          // Ensure space after punctuation if missing
          text = text.replace(/([.,?])([^\s])/g, '$1 $2');

          if (activeTab === 'notes') {
            setVoiceNotes(prev => prev + text + " ");
          } else {
            editor?.chain().focus().insertContent(text + " ").run();
          }
          setPartialText("");
        } else if (result.text) {
          setPartialText(result.text);
        }
      };

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e: any) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const buffer = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            buffer[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          ws.send(buffer.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      setListening(true);
    } catch (err: any) {
      alert(`Processor Error: ${err.message}`);
    }
  };

  // Re-start logic for Locked Mic if it drops
  useEffect(() => {
    if (isLockedMic && !listening) {
      startDictation();
    }
  }, [isLockedMic, listening]);

  const stopDictation = () => {
    wsRef.current?.close();
    wsRef.current = null;
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
    setListening(false);
    setPartialText("");
  };

  const toggleDictation = () => { if (listening) stopDictation(); else startDictation(); };

  // Advanced Sidebar Actions
  const insertSymbol = (symbol: string) => {
    editor?.chain().focus().insertContent(symbol).run();
  };

  const insertCriticalFlag = () => {
    editor?.chain().focus()
      .insertContent('<div class="critical-finding-alert">⚠️ CRITICAL FINDING: </div>')
      .run();
  };

  const insertMeasurementTable = () => {
    editor?.chain().focus()
      .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
      .run();
  };

  if (!editor) return null;

  return (
    <div className="flex h-screen w-full bg-slate-100 text-slate-900 font-sans overflow-hidden">

      {/* MEDICAL GRADE VERTICAL COMMAND CENTER */}
      <div className="medical-sidebar no-print shadow-xl">
        {/* Branding/Top Icon */}
        <div className="sidebar-group mb-2">
          <div className="bg-blue-600 p-2 rounded-xl shadow-md border border-blue-400">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* 1. FORMATTING GROUP */}
        <div className="sidebar-group">
          <span className="sidebar-label">Format</span>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={`sidebar-btn ${editor.isActive('bold') ? 'active' : ''}`} title="Bold (Ctrl+B)"><Bold size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={`sidebar-btn ${editor.isActive('italic') ? 'active' : ''}`} title="Italic (Ctrl+I)"><Italic size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`sidebar-btn ${editor.isActive('underline') ? 'active' : ''}`} title="Underline (Ctrl+U)"><UnderlineIcon size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleStrike().run()} className={`sidebar-btn ${editor.isActive('strike') ? 'active' : ''}`} title="Strikethrough"><Strikethrough size={18} /></Button>

          <div className="sidebar-divider my-1" />

          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`sidebar-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`} title="Align Left"><AlignLeft size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`sidebar-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`} title="Align Center"><AlignCenter size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`sidebar-btn ${editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}`} title="Justify"><AlignJustify size={18} /></Button>
        </div>

        {/* 2. SCIENTIFIC & TOOLS */}
        <div className="sidebar-group">
          <span className="sidebar-label">Medical</span>
          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="icon" onClick={() => insertSymbol('°')} className="sidebar-btn" title="Degree Symbol (°)"><span className="text-xs font-bold">°</span></Button>
            <Button variant="ghost" size="icon" onClick={() => insertSymbol('±')} className="sidebar-btn" title="Plus-Minus (±)"><span className="text-xs font-bold">±</span></Button>
            <Button variant="ghost" size="icon" onClick={() => insertSymbol('µ')} className="sidebar-btn" title="Micro (µ)"><span className="text-xs font-bold">µ</span></Button>
          </div>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} className="sidebar-btn text-orange-500" title="Clear All Formatting"><Type size={18} /></Button>
        </div>

        {/* 3. INSERT GROUP */}
        <div className="sidebar-group">
          <span className="sidebar-label">Insert</span>
          <Button variant="ghost" size="icon" onClick={() => setShowKeyImages(!showKeyImages)} className={`sidebar-btn ${showKeyImages ? 'active text-blue-600' : ''}`} title="Key Images Panel"><ImagePlus size={19} /></Button>
          <Button variant="ghost" size="icon" onClick={insertCriticalFlag} className="sidebar-btn text-red-500 hover:bg-red-50" title="FLAG CRITICAL FINDING"><AlertTriangle size={19} /></Button>
          <Button variant="ghost" size="icon" onClick={insertMeasurementTable} className="sidebar-btn text-purple-600 hover:bg-purple-50" title="Insert Measurement Table"><TableIcon size={19} /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="sidebar-btn" title="Horizontal Divider"><Minus size={19} /></Button>
        </div>

        <div className="flex-1" />

        {/* 4. SYSTEM ACTIONS - MINIMIZED */}
        <div className="sidebar-group border-t border-slate-100 pt-4 pb-2">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="sidebar-btn text-slate-400 hover:text-red-500 hover:bg-red-50" title="Exit Editor">
              <X size={22} />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full relative bg-slate-50">

        {/* TOP CONTROL STRIP - REFINED */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-40 no-print shadow-sm control-strip-glass">
          <div className="flex items-center gap-6">
            {/* Dictation Controller */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDictation}
              className={`h-9 px-4 gap-2 border-slate-200 rounded-full shadow-sm transition-all duration-300 ${listening ? 'bg-red-50 border-red-500 text-red-600 ring-4 ring-red-500/10' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <div className={`w-2 h-2 rounded-full ${listening ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className="text-[10px] font-bold uppercase tracking-tight">{listening ? 'Listening...' : 'Start Dictation'}</span>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <SmartTemplateSelector
              modality={patient?.modality}
              bodyPart={patient?.bodyPart}
              gender={patient?.patientSex}
              onSelect={(c) => editor?.commands.setContent(c)}
            />
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 gap-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg shadow-sm">
              <Printer size={15} /> <span className="text-[10px] font-bold uppercase">Print</span>
            </Button>
          </div>
        </div>

        {/* MAIN BODY: EDITOR + WORKFLOW PANEL */}
        <div className="flex-1 flex overflow-hidden relative">

          {/* EDITOR SCROLL AREA */}
          <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center custom-scrollbar bg-slate-50/50">
            <div className="printable-area transform scale-[0.9] md:scale-100 shadow-2xl origin-top">
              {/* HOSPITAL HEADER - EDITABLE */}
              <div className="text-center mb-0 mt-0">
                <input
                  className="field-input-reset text-center text-3xl font-bold text-slate-900 uppercase tracking-wide font-sans w-full bg-transparent placeholder-slate-300 focus:placeholder-transparent no-print"
                  value={orgSettings.name || ""}
                  onChange={e => setOrgSettings(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="HOSPITAL NAME"
                />
                <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-widest font-serif-premium only-print mb-1 mt-1">{orgSettings.name || "CAPRICORN HOSPITALS"}</h1>
              </div>

              {/* PATIENT CARD - FIXED COLUMNS */}
              <table className="patient-card-table mb-1">
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '46%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '18%' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td className="label-cell">PATIENT NAME</td>
                    <td className="val-cell">
                      <textarea
                        rows={1}
                        className="field-input-reset block w-full no-print"
                        value={patient?.patientName || ""}
                        onChange={e => setPatient(p => ({ ...p!, patientName: e.target.value }))}
                        onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                      />
                      <span className="only-print">{patient?.patientName || "—"}</span>
                    </td>
                    <td className="label-cell">AGE / SEX</td>
                    <td className="val-cell">
                      <div className="flex gap-1 no-print">
                        <input className="field-input-reset w-8" value={patient?.patientAge || ""} onChange={e => setPatient(p => ({ ...p!, patientAge: e.target.value }))} placeholder="00" />
                        <span>/</span>
                        <input className="field-input-reset w-8" value={patient?.patientSex || ""} onChange={e => setPatient(p => ({ ...p!, patientSex: e.target.value }))} placeholder="M" />
                      </div>
                      <span className="only-print">{patient?.patientAge}/{patient?.patientSex}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="label-cell">PATIENT ID</td>
                    <td className="val-cell">
                      <input className="field-input-reset no-print" value={patient?.patientID || ""} onChange={e => setPatient(p => ({ ...p!, patientID: e.target.value }))} />
                      <span className="only-print">{patient?.patientID}</span>
                    </td>
                    <td className="label-cell">ACCESSION</td>
                    <td className="val-cell">
                      <input className="field-input-reset no-print" value={patient?.accessionNumber || ""} onChange={e => setPatient(p => ({ ...p!, accessionNumber: e.target.value }))} />
                      <span className="only-print">{patient?.accessionNumber}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="label-cell">REF DOCTOR</td>
                    <td className="val-cell">
                      <input className="field-input-reset no-print" value={patient?.referringPhysician || ""} onChange={e => setPatient(p => ({ ...p!, referringPhysician: e.target.value }))} />
                      <span className="only-print">{patient?.referringPhysician}</span>
                    </td>
                    <td className="label-cell">SCAN DATE</td>
                    <td className="val-cell">
                      <input
                        className="field-input-reset no-print"
                        value={
                          patient?.studyDate?.includes("T")
                            ? formatDate(patient.studyDate)
                            : (patient?.studyDate?.includes("-") && patient.studyDate.length === 10
                              ? formatDate(patient.studyDate)
                              : (patient?.studyDate || ""))
                        }
                        onChange={e => setPatient(p => ({ ...p!, studyDate: e.target.value }))}
                        placeholder="DD/MM/YYYY"
                      />
                      <span className="only-print">{formatDate(patient?.studyDate)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="label-cell">MODALITY</td>
                    <td className="val-cell font-bold text-blue-900">
                      <input className="field-input-reset no-print" value={patient?.modality || ""} onChange={e => setPatient(p => ({ ...p!, modality: e.target.value }))} placeholder="MODALITY" />
                      <span className="only-print">{patient?.modality}</span>
                    </td>
                    <td className="label-cell">REPORT DATE</td>
                    <td className="val-cell">
                      <input
                        className="field-input-reset no-print"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        placeholder="DD/MM/YYYY"
                      />
                      <span className="only-print">{reportDate}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="label-cell">BODY PART</td>
                    <td className="val-cell" colSpan={3}>
                      <input className="field-input-reset no-print" value={patient?.bodyPart || ""} onChange={e => setPatient(p => ({ ...p!, bodyPart: e.target.value }))} placeholder="BODY PART (e.g. CHEST, ABDOMEN)" />
                      <span className="only-print">{patient?.bodyPart}</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* REPORT TITLE - EDITABLE */}
              <div className="flex justify-center mb-2">
                <div className="text-center py-1 border-b-2 border-slate-900 w-full px-4">
                  <input
                    className="field-input-reset text-center text-xl font-bold uppercase tracking-widest w-full placeholder-slate-400 focus:placeholder-transparent no-print"
                    value={customTitle}
                    onChange={(e) => {
                      setCustomTitle(e.target.value);
                      setIsTitleManual(true);
                    }}
                  />
                  <h2 className="text-xl font-bold uppercase tracking-widest only-print">
                    {customTitle}
                  </h2>
                </div>
              </div>

              <div className="flex-1 py-2 min-h-[500px]">
                <EditorContent editor={editor} />
              </div>

              {/* SIGNATURE BLOCK */}
              <div className="flex justify-between items-end px-8 pt-8 signature-block mb-10">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">REFERRING PHYSICIAN</p>
                </div>
                <div className="text-center min-w-[200px]">
                  <div className="h-8 flex items-center justify-center italic text-slate-400 text-xs">
                    {status === 'final' ? "Digitally Signed & Verified" : ""}
                  </div>
                  <p className="font-bold text-lg text-slate-900 leading-none">Dr. Result Consultant</p>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-tight mt-1">MD, Radiodiagnosis</p>
                </div>
              </div>

              {/* FIXED FOOTER STRIPE - APPEARS ON EVERY PAGE */}
              <div className="fixed-footer-stripe text-center border-t-2 border-slate-900 pt-1 mt-auto">
                <p className="text-sm font-bold uppercase text-slate-800 tracking-wide mb-1">{orgSettings.address || "#1, BANGALORE OUTER RING ROAD, HEBBAL, BANGALORE, 560031"}</p>
                <div className="contact-line flex justify-center items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Phone size={11} className="text-slate-900 fill-current" />
                    <span>{orgSettings.enquiryPhone || "+91 9886617662"}</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1 text-red-600">
                    <Siren size={11} className="fill-current" />
                    <span>{orgSettings.contactPhone || "+91 9886517662"}</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1">
                    <Mail size={11} className="text-sky-500 fill-current" />
                    <span>{orgSettings.email || "radiology@capricornhospitals.com"}</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1">
                    <Globe size={11} className="text-blue-700" />
                    <span>{orgSettings.website || "www.capricornhospitals.com"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DRAGGABLE IMAGES PANEL */}
          {(showKeyImages || keyImages.length > 0) && (
            <div className="absolute right-4 top-20 w-64 bg-white/90 backdrop-blur shadow-2xl rounded-xl border border-white/20 p-2 z-[60]">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-xs font-bold uppercase text-slate-500">Key Images</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowKeyImages(false)}><X size={12} /></Button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-auto">
                {keyImages.map(img => (
                  <div key={img.id} className="relative group rounded overflow-hidden shadow-sm border" draggable onDragStart={e => e.dataTransfer.setData("text/html", `<img src="/api/uploads/keyimages/${img.file_path}" width="220" />`)}>
                    <img src={`/api/uploads/keyimages/${img.file_path}`} className="w-full aspect-square object-cover" onClick={() => insertKeyImageToEditor(img)} />
                  </div>
                ))}
                <label className="border-2 border-dashed border-slate-300 rounded flex items-center justify-center aspect-square cursor-pointer hover:bg-slate-50">
                  <ImagePlus className="text-slate-400" />
                  <input type="file" hidden onChange={e => e.target.files?.[0] && uploadKeyImage(e.target.files[0])} />
                </label>
              </div>
            </div>
          )}

          {/* RIGHT WORKFLOW PANEL */}
          {showWorkflowPanel && (
            <div className="w-[320px] bg-white border-l border-slate-200 flex flex-col shrink-0 no-print shadow-2xl z-20">
              <div className="p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-8">

                {/* TAB NAVIGATION */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab("context")}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'context' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Context & History
                  </button>
                  <button
                    onClick={() => setActiveTab("notes")}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'notes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Voice Notes
                  </button>
                </div>

                {activeTab === 'context' ? (
                  <>
                    {/* 1. CLINICAL CONTEXT */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Info size={14} />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">Clinical Context</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 italic text-slate-600 text-sm leading-relaxed shadow-inner">
                        {clinicalHistory || "No clinical history provided."}
                      </div>
                    </div>

                    {/* 2. PRIORS TIMELINE */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                          <History size={14} />
                          <span className="text-[10px] font-extrabold uppercase tracking-widest">Priors Timeline</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {loadingPriors && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                          <button
                            onClick={loadPriors}
                            disabled={loadingPriors}
                            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-500 transition-colors"
                            title="Refresh History"
                          >
                            <RefreshCcw size={12} className={loadingPriors ? 'animate-spin-slow' : ''} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5 relative pl-4 border-l-2 border-slate-100 ml-2">
                        {priors.length === 0 && !loadingPriors ? (
                          <span className="text-[10px] text-slate-400 font-bold ml-2 italic">No prior studies found.</span>
                        ) : (
                          priors.filter(p => !['SR', 'PR', 'KO'].includes(p.modality)).slice(0, 5).map((prior) => (
                            <div key={prior.studyUID} className="relative group mb-5 last:mb-0">
                              <div className={`absolute -left-[23.5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm transition-all duration-300 z-10 ${prior.reportStatus === 'final' ? 'ring-2 ring-emerald-500/50 ring-offset-1' : ''}`}
                                style={{ backgroundColor: getModalityColor(prior.modality) }}
                              />

                              <div className="flex flex-col bg-white p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-300">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded leading-none">{prior.modality}</span>
                                    <span className="text-[10px] font-bold text-slate-400">{formatDate(prior.date)}</span>
                                  </div>
                                  {prior.reportStatus === 'final' ? (
                                    <button
                                      className="text-[9px] font-extrabold text-emerald-600 hover:text-emerald-700 uppercase tracking-tighter flex items-center gap-1 transition-colors"
                                      onClick={() => fetchPriorReport(prior)}
                                    >
                                      <Eye size={10} />
                                      <span>Read Report</span>
                                    </button>
                                  ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                  )}
                                </div>
                                <span className="text-[11px] font-bold text-slate-700 leading-[1.3] mb-2 line-clamp-2">{prior.description}</span>
                                <div className="flex items-center gap-4 border-t border-slate-50 pt-2">
                                  <button
                                    onClick={() => window.open(`/pacs/viewer/${prior.studyUID}`, '_blank')}
                                    className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-tighter flex items-center gap-1.5 transition-colors group/btn"
                                  >
                                    <ExternalLink size={10} className="group-hover/btn:scale-110 transition-transform" />
                                    Launch Viewer
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-2 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Mic size={14} />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">Scribble Pad</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setVoiceNotes("")} className="h-6 text-[9px] font-bold text-slate-400">CLEAR</Button>
                    </div>
                    <div className="relative">
                      <textarea
                        className="w-full h-[300px] p-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-[13px] text-slate-700 outline-none resize-none font-medium italic placeholder:text-blue-300/60 leading-relaxed shadow-inner"
                        placeholder="Start speaking to take rough notes..."
                        value={voiceNotes}
                        onChange={(e) => setVoiceNotes(e.target.value)}
                      />
                      {listening && activeTab === 'notes' && (
                        <div className="absolute top-4 right-4 flex items-center gap-1">
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        editor?.chain().focus().insertContent(voiceNotes + " ").run();
                        setVoiceNotes("");
                      }}
                      disabled={!voiceNotes.trim()}
                      className="w-full bg-blue-600 text-white rounded-xl h-10 font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20"
                    >
                      Paste into 🔬 Findings
                    </Button>
                  </div>
                )}

                {/* 3. WORKFLOW STEPPER */}
                <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Sigma size={14} />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Workflow State</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {[
                      { id: 'draft', label: 'Draft', color: 'bg-amber-500', icon: Pencil },
                      { id: 'preliminary', label: 'Preliminary', color: 'bg-blue-500', icon: Eye },
                      { id: 'final', label: 'Finalized', color: 'bg-emerald-600', icon: Lock },
                      { id: 'addendum', label: 'Addendum', color: 'bg-red-600', icon: AlertTriangle },
                    ].map((s) => {
                      const isActive = status === s.id;

                      return (
                        <button
                          key={s.id}
                          disabled={status === 'final' && s.id !== 'addendum'}
                          onClick={() => setStatus(s.id as any)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${isActive
                            ? `border-transparent ring-2 ring-offset-1 ${s.color.replace('bg-', 'ring-')} ${s.color} text-white shadow-lg shadow-black/10`
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <s.icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                            <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>{s.label}</span>
                          </div>
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. CLARIFICATION NOTE */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Pencil size={14} />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest">Clarification Note</span>
                    </div>
                    {status === 'addendum' && <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">MANDATORY</span>}
                  </div>
                  <textarea
                    placeholder="Enter findings clarification or addendum reason..."
                    value={workflowNote}
                    onChange={(e) => setWorkflowNote(e.target.value)}
                    className="w-full h-32 p-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition-all placeholder:text-slate-300 text-slate-700 shadow-sm"
                  />
                </div>

              </div>

              {/* ACTION FOOTER */}
              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                <Button
                  onClick={() => save(status === 'final' || status === 'addendum')}
                  className={`w-full h-11 rounded-xl font-bold text-xs uppercase tracking-widest gap-2 shadow-lg transition-all active:scale-95 ${status === 'addendum' ? 'bg-red-600 hover:bg-red-700' :
                    status === 'final' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  <Save size={16} /> {status === 'final' || status === 'addendum' ? 'Sign & Finalize' : 'Save Changes'}
                </Button>
                <button
                  onClick={() => setShowWorkflowPanel(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase tracking-tighter transition-colors"
                >
                  Collapse Side Panel
                </button>
              </div>
            </div>
          )}


          {!showWorkflowPanel && (
            <button
              onClick={() => setShowWorkflowPanel(true)}
              className="absolute right-4 top-4 z-30 w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-lg text-slate-400 hover:text-blue-600 transition-all hover:scale-110 active:scale-95 no-print"
              title="Open Workflow Panel"
            >
              <Sigma size={20} />
            </button>
          )}

        </div>
      </div >

      {/* QUICK REPORT MODAL */}
      {
        selectedPriorReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Historical Findings</span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">{selectedPriorReport.title}</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedPriorReport(null)} className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm">
                  <X size={16} />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/10">
                <div
                  className="prose prose-slate prose-sm max-w-none text-slate-700 leading-relaxed font-sans"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedPriorReport.content) }}
                />
              </div>
              <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
                <Button onClick={() => setSelectedPriorReport(null)} className="bg-slate-900 text-white rounded-xl px-6 text-xs font-bold uppercase tracking-widest">Close Record</Button>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
}

function DraggablePanel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const onMouseDown = (e: React.MouseEvent) => { setIsDragging(true); setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y }); };
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => { if (isDragging) setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }); };
    const onMouseUp = () => setIsDragging(false);
    if (isDragging) { window.addEventListener("mousemove", onMouseMove); window.addEventListener("mouseup", onMouseUp); }
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [isDragging, dragOffset]);
  return (
    <div className="absolute z-50 flex flex-col w-64 bg-white shadow-2xl rounded-xl border border-slate-200 overflow-hidden" style={{ left: position.x, top: position.y }}>
      <div className="p-2 bg-slate-100 flex justify-between items-center cursor-move" onMouseDown={onMouseDown}>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Key Images</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}><X size={12} /></Button>
      </div>
      <div className="h-[400px] overflow-hidden flex flex-col">{children}</div>
    </div>
  );
}
