export const dynamic = 'force-dynamic';

// GET /api/aircraft/registry/[tailNumber]
// Fetches aircraft registration info from FAA public registry
export async function GET(request, { params }) {
  const { tailNumber } = await params;
  if (!tailNumber) return Response.json({ error: 'Tail number required' }, { status: 400 });

  const nNumber = tailNumber.toUpperCase().replace(/^N/, '');

  try {
    // FAA Aircraft Registry API
    const res = await fetch(
      `https://registry.faa.gov/AircraftInquiry/Search/NNumberResult?nNumberTxt=${nNumber}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ShinyjetsAviation/1.0)',
          'Accept': 'text/html',
        },
      }
    );

    if (!res.ok) {
      return Response.json({ error: 'FAA registry unavailable', status: res.status }, { status: 502 });
    }

    const html = await res.text();

    // Parse registration data from FAA HTML response
    const registration = parseRegistration(html, nNumber);

    if (!registration.found) {
      return Response.json({
        tail_number: `N${nNumber}`,
        found: false,
        message: 'No registration found for this N-number',
      });
    }

    return Response.json({
      tail_number: `N${nNumber}`,
      found: true,
      ...registration,
      source: 'faa_registry',
    });
  } catch (err) {
    return Response.json({ error: 'Registry lookup failed: ' + err.message }, { status: 500 });
  }
}

// Map FAA manufacturer names to our database names
const MANUFACTURER_MAP = {
  'GULFSTREAM AEROSPACE': 'Gulfstream',
  'GULFSTREAM AEROSPACE CORP': 'Gulfstream',
  'CESSNA': 'Cessna', 'CESSNA AIRCRAFT': 'Cessna', 'TEXTRON AVIATION': 'Cessna',
  'BEECHCRAFT': 'Beechcraft', 'BEECH': 'Beechcraft', 'HAWKER BEECHCRAFT': 'Beechcraft',
  'PIPER': 'Piper', 'PIPER AIRCRAFT': 'Piper',
  'CIRRUS': 'Cirrus', 'CIRRUS DESIGN': 'Cirrus',
  'BOMBARDIER': 'Bombardier', 'BOMBARDIER INC': 'Bombardier', 'LEARJET': 'Bombardier',
  'DASSAULT': 'Dassault', 'DASSAULT AVIATION': 'Dassault', 'DASSAULT FALCON': 'Dassault',
  'EMBRAER': 'Embraer', 'EMBRAER S A': 'Embraer',
  'BOEING': 'Boeing', 'THE BOEING COMPANY': 'Boeing',
  'AIRBUS': 'Airbus', 'AIRBUS INDUSTRIE': 'Airbus',
  'ROBINSON': 'Robinson', 'ROBINSON HELICOPTER': 'Robinson',
  'BELL': 'Bell', 'BELL HELICOPTER': 'Bell', 'BELL TEXTRON': 'Bell',
  'SIKORSKY': 'Sikorsky', 'SIKORSKY AIRCRAFT': 'Sikorsky',
  'LEONARDO': 'Leonardo', 'AGUSTA': 'Leonardo', 'AGUSTAWESTLAND': 'Leonardo',
  'PILATUS': 'Pilatus', 'PILATUS AIRCRAFT': 'Pilatus',
  'DAHER': 'Daher', 'DAHER-SOCATA': 'Daher', 'SOCATA': 'Daher',
  'HONDA': 'Honda', 'HONDA AIRCRAFT': 'Honda',
  'ECLIPSE': 'Eclipse', 'ECLIPSE AEROSPACE': 'Eclipse',
  'PIAGGIO': 'Piaggio', 'PIAGGIO AERO': 'Piaggio',
  'DIAMOND': 'Diamond', 'DIAMOND AIRCRAFT': 'Diamond',
  'MOONEY': 'Mooney',
};

// Map FAA model codes to our database model names
const MODEL_MAP = {
  'G-IV': 'G4', 'G-V': 'G550', 'G-VI': 'G650', 'G-IVSP': 'G4',
  'G-200': 'G280', 'GIV-X': 'G450', 'GV-SP': 'G550',
  'CJ3': 'Citation CJ3', 'CJ3+': 'Citation CJ3',
  'CJ4': 'Citation CJ4', 'CJ2': 'Citation CJ2',
  '525': 'Citation CJ1', '525A': 'Citation CJ2', '525B': 'Citation CJ3', '525C': 'Citation CJ4',
  '560XL': 'Citation XLS', '680': 'Citation Sovereign', '750': 'Citation X',
  'FALCON 900': 'Falcon 900', 'FALCON 2000': 'Falcon 2000', 'FALCON 7X': 'Falcon 7X',
  'GLOBAL 7500': 'Global 7500', 'CHALLENGER 350': 'Challenger 350',
  'PC-12': 'PC-12', 'PC-24': 'PC-24',
  'TBM 940': 'TBM 940', 'TBM 960': 'TBM 960',
};

function cleanManufacturer(raw) {
  if (!raw) return null;
  const upper = raw.toUpperCase().trim();
  return MANUFACTURER_MAP[upper] || raw.split(' ')[0].charAt(0).toUpperCase() + raw.split(' ')[0].slice(1).toLowerCase();
}

function cleanModel(raw) {
  if (!raw) return null;
  const upper = raw.toUpperCase().trim();
  return MODEL_MAP[upper] || raw.trim();
}

function parseRegistration(html, nNumber) {
  const result = { found: false };

  // Check if the page has results
  if (!html.includes('Aircraft Description') && !html.includes('Manufacturer Name')) {
    return result;
  }

  result.found = true;

  // Extract fields using regex patterns from FAA's HTML
  const extract = (label) => {
    const patterns = [
      new RegExp(`${label}[\\s\\S]*?<td[^>]*>\\s*([^<]+)`, 'i'),
      new RegExp(`${label}[^:]*:\\s*</td>\\s*<td[^>]*>\\s*([^<]+)`, 'i'),
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  };

  result.registrant_name = extract('Registrant Name') || extract('Name');
  const rawManufacturer = extract('Manufacturer Name');
  const rawModel = extract('Model');
  result.manufacturer = cleanManufacturer(rawManufacturer);
  let model = cleanModel(rawModel);
  // Reject garbage models (FAA sometimes returns column headers or serial numbers)
  if (model && (/^serial/i.test(model) || /^[0-9]+$/.test(model) || model.length < 2)) model = null;
  result.model = model;
  result.raw_manufacturer = rawManufacturer;
  result.raw_model = rawModel;
  result.serial_number = extract('Serial Number');
  result.year = extract('Year Manufacturer') || extract('Year Mfr');
  result.engine_type = extract('Engine Type') || extract('Type Engine');
  result.aircraft_type = extract('Type Aircraft');
  result.status = extract('Status');
  result.certificate_issue_date = extract('Certificate Issue Date');
  result.expiration_date = extract('Expiration Date');

  return result;
}
