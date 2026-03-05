export type TaxOption = {
  id: string;
  label: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  country:
    | "USA"
    | "Canada"
    | "Mexico"
    | "Guatemala"
    | "Belize"
    | "El Salvador"
    | "Honduras"
    | "Nicaragua"
    | "Costa Rica"
    | "Panama"
    | "Cuba"
    | "Jamaica"
    | "Haiti"
    | "Dominican Republic"
    | "Aruba"
    | "Curaçao"
    | "Puerto Rico"
    | "Trinidad and Tobago"
    | "Barbados"
    | "Bahamas"
    | "Colombia"
    | "Venezuela"
    | "Guyana"
    | "Suriname"
    | "Brazil"
    | "Ecuador"
    | "Peru"
    | "Bolivia"
    | "Paraguay"
    | "Uruguay"
    | "Argentina"
    | "Chile"
    | "United Kingdom"
    | "Ireland"
    | "France"
    | "Germany"
    | "Italy"
    | "Spain"
    | "Portugal"
    | "Netherlands"
    | "Belgium"
    | "Luxembourg"
    | "Austria"
    | "Switzerland"
    | "Sweden"
    | "Norway"
    | "Denmark"
    | "Finland"
    | "Iceland"
    | "Poland"
    | "Czech Republic"
    | "Slovakia"
    | "Hungary"
    | "Romania"
    | "Bulgaria"
    | "Croatia"
    | "Slovenia"
    | "Greece"
    | "Cyprus"
    | "Malta"
    | "Estonia"
    | "Latvia"
    | "Lithuania";
};

