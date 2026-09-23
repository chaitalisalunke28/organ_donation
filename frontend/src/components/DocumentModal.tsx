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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-teal-800 text-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-teal-200" />
            <div>
              <h2 className="font-semibold text-sm sm:text-base leading-tight">{title}</h2>
              <p className="text-2xs text-teal-200">OrganConnect Medical Evidence & Document Viewer</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewTab}
              className="p-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs transition-colors flex items-center gap-1 px-2.5"
              title="Open in new window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </button>

            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs transition-colors flex items-center gap-1 px-2.5"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-teal-700 text-white transition-colors ml-1"
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
          <span>Official Organ Allocation Registry Document</span>
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
