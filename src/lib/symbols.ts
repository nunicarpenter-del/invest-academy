export interface StockSymbol {
  symbol:   string                              // e.g. "AAPL", "LUMI.TA", "BTC-USD"
  name:     string                              // English display name
  exchange: 'NASDAQ' | 'NYSE' | 'TASE' | 'CRYPTO'
  currency: 'USD' | 'ILS'
}

// ─── S&P 500 top stocks (US) ────────────────────────────────────────────────
export const SP500_SYMBOLS: StockSymbol[] = [
  // Mega-cap tech
  { symbol: 'AAPL',  name: 'Apple Inc.',                     exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'MSFT',  name: 'Microsoft Corporation',          exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'NVDA',  name: 'NVIDIA Corporation',             exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',                exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)',        exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'GOOG',  name: 'Alphabet Inc. (Class C)',        exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'META',  name: 'Meta Platforms Inc.',            exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',                     exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'AVGO',  name: 'Broadcom Inc.',                  exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'ORCL',  name: 'Oracle Corporation',             exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices',         exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'QCOM',  name: 'Qualcomm Inc.',                  exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'INTC',  name: 'Intel Corporation',              exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'CSCO',  name: 'Cisco Systems Inc.',             exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'ADBE',  name: 'Adobe Inc.',                     exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'CRM',   name: 'Salesforce Inc.',                exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'NFLX',  name: 'Netflix Inc.',                   exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'INTU',  name: 'Intuit Inc.',                    exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'TXN',   name: 'Texas Instruments Inc.',         exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'AMAT',  name: 'Applied Materials Inc.',         exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'LRCX',  name: 'Lam Research Corporation',      exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'KLAC',  name: 'KLA Corporation',                exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'MCHP',  name: 'Microchip Technology',          exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'ADI',   name: 'Analog Devices Inc.',            exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'MU',    name: 'Micron Technology Inc.',         exchange: 'NASDAQ', currency: 'USD' },
  // Financials
  { symbol: 'JPM',   name: 'JPMorgan Chase & Co.',          exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'V',     name: 'Visa Inc.',                      exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'MA',    name: 'Mastercard Inc.',                exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'BAC',   name: 'Bank of America Corp.',          exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'GS',    name: 'Goldman Sachs Group',           exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'MS',    name: 'Morgan Stanley',                 exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'BLK',   name: 'BlackRock Inc.',                 exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'SPGI',  name: 'S&P Global Inc.',                exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'AXP',   name: 'American Express Co.',          exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'USB',   name: 'U.S. Bancorp',                   exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'PNC',   name: 'PNC Financial Services',        exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'ICE',   name: 'Intercontinental Exchange',     exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'MMC',   name: 'Marsh & McLennan Cos.',         exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'AON',   name: 'Aon plc',                        exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'PYPL',  name: 'PayPal Holdings Inc.',           exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'COF',   name: 'Capital One Financial',         exchange: 'NYSE',   currency: 'USD' },
  // Healthcare
  { symbol: 'UNH',   name: 'UnitedHealth Group Inc.',       exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'JNJ',   name: 'Johnson & Johnson',             exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'LLY',   name: 'Eli Lilly and Company',         exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'ABBV',  name: 'AbbVie Inc.',                    exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'MRK',   name: 'Merck & Co. Inc.',              exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'ABT',   name: 'Abbott Laboratories',           exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'TMO',   name: 'Thermo Fisher Scientific',      exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'DHR',   name: 'Danaher Corporation',           exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'AMGN',  name: 'Amgen Inc.',                     exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'GILD',  name: 'Gilead Sciences Inc.',           exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'ISRG',  name: 'Intuitive Surgical Inc.',        exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'VRTX',  name: 'Vertex Pharmaceuticals',        exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'REGN',  name: 'Regeneron Pharmaceuticals',     exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'BSX',   name: 'Boston Scientific Corp.',        exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'MDT',   name: 'Medtronic plc',                  exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'CVS',   name: 'CVS Health Corporation',        exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'CI',    name: 'Cigna Group',                    exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'HUM',   name: 'Humana Inc.',                    exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'ELV',   name: 'Elevance Health Inc.',           exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'ZTS',   name: 'Zoetis Inc.',                    exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'BIIB',  name: 'Biogen Inc.',                    exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'BDX',   name: 'Becton Dickinson & Co.',        exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'EW',    name: 'Edwards Lifesciences',          exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'MRNA',  name: 'Moderna Inc.',                   exchange: 'NASDAQ', currency: 'USD' },
  // Consumer
  { symbol: 'WMT',   name: 'Walmart Inc.',                   exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'COST',  name: 'Costco Wholesale Corp.',        exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'HD',    name: "Home Depot Inc.",                exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'LOW',   name: "Lowe's Companies Inc.",         exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'TGT',   name: 'Target Corporation',            exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'TJX',   name: 'TJX Companies Inc.',            exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'MCD',   name: "McDonald's Corporation",        exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'SBUX',  name: 'Starbucks Corporation',         exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'NKE',   name: 'Nike Inc.',                      exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'KO',    name: 'Coca-Cola Company',             exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'PEP',   name: 'PepsiCo Inc.',                   exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'PG',    name: 'Procter & Gamble Co.',          exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'MDLZ',  name: 'Mondelez International',        exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'PM',    name: 'Philip Morris International',   exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'MO',    name: 'Altria Group Inc.',              exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'CMG',   name: 'Chipotle Mexican Grill',        exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'BKNG',  name: 'Booking Holdings Inc.',         exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'ABNB',  name: 'Airbnb Inc.',                    exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'UBER',  name: 'Uber Technologies Inc.',        exchange: 'NYSE',   currency: 'USD' },
  // Industrial / Energy / Utilities
  { symbol: 'XOM',   name: 'Exxon Mobil Corporation',       exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'CVX',   name: 'Chevron Corporation',           exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'SLB',   name: 'SLB (Schlumberger)',            exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'CAT',   name: 'Caterpillar Inc.',               exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'GE',    name: 'GE Aerospace',                   exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'HON',   name: 'Honeywell International',       exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'RTX',   name: 'RTX Corporation',               exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'GD',    name: 'General Dynamics Corp.',        exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'LMT',   name: 'Lockheed Martin Corp.',         exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'NOC',   name: 'Northrop Grumman Corp.',        exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'DE',    name: 'Deere & Company',               exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'ETN',   name: 'Eaton Corporation',             exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'ITW',   name: 'Illinois Tool Works Inc.',      exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'MMM',   name: '3M Company',                    exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'EMR',   name: 'Emerson Electric Co.',          exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'UPS',   name: 'United Parcel Service',         exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'FDX',   name: 'FedEx Corporation',             exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'CSX',   name: 'CSX Corporation',               exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'NSC',   name: 'Norfolk Southern Corp.',        exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'PCAR',  name: 'PACCAR Inc.',                    exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'NEE',   name: 'NextEra Energy Inc.',            exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'DUK',   name: 'Duke Energy Corporation',       exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'SO',    name: 'Southern Company',              exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'LIN',   name: 'Linde plc',                     exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'APD',   name: 'Air Products & Chemicals',      exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'ECL',   name: 'Ecolab Inc.',                    exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'SHW',   name: 'Sherwin-Williams Co.',          exchange: 'NYSE',   currency: 'USD' },
  // Real Estate
  { symbol: 'PLD',   name: 'Prologis Inc.',                  exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'AMT',   name: 'American Tower Corp.',          exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'PSA',   name: 'Public Storage',                exchange: 'NYSE',   currency: 'USD' },
  // Pharma / Biotech
  { symbol: 'ACN',   name: 'Accenture plc',                  exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'IBM',   name: 'IBM Corporation',               exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'T',     name: 'AT&T Inc.',                      exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'VZ',    name: 'Verizon Communications',        exchange: 'NYSE',   currency: 'USD' },
  // Autos
  { symbol: 'F',     name: 'Ford Motor Company',            exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'GM',    name: 'General Motors Company',        exchange: 'NYSE',   currency: 'USD' },
  // Growth / Tech
  { symbol: 'SHOP',  name: 'Shopify Inc.',                   exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'SQ',    name: 'Block Inc. (Square)',           exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'COIN',  name: 'Coinbase Global Inc.',          exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'PLTR',  name: 'Palantir Technologies',         exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'NET',   name: 'Cloudflare Inc.',               exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'DDOG',  name: 'Datadog Inc.',                   exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'SNOW',  name: 'Snowflake Inc.',                 exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'CRWD',  name: 'CrowdStrike Holdings',          exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'PANW',  name: 'Palo Alto Networks',            exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'FTNT',  name: 'Fortinet Inc.',                  exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'ZS',    name: 'Zscaler Inc.',                   exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'OKTA',  name: 'Okta Inc.',                      exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'MDB',   name: 'MongoDB Inc.',                   exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'TEAM',  name: 'Atlassian Corporation',         exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'PATH',  name: 'UiPath Inc.',                    exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'APP',   name: 'AppLovin Corporation',          exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'ARM',   name: 'Arm Holdings plc',              exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'SMCI',  name: 'Super Micro Computer',          exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'DELL',  name: 'Dell Technologies Inc.',        exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'RBLX',  name: 'Roblox Corporation',            exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'SNAP',  name: 'Snap Inc.',                      exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'PINS',  name: 'Pinterest Inc.',                 exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'TTD',   name: 'The Trade Desk Inc.',           exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'MELI',  name: 'MercadoLibre Inc.',             exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'SPOT',  name: 'Spotify Technology',            exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'ADP',   name: 'Automatic Data Processing',    exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'DASH',  name: 'DoorDash Inc.',                  exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'ZM',    name: 'Zoom Video Communications',     exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'LYFT',  name: 'Lyft Inc.',                      exchange: 'NASDAQ', currency: 'USD' },
  // ETFs
  { symbol: 'SPY',   name: 'SPDR S&P 500 ETF Trust',       exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'QQQ',   name: 'Invesco QQQ Trust (Nasdaq 100)',exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'VTI',   name: 'Vanguard Total Stock Market ETF',exchange: 'NYSE',  currency: 'USD' },
  { symbol: 'VOO',   name: 'Vanguard S&P 500 ETF',         exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'IWM',   name: 'iShares Russell 2000 ETF',     exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'GLD',   name: 'SPDR Gold Shares ETF',         exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'TLT',   name: 'iShares 20+ Year Treasury ETF',exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'XLF',   name: 'Financial Select Sector SPDR', exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'XLK',   name: 'Technology Select Sector SPDR',exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'ARKK',  name: 'ARK Innovation ETF',           exchange: 'NYSE',   currency: 'USD' },
]

