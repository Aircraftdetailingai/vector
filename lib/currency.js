// All Stripe-supported currencies with symbols, names, flags, and locales

export const CURRENCY_MAP = {
  USD: { symbol: '$', code: 'USD', name: 'US Dollar', flag: '\u{1F1FA}\u{1F1F8}', locale: 'en-US' },
  AED: { symbol: 'د.إ', code: 'AED', name: 'UAE Dirham', flag: '\u{1F1E6}\u{1F1EA}', locale: 'ar-AE' },
  AFN: { symbol: '؋', code: 'AFN', name: 'Afghan Afghani', flag: '\u{1F1E6}\u{1F1EB}', locale: 'fa-AF' },
  ALL: { symbol: 'L', code: 'ALL', name: 'Albanian Lek', flag: '\u{1F1E6}\u{1F1F1}', locale: 'sq-AL' },
  AMD: { symbol: '֏', code: 'AMD', name: 'Armenian Dram', flag: '\u{1F1E6}\u{1F1F2}', locale: 'hy-AM' },
  ANG: { symbol: 'ƒ', code: 'ANG', name: 'Netherlands Antillean Guilder', flag: '\u{1F1E8}\u{1F1FC}', locale: 'nl-CW' },
  AOA: { symbol: 'Kz', code: 'AOA', name: 'Angolan Kwanza', flag: '\u{1F1E6}\u{1F1F4}', locale: 'pt-AO' },
  ARS: { symbol: '$', code: 'ARS', name: 'Argentine Peso', flag: '\u{1F1E6}\u{1F1F7}', locale: 'es-AR' },
  AUD: { symbol: 'A$', code: 'AUD', name: 'Australian Dollar', flag: '\u{1F1E6}\u{1F1FA}', locale: 'en-AU' },
  AWG: { symbol: 'ƒ', code: 'AWG', name: 'Aruban Florin', flag: '\u{1F1E6}\u{1F1FC}', locale: 'nl-AW' },
  AZN: { symbol: '₼', code: 'AZN', name: 'Azerbaijani Manat', flag: '\u{1F1E6}\u{1F1FF}', locale: 'az-AZ' },
  BAM: { symbol: 'KM', code: 'BAM', name: 'Bosnia-Herzegovina Mark', flag: '\u{1F1E7}\u{1F1E6}', locale: 'bs-BA' },
  BBD: { symbol: 'Bds$', code: 'BBD', name: 'Barbadian Dollar', flag: '\u{1F1E7}\u{1F1E7}', locale: 'en-BB' },
  BDT: { symbol: '৳', code: 'BDT', name: 'Bangladeshi Taka', flag: '\u{1F1E7}\u{1F1E9}', locale: 'bn-BD' },
  BGN: { symbol: 'лв', code: 'BGN', name: 'Bulgarian Lev', flag: '\u{1F1E7}\u{1F1EC}', locale: 'bg-BG' },
  BHD: { symbol: '.د.ب', code: 'BHD', name: 'Bahraini Dinar', flag: '\u{1F1E7}\u{1F1ED}', locale: 'ar-BH' },
  BMD: { symbol: '$', code: 'BMD', name: 'Bermudian Dollar', flag: '\u{1F1E7}\u{1F1F2}', locale: 'en-BM' },
  BND: { symbol: 'B$', code: 'BND', name: 'Brunei Dollar', flag: '\u{1F1E7}\u{1F1F3}', locale: 'ms-BN' },
  BOB: { symbol: 'Bs.', code: 'BOB', name: 'Bolivian Boliviano', flag: '\u{1F1E7}\u{1F1F4}', locale: 'es-BO' },
  BRL: { symbol: 'R$', code: 'BRL', name: 'Brazilian Real', flag: '\u{1F1E7}\u{1F1F7}', locale: 'pt-BR' },
  BSD: { symbol: 'B$', code: 'BSD', name: 'Bahamian Dollar', flag: '\u{1F1E7}\u{1F1F8}', locale: 'en-BS' },
  BWP: { symbol: 'P', code: 'BWP', name: 'Botswana Pula', flag: '\u{1F1E7}\u{1F1FC}', locale: 'en-BW' },
  BYN: { symbol: 'Br', code: 'BYN', name: 'Belarusian Ruble', flag: '\u{1F1E7}\u{1F1FE}', locale: 'be-BY' },
  BZD: { symbol: 'BZ$', code: 'BZD', name: 'Belize Dollar', flag: '\u{1F1E7}\u{1F1FF}', locale: 'en-BZ' },
  CAD: { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar', flag: '\u{1F1E8}\u{1F1E6}', locale: 'en-CA' },
  CDF: { symbol: 'FC', code: 'CDF', name: 'Congolese Franc', flag: '\u{1F1E8}\u{1F1E9}', locale: 'fr-CD' },
  CHF: { symbol: 'CHF', code: 'CHF', name: 'Swiss Franc', flag: '\u{1F1E8}\u{1F1ED}', locale: 'de-CH' },
  CKD: { symbol: '$', code: 'CKD', name: 'Cook Islands Dollar', flag: '\u{1F1E8}\u{1F1F0}', locale: 'en-CK' },
  CLP: { symbol: 'CL$', code: 'CLP', name: 'Chilean Peso', flag: '\u{1F1E8}\u{1F1F1}', locale: 'es-CL' },
  CNY: { symbol: '¥', code: 'CNY', name: 'Chinese Yuan', flag: '\u{1F1E8}\u{1F1F3}', locale: 'zh-CN' },
  COP: { symbol: 'COL$', code: 'COP', name: 'Colombian Peso', flag: '\u{1F1E8}\u{1F1F4}', locale: 'es-CO' },
  CRC: { symbol: '₡', code: 'CRC', name: 'Costa Rican Colon', flag: '\u{1F1E8}\u{1F1F7}', locale: 'es-CR' },
  CVE: { symbol: 'Esc', code: 'CVE', name: 'Cape Verdean Escudo', flag: '\u{1F1E8}\u{1F1FB}', locale: 'pt-CV' },
  CZK: { symbol: 'Kč', code: 'CZK', name: 'Czech Koruna', flag: '\u{1F1E8}\u{1F1FF}', locale: 'cs-CZ' },
  DJF: { symbol: 'Fdj', code: 'DJF', name: 'Djiboutian Franc', flag: '\u{1F1E9}\u{1F1EF}', locale: 'fr-DJ' },
  DKK: { symbol: 'kr', code: 'DKK', name: 'Danish Krone', flag: '\u{1F1E9}\u{1F1F0}', locale: 'da-DK' },
  DOP: { symbol: 'RD$', code: 'DOP', name: 'Dominican Peso', flag: '\u{1F1E9}\u{1F1F4}', locale: 'es-DO' },
  DZD: { symbol: 'د.ج', code: 'DZD', name: 'Algerian Dinar', flag: '\u{1F1E9}\u{1F1FF}', locale: 'ar-DZ' },
  EGP: { symbol: 'E£', code: 'EGP', name: 'Egyptian Pound', flag: '\u{1F1EA}\u{1F1EC}', locale: 'ar-EG' },
  ETB: { symbol: 'Br', code: 'ETB', name: 'Ethiopian Birr', flag: '\u{1F1EA}\u{1F1F9}', locale: 'am-ET' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro', flag: '\u{1F1EA}\u{1F1FA}', locale: 'de-DE' },
  FJD: { symbol: 'FJ$', code: 'FJD', name: 'Fijian Dollar', flag: '\u{1F1EB}\u{1F1EF}', locale: 'en-FJ' },
  FKP: { symbol: '£', code: 'FKP', name: 'Falkland Islands Pound', flag: '\u{1F1EB}\u{1F1F0}', locale: 'en-FK' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound', flag: '\u{1F1EC}\u{1F1E7}', locale: 'en-GB' },
  GEL: { symbol: '₾', code: 'GEL', name: 'Georgian Lari', flag: '\u{1F1EC}\u{1F1EA}', locale: 'ka-GE' },
  GIP: { symbol: '£', code: 'GIP', name: 'Gibraltar Pound', flag: '\u{1F1EC}\u{1F1EE}', locale: 'en-GI' },
  GMD: { symbol: 'D', code: 'GMD', name: 'Gambian Dalasi', flag: '\u{1F1EC}\u{1F1F2}', locale: 'en-GM' },
  GTQ: { symbol: 'Q', code: 'GTQ', name: 'Guatemalan Quetzal', flag: '\u{1F1EC}\u{1F1F9}', locale: 'es-GT' },
  GYD: { symbol: 'GY$', code: 'GYD', name: 'Guyanese Dollar', flag: '\u{1F1EC}\u{1F1FE}', locale: 'en-GY' },
  HKD: { symbol: 'HK$', code: 'HKD', name: 'Hong Kong Dollar', flag: '\u{1F1ED}\u{1F1F0}', locale: 'en-HK' },
  HNL: { symbol: 'L', code: 'HNL', name: 'Honduran Lempira', flag: '\u{1F1ED}\u{1F1F3}', locale: 'es-HN' },
  HTG: { symbol: 'G', code: 'HTG', name: 'Haitian Gourde', flag: '\u{1F1ED}\u{1F1F9}', locale: 'fr-HT' },
  HUF: { symbol: 'Ft', code: 'HUF', name: 'Hungarian Forint', flag: '\u{1F1ED}\u{1F1FA}', locale: 'hu-HU' },
  IDR: { symbol: 'Rp', code: 'IDR', name: 'Indonesian Rupiah', flag: '\u{1F1EE}\u{1F1E9}', locale: 'id-ID' },
  ILS: { symbol: '₪', code: 'ILS', name: 'Israeli Shekel', flag: '\u{1F1EE}\u{1F1F1}', locale: 'he-IL' },
  INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee', flag: '\u{1F1EE}\u{1F1F3}', locale: 'en-IN' },
  ISK: { symbol: 'kr', code: 'ISK', name: 'Icelandic Krona', flag: '\u{1F1EE}\u{1F1F8}', locale: 'is-IS' },
  JMD: { symbol: 'J$', code: 'JMD', name: 'Jamaican Dollar', flag: '\u{1F1EF}\u{1F1F2}', locale: 'en-JM' },
  JOD: { symbol: 'JD', code: 'JOD', name: 'Jordanian Dinar', flag: '\u{1F1EF}\u{1F1F4}', locale: 'ar-JO' },
  JPY: { symbol: '¥', code: 'JPY', name: 'Japanese Yen', flag: '\u{1F1EF}\u{1F1F5}', locale: 'ja-JP' },
  KES: { symbol: 'KSh', code: 'KES', name: 'Kenyan Shilling', flag: '\u{1F1F0}\u{1F1EA}', locale: 'en-KE' },
  KGS: { symbol: 'сом', code: 'KGS', name: 'Kyrgyzstani Som', flag: '\u{1F1F0}\u{1F1EC}', locale: 'ky-KG' },
  KHR: { symbol: '៛', code: 'KHR', name: 'Cambodian Riel', flag: '\u{1F1F0}\u{1F1ED}', locale: 'km-KH' },
  KMF: { symbol: 'CF', code: 'KMF', name: 'Comorian Franc', flag: '\u{1F1F0}\u{1F1F2}', locale: 'fr-KM' },
  KRW: { symbol: '₩', code: 'KRW', name: 'South Korean Won', flag: '\u{1F1F0}\u{1F1F7}', locale: 'ko-KR' },
  KWD: { symbol: 'د.ك', code: 'KWD', name: 'Kuwaiti Dinar', flag: '\u{1F1F0}\u{1F1FC}', locale: 'ar-KW' },
  KYD: { symbol: 'CI$', code: 'KYD', name: 'Cayman Islands Dollar', flag: '\u{1F1F0}\u{1F1FE}', locale: 'en-KY' },
  KZT: { symbol: '₸', code: 'KZT', name: 'Kazakhstani Tenge', flag: '\u{1F1F0}\u{1F1FF}', locale: 'kk-KZ' },
  LAK: { symbol: '₭', code: 'LAK', name: 'Lao Kip', flag: '\u{1F1F1}\u{1F1E6}', locale: 'lo-LA' },
  LBP: { symbol: 'L£', code: 'LBP', name: 'Lebanese Pound', flag: '\u{1F1F1}\u{1F1E7}', locale: 'ar-LB' },
  LKR: { symbol: 'Rs', code: 'LKR', name: 'Sri Lankan Rupee', flag: '\u{1F1F1}\u{1F1F0}', locale: 'si-LK' },
  LRD: { symbol: 'L$', code: 'LRD', name: 'Liberian Dollar', flag: '\u{1F1F1}\u{1F1F7}', locale: 'en-LR' },
  LSL: { symbol: 'L', code: 'LSL', name: 'Lesotho Loti', flag: '\u{1F1F1}\u{1F1F8}', locale: 'en-LS' },
  MAD: { symbol: 'د.م.', code: 'MAD', name: 'Moroccan Dirham', flag: '\u{1F1F2}\u{1F1E6}', locale: 'ar-MA' },
  MDL: { symbol: 'L', code: 'MDL', name: 'Moldovan Leu', flag: '\u{1F1F2}\u{1F1E9}', locale: 'ro-MD' },
  MKD: { symbol: 'ден', code: 'MKD', name: 'Macedonian Denar', flag: '\u{1F1F2}\u{1F1F0}', locale: 'mk-MK' },
  MMK: { symbol: 'K', code: 'MMK', name: 'Myanmar Kyat', flag: '\u{1F1F2}\u{1F1F2}', locale: 'my-MM' },
  MNT: { symbol: '₮', code: 'MNT', name: 'Mongolian Tugrik', flag: '\u{1F1F2}\u{1F1F3}', locale: 'mn-MN' },
  MOP: { symbol: 'MOP$', code: 'MOP', name: 'Macanese Pataca', flag: '\u{1F1F2}\u{1F1F4}', locale: 'zh-MO' },
  MUR: { symbol: '₨', code: 'MUR', name: 'Mauritian Rupee', flag: '\u{1F1F2}\u{1F1FA}', locale: 'en-MU' },
  MVR: { symbol: 'Rf', code: 'MVR', name: 'Maldivian Rufiyaa', flag: '\u{1F1F2}\u{1F1FB}', locale: 'dv-MV' },
  MWK: { symbol: 'MK', code: 'MWK', name: 'Malawian Kwacha', flag: '\u{1F1F2}\u{1F1FC}', locale: 'en-MW' },
  MXN: { symbol: 'MX$', code: 'MXN', name: 'Mexican Peso', flag: '\u{1F1F2}\u{1F1FD}', locale: 'es-MX' },
  MYR: { symbol: 'RM', code: 'MYR', name: 'Malaysian Ringgit', flag: '\u{1F1F2}\u{1F1FE}', locale: 'ms-MY' },
  MZN: { symbol: 'MT', code: 'MZN', name: 'Mozambican Metical', flag: '\u{1F1F2}\u{1F1FF}', locale: 'pt-MZ' },
  NAD: { symbol: 'N$', code: 'NAD', name: 'Namibian Dollar', flag: '\u{1F1F3}\u{1F1E6}', locale: 'en-NA' },
  NGN: { symbol: '₦', code: 'NGN', name: 'Nigerian Naira', flag: '\u{1F1F3}\u{1F1EC}', locale: 'en-NG' },
  NIO: { symbol: 'C$', code: 'NIO', name: 'Nicaraguan Cordoba', flag: '\u{1F1F3}\u{1F1EE}', locale: 'es-NI' },
  NOK: { symbol: 'kr', code: 'NOK', name: 'Norwegian Krone', flag: '\u{1F1F3}\u{1F1F4}', locale: 'nb-NO' },
  NPR: { symbol: 'Rs', code: 'NPR', name: 'Nepalese Rupee', flag: '\u{1F1F3}\u{1F1F5}', locale: 'ne-NP' },
  NZD: { symbol: 'NZ$', code: 'NZD', name: 'New Zealand Dollar', flag: '\u{1F1F3}\u{1F1FF}', locale: 'en-NZ' },
  PAB: { symbol: 'B/.', code: 'PAB', name: 'Panamanian Balboa', flag: '\u{1F1F5}\u{1F1E6}', locale: 'es-PA' },
  PEN: { symbol: 'S/.', code: 'PEN', name: 'Peruvian Sol', flag: '\u{1F1F5}\u{1F1EA}', locale: 'es-PE' },
  PGK: { symbol: 'K', code: 'PGK', name: 'Papua New Guinean Kina', flag: '\u{1F1F5}\u{1F1EC}', locale: 'en-PG' },
  PHP: { symbol: '₱', code: 'PHP', name: 'Philippine Peso', flag: '\u{1F1F5}\u{1F1ED}', locale: 'en-PH' },
  PKR: { symbol: '₨', code: 'PKR', name: 'Pakistani Rupee', flag: '\u{1F1F5}\u{1F1F0}', locale: 'ur-PK' },
  PLN: { symbol: 'zł', code: 'PLN', name: 'Polish Zloty', flag: '\u{1F1F5}\u{1F1F1}', locale: 'pl-PL' },
  QAR: { symbol: 'QR', code: 'QAR', name: 'Qatari Riyal', flag: '\u{1F1F6}\u{1F1E6}', locale: 'ar-QA' },
  RON: { symbol: 'lei', code: 'RON', name: 'Romanian Leu', flag: '\u{1F1F7}\u{1F1F4}', locale: 'ro-RO' },
  RSD: { symbol: 'din', code: 'RSD', name: 'Serbian Dinar', flag: '\u{1F1F7}\u{1F1F8}', locale: 'sr-RS' },
  SAR: { symbol: 'SR', code: 'SAR', name: 'Saudi Riyal', flag: '\u{1F1F8}\u{1F1E6}', locale: 'ar-SA' },
  SBD: { symbol: 'SI$', code: 'SBD', name: 'Solomon Islands Dollar', flag: '\u{1F1F8}\u{1F1E7}', locale: 'en-SB' },
  SCR: { symbol: '₨', code: 'SCR', name: 'Seychellois Rupee', flag: '\u{1F1F8}\u{1F1E8}', locale: 'en-SC' },
  SEK: { symbol: 'kr', code: 'SEK', name: 'Swedish Krona', flag: '\u{1F1F8}\u{1F1EA}', locale: 'sv-SE' },
  SGD: { symbol: 'S$', code: 'SGD', name: 'Singapore Dollar', flag: '\u{1F1F8}\u{1F1EC}', locale: 'en-SG' },
  SHP: { symbol: '£', code: 'SHP', name: 'Saint Helena Pound', flag: '\u{1F1F8}\u{1F1ED}', locale: 'en-SH' },
  SLL: { symbol: 'Le', code: 'SLL', name: 'Sierra Leonean Leone', flag: '\u{1F1F8}\u{1F1F1}', locale: 'en-SL' },
  SOS: { symbol: 'Sh', code: 'SOS', name: 'Somali Shilling', flag: '\u{1F1F8}\u{1F1F4}', locale: 'so-SO' },
  SRD: { symbol: 'SRD', code: 'SRD', name: 'Surinamese Dollar', flag: '\u{1F1F8}\u{1F1F7}', locale: 'nl-SR' },
  STD: { symbol: 'Db', code: 'STD', name: 'Sao Tome Dobra', flag: '\u{1F1F8}\u{1F1F9}', locale: 'pt-ST' },
  SZL: { symbol: 'E', code: 'SZL', name: 'Swazi Lilangeni', flag: '\u{1F1F8}\u{1F1FF}', locale: 'en-SZ' },
  THB: { symbol: '฿', code: 'THB', name: 'Thai Baht', flag: '\u{1F1F9}\u{1F1ED}', locale: 'th-TH' },
  TJS: { symbol: 'SM', code: 'TJS', name: 'Tajikistani Somoni', flag: '\u{1F1F9}\u{1F1EF}', locale: 'tg-TJ' },
  TOP: { symbol: 'T$', code: 'TOP', name: 'Tongan Pa\'anga', flag: '\u{1F1F9}\u{1F1F4}', locale: 'en-TO' },
  TRY: { symbol: '₺', code: 'TRY', name: 'Turkish Lira', flag: '\u{1F1F9}\u{1F1F7}', locale: 'tr-TR' },
  TTD: { symbol: 'TT$', code: 'TTD', name: 'Trinidad & Tobago Dollar', flag: '\u{1F1F9}\u{1F1F9}', locale: 'en-TT' },
  TWD: { symbol: 'NT$', code: 'TWD', name: 'New Taiwan Dollar', flag: '\u{1F1F9}\u{1F1FC}', locale: 'zh-TW' },
  TZS: { symbol: 'TSh', code: 'TZS', name: 'Tanzanian Shilling', flag: '\u{1F1F9}\u{1F1FF}', locale: 'en-TZ' },
  UAH: { symbol: '₴', code: 'UAH', name: 'Ukrainian Hryvnia', flag: '\u{1F1FA}\u{1F1E6}', locale: 'uk-UA' },
  UGX: { symbol: 'USh', code: 'UGX', name: 'Ugandan Shilling', flag: '\u{1F1FA}\u{1F1EC}', locale: 'en-UG' },
  UYU: { symbol: '$U', code: 'UYU', name: 'Uruguayan Peso', flag: '\u{1F1FA}\u{1F1FE}', locale: 'es-UY' },
  UZS: { symbol: 'сўм', code: 'UZS', name: 'Uzbekistani Som', flag: '\u{1F1FA}\u{1F1FF}', locale: 'uz-UZ' },
  VND: { symbol: '₫', code: 'VND', name: 'Vietnamese Dong', flag: '\u{1F1FB}\u{1F1F3}', locale: 'vi-VN' },
  VUV: { symbol: 'VT', code: 'VUV', name: 'Vanuatu Vatu', flag: '\u{1F1FB}\u{1F1FA}', locale: 'en-VU' },
  WST: { symbol: 'WS$', code: 'WST', name: 'Samoan Tala', flag: '\u{1F1FC}\u{1F1F8}', locale: 'en-WS' },
  XAF: { symbol: 'FCFA', code: 'XAF', name: 'Central African CFA Franc', flag: '\u{1F30D}', locale: 'fr-CM' },
  XCD: { symbol: 'EC$', code: 'XCD', name: 'East Caribbean Dollar', flag: '\u{1F30E}', locale: 'en-AG' },
  XOF: { symbol: 'CFA', code: 'XOF', name: 'West African CFA Franc', flag: '\u{1F30D}', locale: 'fr-SN' },
  XPF: { symbol: '₣', code: 'XPF', name: 'CFP Franc', flag: '\u{1F30F}', locale: 'fr-PF' },
  YER: { symbol: '﷼', code: 'YER', name: 'Yemeni Rial', flag: '\u{1F1FE}\u{1F1EA}', locale: 'ar-YE' },
  ZAR: { symbol: 'R', code: 'ZAR', name: 'South African Rand', flag: '\u{1F1FF}\u{1F1E6}', locale: 'en-ZA' },
  ZMW: { symbol: 'ZK', code: 'ZMW', name: 'Zambian Kwacha', flag: '\u{1F1FF}\u{1F1F2}', locale: 'en-ZM' },
};

// Stripe-supported countries for detailer registration
export const STRIPE_COUNTRIES = [
  { code: 'AU', name: 'Australia', flag: '\u{1F1E6}\u{1F1FA}', currency: 'AUD' },
  { code: 'AT', name: 'Austria', flag: '\u{1F1E6}\u{1F1F9}', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', flag: '\u{1F1E7}\u{1F1EA}', currency: 'EUR' },
  { code: 'BR', name: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', currency: 'BRL' },
  { code: 'BG', name: 'Bulgaria', flag: '\u{1F1E7}\u{1F1EC}', currency: 'BGN' },
  { code: 'CA', name: 'Canada', flag: '\u{1F1E8}\u{1F1E6}', currency: 'CAD' },
  { code: 'HR', name: 'Croatia', flag: '\u{1F1ED}\u{1F1F7}', currency: 'EUR' },
  { code: 'CY', name: 'Cyprus', flag: '\u{1F1E8}\u{1F1FE}', currency: 'EUR' },
  { code: 'CZ', name: 'Czech Republic', flag: '\u{1F1E8}\u{1F1FF}', currency: 'CZK' },
  { code: 'DK', name: 'Denmark', flag: '\u{1F1E9}\u{1F1F0}', currency: 'DKK' },
  { code: 'EE', name: 'Estonia', flag: '\u{1F1EA}\u{1F1EA}', currency: 'EUR' },
  { code: 'FI', name: 'Finland', flag: '\u{1F1EB}\u{1F1EE}', currency: 'EUR' },
  { code: 'FR', name: 'France', flag: '\u{1F1EB}\u{1F1F7}', currency: 'EUR' },
  { code: 'DE', name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', currency: 'EUR' },
  { code: 'GR', name: 'Greece', flag: '\u{1F1EC}\u{1F1F7}', currency: 'EUR' },
  { code: 'HK', name: 'Hong Kong', flag: '\u{1F1ED}\u{1F1F0}', currency: 'HKD' },
  { code: 'HU', name: 'Hungary', flag: '\u{1F1ED}\u{1F1FA}', currency: 'HUF' },
  { code: 'IN', name: 'India', flag: '\u{1F1EE}\u{1F1F3}', currency: 'INR' },
  { code: 'ID', name: 'Indonesia', flag: '\u{1F1EE}\u{1F1E9}', currency: 'IDR' },
  { code: 'IE', name: 'Ireland', flag: '\u{1F1EE}\u{1F1EA}', currency: 'EUR' },
  { code: 'IT', name: 'Italy', flag: '\u{1F1EE}\u{1F1F9}', currency: 'EUR' },
  { code: 'JP', name: 'Japan', flag: '\u{1F1EF}\u{1F1F5}', currency: 'JPY' },
  { code: 'LV', name: 'Latvia', flag: '\u{1F1F1}\u{1F1FB}', currency: 'EUR' },
  { code: 'LI', name: 'Liechtenstein', flag: '\u{1F1F1}\u{1F1EE}', currency: 'CHF' },
  { code: 'LT', name: 'Lithuania', flag: '\u{1F1F1}\u{1F1F9}', currency: 'EUR' },
  { code: 'LU', name: 'Luxembourg', flag: '\u{1F1F1}\u{1F1FA}', currency: 'EUR' },
  { code: 'MY', name: 'Malaysia', flag: '\u{1F1F2}\u{1F1FE}', currency: 'MYR' },
  { code: 'MT', name: 'Malta', flag: '\u{1F1F2}\u{1F1F9}', currency: 'EUR' },
  { code: 'MX', name: 'Mexico', flag: '\u{1F1F2}\u{1F1FD}', currency: 'MXN' },
  { code: 'NL', name: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}', currency: 'EUR' },
  { code: 'NZ', name: 'New Zealand', flag: '\u{1F1F3}\u{1F1FF}', currency: 'NZD' },
  { code: 'NO', name: 'Norway', flag: '\u{1F1F3}\u{1F1F4}', currency: 'NOK' },
  { code: 'PL', name: 'Poland', flag: '\u{1F1F5}\u{1F1F1}', currency: 'PLN' },
  { code: 'PT', name: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}', currency: 'EUR' },
  { code: 'RO', name: 'Romania', flag: '\u{1F1F7}\u{1F1F4}', currency: 'RON' },
  { code: 'SG', name: 'Singapore', flag: '\u{1F1F8}\u{1F1EC}', currency: 'SGD' },
  { code: 'SK', name: 'Slovakia', flag: '\u{1F1F8}\u{1F1F0}', currency: 'EUR' },
  { code: 'SI', name: 'Slovenia', flag: '\u{1F1F8}\u{1F1EE}', currency: 'EUR' },
  { code: 'ES', name: 'Spain', flag: '\u{1F1EA}\u{1F1F8}', currency: 'EUR' },
  { code: 'SE', name: 'Sweden', flag: '\u{1F1F8}\u{1F1EA}', currency: 'SEK' },
  { code: 'CH', name: 'Switzerland', flag: '\u{1F1E8}\u{1F1ED}', currency: 'CHF' },
  { code: 'TH', name: 'Thailand', flag: '\u{1F1F9}\u{1F1ED}', currency: 'THB' },
  { code: 'AE', name: 'United Arab Emirates', flag: '\u{1F1E6}\u{1F1EA}', currency: 'AED' },
  { code: 'GB', name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}', currency: 'GBP' },
  { code: 'US', name: 'United States', flag: '\u{1F1FA}\u{1F1F8}', currency: 'USD' },
];

// Get all currencies as a flat array (for dropdowns)
export function getAllCurrencies() {
  return Object.values(CURRENCY_MAP);
}

// Get suggested currencies for a country code (country's default first, then common, then rest)
export function getCurrenciesForCountry(countryCode) {
  const country = STRIPE_COUNTRIES.find(c => c.code === countryCode);
  const defaultCurrency = country?.currency || 'USD';
  const common = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY'];
  const all = Object.values(CURRENCY_MAP);

  // Country's default currency first
  const top = all.filter(c => c.code === defaultCurrency);
  // Then common currencies (excluding default)
  const mid = all.filter(c => common.includes(c.code) && c.code !== defaultCurrency);
  // Then everything else
  const rest = all.filter(c => c.code !== defaultCurrency && !common.includes(c.code));

  return [...top, ...mid, ...rest];
}

const STORAGE_KEY = 'vector_currency';

export function getUserCurrency() {
  if (typeof window === 'undefined') return 'USD';
  try {
    return localStorage.getItem(STORAGE_KEY) || 'USD';
  } catch {
    return 'USD';
  }
}

export function setUserCurrency(code) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
}

export function getCurrencySymbol(code) {
  return CURRENCY_MAP[code]?.symbol || code || '$';
}

export function getUserCurrencySymbol() {
  return getCurrencySymbol(getUserCurrency());
}
