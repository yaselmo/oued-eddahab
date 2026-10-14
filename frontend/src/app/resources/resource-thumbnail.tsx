"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../lib/api";

type Props = {
  resourceId: string;
  title: string;
  token: string;
  onUnauthorized: () => void;
};

export default function ResourceThumbnail({
  resourceId,
  title,
  token,
  onUnauthorized,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || shouldLoad) return;

    if (!("IntersectionObserver" in window)) {
      const timer = setTimeout(() => setShouldLoad(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "240px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return;

    const controller = new AbortController();
    let objectUrl: string | null = null;

    async function loadThumbnail() {
      try {
        const response = await fetch(
          apiUrl(`/api/resources/${resourceId}/thumbnail`),
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );

        if (response.status === 401) {
          onUnauthorized();
          return;
        }
        if (!response.ok) throw new Error("Preview unavailable");

        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) {
          throw new Error("Invalid preview response");
        }

        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
      }
    }

    void loadThumbnail();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [onUnauthorized, resourceId, shouldLoad, token]);

  return (
    <div
      ref={containerRef}
      className="relative flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-zinc-200 bg-zinc-100"
    >
      {imageUrl && !failed ? (
        // A blob URL is required because the protected endpoint needs a JWT header.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={`First page preview of ${title}`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.015]"
        />
      ) : failed ? (
        <PdfPlaceholder />
      ) : (
        <div className="h-4/5 w-3/5 animate-pulse rounded-sm bg-white shadow-sm" />
      )}
    </div>
  );
}

function PdfPlaceholder() {
  return (
    <div className="flex h-4/5 w-3/5 flex-col rounded-sm border border-zinc-200 bg-white p-4 shadow-sm">
      <span className="w-fit rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold tracking-wide text-white">
        PDF
      </span>
      <div className="mt-4 h-2 w-full rounded bg-zinc-200" />
      <div className="mt-2 h-2 w-4/5 rounded bg-zinc-200" />
      <div className="mt-2 h-2 w-2/3 rounded bg-zinc-200" />
      <p className="mt-auto text-center text-[11px] font-medium text-zinc-400">
        Preview unavailable
      </p>
    </div>
  );
}
