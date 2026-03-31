import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

// CRM field mappings for auto-detection
const CRM_MAPPINGS = {
  jobber: {
    detect: ['client_name', 'client_email', 'work_order_title'],
    fields: {
      client_name: 'name', client_email: 'email', client_phone: 'phone',
      client_company: 'company_name', work_order_title: 'service_name',
      total: 'total_price', description: 'notes',
    },
  },
  housecall_pro: {
    detect: ['customer_name', 'job_type', 'invoice_total'],
    fields: {
      customer_name: 'name', email: 'email', phone: 'phone',
      customer_company: 'company_name', job_type: 'service_name',
      invoice_total: 'total_price', address: 'notes',
    },
  },
  servicetitan: {
    detect: ['CustomerName', 'CustomerEmail', 'JobType', 'InvoiceTotal'],
    fields: {
      CustomerName: 'name', CustomerEmail: 'email', CustomerPhone: 'phone',
      CustomerCompany: 'company_name', JobType: 'service_name',
      InvoiceTotal: 'total_price', JobDescription: 'notes',
    },
  },
  quickbooks: {
    detect: ['Customer', 'Description', 'Amount'],
    fields: {
      Customer: 'name', Email: 'email', Phone: 'phone',
      Company: 'company_name', Description: 'service_name',
      Amount: 'total_price', Memo: 'notes',
    },
  },
};

// Standard field aliases for auto-mapping
const FIELD_ALIASES = {
  name: ['name', 'full_name', 'fullname', 'contact_name', 'contactname', 'client_name', 'customer_name', 'customername', 'first_name', 'firstname'],
  email: ['email', 'e-mail', 'email_address', 'emailaddress', 'client_email', 'customer_email'],
  phone: ['phone', 'phone_number', 'phonenumber', 'mobile', 'cell', 'telephone', 'client_phone', 'customer_phone'],
  company_name: ['company', 'company_name', 'companyname', 'business', 'business_name', 'organization', 'client_company', 'customer_company'],
  notes: ['notes', 'note', 'comments', 'comment', 'description', 'memo', 'details'],
  tail_number: ['tail_number', 'tailnumber', 'tail', 'n_number', 'registration', 'aircraft_registration', 'reg'],
  aircraft_type: ['aircraft_type', 'aircraft', 'make', 'manufacturer', 'aircraft_make'],
  aircraft_model: ['aircraft_model', 'model', 'type', 'aircraft_name'],
  total_price: ['total_price', 'total', 'amount', 'price', 'invoice_total', 'revenue', 'cost', 'invoice_amount'],
  service_name: ['service', 'service_name', 'job_type', 'work_order_title', 'job_title', 'service_type'],
  tags: ['tags', 'tag', 'category', 'categories', 'label', 'labels'],
};

function detectCRM(headers) {
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const [crm, config] of Object.entries(CRM_MAPPINGS)) {
    const detectLower = config.detect.map(d => d.toLowerCase());
    const matched = detectLower.filter(d => lower.includes(d));
    if (matched.length >= 2) return crm;
  }
  return null;
}

function autoMapFields(headers) {
  const mapping = {};
  for (const header of headers) {
    const lower = header.toLowerCase().trim().replace(/[\s-]/g, '_');
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(lower)) {
        mapping[header] = field;
        break;
      }
    }
  }
  return mapping;
}

function parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      lines.push(current);
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      lines.push(current);
      current = '';
      if (lines.length > 0) {
        // We've completed a row
      }
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);

  // Better CSV parsing - split into rows properly
  const rows = [];
  let row = [];
  let field = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (insideQuotes && text[i + 1] === '"') { field += '"'; i++; }
      else { insideQuotes = !insideQuotes; }
    } else if (ch === ',' && !insideQuotes) {
      row.push(field.trim());
      field = '';
    } else if ((ch === '\n' || (ch === '\r' && text[i + 1] !== '\n') || (ch === '\r' && text[i + 1] === '\n')) && !insideQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field.trim());
      if (row.some(f => f !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field || row.length > 0) {
    row.push(field.trim());
    if (row.some(f => f !== '')) rows.push(row);
  }

  if (rows.length < 2) return { headers: [], data: [] };
  const headers = rows[0];
  const data = rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i] || ''; });
    return obj;
  });
  return { headers, data };
}