// ─── TA-125 top Israeli stocks ──────────────────────────────────────────────
export const TA_SYMBOLS: StockSymbol[] = [
  // Banks
  { symbol: 'LUMI.TA',  name: 'Bank Leumi',                  exchange: 'TASE', currency: 'ILS' },
  { symbol: 'POLI.TA',  name: 'Bank Hapoalim',               exchange: 'TASE', currency: 'ILS' },
  { symbol: 'DSCT.TA',  name: 'Israel Discount Bank',        exchange: 'TASE', currency: 'ILS' },
  { symbol: 'MZTF.TA',  name: 'Mizrahi Tefahot Bank',        exchange: 'TASE', currency: 'ILS' },
  { symbol: 'FIBI.TA',  name: 'First International Bank',    exchange: 'TASE', currency: 'ILS' },
  { symbol: 'UNON.TA',  name: 'Union Bank of Israel',        exchange: 'TASE', currency: 'ILS' },
  // Pharma / Life Sciences
  { symbol: 'TEVA.TA',  name: 'Teva Pharmaceutical',         exchange: 'TASE', currency: 'ILS' },
  // Tech
  { symbol: 'NICE.TA',  name: 'NICE Systems',                exchange: 'TASE', currency: 'ILS' },
  { symbol: 'CHKP.TA',  name: 'Check Point Software',        exchange: 'TASE', currency: 'ILS' },
  { symbol: 'ESLT.TA',  name: 'Elbit Systems',               exchange: 'TASE', currency: 'ILS' },
  { symbol: 'CEVA.TA',  name: 'CEVA Inc.',                   exchange: 'TASE', currency: 'ILS' },
  { symbol: 'RDCM.TA',  name: 'Radcom Ltd.',                 exchange: 'TASE', currency: 'ILS' },
  { symbol: 'SILC.TA',  name: 'Silicom Ltd.',                exchange: 'TASE', currency: 'ILS' },
  { symbol: 'CAMT.TA',  name: 'Camtek Ltd.',                 exchange: 'TASE', currency: 'ILS' },
  { symbol: 'NVMI.TA',  name: 'Nova Ltd.',                   exchange: 'TASE', currency: 'ILS' },
  { symbol: 'TSEM.TA',  name: 'Tower Semiconductor',         exchange: 'TASE', currency: 'ILS' },
  { symbol: 'AUDC.TA',  name: 'AudioCodes Ltd.',             exchange: 'TASE', currency: 'ILS' },
  { symbol: 'GILT.TA',  name: 'Gilat Satellite Networks',   exchange: 'TASE', currency: 'ILS' },
  { symbol: 'ALLT.TA',  name: 'Allot Ltd.',                  exchange: 'TASE', currency: 'ILS' },
  { symbol: 'CRAI.TA',  name: 'Ceragon Networks',            exchange: 'TASE', currency: 'ILS' },
  { symbol: 'FRSX.TA',  name: 'Foresight Autonomous Vehicles',exchange: 'TASE',currency: 'ILS' },
  // Telecom
  { symbol: 'BEZQ.TA',  name: 'Bezeq Israeli Telecom',       exchange: 'TASE', currency: 'ILS' },
  { symbol: 'PRTC.TA',  name: 'Partner Communications',      exchange: 'TASE', currency: 'ILS' },
  { symbol: 'CLBR.TA',  name: 'Cellcom Israel',              exchange: 'TASE', currency: 'ILS' },
  { symbol: 'HOT.TA',   name: 'HOT Mobile',                  exchange: 'TASE', currency: 'ILS' },
  // Real Estate / Conglomerates
  { symbol: 'AZRG.TA',  name: 'Azrieli Group',               exchange: 'TASE', currency: 'ILS' },
  { symbol: 'AMOT.TA',  name: 'Amot Investments',            exchange: 'TASE', currency: 'ILS' },
  { symbol: 'BIGA.TA',  name: 'Big Shopping Centers',        exchange: 'TASE', currency: 'ILS' },
  { symbol: 'SPEN.TA',  name: 'Shapir Engineering',          exchange: 'TASE', currency: 'ILS' },
  { symbol: 'AFHL.TA',  name: 'Afimilk Holdings',            exchange: 'TASE', currency: 'ILS' },
  { symbol: 'ENLT.TA',  name: 'Enlight Renewable Energy',   exchange: 'TASE', currency: 'ILS' },
  // Energy
  { symbol: 'ICL.TA',   name: 'ICL Group',                   exchange: 'TASE', currency: 'ILS' },
  { symbol: 'DLEKG.TA', name: 'Delek Group',                 exchange: 'TASE', currency: 'ILS' },
  { symbol: 'DELVR.TA', name: 'Delek Vehicles',              exchange: 'TASE', currency: 'ILS' },
  { symbol: 'ISCD.TA',  name: 'Israel Chemical Distributors',exchange: 'TASE', currency: 'ILS' },
  // Insurance / Finance
  { symbol: 'PHOE.TA',  name: 'Phoenix Holdings',            exchange: 'TASE', currency: 'ILS' },
  { symbol: 'MGDL.TA',  name: 'Migdal Insurance',            exchange: 'TASE', currency: 'ILS' },
  { symbol: 'HRL.TA',   name: 'Harel Insurance',             exchange: 'TASE', currency: 'ILS' },
  { symbol: 'CLAL.TA',  name: 'Clal Insurance',              exchange: 'TASE', currency: 'ILS' },
  { symbol: 'MEITAV.TA',name: 'Meitav Investment House',     exchange: 'TASE', currency: 'ILS' },
  { symbol: 'IBI.TA',   name: 'IBI Investment House',        exchange: 'TASE', currency: 'ILS' },
  // Consumer / Retail
  { symbol: 'SANO.TA',  name: 'Sano Bruno\'s Enterprises',  exchange: 'TASE', currency: 'ILS' },
  { symbol: 'OSEM.TA',  name: 'Osem Investments',            exchange: 'TASE', currency: 'ILS' },
  { symbol: 'TRGR.TA',  name: 'Trigger-Frog',                exchange: 'TASE', currency: 'ILS' },
  { symbol: 'SSTL.TA',  name: 'Supersol',                    exchange: 'TASE', currency: 'ILS' },
  // Hospitality
  { symbol: 'FTAL.TA',  name: 'Fattal Hotels',               exchange: 'TASE', currency: 'ILS' },
  { symbol: 'ISRO.TA',  name: 'Isrotel Hotels',              exchange: 'TASE', currency: 'ILS' },
  // Israeli tech cross-listed
  { symbol: 'WIX.TA',   name: 'Wix.com Ltd.',                exchange: 'TASE', currency: 'ILS' },
  { symbol: 'MNDY.TA',  name: 'monday.com Ltd.',             exchange: 'TASE', currency: 'ILS' },
  { symbol: 'FVRR.TA',  name: 'Fiverr International',        exchange: 'TASE', currency: 'ILS' },
  { symbol: 'GLBE.TA',  name: 'Global-E Online',             exchange: 'TASE', currency: 'ILS' },
  { symbol: 'RSKD.TA',  name: 'Riskified Ltd.',              exchange: 'TASE', currency: 'ILS' },
]

