"use client";

import { DiscoverView } from "./_components/discover-view";
import { useDiscover } from "./hooks/use-discover";

export default function DiscoverPage() {
  const {
    models,
    filteredModels,
    loading,
    error,
    search,
    task,
    sort,
    library,
    showFilters,
    copiedId,
    hasMore,
    providerFilter,
    providers,
    setSearch,
    setTask,
    setSort,
    setLibrary,
    setShowFilters,
    setProviderFilter,
    copyModelId,
    loadMore,
    refreshModels,
    isModelLocal,
  } = useDiscover();

  return (
    <DiscoverView
      models={models}
      filteredModels={filteredModels}
      loading={loading}
      error={error}
      search={search}
      task={task}
      sort={sort}
      library={library}
      showFilters={showFilters}
      copiedId={copiedId}
      hasMore={hasMore}
      providerFilter={providerFilter}
      providers={providers}
      onSearchChange={setSearch}
      onTaskChange={setTask}
      onSortChange={setSort}
      onLibraryChange={setLibrary}
      onToggleFilters={() => setShowFilters(!showFilters)}
      onProviderFilterChange={setProviderFilter}
      onCopyModelId={copyModelId}
      onLoadMore={loadMore}
      onRefresh={refreshModels}
      isModelLocal={isModelLocal}
    />
  );
}
