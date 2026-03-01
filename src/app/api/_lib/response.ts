export type ApiMeta = {
  last_sync_at: string | null;
  data_updated_at: string | null;
  source: string;
};

export type ApiPagination = {
  page: number;
  page_size: number;
  total: number;
  // backward-compatible aliases / extras
  pageSize?: number;
  totalPages?: number;
  hasMore?: boolean;
};

export function buildMeta(params: {
  source?: string;
  lastSyncAt?: string | Date | null;
  dataUpdatedAt?: string | Date | null;
}): ApiMeta {
  const toIsoOrNull = (v: string | Date | null | undefined): string | null => {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString();
    return v;
  };

  return {
    source: params.source ?? 'supabase',
    last_sync_at: toIsoOrNull(params.lastSyncAt),
    data_updated_at: toIsoOrNull(params.dataUpdatedAt),
  };
}

export function buildPagination(params: {
  page: number;
  pageSize: number;
  total: number;
}): ApiPagination {
  const { page, pageSize, total } = params;
  const totalPages = Math.ceil(total / pageSize);
  const hasMore = page * pageSize < total;

  return {
    page,
    page_size: pageSize,
    total,
    // backward-compatible aliases / extras
    pageSize,
    totalPages,
    hasMore,
  };
}

export function withLegacyListShape<T>(params: {
  key: string;
  rows: T[];
  data: unknown;
  meta: ApiMeta;
  pagination?: ApiPagination;
  extra?: Record<string, unknown>;
}) {
  const { key, rows, data, meta, pagination, extra } = params;

  return {
    data,
    ...(pagination ? { pagination } : {}),
    meta,

    // Backward compatibility fields
    [key]: rows,
    count: rows.length,
    data_source: meta.source,
    last_sync_at: meta.last_sync_at,
    data_updated_at: meta.data_updated_at,
    ...(extra ?? {}),
  };
}
