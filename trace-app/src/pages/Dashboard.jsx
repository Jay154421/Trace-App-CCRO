import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import { useQuery } from '../hooks/useQuery';
import { childrenApi } from '../services/api';
import { exportDatabaseFile, fetchDatabaseInfo, importDatabaseFile } from '../services/databaseApi';
import { AddApplicantModal } from '../components/AddApplicantModal';
import { getApplicantStatusDisplay } from '../utils/applicantStatus';
import { applicantDetailPath, getApplicantBasePathForRecord } from '../utils/applicantRoutes';

const APPLICATIONS_RANGE_OPTIONS = [
  { id: 'last7', label: 'Last 7 days' },
  { id: 'last14', label: 'Last 14 days' },
  { id: 'month', label: '12 months' },
  { id: 'year', label: 'Year' },
  { id: 'custom', label: 'Custom' },
];

function parseCreatedAt(createdAt) {
  if (!createdAt) return null;
  const datePart = String(createdAt).split(/[ T]/)[0];
  const d = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : toDateOnly(d);
}

function toDateOnly(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIsoDateOnly(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : toDateOnly(d);
}

function getDefaultCustomRange() {
  const end = toDateOnly(new Date());
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { from: formatIsoDate(start), to: formatIsoDate(end) };
}

function daysBetweenInclusive(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86400000) + 1;
}

function inferBucketPeriodForRange(start, end) {
  const days = daysBetweenInclusive(start, end);
  if (days <= 31) return 'day';
  if (days <= 731) return 'month';
  return 'year';
}

function isColbBrapRecord(child) {
  return String(child.application_type || '').toLowerCase() === 'colb_brap';
}

function applicationsBucketKey(date, period) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  if (period === 'year') return String(y);
  if (period === 'month') return `${y}-${m}`;
  return `${y}-${m}-${day}`;
}

