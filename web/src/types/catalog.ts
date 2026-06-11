export type CatalogEntry = {
  code: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CatalogSyncResult = {
  platforms: number;
  countries: number;
};
