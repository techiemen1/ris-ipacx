import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../services/axiosInstance";
import { ChevronDown, FileText, Loader2, Search } from "lucide-react";
import { Button } from "../ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "../ui/dropdown-menu";

type Template = {
    id: number;
    name: string;
    content: string;
    modality?: string;
};

interface SmartTemplateSelectorProps {
    modality?: string;
    bodyPart?: string;
    onSelect: (content: string) => void;
}

export function SmartTemplateSelector({
    modality,
    bodyPart,
    onSelect,
}: SmartTemplateSelectorProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Try fetching specific to modality
            const q = modality ? `?modality=${modality}` : "";
            let r = await axiosInstance.get(`/report-templates/match${q}`);

            // 2. If no templates found (or specific query returned empty), try fetching all (fallback)
            if (r.data?.success && (!r.data.data || r.data.data.length === 0) && modality) {
                const r2 = await axiosInstance.get(`/report-templates/match`); // Fetch all
                if (r2.data?.success) {
                    setTemplates(r2.data.data);
                    return;
                }
            }

            if (r.data?.success) {
                setTemplates(r.data.data || []);
            } else {
                // Fallback hardcoded for demo
                setTemplates([
                    { id: 1, name: "Normal Chest X-Ray", modality: "CR", content: "<p><strong>Findings:</strong> No active lung parenthesis lesion seen.</p>" },
                    { id: 2, name: "Normal Brain CT", modality: "CT", content: "<p><strong>Findings:</strong> Normal gray-white matter differentiation.</p>" }
                ]);
            }
        } catch (err) {
            console.error(err);
            setTemplates([
                { id: 1, name: "Normal Chest X-Ray", modality: "CR", content: "<p><strong>Findings:</strong> No active lung parenthesis lesion seen.</p>" },
                { id: 2, name: "Normal Brain CT", modality: "CT", content: "<p><strong>Findings:</strong> Normal gray-white matter differentiation.</p>" }
            ]);
        } finally {
            setLoading(false);
        }
    }, [modality]);

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
        }
    }, [isOpen, fetchTemplates]);

    const filtered = templates.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    // Auto-suggestion logic highlighting
    const suggested = filtered.filter(
        (t) => t.modality === modality || (modality && t.name.includes(modality))
    );
    const others = filtered.filter((t) => !suggested.includes(t));

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 border-dashed border-blue-300 bg-blue-50/50 text-blue-700 hover:bg-blue-100 h-9">
                    <FileText className="w-4 h-4" />
                    <span>Templates</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[320px] p-0" align="start">
                <div className="p-2 border-b bg-gray-50 flex items-center gap-2 sticky top-0">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                        placeholder="Search templates..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="max-h-[300px] overflow-y-auto py-1">
                    {loading ? (
                        <div className="p-4 flex justify-center text-gray-500 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-xs">
                            No templates found
                        </div>
                    ) : (
                        <>
                            {suggested.length > 0 && (
                                <>
                                    <DropdownMenuLabel className="text-xs text-blue-600 px-2 py-1 bg-blue-50/30">
                                        Suggested for {modality || "Study"}
                                    </DropdownMenuLabel>
                                    {suggested.map(t => (
                                        <DropdownMenuItem key={t.id} onClick={() => onSelect(t.content)} className="cursor-pointer gap-2">
                                            <span className="flex-1 truncate">{t.name}</span>
                                            {t.modality && <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">{t.modality}</span>}
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                </>
                            )}

                            {others.length > 0 && (
                                <>
                                    <DropdownMenuLabel className="text-xs text-gray-500 px-2 py-1">
                                        All Templates
                                    </DropdownMenuLabel>
                                    {others.map(t => (
                                        <DropdownMenuItem key={t.id} onClick={() => onSelect(t.content)} className="cursor-pointer gap-2">
                                            <span className="flex-1 truncate">{t.name}</span>
                                            {t.modality && <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">{t.modality}</span>}
                                        </DropdownMenuItem>
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