// ─── Top 50 Cryptocurrencies ─────────────────────────────────────────────────
// Yahoo Finance format for crypto: BASE-USD  (e.g. BTC-USD, ETH-USD)
export const CRYPTO_SYMBOLS: StockSymbol[] = [
  { symbol: 'BTC-USD',   name: 'Bitcoin',               exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'ETH-USD',   name: 'Ethereum',               exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'BNB-USD',   name: 'BNB (Binance)',          exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'SOL-USD',   name: 'Solana',                 exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'XRP-USD',   name: 'XRP (Ripple)',           exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'DOGE-USD',  name: 'Dogecoin',               exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'ADA-USD',   name: 'Cardano',                exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'AVAX-USD',  name: 'Avalanche',              exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'TRX-USD',   name: 'TRON',                   exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'SHIB-USD',  name: 'Shiba Inu',              exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'DOT-USD',   name: 'Polkadot',               exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'LINK-USD',  name: 'Chainlink',              exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'TON-USD',   name: 'Toncoin',                exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'MATIC-USD', name: 'Polygon (MATIC)',        exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'LTC-USD',   name: 'Litecoin',               exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'NEAR-USD',  name: 'NEAR Protocol',          exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'UNI-USD',   name: 'Uniswap',                exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'ICP-USD',   name: 'Internet Computer',      exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'ATOM-USD',  name: 'Cosmos',                 exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'XLM-USD',   name: 'Stellar Lumens',         exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'OP-USD',    name: 'Optimism',               exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'ARB-USD',   name: 'Arbitrum',               exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'HBAR-USD',  name: 'Hedera',                 exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'VET-USD',   name: 'VeChain',                exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'FIL-USD',   name: 'Filecoin',               exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'APT-USD',   name: 'Aptos',                  exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'SUI-USD',   name: 'Sui',                    exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'INJ-USD',   name: 'Injective',              exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'GRT-USD',   name: 'The Graph',              exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'ALGO-USD',  name: 'Algorand',               exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'AAVE-USD',  name: 'Aave',                   exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'MKR-USD',   name: 'Maker',                  exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'RUNE-USD',  name: 'THORChain',              exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'THETA-USD', name: 'Theta Network',          exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'EOS-USD',   name: 'EOS',                    exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'XTZ-USD',   name: 'Tezos',                  exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'FLOW-USD',  name: 'Flow',                   exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'EGLD-USD',  name: 'MultiversX (EGLD)',      exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'AXS-USD',   name: 'Axie Infinity',          exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'MANA-USD',  name: 'Decentraland',           exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'SAND-USD',  name: 'The Sandbox',            exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'CRV-USD',   name: 'Curve DAO Token',        exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'SNX-USD',   name: 'Synthetix',              exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'GALA-USD',  name: 'Gala',                   exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'PEPE-USD',  name: 'Pepe',                   exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'WIF-USD',   name: 'dogwifhat (WIF)',         exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'BONK-USD',  name: 'Bonk',                   exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'SEI-USD',   name: 'Sei',                    exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'JUP-USD',   name: 'Jupiter',                exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'STX-USD',   name: 'Stacks',                 exchange: 'CRYPTO', currency: 'USD' },
  { symbol: 'FTM-USD',   name: 'Fantom',                 exchange: 'CRYPTO', currency: 'USD' },
]

