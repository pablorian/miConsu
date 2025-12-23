'use client';

import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { useTranslations } from 'next-intl';

interface DownloadOptionsProps {
  url: string;
  fileName: string;
}

export default function DownloadOptions({ url, fileName }: DownloadOptionsProps) {
  const t = useTranslations('Dashboard');
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  const downloadPNG = async (size: number) => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${fileName}-${size}x${size}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadSVG = async () => {
    try {
      const svgString = await QRCode.toString(url, {
        type: 'svg',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex-1 inline-flex items-center justify-center rounded-md bg-white dark:bg-zinc-700 border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full"
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        {t('download')}
        <svg className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-full origin-bottom rounded-md bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1">
            <button
              onClick={() => downloadPNG(256)}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
            >
              PNG 256px
            </button>
            <button
              onClick={() => downloadPNG(512)}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
            >
              PNG 512px
            </button>
            <button
              onClick={() => downloadPNG(1024)}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
            >
              PNG 1024px
            </button>
            <button
              onClick={downloadSVG}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
            >
              SVG (Vector)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