// POST - Parse uploaded file and return preview
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return Response.json({ error: 'No file uploaded' }, { status: 400 });

    const text = await file.text();
    const fileName = file.name.toLowerCase();

    let headers = [];
    let data = [];

    if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      const parsed = parseCSV(text);
      headers = parsed.headers;
      data = parsed.data;
    } else if (fileName.endsWith('.tsv')) {
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      headers = lines[0].split('\t').map(h => h.trim());
      data = lines.slice(1).map(line => {
        const vals = line.split('\t');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
        return obj;
      });
    } else {
      return Response.json({ error: 'Unsupported file format. Please upload CSV, TSV, or TXT.' }, { status: 400 });
    }

    // Detect CRM source
    const detectedCRM = detectCRM(headers);
    const crmMapping = detectedCRM ? CRM_MAPPINGS[detectedCRM].fields : null;

    // Auto-map fields
    const autoMapping = crmMapping || autoMapFields(headers);

    // Classify records
    const hasCustomerFields = Object.values(autoMapping).some(v => ['name', 'email', 'phone', 'company_name'].includes(v));
    const hasAircraftFields = Object.values(autoMapping).some(v => ['tail_number', 'aircraft_type', 'aircraft_model'].includes(v));
    const hasQuoteFields = Object.values(autoMapping).some(v => ['total_price', 'service_name'].includes(v));

    // Check for existing emails to detect duplicates
    const supabase = getSupabase();
    const emails = data.map(row => {
      const emailField = Object.entries(autoMapping).find(([, v]) => v === 'email');
      return emailField ? (row[emailField[0]] || '').toLowerCase().trim() : '';
    }).filter(Boolean);

    let existingEmails = [];
    if (emails.length > 0) {
      const { data: existing } = await supabase
        .from('customers')
        .select('email')
        .eq('detailer_id', user.id)
        .in('email', emails.slice(0, 500));
      existingEmails = (existing || []).map(e => e.email?.toLowerCase());
    }

    const duplicateCount = emails.filter(e => existingEmails.includes(e)).length;

    return Response.json({
      headers,
      preview: data.slice(0, 10),
      totalRows: data.length,
      detectedCRM: detectedCRM || 'generic',
      mapping: autoMapping,
      counts: {
        customers: hasCustomerFields ? data.length : 0,
        aircraft: hasAircraftFields ? data.filter(r => {
          const tailField = Object.entries(autoMapping).find(([, v]) => v === 'tail_number');
          return tailField && r[tailField[0]];
        }).length : 0,
        quotes: hasQuoteFields ? data.filter(r => {
          const priceField = Object.entries(autoMapping).find(([, v]) => v === 'total_price');
          return priceField && r[priceField[0]];
        }).length : 0,
      },
      duplicates: duplicateCount,
    });
  } catch (err) {
    console.error('[import] Parse error:', err);
    return Response.json({ error: 'Failed to parse file: ' + err.message }, { status: 500 });
  }
}

