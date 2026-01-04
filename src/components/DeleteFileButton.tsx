"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteFileButtonProps {
    fileId: string;
    onDelete: () => void;
}

export function DeleteFileButton({ fileId, onDelete }: DeleteFileButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    // Check if we have ShadCN AlertDialog. If not, fallback to window.confirm. 
    // For now, I'll stick to a simple button that uses window.confirm to avoid missing dependency assumption, 
    // unless I check for the component existence. The user has "src/components/ui".

    const { mutate: deleteFile } = api.file.deleteFile.useMutation({
        onSuccess: () => {
            setIsDeleting(false);
            onDelete();
        },
        onError: (err) => {
            setIsDeleting(false);
            alert("Failed to delete file: " + err.message);
        }
    });

    return (
        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent Link click
                if (window.confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
                    setIsDeleting(true);
                    deleteFile({ id: fileId });
                }
            }}
            disabled={isDeleting}
            className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
            title="Delete File"
        >
            {isDeleting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Trash2 className="w-5 h-5" />
            )}
        </button>
    );
}
