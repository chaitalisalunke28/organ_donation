import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  pdfBlobUrl: string | null;
  downloadFilename?: string;
}

export default function DocumentModal({
  isOpen,
  onClose,
  title,
  pdfBlobUrl,
  downloadFilename = 'Document.pdf',
}: DocumentModalProps) {
  if (!isOpen || !pdfBlobUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleOpenNewTab = () => {
    window.open(pdfBlobUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/50 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-gray-900/10">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="icon-tile h-9 w-9 bg-teal-50 text-teal-600"><FileText className="w-[18px] h-[18px]" /></span>
            <div>
              <h2 className="truncate font-semibold text-sm sm:text-base leading-tight text-gray-900">{title}</h2>
              <p className="text-2xs text-gray-500">Medical evidence viewer</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={handleOpenNewTab}
              className="btn-secondary px-2.5 py-1.5 text-xs"
              title="Open in new window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </button>

            <button
              onClick={handleDownload}
              className="btn-secondary px-2.5 py-1.5 text-xs"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={onClose}
              className="btn-ghost p-1.5 ml-1"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded PDF Viewer */}
        <div className="flex-1 bg-gray-100 relative">
          <iframe
            src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full border-0"
            title={title}
          />
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
          <span>OrganConnect registry document</span>
          <button
            onClick={onClose}
            className="btn-secondary text-xs px-3 py-1"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
