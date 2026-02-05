// src/pages/ReportEditor.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import DOMPurify from "dompurify";
// @ts-ignore
import html2pdf from "html2pdf.js";

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
  Bold, Italic, Underline as UnderlineIcon, Save, Lock, Unlock, Mic, MicOff,
  AlignLeft, AlignCenter, AlignJustify, List, ListOrdered, X, Stethoscope, ImagePlus, Pencil,
  Phone, Siren, Mail, Globe, Printer, Eye, Strikethrough, Type, Sigma, AlertTriangle,
  Table as TableIcon, Minus, Trash2, Info, History, Calendar, ChevronRight, ExternalLink, RefreshCcw, Command,
  Server, MessageSquare
} from "lucide-react";
import { Button } from "../components/ui/button";
import { SmartTemplateSelector } from "../components/report/SmartTemplateSelector";
import { KeyImage } from "../components/report/KeyImagesPanel";
import { Node, mergeAttributes, Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import "./ReportEditor.css";

const Figure = Node.create({
  name: 'figure',
  group: 'block',
  content: 'image figcaption',
  draggable: true,
  // Make sure to allow class attribute
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          return { class: attributes.class };
        },
      },
    };
  },
  parseHTML() {
    return [
      { tag: 'figure' },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(HTMLAttributes), 0];
  },
});

