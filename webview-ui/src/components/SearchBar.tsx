import React from "react";
import { Search, Loader2 } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSearch: (e: React.FormEvent) => void;
  loading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  setSearchTerm,
  onSearch,
  loading,
}) => {
  return (
    <div className="w-full flex items-center">
      <form onSubmit={onSearch} className="flex-1 flex items-center relative group">
        <div className="absolute left-3 text-nexus-text-muted transition-colors group-focus-within:text-nexus-text">
          {loading ? (
            <Loader2 size={14} className="animate-spin text-nexus-accent" />
          ) : (
            <Search size={14} />
          )}
        </div>
        <input
          type="text"
          placeholder="Search memories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-nexus-input-bg border border-nexus-border rounded pl-9 pr-3 py-2 text-[13px] text-nexus-input-fg outline-none focus:border-nexus-focus-border focus:ring-1 focus:ring-nexus-focus-border/20 transition-all placeholder:text-nexus-text-muted/70"
        />
        <button type="submit" className="hidden">
          Buscar
        </button>
      </form>
    </div>
  );
};
