import { useEffect, useRef, useState } from "react";

type DictState = {
  listening: boolean;
  interim: string;
  final: string;
  error?: string | null;
};

export default function useDictation(lang = "en-IN") {
  const [state, setState] = useState<DictState>({
    listening: false,
    interim: "",
    final: "",
    error: null,
  });

  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setState(s => ({ ...s, error: "Speech Recognition not supported" }));
      return;
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (e: any) => {
      let interim = "";
      let final = state.final;

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }

      setState(s => ({ ...s, interim, final }));
    };

    rec.onerror = (e: any) => setState(s => ({ ...s, error: e.error }));

    recRef.current = rec;

    return () => {
      try { rec.stop(); } catch {}
    };
  }, []);

  const start = () => {
    try {
      recRef.current?.start();
      setState(s => ({ ...s, listening: true }));
    } catch {}
  };

  const stop = () => {
    try {
      recRef.current?.stop();
      setState(s => ({ ...s, listening: false, interim: "" }));
    } catch {}
  };

  const clearFinal = () => setState(s => ({ ...s, final: "" }));

  return { state, start, stop, clearFinal };
}