function formatApplicationsBucketLabel(key, period) {
  if (period === 'year') return key;
  if (period === 'month') {
    const [y, m] = key.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  const [y, m, day] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, Number(day));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildBucketsFromRange(start, end, bucketPeriod) {
  if (bucketPeriod === 'year') {
    const keys = [];
    for (let y = start.getFullYear(); y <= end.getFullYear(); y += 1) {
      keys.push(String(y));
    }
    return keys;
  }
  if (bucketPeriod === 'month') {
    const keys = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= endMonth) {
      keys.push(applicationsBucketKey(cursor, 'month'));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return keys;
  }
  const keys = [];
  const cursor = toDateOnly(start);
  const endDay = toDateOnly(end);
  while (cursor <= endDay) {
    keys.push(applicationsBucketKey(cursor, 'day'));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function resolveApplicationsChartRange(rangeMode, customFrom, customTo, list) {
  const today = toDateOnly(new Date());

  if (rangeMode === 'last7') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { start, end: today, bucketPeriod: 'day' };
  }
  if (rangeMode === 'last14') {
    const start = new Date(today);
    start.setDate(start.getDate() - 13);
    return { start, end: today, bucketPeriod: 'day' };
  }
  if (rangeMode === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    return { start, end: today, bucketPeriod: 'month' };
  }
  if (rangeMode === 'year') {
    let startYear = today.getFullYear();
    for (const child of list) {
      const d = parseCreatedAt(child.created_at);
      if (d) startYear = Math.min(startYear, d.getFullYear());
    }
    return { start: new Date(startYear, 0, 1), end: today, bucketPeriod: 'year' };
  }
  if (rangeMode === 'custom') {
    let start = parseIsoDateOnly(customFrom);
    let end = parseIsoDateOnly(customTo);
    if (!start || !end) return null;
    if (start > end) {
      const swap = start;
      start = end;
      end = swap;
    }
    return { start, end, bucketPeriod: inferBucketPeriodForRange(start, end) };
  }
  return null;
}

function getApplicationsChartEmptyMessage(rangeMode) {
  if (rangeMode === 'last7') return 'No applications in the last 7 days yet.';
  if (rangeMode === 'last14') return 'No applications in the last 14 days yet.';
  if (rangeMode === 'month') return 'No applications in the last 12 months yet.';
  if (rangeMode === 'year') return 'No applications in the selected years yet.';
  return 'No applications in the selected date range yet.';
}

function aggregateApplicationsOverTime(list, rangeMode, customFrom, customTo) {
  const range = resolveApplicationsChartRange(rangeMode, customFrom, customTo, list);
  if (!range) {
    return { rows: [], bucketPeriod: 'day', needsCustomRange: rangeMode === 'custom' };
  }

  const { start, end, bucketPeriod } = range;
  const bucketKeys = buildBucketsFromRange(start, end, bucketPeriod);
  const rows = bucketKeys.map((key) => ({
    label: formatApplicationsBucketLabel(key, bucketPeriod),
    applicants: 0,
    colbBrap: 0,
    sortKey: key,
  }));
  const byKey = new Map(rows.map((row) => [row.sortKey, row]));

  for (const child of list) {
    const d = parseCreatedAt(child.created_at);
    if (!d) continue;
    if (d < start || d > end) continue;
    const key = applicationsBucketKey(d, bucketPeriod);
    const row = byKey.get(key);
    if (!row) continue;
    if (isColbBrapRecord(child)) row.colbBrap += 1;
    else row.applicants += 1;
  }

  return { rows, bucketPeriod, needsCustomRange: false };
}

export function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const defaultCustomRange = getDefaultCustomRange();
  const [applicationsRange, setApplicationsRange] = useState('month');
  const [customRangeFrom, setCustomRangeFrom] = useState(defaultCustomRange.from);
  const [customRangeTo, setCustomRangeTo] = useState(defaultCustomRange.to);
  const [listKey, setListKey] = useState(0);
  const [dbBusy, setDbBusy] = useState(false);
  const importDbInputRef = useRef(null);
  const { data, loading, error } = useQuery(childrenApi.list, [listKey]);
  const { data: dbInfo, error: dbInfoError } = useQuery(fetchDatabaseInfo, []);
  const list = Array.isArray(data) ? data : [];
  const recentApplicants = list.slice(0, 5);

  const registrationCounts = useMemo(() => {
    let verified = 0;
    let underProcess = 0;
    let incomplete = 0;
    for (const child of list) {
      const { key } = getApplicantStatusDisplay({
        checklist_total: child.checklist_total,
        checklist_checked: child.checklist_checked,
        staff_process_status: child.staff_process_status,
      });
      if (key === 'verified') verified += 1;
      else if (key === 'under_process') underProcess += 1;
      else incomplete += 1;
    }
    return { verified, underProcess, incomplete };
  }, [list]);

  const completedCount = registrationCounts.verified;
  const pendingCount = list.length - completedCount;

  const applicationsChart = useMemo(
    () => aggregateApplicationsOverTime(list, applicationsRange, customRangeFrom, customRangeTo),
    [list, applicationsRange, customRangeFrom, customRangeTo]
  );

  const applicationsOverTime = applicationsChart.rows;
  const applicationsBucketPeriod = applicationsChart.bucketPeriod;

  const applicationsChartHasData = useMemo(
    () => applicationsOverTime.some((row) => row.applicants > 0 || row.colbBrap > 0),
    [applicationsOverTime]
  );

  const handleApplicationsRangeChange = (rangeId) => {
    setApplicationsRange(rangeId);
    if (rangeId === 'custom') {
      const { from, to } = getDefaultCustomRange();
      setCustomRangeFrom(from);
      setCustomRangeTo(to);
    }
  };

  const registrationStatusPie = useMemo(() => {
    const { verified, underProcess, incomplete } = registrationCounts;
    const rows = [
      { name: 'Verified', value: verified, color: '#059669' },
      { name: 'Under process', value: underProcess, color: '#0284c7' },
      { name: 'Incomplete checklist', value: incomplete, color: '#d97706' },
    ];
    return rows.filter((d) => d.value > 0);
  }, [registrationCounts]);

  const stats = [
    { id: 'total', label: 'Total Applicants', value: list.length, hint: 'All recorded applicants' },
    { id: 'completed', label: 'Completed Registrations', value: completedCount, hint: 'Staff-verified applicants' },
    { id: 'pending', label: 'Pending Registrations', value: pendingCount, hint: 'Everyone not yet verified' },
  ];

  const [importConfirmFile, setImportConfirmFile] = useState(null);

  const handleExportDatabase = async () => {
    setDbBusy(true);
    try {
      const blob = await exportDatabaseFile();
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trace-backup-${stamp}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported (database and attachments).');
    } catch (err) {
      toast.error(err?.message || 'Export failed.');
    } finally {
      setDbBusy(false);
    }
  };

  const handleImportDatabase = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error('Select a .zip backup file.');
      return;
    }
    setImportConfirmFile(file);
  };

  const executeImport = async () => {
    const file = importConfirmFile;
    setImportConfirmFile(null);
    if (!file) return;
    
    setDbBusy(true);
    try {
      const result = await importDatabaseFile(file);
      const summary = result?.summary;
      if (summary) {
        toast.success(
          `Import complete: ${summary.addedApplicants} applicants added, ${summary.skippedApplicants} skipped, ${summary.addedChecklistItems} checklist added, ${summary.mergedChecklistItems} checklist merged, ${summary.copiedAttachments} attachments copied.`
        );
      } else {
        toast.success('Backup imported.');
      }
      setListKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.message || 'Import failed.');
    } finally {
      setDbBusy(false);
    }
  };

  return (  
    <div className="space-y-6 lg:space-y-8">
      <header className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50/70 to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 lg:text-3xl">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              Overview of applicants and document requirements.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={importDbInputRef}
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              onChange={handleImportDatabase}
              aria-label="Import backup zip"
            />
            <button
              type="button"
              onClick={handleExportDatabase}
              disabled={dbBusy}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Export backup
            </button>
            <button
              type="button"
              onClick={() => importDbInputRef.current?.click()}
              disabled={dbBusy}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              Import backup
            </button>
          </div>
        </div>
        {(dbInfo || dbInfoError) && (
          <div>
          </div>
        )}
      </header>

      <AddApplicantModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={() => setListKey((k) => k + 1)}
      />

      {importConfirmFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800">
              Import Backup
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Import new applicants and attachments from this backup? Existing matching applicants will be skipped.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setImportConfirmFile(null);
                  if (importDbInputRef.current) importDbInputRef.current.value = '';
                }}
                disabled={dbBusy}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeImport}
                disabled={dbBusy}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                {dbBusy ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800" role="alert">
          {error.message}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <section
            key={stat.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-labelledby={`stats-${stat.id}`}
          >
            <h2 id={`stats-${stat.id}`} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {stat.label}
            </h2>
            <p className="mt-3 text-3xl font-bold text-slate-800">
              {loading ? <span className="inline-block h-9 w-14 animate-pulse rounded-md bg-slate-200" /> : stat.value}
            </p>
            <p className="mt-2 text-xs text-slate-500">{stat.hint}</p>
          </section>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-1">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Applications over time</h2>
              <p className="mt-1 text-xs text-slate-500">
                New applicants and COLB BRAP records
                {applicationsRange === 'custom' && customRangeFrom && customRangeTo
                  ? ` from ${customRangeFrom} to ${customRangeTo}.`
                  : '.'}
              </p>
            </div>
            <div
              className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5"
              role="group"
              aria-label="Chart date range"
            >
              {APPLICATIONS_RANGE_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleApplicationsRangeChange(id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                    applicationsRange === id
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                  aria-pressed={applicationsRange === id}
                >
                  {label}
                </button>
              ))}
            </div>
            {applicationsRange === 'custom' && (
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  From
                  <input
                    type="date"
                    value={customRangeFrom}
                    max={customRangeTo || undefined}
                    onChange={(e) => setCustomRangeFrom(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  To
                  <input
                    type="date"
                    value={customRangeTo}
                    min={customRangeFrom || undefined}
                    onChange={(e) => setCustomRangeTo(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </label>
              </div>
            )}
          </div>
          <div className="mt-4 h-72 w-full min-h-[280px]">
            {loading ? (
              <div className="flex h-full items-center justify-center rounded-lg bg-slate-50">
                <div className="h-40 w-full max-w-md animate-pulse rounded-md bg-slate-200" />
              </div>
            ) : list.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                No applicants to chart yet.
              </div>
            ) : applicationsChart.needsCustomRange ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500">
                Select a start and end date to view the chart.
              </div>
            ) : !applicationsChartHasData ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500">
                {getApplicationsChartEmptyMessage(applicationsRange)}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={applicationsOverTime} margin={{ top: 8, right: 8, left: 0, bottom: 64 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={applicationsBucketPeriod === 'day' ? 'preserveStartEnd' : 0}
                    angle={applicationsBucketPeriod === 'year' ? 0 : -28}
                    textAnchor={applicationsBucketPeriod === 'year' ? 'middle' : 'end'}
                    height={72}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} width={36} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="applicants" name="Applicants" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="colbBrap" name="COLB BRAP" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

       
      </section>

    </div>
  );
}