// PUT - Execute the actual import
export async function PUT(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { rows, mapping, skipDuplicates } = await request.json();
    if (!rows || !mapping) return Response.json({ error: 'Missing data' }, { status: 400 });

    const supabase = getSupabase();
    const results = { customers: 0, aircraft: 0, quotes: 0, skipped: 0, errors: [] };

    // Reverse mapping: crmField -> ourField
    const reverseMap = {};
    for (const [src, dest] of Object.entries(mapping)) {
      if (dest && dest !== 'skip') reverseMap[src] = dest;
    }

    // Get existing customer emails for dedup
    const { data: existingCustomers } = await supabase
      .from('customers')
      .select('id, email')
      .eq('detailer_id', user.id);
    const emailToId = {};
    for (const c of (existingCustomers || [])) {
      if (c.email) emailToId[c.email.toLowerCase()] = c.id;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const mapped = {};
      for (const [src, dest] of Object.entries(reverseMap)) {
        if (row[src] !== undefined && row[src] !== '') mapped[dest] = row[src];
      }

      // Import customer
      if (mapped.name || mapped.email || mapped.phone) {
        const email = (mapped.email || '').toLowerCase().trim();

        if (email && emailToId[email]) {
          if (skipDuplicates) { results.skipped++; continue; }
          // Update existing customer
          const updates = {};
          if (mapped.name) updates.name = mapped.name;
          if (mapped.phone) updates.phone = mapped.phone;
          if (mapped.company_name) updates.company_name = mapped.company_name;
          if (mapped.notes) updates.notes = mapped.notes;
          if (mapped.tags) updates.tags = mapped.tags.split(/[;,]/).map(t => t.trim()).filter(Boolean);

          if (Object.keys(updates).length > 0) {
            await supabase.from('customers').update(updates).eq('id', emailToId[email]);
          }
          results.customers++;
        } else {
          // Create new customer
          const customerData = {
            detailer_id: user.id,
            name: mapped.name || '',
            email: email || null,
            phone: mapped.phone || null,
            company_name: mapped.company_name || null,
            notes: mapped.notes || null,
          };
          if (mapped.tags) {
            customerData.tags = mapped.tags.split(/[;,]/).map(t => t.trim()).filter(Boolean);
          }

          const { data: newCust, error: custErr } = await supabase
            .from('customers')
            .insert(customerData)
            .select('id, email')
            .single();

          if (custErr) {
            // Try stripping columns that might not exist
            delete customerData.tags;
            const { data: retry, error: retryErr } = await supabase
              .from('customers')
              .insert(customerData)
              .select('id, email')
              .single();
            if (retryErr) {
              results.errors.push(`Row ${i + 1}: ${retryErr.message}`);
              continue;
            }
            if (retry?.email) emailToId[retry.email.toLowerCase()] = retry.id;
          } else {
            if (newCust?.email) emailToId[newCust.email.toLowerCase()] = newCust.id;
          }
          results.customers++;
        }
      }

      // Import quote/job if price data present
      if (mapped.total_price || mapped.service_name) {
        const email = (mapped.email || '').toLowerCase().trim();
        const customerId = email ? emailToId[email] : null;
        const price = parseFloat(mapped.total_price) || 0;

        const quoteData = {
          detailer_id: user.id,
          client_name: mapped.name || '',
          client_email: email || null,
          customer_id: customerId || null,
          total_price: price,
          status: 'completed',
          notes: [mapped.service_name, mapped.notes].filter(Boolean).join(' - ') || 'Imported record',
          tail_number: mapped.tail_number || null,
          aircraft_type: mapped.aircraft_type || null,
          aircraft_model: mapped.aircraft_model || null,
        };

        const { error: quoteErr } = await supabase.from('quotes').insert(quoteData);
        if (quoteErr) {
          // Strip optional columns and retry
          delete quoteData.customer_id;
          delete quoteData.tail_number;
          delete quoteData.aircraft_type;
          delete quoteData.aircraft_model;
          const { error: retry2 } = await supabase.from('quotes').insert(quoteData);
          if (retry2) {
            results.errors.push(`Row ${i + 1} quote: ${retry2.message}`);
          } else {
            results.quotes++;
          }
        } else {
          results.quotes++;
        }
      }
    }

    return Response.json({ success: true, results });
  } catch (err) {
    console.error('[import] Execute error:', err);
    return Response.json({ error: 'Import failed: ' + err.message }, { status: 500 });
  }
}
