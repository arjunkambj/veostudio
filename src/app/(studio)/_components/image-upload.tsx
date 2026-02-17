"use client";

import { Button } from "@heroui/react";
import { useEffect, useRef, useState } from "react";

type ImageUploadProps = {
  files: File[];
  onChange: (files: File[]) => void;
};

export default function ImageUpload({ files, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [files]);

  function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > 0) {
      onChange([...files, ...selected]);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Reference Images</span>
        {files.length > 0 && (
          <span className="rounded-full bg-default-100 px-2 py-0.5 text-xs text-default-600">
            {files.length}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFiles}
        className="hidden"
      />

      <Button
        size="sm"
        variant="flat"
        onPress={() => inputRef.current?.click()}
      >
        Choose Images
      </Button>

      {previews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto py-1">
          {previews.map((src, i) => {
            const file = files[i];
            const key = `${file.name}-${file.size}-${file.lastModified}`;
            return (
              <div key={key} className="group relative shrink-0">
                {/* biome-ignore lint/performance/noImgElement: blob preview URLs are not optimizable by next/image */}
                <img
                  src={src}
                  alt={file.name}
                  className="h-20 w-20 rounded-lg border border-divider object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