const Figcaption = Node.create({
  name: 'figcaption',
  group: 'block',
  content: 'text*',
  selectable: true,
  parseHTML() {
    return [
      { tag: 'figcaption' },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['figcaption', mergeAttributes(HTMLAttributes), 0];
  },
});

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

  // Load dictation dictionary & Modalities
  const safeAxios = useCallback(async (fn: () => Promise<any>, fallback?: any) => {
    try {
      return await fn();
    } catch (err) {
      console.warn("API Error:", err);
      return fallback;
    }
  }, []);

  useEffect(() => {
    fetch('/radiology_dictionary.json')
      .then(res => res.json())
      .then(data => setDict(data))
      .catch(err => console.error("Failed to load dictation dictionary:", err));

    safeAxios(async () => {
      const { data } = await axiosInstance.get("/modalities");
      setModalities(data?.data || []);
    });
  }, [safeAxios]);

  const normalizePatient = useCallback((raw: any): PatientMeta => {
    const data = raw || {};
    const cleanMod = (val: any) => {
      if (!val) return "";
      const s = String(val).trim();
      if (/^[-_.]+$/.test(s)) return "";
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

  const loadPriors = useCallback(async () => {
    if (!patient?.patientID) return;
    setLoadingPriors(true);
    await safeAxios(async () => {
      const r = await axiosInstance.get(`/studies/patient/${patient.patientID}/priors?exclude=${studyUID}`);
      if (r.data?.success) setPriors(r.data.data);
    });
    setLoadingPriors(false);
  }, [patient?.patientID, studyUID, safeAxios]);

  useEffect(() => { loadPriors(); }, [loadPriors]);

  const viewPriorReport = async (uid: string, title: string) => {
    setFetchingPriorReport(true);
    await safeAxios(async () => {
      const r = await axiosInstance.get(`/reports/${encodeURIComponent(uid)}`);
      if (r.data?.success && r.data.data) {
        setSelectedPriorReport({ title, content: r.data.data.content });
      } else {
        alert("No report found for this prior study.");
      }
    });
    setFetchingPriorReport(false);
  };

  const getModalityColor = (modalityName?: string) => {
    const mod = (modalityName || "").toUpperCase();
    const settingColor = modalities.find(m => m.name.toUpperCase() === mod || m.ae_title.toUpperCase() === mod)?.color;
    if (settingColor) return settingColor;
    if (mod.includes("CT")) return "#f59e0b";
    if (mod.includes("MR")) return "#3b82f6";
    if (mod.includes("US")) return "#a855f7";
    if (mod.includes("XR") || mod.includes("CR") || mod.includes("DX")) return "#64748b";
    return "#94a3b8";
  };

  const calculatedTitle = useMemo(() => {
    if (isTitleManual && customTitle) return customTitle;
    const parts = [];
    if (patient?.modality) parts.push(patient.modality);
    if (patient?.bodyPart && !patient.bodyPart.includes("(")) parts.push(patient.bodyPart);
    parts.push("RADIOLOGY REPORT");
    return parts.join(" ");
  }, [patient?.modality, patient?.bodyPart, isTitleManual, customTitle]);

  useEffect(() => {
    if (!isTitleManual) setCustomTitle(calculatedTitle);
  }, [calculatedTitle, isTitleManual]);

  const editor = useEditor({
    extensions: [
      StarterKit, Underline,
      Placeholder.configure({ placeholder: "Type report content here..." }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle, FontFamily, Color,
      Highlight.configure({ multicolor: true }),
      Highlight.configure({ multicolor: true }),
      ImageExtension.configure({ inline: false, allowBase64: true }),
      SlashCommand,
      Figure, Figcaption,
      // Custom Extension to clean up empty figures
      Extension.create({
        name: 'figureCleanup',
        addProseMirrorPlugins() {
          return [
            new Plugin({
              key: new PluginKey('figureCleanup'),
              appendTransaction: (transactions, oldState, newState) => {
                const tr = newState.tr;
                let modified = false;
                // Iterate through docs to find empty figures
                newState.doc.descendants((node, pos) => {
                  if (node.type.name === 'figure') {
                    const hasImage = node.childCount > 0 && node.firstChild?.type.name === 'image';
                    if (!hasImage) {
                      // If no image (first child missing or not image), delete the whole figure
                      tr.delete(pos, pos + node.nodeSize);
                      modified = true;
                    }
                  }
                });
                return modified ? tr : null;
              },
            }),
          ];
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: "print-content focus:outline-none min-h-[300px] prose max-w-none text-slate-800 leading-relaxed font-sans",
        'data-modality': patient?.modality || "",
      },
    },
  });

  useEffect(() => {
    if (!editor || !studyUID) return;
    const handler = ({ editor: e }: { editor: any }) => {
      localStorage.setItem(`report_draft_${studyUID}`, e.getHTML());
    };
    editor.on('update', handler);
    return () => { editor.off('update', handler); };
  }, [editor, studyUID]);

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

  const loadIdRef = useRef(0);

  useEffect(() => {
    if (!studyUID) return;
    const currentRequestId = ++loadIdRef.current;
    let ignore = false;

    const loadData = async () => {
      setLoading(true);
      if (editor) editor.commands.setContent("");
      setStatus("draft"); setKeyImages([]); setReportContent(null);
      setPatient(null); setCustomTitle(""); setIsTitleManual(false);
      setWorkflowNote(""); setClinicalHistory(""); setVoiceNotes("");

      let reportData: any = null;
      await safeAxios(async () => {
        const r = await axiosInstance.get(`/reports/${encodeURIComponent(studyUID)}`);
        if (ignore || currentRequestId !== loadIdRef.current) return;
        if (r.data?.success && r.data.data) {
          reportData = r.data.data;
          setStatus(reportData.status || "draft");
          if (reportData.reportTitle) { setCustomTitle(reportData.reportTitle); setIsTitleManual(true); }
          if (reportData.content) {
            setReportContent(reportData.content);
            if (reportData.workflowNote) setWorkflowNote(reportData.workflowNote);
          }
        }
      });
      if (ignore || currentRequestId !== loadIdRef.current) return;

      let dbMeta: any = {};
      await safeAxios(async () => {
        const r = await axiosInstance.get(`/studies/${studyUID}/meta`);
        if (!ignore && currentRequestId === loadIdRef.current && r.data?.success) dbMeta = normalizePatient(r.data.data);
      });
      if (ignore || currentRequestId !== loadIdRef.current) return;

      let pacsMeta: any = {};
      await safeAxios(async () => {
        const r = await axiosInstance.get(`/studies/${studyUID}/dicom-tags`);
        if (!ignore && currentRequestId === loadIdRef.current && r.data?.tags) pacsMeta = normalizePatient(r.data.tags);
      });
      if (ignore || currentRequestId !== loadIdRef.current) return;

      const localDraft = localStorage.getItem(`report_draft_${studyUID}`);
      if (!reportData?.content && localDraft) setReportContent(localDraft);

      const merged = { ...dbMeta, ...pacsMeta, ...(reportData || {}) };
      if (merged.patientName && (!merged.patientAge || !merged.patientSex)) {
        const name = merged.patientName;
        const ageMatch = name.match(/(\d{1,3})[Yy]/);
        const sexMatch = name.match(/\b([MFmf])\b/) || name.match(/\/([MFmf])/);
        if (ageMatch && !merged.patientAge) merged.patientAge = ageMatch[1];
        if (sexMatch && !merged.patientSex) merged.patientSex = sexMatch[1].toUpperCase();
      }

      if (!ignore && currentRequestId === loadIdRef.current) {
        setPatient(merged); setLoading(false);
      }
    };

    safeAxios(async () => {
      const r = await axiosInstance.get("/settings");
      if (!ignore && currentRequestId === loadIdRef.current && r.data?.data?.org) setOrgSettings(r.data.data.org);
    });

    loadData();
    return () => { ignore = true; };
  }, [studyUID, editor, safeAxios, normalizePatient]);

  useEffect(() => {
    if (editor && reportContent !== null) editor.commands.setContent(reportContent);
  }, [editor, reportContent]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    let d = dateStr;
    if (d.includes("T")) d = d.split("T")[0];
    if (d.includes("-")) {
      const parts = d.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (/^\d{8}$/.test(d)) return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
    return d;
  };

  useEffect(() => {
    if (patient?.studyDate && !patient.studyDate.includes("-") && !patient.studyDate.includes("/")) {
      setPatient(p => p ? ({ ...p, studyDate: formatDate(p.studyDate) }) : null);
    }
  }, [patient?.studyDate]);

  const [reportDate, setReportDate] = useState(new Date().toLocaleDateString('en-GB'));
  const header = useMemo(() => ({ reportDate }), [reportDate]);

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
    // Immediate delete without confirmation for speed - user request
    await safeAxios(() => axiosInstance.delete(`/reports/keyimage/${id}`));
    loadKeyImages();
  };

  const insertKeyImageToEditor = (img: KeyImage) => {
    // 4 images per row = approx 23-24% width, considering margins
    // Gold Standard: 4 images per row using inline-flex tiles
    // Compact HTML string to prevent schema validation issues with whitespace
    const content = `<figure class="report-grid-figure"><img src="/api/uploads/keyimages/${img.file_path}" /><figcaption>Caption</figcaption></figure>`;


    // Note: The &nbsp; helps separate inline-blocks if the editor compresses whitespace
    editor?.chain().focus().insertContent(content).run();

    // Auto-remove (move) from panel after inserting - Gold Standard Workflow
    setKeyImages(prev => prev.filter(i => i.id !== img.id));
    // Ideally we might want to keep it on server but hide it, but user asked for "remove". 
    // If they want to get it back, they re-upload. Or we just hide it locally. 
    // Let's hide it locally for speed, but better to keep server in sync if they reload.
    // Calling delete is destructive but matches "Remove from panel".
    // Alternatively just filter locally: setKeyImages(prev => prev.filter(k => k.id !== img.id));
  };

  const handlePrint = () => {
    const originalTitle = document.title;

    // Medical Grade Naming: PATIENT_NAME_ACCESSION_DATE
    const clean = (s?: string) => (s || "UNKNOWN").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    const pName = clean(patient?.patientName);
    const acc = clean(patient?.accessionNumber);
    // Format date as YYYYMMDD for sorting if possible, or just clean the string
    let dateStr = clean(patient?.studyDate);

    // Attempt standard medical filename format
    const filename = `${pName}_${acc}_${dateStr}_REPORT`;

    document.title = filename;
    window.print();

    // Restore title after print dialog opens (timeout ensures browser picks up new title)
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  // Helper to generate PDF Blob
  const generatePdfBlob = async () => {
    const element = document.querySelector('.printable-area') as HTMLElement;
    if (!element) return null;

    // 1. Temporarily strip layout transforms that confuse html2canvas
    const originalTransform = element.style.transform;
    const originalClass = element.className; // Save tailwind classes

    // Remove scaling classes temporarily to ensure 1:1 capture without offsets
    element.classList.remove('scale-[0.9]', 'md:scale-100', 'transform', 'origin-top');
    element.style.transform = 'none'; // Force reset
    element.style.margin = '0 auto';  // Center
    element.style.backgroundColor = '#ffffff'; // Ensure white background

    const opt = {
      margin: 10,
      filename: 'report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        // Improved: Safely ignore UI elements
        ignoreElements: (el: Element) => {
          // html2canvas sometimes visits non-element nodes or SVGs where classList might differ
          return el && el.classList && el.classList.contains('no-print');
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      // @ts-ignore
      const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');
      return pdfBlob;
    } finally {
      // 2. Restore original UI state
      element.className = originalClass;
      element.style.transform = originalTransform;
      element.style.margin = '';
      element.style.backgroundColor = '';
    }
  };

  const handleSendToPacs = async () => {
    if (!studyUID || !patient) return;
    alert("Exporting to PACS...");

    try {
      const pdfBlob = await generatePdfBlob();
      if (!pdfBlob) throw new Error("Could not generate PDF");

      const fd = new FormData();
      fd.append("pdf", pdfBlob, "report.pdf");
      fd.append("metadata", JSON.stringify({
        PatientName: patient.patientName,
        PatientID: patient.patientID,
        AccessionNumber: patient.accessionNumber,
        StudyDate: patient.studyDate,
        Modality: patient.modality
      }));

      await axiosInstance.post('/dicom/export-pdf', fd);
      alert("Successfully sent to PACS!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to send to PACS: " + (err.response?.data?.message || err.message));
    }
  };

  const handleShareReport = async (type: 'email' | 'sms' | 'whatsapp') => {
    const promptLabel = type === 'email' ? 'Email' : (type === 'sms' ? 'Mobile Number' : 'WhatsApp Number');
    const recipient = prompt(`Enter Patient ${promptLabel}:`);
    if (!recipient) return;

    alert(`Sending ${type === 'email' ? 'Email' : (type === 'sms' ? 'SMS' : 'WhatsApp')}...`);

    try {
      const pdfBlob = await generatePdfBlob();
      if (!pdfBlob) throw new Error("Could not generate PDF");

      const fd = new FormData();
      fd.append("pdf", pdfBlob, "report.pdf");
      fd.append("type", type);
      fd.append("recipient", recipient);

      // Pass Metadata for Professional Email/SMS Content
      if (patient) {
        fd.append("metadata", JSON.stringify({
          patientName: patient.patientName,
          accessionNumber: patient.accessionNumber,
          studyDate: patient.studyDate ? new Date(patient.studyDate).toDateString() : 'N/A',
          hospitalName: orgSettings.name || "MERCURY HOSPITALS"
        }));
      }

      await axiosInstance.post('/share/patient-report', fd);
      alert(`${type === 'email' ? 'Email' : (type === 'sms' ? 'SMS' : 'WhatsApp')} sent successfully!`);
    } catch (err: any) {
      console.error(err);
      alert("Failed to share report: " + (err.response?.data?.message || err.message));
    }
  };


  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Fetch current user for disclaimer
  useEffect(() => {
    // Assuming we can get user info from context or local storage if not available easily here
    // For now purely relying on RBAC context if accessible, or decoding token
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch (e) { }
    }
  }, []);

  const handleSave = async (statusOverride?: string) => {
    if (!editor) return;

    const finalStatus = statusOverride || status;

    if (finalStatus === 'final' && !disclaimerAccepted) {
      toast.error("You must accept the legal disclaimer to sign this report.");
      return;
    }

    const html = editor.getHTML();

    try {
      setIsSaving(true);
      await axiosInstance.post("/reports/save", {
        studyUID: studyUID, // Assuming studyUID is the correct variable name
        content: html,
        workflow_status: finalStatus,
        patientName: patient?.patientName, // Assuming patient is the correct variable name
        patientID: patient?.patientID,
        modality: patient?.modality,
        accessionNumber: patient?.accessionNumber,
        studyDate: patient?.studyDate,
        reportTitle: customTitle, // Assuming customTitle is the correct variable name
        workflowNote: workflowNote,
      });

      if (finalStatus === "final") {
        await axiosInstance.post("/reports/finalize", {
          studyUID: studyUID,
          content: html,
          disclaimer_accepted: true
        });
        // Industry Standard: Auto-Push to PACS upon finalization
        // We run this without awaiting to not block the UI, or await if we want to ensure it sent
        // ideally we await it but don't fail report saving if it fails (just warn)
        handleSendToPacs().catch(e => console.error("Auto-Push PACS failed", e));
        toast.success("Report FINALIZED and DIGITALLY SIGNED.");
        // Reload to show signature
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.success("Draft saved.");
      }

      setStatus(finalStatus);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save report");
    } finally {
      setIsSaving(false);
    }
  };

  // DICTATION LOGIC
  const [listening, setListening] = useState(false);
  const [partialText, setPartialText] = useState("");
  const socketRef = useRef<WebSocket | null>(null);

  const toggleDictation = () => {
    if (listening) {
      socketRef.current?.close();
      setListening(false);
    } else {
      startListening();
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/vosk`;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (socket.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          socket.send(pcmData.buffer);
        }
      };

      socket.onopen = () => {
        setListening(true);
        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.final === false) {
          setPartialText(data.text);
        } else if (data.text) {
          let final = data.text.trim();
          if (final) {
            final = final.charAt(0).toUpperCase() + final.slice(1);
            if (!/[.!?]$/.test(final)) final += ".";

            if (activeTab === "notes") {
              setVoiceNotes(prev => prev + (prev ? " " : "") + final);
            } else {
              editor?.chain().focus().insertContent(final + " ").run();
            }
          }
          setPartialText("");
          if (!isLockedMic) {
            socket.close();
            setListening(false);
          }
        }
      };

      socket.onclose = () => {
        setListening(false);
        stream.getTracks().forEach(t => t.stop());
        processor.disconnect();
        source.disconnect();
      };

    } catch (err) {
      console.error("Mic error:", err);
      alert("Microphone access denied or Vosk server offline.");
    }
  };

  const insertSymbol = (symbol: string) => { editor?.chain().focus().insertContent(symbol).run(); };
  const insertCriticalFlag = () => { editor?.chain().focus().insertContent('<div class="critical-finding-alert">⚠️ CRITICAL FINDING: </div>').run(); };
  const insertMeasurementTable = () => { editor?.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run(); };

  if (!editor) return null;

  return (
    <div className="flex h-screen w-full bg-slate-100 text-slate-900 font-sans overflow-hidden">
      <div className="medical-sidebar no-print shadow-xl">
        <div className="sidebar-group mb-2">
          <div className="bg-blue-600 p-2 rounded-xl shadow-md border border-blue-400"><Stethoscope className="w-5 h-5 text-white" /></div>
        </div>
        <div className="sidebar-group">
          <span className="sidebar-label">Format</span>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={`sidebar-btn ${editor.isActive('bold') ? 'active' : ''}`}><Bold size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={`sidebar-btn ${editor.isActive('italic') ? 'active' : ''}`}><Italic size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`sidebar-btn ${editor.isActive('underline') ? 'active' : ''}`}><UnderlineIcon size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleStrike().run()} className={`sidebar-btn ${editor.isActive('strike') ? 'active' : ''}`}><Strikethrough size={18} /></Button>
          <div className="sidebar-divider my-1" />
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`sidebar-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}><AlignLeft size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`sidebar-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}><AlignCenter size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`sidebar-btn ${editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}`}><AlignJustify size={18} /></Button>
        </div>
        <div className="sidebar-group">
          <span className="sidebar-label">Medical</span>
          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="icon" onClick={() => insertSymbol('°')} className="sidebar-btn"><span className="text-xs font-bold">°</span></Button>
            <Button variant="ghost" size="icon" onClick={() => insertSymbol('±')} className="sidebar-btn"><span className="text-xs font-bold">±</span></Button>
            <Button variant="ghost" size="icon" onClick={() => insertSymbol('µ')} className="sidebar-btn"><span className="text-xs font-bold">µ</span></Button>
          </div>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} className="sidebar-btn text-orange-500"><Type size={18} /></Button>
        </div>
        <div className="sidebar-group">
          <span className="sidebar-label">Insert</span>
          <Button variant="ghost" size="icon" onClick={() => setShowKeyImages(!showKeyImages)} className={`sidebar-btn ${showKeyImages ? 'active text-blue-600' : ''}`}><ImagePlus size={19} /></Button>
          <Button variant="ghost" size="icon" onClick={insertCriticalFlag} className="sidebar-btn text-red-500 hover:bg-red-50"><AlertTriangle size={19} /></Button>
          <Button variant="ghost" size="icon" onClick={insertMeasurementTable} className="sidebar-btn text-purple-600 hover:bg-purple-50"><TableIcon size={19} /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="sidebar-btn"><Minus size={19} /></Button>
        </div>
        <div className="sidebar-group">
          <span className="sidebar-label">Share</span>
          <Button variant="ghost" size="icon" onClick={handleSendToPacs} className="sidebar-btn text-blue-600 hover:bg-blue-50" title="Export to PACS"><Server size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleShareReport('email')} className="sidebar-btn text-emerald-600 hover:bg-emerald-50" title="Email Report"><Mail size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleShareReport('sms')} className="sidebar-btn text-purple-600 hover:bg-purple-50" title="SMS Report"><MessageSquare size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleShareReport('whatsapp')} className="sidebar-btn text-green-600 hover:bg-green-50" title="WhatsApp Report"><Phone size={18} /></Button>
        </div>
        <div className="sidebar-group">
          <span className="sidebar-label">Panel</span>
          <Button variant="ghost" size="icon" onClick={() => setShowWorkflowPanel(!showWorkflowPanel)} className={`sidebar-btn ${showWorkflowPanel ? 'active text-blue-600' : ''}`} title="Toggle History/Notes Panel">
            {showWorkflowPanel ? <ChevronRight size={19} /> : <History size={19} />}
          </Button>
        </div>
        <div className="flex-1" />
        <div className="sidebar-group border-t border-slate-100 pt-4 pb-2">
          {onClose && <Button variant="ghost" size="icon" onClick={onClose} className="sidebar-btn text-slate-400 hover:text-red-500 hover:bg-red-50"><X size={22} /></Button>}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full relative bg-slate-50">
        <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-40 no-print shadow-sm control-strip-glass">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1 group">
              <Button variant="outline" size="sm" onClick={toggleDictation} className={`h-9 px-4 gap-2 border-slate-200 rounded-full shadow-sm transition-all duration-300 ${listening ? 'bg-red-50 border-red-500 text-red-600 ring-4 ring-red-500/10' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                <div className={`w-2 h-2 rounded-full ${listening ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-[10px] font-bold uppercase tracking-tight">{listening ? 'Listening...' : 'Start Dictation'}</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsLockedMic(!isLockedMic)} className={`h-8 w-8 rounded-full transition-all ${isLockedMic ? 'text-red-600 bg-red-50' : 'text-slate-300 hover:text-slate-500'}`} title="Lock/Unlock Microphone (Hands-Free)">
                {isLockedMic ? <Lock size={14} /> : <Unlock size={14} />}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SmartTemplateSelector modality={patient?.modality} bodyPart={patient?.bodyPart} gender={patient?.patientSex} onSelect={(html) => editor.commands.setContent(html)} />



            <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 gap-2 border-slate-200 rounded-xl px-4 text-slate-600 font-bold text-xs uppercase tracking-widest"><Printer size={16} /> Print</Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center custom-scrollbar bg-slate-50/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-4 text-slate-400 animate-in fade-in duration-500">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest">Wiping Cache & Loading Patient...</span>
              </div>
            ) : (
              <div className={`printable-area transition-all duration-700 transform scale-[0.9] md:scale-100 shadow-2xl origin-top ${listening ? 'listening-pulse' : ''}`}>
                <table className="main-table w-full border-collapse">
                  <thead>
                    <tr><td>
                      <div className="text-center mb-0 mt-0">
                        <input className="field-input-reset text-center text-3xl font-bold text-slate-900 uppercase tracking-widest font-serif-premium w-full bg-transparent placeholder-slate-300 focus:placeholder-transparent no-print" value={orgSettings.name || ""} onChange={e => setOrgSettings(prev => ({ ...prev, name: e.target.value }))} placeholder="HOSPITAL NAME" />
                        <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-widest font-serif-premium only-print mb-1 mt-1">{orgSettings.name || "CAPRICORN HOSPITALS"}</h1>
                      </div>
                      <div className="flex justify-between items-center px-1 mb-1 no-print">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full shadow-sm identity-badge uppercase tracking-widest"><Lock size={10} /> Patient Secure Mode</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Verified DICOM Node: PACS01</span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          <span>{new Date().toLocaleTimeString()}</span>
                          <span>RIS-V3.2</span>
                        </div>
                      </div>
                      <table className="patient-card-table mb-2">
                        <colgroup><col style={{ width: '18%' }} /><col style={{ width: '46%' }} /><col style={{ width: '18%' }} /><col style={{ width: '18%' }} /></colgroup>
                        <tbody>
                          <tr>
                            <td className="label-cell">PATIENT NAME</td>
                            <td className="val-cell">
                              <div className="flex items-center w-full">
                                <textarea rows={1} className="field-input-reset block w-full no-print font-bold uppercase" value={patient?.patientName || ""} onChange={e => setPatient(p => ({ ...p!, patientName: e.target.value }))} onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }} />
                                <span className="only-print font-bold uppercase">{patient?.patientName || "—"}</span>
                              </div>
                            </td>
                            <td className="label-cell">AGE / SEX</td>
                            <td className="val-cell">
                              <div className="flex gap-1 no-print font-bold">
                                <input className="field-input-reset w-8" value={patient?.patientAge || ""} onChange={e => setPatient(p => ({ ...p!, patientAge: e.target.value }))} placeholder="00" />
                                <span>/</span>
                                <input className="field-input-reset w-8" value={patient?.patientSex || ""} onChange={e => setPatient(p => ({ ...p!, patientSex: e.target.value }))} placeholder="M" />
                              </div>
                              <span className="only-print font-bold">{patient?.patientAge}/{patient?.patientSex}</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="label-cell">PATIENT ID</td>
                            <td className="val-cell"><input className="field-input-reset no-print font-bold" value={patient?.patientID || ""} onChange={e => setPatient(p => ({ ...p!, patientID: e.target.value }))} /><span className="only-print font-bold">{patient?.patientID}</span></td>
                            <td className="label-cell">ACCESSION</td>
                            <td className="val-cell"><input className="field-input-reset no-print font-bold" value={patient?.accessionNumber || ""} onChange={e => setPatient(p => ({ ...p!, accessionNumber: e.target.value }))} /><span className="only-print font-bold">{patient?.accessionNumber}</span></td>
                          </tr>
                          <tr>
                            <td className="label-cell">REF DOCTOR</td>
                            <td className="val-cell"><textarea rows={1} className="field-input-reset no-print min-h-[1.5em] font-bold uppercase" value={patient?.referringPhysician || ""} onChange={e => setPatient(p => ({ ...p!, referringPhysician: e.target.value }))} onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }} /><span className="only-print font-bold uppercase">{patient?.referringPhysician}</span></td>
                            <td className="label-cell">SCAN DATE</td>
                            <td className="val-cell"><input className="field-input-reset no-print font-bold" value={patient?.studyDate?.includes("T") ? formatDate(patient.studyDate) : (patient?.studyDate?.includes("-") && patient.studyDate.length === 10 ? formatDate(patient.studyDate) : (patient?.studyDate || ""))} onChange={e => setPatient(p => ({ ...p!, studyDate: e.target.value }))} placeholder="DD/MM/YYYY" /><span className="only-print font-bold">{formatDate(patient?.studyDate)}</span></td>
                          </tr>
                          <tr>
                            <td className="label-cell">MODALITY</td>
                            <td className="val-cell font-bold text-blue-900 uppercase">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: getModalityColor(patient?.modality) }} />
                                <input className="field-input-reset no-print font-black" value={patient?.modality || ""} onChange={e => setPatient(p => ({ ...p!, modality: e.target.value }))} placeholder="MODALITY" />
                                <span className="only-print">{patient?.modality}</span>
                              </div>
                            </td>
                            <td className="label-cell">REPORT DATE</td>
                            <td className="val-cell"><input className="field-input-reset no-print font-bold" value={reportDate} onChange={(e) => setReportDate(e.target.value)} placeholder="DD/MM/YYYY" /><span className="only-print font-bold">{reportDate}</span></td>
                          </tr>
                          <tr>
                            <td className="label-cell">BODY PART</td>
                            <td className="val-cell uppercase font-bold" colSpan={3}><input className="field-input-reset no-print" value={patient?.bodyPart || ""} onChange={e => setPatient(p => ({ ...p!, bodyPart: e.target.value }))} placeholder="BODY PART" /><span className="only-print">{patient?.bodyPart}</span></td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="flex justify-center mb-2">
                        <div className="text-center py-1 border-b-2 border-slate-900 w-full px-4">
                          <input className="field-input-reset text-center text-xl font-bold uppercase tracking-widest w-full font-serif-premium no-print bg-transparent" value={customTitle} onChange={(e) => { setCustomTitle(e.target.value); setIsTitleManual(true); }} />
                          <h2 className="text-xl font-bold uppercase tracking-widest only-print font-serif-premium">{customTitle}</h2>
                        </div>
                      </div>
                    </td></tr>
                  </thead>
                  <tbody><tr><td className="report-content-cell py-4">
                    <EditorContent editor={editor} className="min-h-[500px]" />
                    {/* Signature is now injected by backend on finalization */}
                  </td></tr></tbody>
                  <tfoot><tr><td><div className="footer-spacer h-[25mm] invisible" /></td></tr></tfoot>
                </table>
                <div className="fixed-footer-stripe text-center border-t-2 border-slate-900 pt-1 mt-auto bg-white z-[999]">
                  <p className="text-sm font-bold uppercase text-slate-800 tracking-wide mb-1 leading-tight">{orgSettings.address || "#1, BANGALORE OUTER RING ROAD, HEBBAL, BANGALORE, 560031"}</p>
                  <div className="contact-line flex justify-center items-center gap-4 py-1">
                    <div className="flex items-center gap-1"><Phone size={11} className="text-slate-900 fill-current" /><span>{orgSettings.enquiryPhone || "+91 9886617662"}</span></div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1 text-red-600"><Siren size={11} className="fill-current" /><span>{orgSettings.contactPhone || "+91 9886517662"}</span></div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1"><Mail size={11} className="text-sky-500 fill-current" /><span>{orgSettings.email || "radiology@hospital.com"}</span></div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1 italic opacity-60"><Globe size={11} className="text-blue-700" /><span>{orgSettings.website || "www.hospital.com"}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {showWorkflowPanel && (
            <div className="w-80 bg-white border-l border-slate-200 flex flex-col no-print glass-panel animate-in slide-in-from-right duration-500 shadow-2xl z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-600 rounded-lg shadow-sm"><Sigma size={16} className="text-white" /></div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Medical Hub</h2>
                </div>
                <button onClick={() => setShowWorkflowPanel(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
                <div className="flex bg-slate-100/50 p-1 rounded-xl">
                  <button onClick={() => setActiveTab("context")} className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'context' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                    <Info size={14} /> CONTEXT & HISTORY
                  </button>
                  <button onClick={() => setActiveTab("notes")} className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'notes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                    <Mic size={14} /> VOICE NOTES
                  </button>
                </div>

                {activeTab === "context" ? (
                  <>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Stethoscope size={14} />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">Clinical Context</span>
                      </div>
                      <div className="p-4 bg-slate-100/50 rounded-2xl border border-slate-200/50">
                        <textarea placeholder="No clinical history provided." value={clinicalHistory} onChange={(e) => setClinicalHistory(e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-600 italic leading-relaxed placeholder:text-slate-300 resize-none h-20" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                          <History size={14} />
                          <span className="text-[10px] font-extrabold uppercase tracking-widest">Priors Timeline</span>
                        </div>
                        <button onClick={loadPriors} className="text-slate-400 hover:text-blue-600"><RefreshCcw size={12} className={loadingPriors ? 'animate-spin' : ''} /></button>
                      </div>

                      <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-100 flex flex-col">
                        {priors.length === 0 ? (
                          <div className="text-[10px] text-slate-400 italic pl-8 py-2">No prior studies found.</div>
                        ) : (
                          priors.map((p) => (
                            <div key={p.studyUID} className="relative pl-8 group cursor-pointer" onClick={() => viewPriorReport(p.studyUID, p.description)}>
                              <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center z-10 group-hover:border-blue-500 transition-colors">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getModalityColor(p.modality) }} />
                              </div>
                              <div className="flex flex-col p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{p.date} • {p.modality}</span>
                                <span className="text-xs font-bold text-slate-700 leading-tight mt-1">{p.description}</span>
                                {p.reportStatus === 'final' && <span className="text-[9px] text-emerald-600 font-bold mt-1 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform"><Printer size={10} /> View Report <ChevronRight size={10} /></span>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Mic size={14} />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest">Voice Scribble Pad</span>
                    </div>
                    <div className="p-5 bg-blue-50/30 rounded-3xl border border-blue-100 ring-8 ring-blue-50/10 min-h-[300px] flex flex-col shadow-inner">
                      <textarea
                        placeholder="Speak freely to take rough notes... (Hands-free mode recommended)"
                        value={voiceNotes}
                        onChange={(e) => setVoiceNotes(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm text-blue-800 leading-relaxed placeholder:text-blue-200 resize-none flex-1 font-medium"
                      />
                      {voiceNotes && (
                        <Button
                          size="sm"
                          onClick={() => { editor?.chain().focus().insertContent(`<p><b>Note:</b> ${voiceNotes}</p>`).run(); setVoiceNotes(""); }}
                          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-[10px] uppercase font-bold tracking-widest rounded-xl shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
                        >
                          Paste into Findings
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 italic px-2">This is a temporary pad. Notes are NOT saved to the permanent record unless pasted into the main editor.</p>
                  </div>
                )}

                <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Sigma size={14} />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Workflow State</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      { id: 'draft', label: 'Draft', icon: Pencil, color: 'bg-amber-500' },
                      { id: 'preliminary', label: 'Preliminary', icon: Eye, color: 'bg-blue-500' },
                      { id: 'final', label: 'Finalized', icon: Lock, color: 'bg-emerald-500' },
                      { id: 'addendum', label: 'Addendum', icon: AlertTriangle, color: 'bg-red-500' },
                    ].map((s) => {
                      const isActive = status === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setStatus(s.id as WorkflowStatus)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${isActive
                            ? `${s.color} border-transparent shadow-lg shadow-${s.id}-500/20 scale-105 z-10`
                            : 'bg-white border-slate-100 hover:border-slate-300'
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

                <div className="flex flex-col gap-3 pb-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Pencil size={14} />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest">Clarification Note</span>
                    </div>
                  </div>
                  <textarea
                    placeholder="Enter findings clarification or addendum reason..."
                    value={workflowNote}
                    onChange={(e) => setWorkflowNote(e.target.value)}
                    className="w-full h-32 p-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition-all placeholder:text-slate-300 text-slate-700 shadow-sm"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">

                <div className="flex flex-col gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <h4 className="text-[10px] font-bold uppercase text-amber-700 tracking-widest flex items-center gap-1"><Lock size={10} /> Legal Certification</h4>
                  <label className="flex items-start gap-2 text-[10px] text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={disclaimerAccepted}
                      onChange={e => setDisclaimerAccepted(e.target.checked)}
                      disabled={status === 'final'}
                    />
                    <span className="leading-tight">
                      I, <b>{currentUser?.full_name || "the undersigned"}</b>, hereby certify that I have personally reviewed the images and this report is an accurate interpretation of the findings. I affix my digital signature to this document.
                    </span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button
                    disabled={isSaving || status === 'final'}
                    onClick={() => handleSave("draft")}
                    variant="outline"
                    className="flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-widest border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    Save Draft
                  </Button>
                  <Button
                    disabled={isSaving || status === 'final' || (!disclaimerAccepted && status !== 'final')}
                    onClick={() => {
                      handleSave("final");
                    }}
                    className={`flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Sign & Finalize
                  </Button>
                </div>


                <button
                  onClick={() => setShowWorkflowPanel(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase tracking-tighter transition-colors"
                >
                  Collapse Side Panel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {
        selectedPriorReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Historical Findings</span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">{selectedPriorReport.title}</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedPriorReport(null)} className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm"><X size={16} /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/10">
                <div className="prose prose-slate prose-sm max-w-none text-slate-700 leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedPriorReport.content) }} />
              </div>
              <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
                <Button onClick={() => setSelectedPriorReport(null)} className="bg-slate-900 text-white rounded-xl px-6 text-xs font-bold uppercase tracking-widest">Close Record</Button>
              </div>
            </div>
          </div>
        )
      }

      {
        (showKeyImages || keyImages.length > 0) && (
          <DraggablePanel
            title="Key Image Manager"
            subtitle={`${keyImages.length} Images`}
            onClose={() => setShowKeyImages(false)}
            className="w-[600px] h-auto max-h-[600px]"
          >
            <div className="p-4 bg-slate-50/50 flex-1 overflow-y-auto custom-scrollbar min-h-[200px]">
              {keyImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white h-full">
                  <ImagePlus size={32} className="mb-2 opacity-20" />
                  <span className="text-xs font-bold uppercase tracking-wide">No Key Images</span>
                  <span className="text-[10px]">Upload or drag images here</span>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {keyImages.map(img => (
                    <div key={img.id} className="group relative bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-square bg-slate-100 relative cursor-pointer" onClick={() => insertKeyImageToEditor(img)}>
                        <img src={`/api/uploads/keyimages/${img.file_path}`} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="bg-black/80 text-white text-[9px] font-bold px-2 py-1 rounded-full backdrop-blur-sm uppercase tracking-wider">Insert</span>
                        </div>
                      </div>
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteKeyImage(img.id); }}
                          className="bg-white/90 text-red-500 p-1 rounded shadow-sm hover:bg-red-500 hover:text-white transition-colors"
                          title="Delete Image"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                      <div className="p-1 border-t border-slate-50">
                        <p className="text-[9px] text-slate-500 truncate text-center font-mono">{img.uploaded_at ? new Date(img.uploaded_at).toLocaleTimeString() : "IMG"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-white border-t border-slate-100">
              <label className="flex items-center justify-center gap-2 w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-widest rounded-lg border border-blue-200 border-dashed cursor-pointer transition-colors active:scale-[0.99] relative">
                <ImagePlus size={14} />
                <span>Upload New Images</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={e => {
                    if (e.target.files?.length) {
                      Array.from(e.target.files).forEach(file => uploadKeyImage(file));
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
          </DraggablePanel>
        )
      }

    </div >
  );
}

function DraggablePanel({ children, onClose, title = "Key Images", subtitle, className = "w-64" }: { children: React.ReactNode; onClose: () => void; title?: string; subtitle?: string; className?: string }) {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    // Only drag if clicking header
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - 600, e.clientX - dragOffset.x)),
          y: Math.max(0, Math.min(window.innerHeight - 600, e.clientY - dragOffset.y))
        });
      }
    };
    const onMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div className={`absolute z-[9000] flex flex-col bg-white shadow-2xl rounded-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 ${className}`} style={{ left: position.x, top: position.y }}>
      <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center cursor-move select-none active:bg-slate-100" onMouseDown={onMouseDown}>
        <div className="flex items-center gap-2 pointer-events-none">
          <ImagePlus size={16} className="text-blue-600" />
          <span className="text-xs font-black uppercase text-slate-700 tracking-widest">{title}</span>
          {subtitle && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{subtitle}</span>}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-red-50 hover:text-red-500" onClick={onClose}><X size={14} /></Button>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

