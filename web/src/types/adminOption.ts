export type ProviderServiceOption = {
  code: string;
  name: string;
};

export type ProviderCountryOption = {
  code: string;
  name: string;
};

export type ProviderPriceOption = {
  serviceCode: string;
  countryCode: string;
  price: string;
  currency: string | null;
  count: number | null;
  operator: string | null;
};