export const PREDEFINED_TAXES: TaxOption[] = [
  // ============================================================================
  // NORTH AMERICA
  // ============================================================================
  
  // USA
  {
    id: "sales-tax-usa",
    label: "Sales Tax",
    type: "PERCENTAGE",
    value: 7,
    country: "USA",
  },
  {
    id: "sales-tax-usa-5",
    label: "Sales Tax",
    type: "PERCENTAGE",
    value: 5,
    country: "USA",
  },
  {
    id: "sales-tax-usa-6",
    label: "Sales Tax",
    type: "PERCENTAGE",
    value: 6,
    country: "USA",
  },
  {
    id: "sales-tax-usa-8",
    label: "Sales Tax",
    type: "PERCENTAGE",
    value: 8,
    country: "USA",
  },
  {
    id: "sales-tax-usa-9",
    label: "Sales Tax",
    type: "PERCENTAGE",
    value: 9,
    country: "USA",
  },
  {
    id: "sales-tax-usa-10",
    label: "Sales Tax",
    type: "PERCENTAGE",
    value: 10,
    country: "USA",
  },

  // Canada
  {
    id: "gst-canada",
    label: "GST",
    type: "PERCENTAGE",
    value: 5,
    country: "Canada",
  },
  {
    id: "hst-canada",
    label: "HST",
    type: "PERCENTAGE",
    value: 13,
    country: "Canada",
  },
  {
    id: "hst-canada-15",
    label: "HST",
    type: "PERCENTAGE",
    value: 15,
    country: "Canada",
  },
  {
    id: "pst-canada",
    label: "PST",
    type: "PERCENTAGE",
    value: 7,
    country: "Canada",
  },
  {
    id: "pst-canada-10",
    label: "PST",
    type: "PERCENTAGE",
    value: 10,
    country: "Canada",
  },

  // Mexico
  {
    id: "iva-mexico",
    label: "IVA",
    type: "PERCENTAGE",
    value: 16,
    country: "Mexico",
  },
  {
    id: "ieps-mexico",
    label: "IEPS",
    type: "PERCENTAGE",
    value: 8,
    country: "Mexico",
  },

  // ============================================================================
  // CENTRAL AMERICA
  // ============================================================================

  // Guatemala
  {
    id: "iva-guatemala",
    label: "IVA",
    type: "PERCENTAGE",
    value: 12,
    country: "Guatemala",
  },

  // Belize
  {
    id: "gst-belize",
    label: "GST",
    type: "PERCENTAGE",
    value: 12.5,
    country: "Belize",
  },

  // El Salvador
  {
    id: "iva-el-salvador",
    label: "IVA",
    type: "PERCENTAGE",
    value: 13,
    country: "El Salvador",
  },

  // Honduras
  {
    id: "isv-honduras",
    label: "ISV",
    type: "PERCENTAGE",
    value: 15,
    country: "Honduras",
  },

  // Nicaragua
  {
    id: "iva-nicaragua",
    label: "IVA",
    type: "PERCENTAGE",
    value: 15,
    country: "Nicaragua",
  },

  // Costa Rica
  {
    id: "iva-costa-rica",
    label: "IVA",
    type: "PERCENTAGE",
    value: 13,
    country: "Costa Rica",
  },

  // Panama
  {
    id: "itbms-panama",
    label: "ITBMS",
    type: "PERCENTAGE",
    value: 7,
    country: "Panama",
  },

  // ============================================================================
  // CARIBBEAN
  // ============================================================================

  // Cuba
  {
    id: "impuesto-cuba",
    label: "Impuesto sobre Ventas",
    type: "PERCENTAGE",
    value: 10,
    country: "Cuba",
  },

  // Jamaica
  {
    id: "gct-jamaica",
    label: "GCT",
    type: "PERCENTAGE",
    value: 15,
    country: "Jamaica",
  },

  // Haiti
  {
    id: "tva-haiti",
    label: "TVA",
    type: "PERCENTAGE",
    value: 10,
    country: "Haiti",
  },

  // Dominican Republic
  {
    id: "itbis-dominican",
    label: "ITBIS",
    type: "PERCENTAGE",
    value: 18,
    country: "Dominican Republic",
  },
  {
    id: "itbis-dominican-16",
    label: "ITBIS",
    type: "PERCENTAGE",
    value: 16,
    country: "Dominican Republic",
  },

  // Aruba
  {
    id: "bbo-aruba",
    label: "BBO",
    type: "PERCENTAGE",
    value: 6,
    country: "Aruba",
  },

  // Curaçao
  {
    id: "ob-curacao",
    label: "OB",
    type: "PERCENTAGE",
    value: 6,
    country: "Curaçao",
  },
  {
    id: "ob-curacao-9",
    label: "OB",
    type: "PERCENTAGE",
    value: 9,
    country: "Curaçao",
  },
  {
    id: "ob-curacao-7",
    label: "OB",
    type: "PERCENTAGE",
    value: 7,
    country: "Curaçao",
  },

  // Puerto Rico
  {
    id: "ivu-puerto-rico",
    label: "IVU",
    type: "PERCENTAGE",
    value: 11.5,
    country: "Puerto Rico",
  },

  // Trinidad and Tobago
  {
    id: "vat-trinidad",
    label: "VAT",
    type: "PERCENTAGE",
    value: 12.5,
    country: "Trinidad and Tobago",
  },

  // Barbados
  {
    id: "vat-barbados",
    label: "VAT",
    type: "PERCENTAGE",
    value: 17.5,
    country: "Barbados",
  },

  // Bahamas
  {
    id: "vat-bahamas",
    label: "VAT",
    type: "PERCENTAGE",
    value: 10,
    country: "Bahamas",
  },

  // ============================================================================
  // SOUTH AMERICA
  // ============================================================================

  // Colombia
  {
    id: "iva-colombia",
    label: "IVA",
    type: "PERCENTAGE",
    value: 19,
    country: "Colombia",
  },
  {
    id: "iva-colombia-5",
    label: "IVA",
    type: "PERCENTAGE",
    value: 5,
    country: "Colombia",
  },
  {
    id: "ipoconsumo-colombia",
    label: "Impuesto al Consumo",
    type: "PERCENTAGE",
    value: 8,
    country: "Colombia",
  },

  // Venezuela
  {
    id: "iva-venezuela",
    label: "IVA",
    type: "PERCENTAGE",
    value: 16,
    country: "Venezuela",
  },

  // Guyana
  {
    id: "vat-guyana",
    label: "VAT",
    type: "PERCENTAGE",
    value: 14,
    country: "Guyana",
  },

  // Suriname
  {
    id: "btw-suriname",
    label: "BTW",
    type: "PERCENTAGE",
    value: 10,
    country: "Suriname",
  },

  // Brazil
  {
    id: "icms-brazil",
    label: "ICMS",
    type: "PERCENTAGE",
    value: 17,
    country: "Brazil",
  },
  {
    id: "icms-brazil-18",
    label: "ICMS",
    type: "PERCENTAGE",
    value: 18,
    country: "Brazil",
  },
  {
    id: "icms-brazil-19",
    label: "ICMS",
    type: "PERCENTAGE",
    value: 19,
    country: "Brazil",
  },
  {
    id: "ipi-brazil",
    label: "IPI",
    type: "PERCENTAGE",
    value: 10,
    country: "Brazil",
  },
  {
    id: "pis-brazil",
    label: "PIS",
    type: "PERCENTAGE",
    value: 1.65,
    country: "Brazil",
  },
  {
    id: "cofins-brazil",
    label: "COFINS",
    type: "PERCENTAGE",
    value: 7.6,
    country: "Brazil",
  },

  // Ecuador
  {
    id: "iva-ecuador",
    label: "IVA",
    type: "PERCENTAGE",
    value: 12,
    country: "Ecuador",
  },

  // Peru
  {
    id: "igv-peru",
    label: "IGV",
    type: "PERCENTAGE",
    value: 18,
    country: "Peru",
  },

  // Bolivia
  {
    id: "iva-bolivia",
    label: "IVA",
    type: "PERCENTAGE",
    value: 13,
    country: "Bolivia",
  },

  // Paraguay
  {
    id: "iva-paraguay",
    label: "IVA",
    type: "PERCENTAGE",
    value: 10,
    country: "Paraguay",
  },

  // Uruguay
  {
    id: "iva-uruguay",
    label: "IVA",
    type: "PERCENTAGE",
    value: 22,
    country: "Uruguay",
  },
  {
    id: "iva-uruguay-10",
    label: "IVA",
    type: "PERCENTAGE",
    value: 10,
    country: "Uruguay",
  },

  // Argentina
  {
    id: "iva-argentina",
    label: "IVA",
    type: "PERCENTAGE",
    value: 21,
    country: "Argentina",
  },
  {
    id: "iva-argentina-10.5",
    label: "IVA",
    type: "PERCENTAGE",
    value: 10.5,
    country: "Argentina",
  },

  // Chile
  {
    id: "iva-chile",
    label: "IVA",
    type: "PERCENTAGE",
    value: 19,
    country: "Chile",
  },

  // ============================================================================
  // EUROPE - WESTERN
  // ============================================================================

  // United Kingdom
  {
    id: "vat-uk",
    label: "VAT",
    type: "PERCENTAGE",
    value: 20,
    country: "United Kingdom",
  },
  {
    id: "vat-uk-reduced",
    label: "VAT (Reduced)",
    type: "PERCENTAGE",
    value: 5,
    country: "United Kingdom",
  },

  // Ireland
  {
    id: "vat-ireland",
    label: "VAT",
    type: "PERCENTAGE",
    value: 23,
    country: "Ireland",
  },
  {
    id: "vat-ireland-reduced",
    label: "VAT (Reduced)",
    type: "PERCENTAGE",
    value: 13.5,
    country: "Ireland",
  },

  // France
  {
    id: "tva-france",
    label: "TVA",
    type: "PERCENTAGE",
    value: 20,
    country: "France",
  },
  {
    id: "tva-france-reduced",
    label: "TVA (Réduite)",
    type: "PERCENTAGE",
    value: 5.5,
    country: "France",
  },

  // Germany
  {
    id: "mwst-germany",
    label: "MwSt",
    type: "PERCENTAGE",
    value: 19,
    country: "Germany",
  },
  {
    id: "mwst-germany-reduced",
    label: "MwSt (Reduziert)",
    type: "PERCENTAGE",
    value: 7,
    country: "Germany",
  },

  // Italy
  {
    id: "iva-italy",
    label: "IVA",
    type: "PERCENTAGE",
    value: 22,
    country: "Italy",
  },
  {
    id: "iva-italy-reduced",
    label: "IVA (Ridotta)",
    type: "PERCENTAGE",
    value: 10,
    country: "Italy",
  },
  {
    id: "iva-italy-super-reduced",
    label: "IVA (Super Ridotta)",
    type: "PERCENTAGE",
    value: 4,
    country: "Italy",
  },

  // Spain
  {
    id: "iva-spain",
    label: "IVA",
    type: "PERCENTAGE",
    value: 21,
    country: "Spain",
  },
  {
    id: "iva-spain-reduced",
    label: "IVA (Reducido)",
    type: "PERCENTAGE",
    value: 10,
    country: "Spain",
  },
  {
    id: "iva-spain-super-reduced",
    label: "IVA (Super Reducido)",
    type: "PERCENTAGE",
    value: 4,
    country: "Spain",
  },

  // Portugal
  {
    id: "iva-portugal",
    label: "IVA",
    type: "PERCENTAGE",
    value: 23,
    country: "Portugal",
  },
  {
    id: "iva-portugal-reduced",
    label: "IVA (Reduzido)",
    type: "PERCENTAGE",
    value: 13,
    country: "Portugal",
  },
  {
    id: "iva-portugal-intermediate",
    label: "IVA (Intermediário)",
    type: "PERCENTAGE",
    value: 6,
    country: "Portugal",
  },

  // Netherlands
  {
    id: "btw-netherlands",
    label: "BTW",
    type: "PERCENTAGE",
    value: 21,
    country: "Netherlands",
  },
  {
    id: "btw-netherlands-reduced",
    label: "BTW (Verlaagd)",
    type: "PERCENTAGE",
    value: 9,
    country: "Netherlands",
  },

  // Belgium
  {
    id: "btw-belgium",
    label: "BTW",
    type: "PERCENTAGE",
    value: 21,
    country: "Belgium",
  },
  {
    id: "btw-belgium-reduced",
    label: "BTW (Verlaagd)",
    type: "PERCENTAGE",
    value: 6,
    country: "Belgium",
  },
  {
    id: "btw-belgium-super-reduced",
    label: "BTW (Super Verlaagd)",
    type: "PERCENTAGE",
    value: 12,
    country: "Belgium",
  },

  // Luxembourg
  {
    id: "tva-luxembourg",
    label: "TVA",
    type: "PERCENTAGE",
    value: 17,
    country: "Luxembourg",
  },
  {
    id: "tva-luxembourg-reduced",
    label: "TVA (Réduite)",
    type: "PERCENTAGE",
    value: 8,
    country: "Luxembourg",
  },
  {
    id: "tva-luxembourg-super-reduced",
    label: "TVA (Super Réduite)",
    type: "PERCENTAGE",
    value: 3,
    country: "Luxembourg",
  },

  // Austria
  {
    id: "ust-austria",
    label: "USt",
    type: "PERCENTAGE",
    value: 20,
    country: "Austria",
  },
  {
    id: "ust-austria-reduced",
    label: "USt (Ermäßigt)",
    type: "PERCENTAGE",
    value: 10,
    country: "Austria",
  },
  {
    id: "ust-austria-super-reduced",
    label: "USt (Super Ermäßigt)",
    type: "PERCENTAGE",
    value: 13,
    country: "Austria",
  },

  // Switzerland
  {
    id: "mws-switzerland",
    label: "MwSt",
    type: "PERCENTAGE",
    value: 7.7,
    country: "Switzerland",
  },
  {
    id: "mws-switzerland-reduced",
    label: "MwSt (Reduziert)",
    type: "PERCENTAGE",
    value: 2.5,
    country: "Switzerland",
  },
  {
    id: "mws-switzerland-special",
    label: "MwSt (Sondersatz)",
    type: "PERCENTAGE",
    value: 3.7,
    country: "Switzerland",
  },

  // ============================================================================
  // EUROPE - NORDIC
  // ============================================================================

  // Sweden
  {
    id: "moms-sweden",
    label: "Moms",
    type: "PERCENTAGE",
    value: 25,
    country: "Sweden",
  },
  {
    id: "moms-sweden-reduced",
    label: "Moms (Reducerad)",
    type: "PERCENTAGE",
    value: 12,
    country: "Sweden",
  },
  {
    id: "moms-sweden-super-reduced",
    label: "Moms (Super Reducerad)",
    type: "PERCENTAGE",
    value: 6,
    country: "Sweden",
  },

  // Norway
  {
    id: "mva-norway",
    label: "MVA",
    type: "PERCENTAGE",
    value: 25,
    country: "Norway",
  },
  {
    id: "mva-norway-reduced",
    label: "MVA (Redusert)",
    type: "PERCENTAGE",
    value: 15,
    country: "Norway",
  },

  // Denmark
  {
    id: "moms-denmark",
    label: "Moms",
    type: "PERCENTAGE",
    value: 25,
    country: "Denmark",
  },

  // Finland
  {
    id: "alv-finland",
    label: "ALV",
    type: "PERCENTAGE",
    value: 24,
    country: "Finland",
  },
  {
    id: "alv-finland-reduced",
    label: "ALV (Alennettu)",
    type: "PERCENTAGE",
    value: 14,
    country: "Finland",
  },
  {
    id: "alv-finland-super-reduced",
    label: "ALV (Super Alennettu)",
    type: "PERCENTAGE",
    value: 10,
    country: "Finland",
  },

  // Iceland
  {
    id: "vsk-iceland",
    label: "VSK",
    type: "PERCENTAGE",
    value: 24,
    country: "Iceland",
  },
  {
    id: "vsk-iceland-reduced",
    label: "VSK (Lækkaður)",
    type: "PERCENTAGE",
    value: 11,
    country: "Iceland",
  },

  // ============================================================================
  // EUROPE - EASTERN
  // ============================================================================

  // Poland
  {
    id: "vat-poland",
    label: "VAT",
    type: "PERCENTAGE",
    value: 23,
    country: "Poland",
  },
  {
    id: "vat-poland-reduced",
    label: "VAT (Obniżona)",
    type: "PERCENTAGE",
    value: 8,
    country: "Poland",
  },
  {
    id: "vat-poland-super-reduced",
    label: "VAT (Super Obniżona)",
    type: "PERCENTAGE",
    value: 5,
    country: "Poland",
  },

  // Czech Republic
  {
    id: "dph-czech",
    label: "DPH",
    type: "PERCENTAGE",
    value: 21,
    country: "Czech Republic",
  },
  {
    id: "dph-czech-reduced",
    label: "DPH (Snížená)",
    type: "PERCENTAGE",
    value: 15,
    country: "Czech Republic",
  },
  {
    id: "dph-czech-super-reduced",
    label: "DPH (Super Snížená)",
    type: "PERCENTAGE",
    value: 10,
    country: "Czech Republic",
  },

  // Slovakia
  {
    id: "dph-slovakia",
    label: "DPH",
    type: "PERCENTAGE",
    value: 20,
    country: "Slovakia",
  },
  {
    id: "dph-slovakia-reduced",
    label: "DPH (Znížená)",
    type: "PERCENTAGE",
    value: 10,
    country: "Slovakia",
  },

  // Hungary
  {
    id: "afa-hungary",
    label: "ÁFA",
    type: "PERCENTAGE",
    value: 27,
    country: "Hungary",
  },
  {
    id: "afa-hungary-reduced",
    label: "ÁFA (Csökkentett)",
    type: "PERCENTAGE",
    value: 18,
    country: "Hungary",
  },
  {
    id: "afa-hungary-super-reduced",
    label: "ÁFA (Super Csökkentett)",
    type: "PERCENTAGE",
    value: 5,
    country: "Hungary",
  },

  // Romania
  {
    id: "tva-romania",
    label: "TVA",
    type: "PERCENTAGE",
    value: 19,
    country: "Romania",
  },
  {
    id: "tva-romania-reduced",
    label: "TVA (Redusă)",
    type: "PERCENTAGE",
    value: 9,
    country: "Romania",
  },
  {
    id: "tva-romania-super-reduced",
    label: "TVA (Super Redusă)",
    type: "PERCENTAGE",
    value: 5,
    country: "Romania",
  },

  // Bulgaria
  {
    id: "ddds-bulgaria",
    label: "ДДС",
    type: "PERCENTAGE",
    value: 20,
    country: "Bulgaria",
  },
  {
    id: "ddds-bulgaria-reduced",
    label: "ДДС (Намален)",
    type: "PERCENTAGE",
    value: 9,
    country: "Bulgaria",
  },

  // Croatia
  {
    id: "pdv-croatia",
    label: "PDV",
    type: "PERCENTAGE",
    value: 25,
    country: "Croatia",
  },
  {
    id: "pdv-croatia-reduced",
    label: "PDV (Smanjeni)",
    type: "PERCENTAGE",
    value: 13,
    country: "Croatia",
  },
  {
    id: "pdv-croatia-super-reduced",
    label: "PDV (Super Smanjeni)",
    type: "PERCENTAGE",
    value: 5,
    country: "Croatia",
  },

  // Slovenia
  {
    id: "ddv-slovenia",
    label: "DDV",
    type: "PERCENTAGE",
    value: 22,
    country: "Slovenia",
  },
  {
    id: "ddv-slovenia-reduced",
    label: "DDV (Znižana)",
    type: "PERCENTAGE",
    value: 9.5,
    country: "Slovenia",
  },

  // ============================================================================
  // EUROPE - SOUTHERN
  // ============================================================================

  // Greece
  {
    id: "fpa-greece",
    label: "ΦΠΑ",
    type: "PERCENTAGE",
    value: 24,
    country: "Greece",
  },
  {
    id: "fpa-greece-reduced",
    label: "ΦΠΑ (Μειωμένος)",
    type: "PERCENTAGE",
    value: 13,
    country: "Greece",
  },
  {
    id: "fpa-greece-super-reduced",
    label: "ΦΠΑ (Υπερ Μειωμένος)",
    type: "PERCENTAGE",
    value: 6,
    country: "Greece",
  },

  // Cyprus
  {
    id: "fpa-cyprus",
    label: "ΦΠΑ",
    type: "PERCENTAGE",
    value: 19,
    country: "Cyprus",
  },
  {
    id: "fpa-cyprus-reduced",
    label: "ΦΠΑ (Μειωμένος)",
    type: "PERCENTAGE",
    value: 9,
    country: "Cyprus",
  },
  {
    id: "fpa-cyprus-super-reduced",
    label: "ΦΠΑ (Υπερ Μειωμένος)",
    type: "PERCENTAGE",
    value: 5,
    country: "Cyprus",
  },

  // Malta
  {
    id: "vat-malta",
    label: "VAT",
    type: "PERCENTAGE",
    value: 18,
    country: "Malta",
  },
  {
    id: "vat-malta-reduced",
    label: "VAT (Ridott)",
    type: "PERCENTAGE",
    value: 7,
    country: "Malta",
  },
  {
    id: "vat-malta-super-reduced",
    label: "VAT (Super Ridott)",
    type: "PERCENTAGE",
    value: 5,
    country: "Malta",
  },

  // ============================================================================
  // EUROPE - BALTIC
  // ============================================================================

  // Estonia
  {
    id: "km-estonia",
    label: "KM",
    type: "PERCENTAGE",
    value: 22,
    country: "Estonia",
  },
  {
    id: "km-estonia-reduced",
    label: "KM (Vähendatud)",
    type: "PERCENTAGE",
    value: 9,
    country: "Estonia",
  },

  // Latvia
  {
    id: "pvnn-latvia",
    label: "PVN",
    type: "PERCENTAGE",
    value: 21,
    country: "Latvia",
  },
  {
    id: "pvnn-latvia-reduced",
    label: "PVN (Samazināts)",
    type: "PERCENTAGE",
    value: 12,
    country: "Latvia",
  },
  {
    id: "pvnn-latvia-super-reduced",
    label: "PVN (Super Samazināts)",
    type: "PERCENTAGE",
    value: 5,
    country: "Latvia",
  },

  // Lithuania
  {
    id: "pvm-lithuania",
    label: "PVM",
    type: "PERCENTAGE",
    value: 21,
    country: "Lithuania",
  },
  {
    id: "pvm-lithuania-reduced",
    label: "PVM (Sumažinta)",
    type: "PERCENTAGE",
    value: 9,
    country: "Lithuania",
  },
  {
    id: "pvm-lithuania-super-reduced",
    label: "PVM (Super Sumažinta)",
    type: "PERCENTAGE",
    value: 5,
    country: "Lithuania",
  },
];

/**
 * Find a predefined tax by its ID
 */
export const findTaxById = (id: string): TaxOption | undefined => {
  return PREDEFINED_TAXES.find((tax) => tax.id === id);
};

/**
 * Find a predefined tax by type and value
 */
export const findTaxByTypeAndValue = (
  type: "PERCENTAGE" | "FIXED",
  value: number,
): TaxOption | undefined => {
  return PREDEFINED_TAXES.find(
    (tax) => tax.type === type && tax.value === value,
  );
};

/**
 * Find a predefined tax by type, value, and country.
 * Prefers the tax for the organization's country so the correct label (e.g. IVA 19% for Colombia) is shown instead of another country's tax (e.g. Sales Tax).
 * Falls back to first match by type+value if no country or no match in that country.
 */
export const findTaxByTypeValueAndCountry = (
  type: "PERCENTAGE" | "FIXED",
  value: number,
  country: TaxOption["country"] | null | undefined,
): TaxOption | undefined => {
  if (country) {
    const match = PREDEFINED_TAXES.find(
      (tax) =>
        tax.type === type && tax.value === value && tax.country === country,
    );
    if (match) return match;
  }
  return findTaxByTypeAndValue(type, value);
};
