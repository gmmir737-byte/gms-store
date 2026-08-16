import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showSummary?: boolean;
  totalItems?: number;
  itemsPerPage?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showSummary = false,
  totalItems,
  itemsPerPage = 12,
}: PaginationProps) {
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const showEllipsisStart = currentPage > 3;
    const showEllipsisEnd = currentPage < totalPages - 2;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (showEllipsisStart) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (showEllipsisEnd) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {showSummary && totalItems && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {startItem} to {endItem} of {totalItems} items
        </p>
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600
            text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getVisiblePages().map((page, index) => (
          <React.Fragment key={index}>
            {typeof page === 'string' ? (
              <span className="px-3 py-1.5 text-gray-400">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page)}
                className={`
                  min-w-[40px] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${page === currentPage
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600
            text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