// ─── All symbols combined ────────────────────────────────────────────────────
export const ALL_SYMBOLS: StockSymbol[] = [...SP500_SYMBOLS, ...TA_SYMBOLS, ...CRYPTO_SYMBOLS]

// ─── Internal ranked search over a specific pool ─────────────────────────────
function rankedSearch(query: string, pool: StockSymbol[], limit: number): StockSymbol[] {
  const q = query.trim().toUpperCase()
  if (!q) return []

  const exact: StockSymbol[]    = []
  const starts: StockSymbol[]   = []
  const contains: StockSymbol[] = []
  const name: StockSymbol[]     = []

  for (const s of pool) {
    const sym = s.symbol.toUpperCase()
    const nm  = s.name.toUpperCase()
    if (sym === q)             exact.push(s)
    else if (sym.startsWith(q)) starts.push(s)
    else if (sym.includes(q))  contains.push(s)
    else if (nm.includes(q))   name.push(s)
  }

  return [...exact, ...starts, ...contains, ...name].slice(0, limit)
}

// ─── Search helpers ───────────────────────────────────────────────────────────
/** Flat search across all symbols (stocks + crypto). */
export function searchSymbols(query: string, limit = 8): StockSymbol[] {
  return rankedSearch(query, ALL_SYMBOLS, limit)
}

