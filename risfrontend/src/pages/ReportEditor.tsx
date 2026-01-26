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
  AlignLeft, AlignCenter, List, ListOrdered, X, Stethoscope, ImagePlus, Pencil,
  Phone, Siren, Mail, Globe, Printer, Eye
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
  const [orgSettings, setOrgSettings] = useState<{ name?: string; address?: string; logo?: string; enquiryPhone?: string; contactPhone?: string; email?: string; website?: string }>({});
  const [showKeyImages, setShowKeyImages] = useState(false);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [isTitleManual, setIsTitleManual] = useState(false);
  const [dict, setDict] = useState<any>(null);

  // Load dictation dictionary
  useEffect(() => {
    fetch('/radiology_dictionary.json')
      .then(res => res.json())
      .then(data => setDict(data))
      .catch(err => console.error("Failed to load dictation dictionary:", err));
  }, []);

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
      },
    },
    onUpdate: ({ editor }) => {
      // Auto-save to LocalStorage every keystroke
      localStorage.setItem(DRAFT_KEY, editor.getHTML());
    }
  });

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
            localStorage.removeItem(DRAFT_KEY); // Clear local backup if server has data
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

  const startDictation = async () => {
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

          editor?.chain().focus().insertContent(text + " ").run();
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

  if (!editor) return null;

  return (
    <div className="flex h-screen w-full bg-slate-100 text-slate-900 font-sans overflow-hidden">

      {/* SOLID LEFT TOOLBAR (Restored from previous preference) */}
      <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-4 shrink-0 z-50 no-print shadow-sm">
        <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 mb-2">
          <Stethoscope className="w-6 h-6 text-white" />
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className="text-slate-500 hover:bg-slate-100"><Bold size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className="text-slate-500 hover:bg-slate-100"><Italic size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} className="text-slate-500 hover:bg-slate-100"><UnderlineIcon size={18} /></Button>
        </div>

        <div className="w-8 h-px bg-slate-200 my-1" />

        <Button variant="ghost" size="icon" onClick={() => setShowKeyImages(!showKeyImages)} className={showKeyImages ? "text-blue-600 bg-blue-50" : "text-slate-500 hover:bg-slate-100"}>
          <ImagePlus size={20} />
        </Button>

        <div className="flex-1" />

        <div className="flex flex-col gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => save(false)} className={`transition-all ${isSaving ? "text-yellow-500 animate-pulse" : "text-emerald-600 hover:bg-emerald-50"}`}>
            <Save size={22} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => save(true)} disabled={status === "final"} className="text-blue-600 hover:bg-blue-50">
            <Lock size={22} />
          </Button>
          {onClose && <Button variant="ghost" size="icon" onClick={onClose} className="text-red-500 hover:bg-red-50"><X size={24} /></Button>}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full relative bg-slate-50">

        {/* TOP BAR - SOLID WHITE */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-40 no-print shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              {['draft', 'preliminary', 'final'].map(s => (
                <div key={s} className={`px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer ${status === s ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`} onClick={() => status !== 'final' && setStatus(s as any)}>
                  {s}
                </div>
              ))}
            </div>
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDictation}
              className={`h-9 px-4 gap-2 border-slate-200 ${listening ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
              <span className="text-[10px] font-bold uppercase">{listening ? 'Stop' : 'Start'} Dictation</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <SmartTemplateSelector
              modality={patient?.modality}
              bodyPart={patient?.bodyPart}
              gender={patient?.patientSex}
              onSelect={(c) => editor?.commands.setContent(c)}
            />
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 ml-2">
              <Printer size={15} /> PRINT
            </Button>
          </div>
        </div>

        {/* EDITOR SCROLL AREA */}
        <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center custom-scrollbar">
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
    </div>
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