/**
 * Grouped search — returns separate arrays for stocks/crypto so the
 * autocomplete dropdown can render section headers.
 */
export function searchSymbolsGrouped(
  query: string,
  limitStocks = 6,
  limitCrypto = 4,
): { stocks: StockSymbol[]; crypto: StockSymbol[] } {
  const q = query.trim()
  if (!q) return { stocks: [], crypto: [] }
  return {
    stocks: rankedSearch(q, [...SP500_SYMBOLS, ...TA_SYMBOLS], limitStocks),
    crypto: rankedSearch(q, CRYPTO_SYMBOLS, limitCrypto),
  }
}

/** Convert a symbol to a TradingView-compatible symbol string */
export function toTVSymbol(symbol: string, exchange?: 'NASDAQ' | 'NYSE' | 'TASE' | 'CRYPTO'): string {
  const sym = symbol.toUpperCase()

  // Israeli stocks: LUMI.TA → TASE:LUMI
  if (sym.endsWith('.TA')) return 'TASE:' + sym.slice(0, -3)

  // Crypto: BTC-USD → COINBASE:BTCUSD
  if (sym.endsWith('-USD')) return 'COINBASE:' + sym.replace('-USD', 'USD')

  // Stocks: look up exchange from our list, default to NASDAQ
  const found = ALL_SYMBOLS.find((s) => s.symbol === sym)
  const ex    = exchange ?? found?.exchange ?? 'NASDAQ'
  if (ex === 'CRYPTO') return 'COINBASE:' + sym
  return `${ex}:${sym}`
}
