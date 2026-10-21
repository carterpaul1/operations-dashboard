import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import Papa from 'papaparse'
import {
  Activity, ArrowDownToLine, ArrowDownRight, ArrowUpRight, CalendarDays,
  Check, ChevronDown, CircleHelp, CloudUpload, Command, FileSpreadsheet,
  LayoutDashboard, Menu, Settings2, Sparkles, Users, X,
} from 'lucide-react'
import { aggregateByDepartment, aggregateByMonth, normalizeCsvRows, sampleRecords } from './data/metrics'
import './App.css'

const PerformanceCharts = lazy(() => import('./components/PerformanceCharts.jsx'))

const formatCurrency = (value, compact = false) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  ...(compact ? { notation: 'compact', maximumSignificantDigits: 3 } : {}),
}).format(value || 0)

const formatNumber = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value || 0)
const getDay = (date) => new Date(`${date}T00:00:00Z`)
const shiftDate = (date, amount) => {
  const shifted = getDay(date)
  shifted.setUTCDate(shifted.getUTCDate() + amount)
  return shifted.toISOString().slice(0, 10)
}
const formatShortDate = (date) => getDay(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

function MetricCard({ label, value, change, detail, icon: Icon, tone = 'blue' }) {
  const positive = change >= 0
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></div>
      <p className="metric-label">{label}</p>
      <div className="metric-value-row">
        <h2>{value}</h2>
        {change === null
          ? <span className="metric-change neutral">No baseline</span>
          : <span className={`metric-change ${positive ? 'positive' : 'negative'}`}>
            {positive ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
            {Math.abs(change).toFixed(1)}%
          </span>}
      </div>
      <p className="metric-detail">{detail}</p>
    </article>
  )
}

function App() {
  const [records, setRecords] = useState(sampleRecords)
  const [department, setDepartment] = useState('All departments')
  const [dateRange, setDateRange] = useState({ start: '2025-04-01', end: '2025-09-30' })
  const [period, setPeriod] = useState('6 months')
  const [notice, setNotice] = useState({ type: 'info', message: '' })
  const [isImporting, setIsImporting] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const fileInputRef = useRef(null)

  const departments = useMemo(() => [...new Set(records.map((row) => row.department))].sort(), [records])
  const rangeIsValid = Boolean(dateRange.start && dateRange.end && dateRange.start <= dateRange.end)
  const previousStart = rangeIsValid
    ? shiftDate(dateRange.start, -(Math.round((getDay(dateRange.end) - getDay(dateRange.start)) / 86400000) + 1))
    : dateRange.start
  const previousEnd = rangeIsValid ? shiftDate(dateRange.start, -1) : dateRange.start

  const { currentRecords, trend, departmentData, totals, previousTotals } = useMemo(() => {
    const matchesDepartment = (row) => department === 'All departments' || row.department === department
    const current = rangeIsValid
      ? records.filter((row) => row.date >= dateRange.start && row.date <= dateRange.end && matchesDepartment(row))
      : []
    const previous = rangeIsValid
      ? records.filter((row) => row.date >= previousStart && row.date <= previousEnd && matchesDepartment(row))
      : []
    const sum = (rows) => rows.reduce((total, row) => ({
      revenue: total.revenue + row.revenue,
      profit: total.profit + row.profit,
      orders: total.orders + row.orders,
    }), { revenue: 0, profit: 0, orders: 0 })

    return {
      currentRecords: current,
      trend: aggregateByMonth(current),
      departmentData: aggregateByDepartment(current, previous),
      totals: sum(current),
      previousTotals: sum(previous),
    }
  }, [records, department, dateRange, previousStart, previousEnd, rangeIsValid])

  const percentChange = (current, previous) => previous ? ((current - previous) / previous) * 100 : null
  const averageOrder = totals.orders ? totals.revenue / totals.orders : 0
  const previousAverageOrder = previousTotals.orders ? previousTotals.revenue / previousTotals.orders : 0
  const displayedRows = [...currentRecords].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)
  const dataSource = records === sampleRecords ? 'Sample dataset' : 'Imported dataset'

  const applyPeriod = (value) => {
    setPeriod(value)
    if (value === 'Custom range') return
    const days = value === '30 days' ? 30 : value === '90 days' ? 90 : 180
    const end = records.reduce((latest, row) => row.date > latest ? row.date : latest, records[0]?.date ?? '2025-09-30')
    setDateRange({ start: shiftDate(end, -(days - 1)), end })
  }

  const importFile = (file) => {
    if (!file) return
    setIsImporting(true)
    setNotice({ type: 'info', message: 'Reading your file…' })
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: ({ data, errors }) => {
        try {
          if (errors.length) throw new Error(errors[0].message)
          const imported = normalizeCsvRows(data)
          setRecords(imported)
          setDepartment('All departments')
          setDateRange({
            start: imported.reduce((earliest, row) => row.date < earliest ? row.date : earliest, imported[0].date),
            end: imported.reduce((latest, row) => row.date > latest ? row.date : latest, imported[0].date),
          })
          setPeriod('Custom range')
          setNotice({ type: 'success', message: `${formatNumber(imported.length)} rows imported successfully.` })
        } catch (error) {
          setNotice({ type: 'error', message: error.message || 'This CSV could not be read. Check its columns and try again.' })
        } finally {
          setIsImporting(false)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      },
      error: () => {
        setIsImporting(false)
        setNotice({ type: 'error', message: 'The file could not be read. Please try another CSV.' })
      },
    })
  }

  const exportCsv = () => {
    if (!currentRecords.length) return
    const csv = Papa.unparse(currentRecords.map(({ date, department: team, revenue, orders, profit }) => ({
      Date: date, Department: team, Revenue: revenue, Orders: orders, Profit: profit,
    })))
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `operations-report-${dateRange.start}-to-${dateRange.end}.csv`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice({ type: 'success', message: 'Your filtered report is ready.' })
  }

  const resetSample = () => {
    setRecords(sampleRecords)
    setDepartment('All departments')
    setDateRange({ start: '2025-04-01', end: '2025-09-30' })
    setPeriod('6 months')
    setNotice({ type: 'success', message: 'Sample dataset restored.' })
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#overview">Skip to dashboard</a>
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation">
        <a className="brand" href="#overview" aria-label="Northstar home">
          <span className="brand-mark"><Activity size={19} strokeWidth={2.3} /></span>
          <span>northstar<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-select" type="button">
          <span className="workspace-avatar">A</span>
          <span className="workspace-copy"><b>Acme Inc.</b><small>Business workspace</small></span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>
        <div className="nav-section-label">ANALYTICS</div>
        <nav className="side-nav">
          <a className="nav-item active" href="#overview" aria-current="page"><LayoutDashboard size={17} /> Overview</a>
          <a className="nav-item" href="#performance"><Activity size={17} /> Performance</a>
          <a className="nav-item" href="#departments"><Users size={17} /> Departments</a>
        </nav>
        <div className="nav-section-label reports-label">WORKSPACE</div>
        <nav className="side-nav">
          <button className="nav-item" type="button" onClick={() => fileInputRef.current?.click()}><FileSpreadsheet size={17} /> Data sources</button>
          <button className="nav-item" type="button" onClick={exportCsv}><ArrowDownToLine size={17} /> Reports</button>
          <button className="nav-item" type="button" onClick={() => setNotice({ type: 'info', message: 'Workspace settings are coming soon.' })}><Settings2 size={17} /> Settings</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon"><CircleHelp size={17} /></span>
            <b>Need a hand?</b>
            <p>Learn how to get more from your data.</p>
            <button type="button" onClick={() => setNotice({ type: 'info', message: 'Your dashboard guide is coming soon.' })}>View guide <span aria-hidden="true">↗</span></button>
          </div>
          <button className="profile-button" type="button" onClick={() => setNotice({ type: 'info', message: 'Signed in as Alex Morgan.' })}>
            <span className="profile-avatar">AM</span><span><b>Alex Morgan</b><small>Admin account</small></span><ChevronDown size={15} />
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu" type="button" aria-label="Toggle navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}>
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-divider">/</span><b>Overview</b></div>
          <div className="topbar-actions">
            <div className="status-indicator"><span /> All systems operational</div>
            <button className="topbar-avatar" type="button" aria-label="Account: Alex Morgan">AM</button>
          </div>
        </header>

        <main id="overview" className="dashboard-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> BUSINESS INTELLIGENCE</div>
              <h1>Good morning, Alex <span className="wave" aria-hidden="true">✳</span></h1>
              <p>Here’s what’s happening across your business.</p>
            </div>
            <div className="heading-actions">
              <label className="sr-only" htmlFor="csv-upload">Import a CSV data file</label>
              <input ref={fileInputRef} id="csv-upload" className="visually-hidden" type="file" accept=".csv,text/csv" onChange={(event) => importFile(event.target.files?.[0])} />
              <button className="btn btn-outline-secondary import-button" type="button" disabled={isImporting} onClick={() => fileInputRef.current?.click()}>
                <CloudUpload size={16} aria-hidden="true" /> {isImporting ? 'Importing…' : 'Import data'}
              </button>
              <button className="btn btn-primary export-button" type="button" onClick={exportCsv} disabled={!currentRecords.length}>
                <ArrowDownToLine size={16} aria-hidden="true" /> Export report
              </button>
            </div>
          </div>

          {notice.message && (
            <div className={`notice notice-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
              {notice.type === 'success' ? <Check size={16} /> : notice.type === 'error' ? <CircleHelp size={16} /> : <Sparkles size={16} />}
              <span>{notice.message}</span>
              <button type="button" aria-label="Dismiss message" onClick={() => setNotice({ type: 'info', message: '' })}><X size={15} /></button>
            </div>
          )}

          <section className="filter-bar" aria-label="Dashboard filters">
            <div className="filter-intro"><span className="filter-icon"><Settings2 size={16} /></span><span>Filters</span></div>
            <div className="filter-divider" />
            <div className="filter-control date-control">
              <CalendarDays size={15} aria-hidden="true" />
              <label className="sr-only" htmlFor="date-start">Start date</label>
              <input id="date-start" type="date" value={dateRange.start} onChange={(event) => { setDateRange((range) => ({ ...range, start: event.target.value })); setPeriod('Custom range') }} />
              <span className="date-to">to</span>
              <label className="sr-only" htmlFor="date-end">End date</label>
              <input id="date-end" type="date" value={dateRange.end} onChange={(event) => { setDateRange((range) => ({ ...range, end: event.target.value })); setPeriod('Custom range') }} />
            </div>
            <div className="filter-divider filter-divider-light" />
            <div className="filter-control department-control">
              <Users size={15} aria-hidden="true" />
              <label className="sr-only" htmlFor="department-select">Department</label>
              <select id="department-select" value={department} onChange={(event) => setDepartment(event.target.value)}>
                <option>All departments</option>
                {departments.map((team) => <option key={team}>{team}</option>)}
              </select>
            </div>
            <div className="filter-spacer" />
            <label className="sr-only" htmlFor="period-select">Reporting period</label>
            <select id="period-select" className="period-select" value={period} onChange={(event) => applyPeriod(event.target.value)}>
              <option>30 days</option><option>90 days</option><option>6 months</option><option>Custom range</option>
            </select>
          </section>
          {!rangeIsValid && <p className="filter-error" role="alert">Choose both dates, and make sure the start date is on or before the end date.</p>}

          <div className="section-title-row">
            <div><h2 className="section-title">Performance overview</h2><p className="section-subtitle">Key metrics compared with the previous period</p></div>
              <div className="period-note"><span className="period-dot" /> {rangeIsValid ? `${formatShortDate(dateRange.start)} — ${formatShortDate(dateRange.end)}` : 'Choose a valid date range'}</div>
          </div>
          <section className="metrics-grid" aria-label="Key performance indicators">
            <MetricCard label="Total revenue" value={formatCurrency(totals.revenue, true)} change={percentChange(totals.revenue, previousTotals.revenue)} detail="vs. previous period" icon={Activity} tone="blue" />
            <MetricCard label="Net profit" value={formatCurrency(totals.profit, true)} change={percentChange(totals.profit, previousTotals.profit)} detail="vs. previous period" icon={Sparkles} tone="purple" />
            <MetricCard label="Total orders" value={formatNumber(totals.orders)} change={percentChange(totals.orders, previousTotals.orders)} detail="vs. previous period" icon={Command} tone="green" />
            <MetricCard label="Avg. order value" value={formatCurrency(averageOrder)} change={percentChange(averageOrder, previousAverageOrder)} detail="vs. previous period" icon={Users} tone="amber" />
          </section>

          <Suspense fallback={<div className="chart-loading" role="status">Loading performance charts…</div>}>
            <PerformanceCharts trend={trend} departmentData={departmentData} onChartAction={() => setNotice({ type: 'info', message: 'Chart options are coming soon.' })} />
          </Suspense>

          <section className="panel activity-panel">
            <div className="panel-heading activity-heading">
              <div><h2>Recent activity</h2><p>Latest transactions from your teams</p></div>
              <div className="table-tools">{records !== sampleRecords && <button className="table-filter" type="button" onClick={resetSample}>Restore sample</button>}<span className="data-source"><span className="data-source-dot" /> {dataSource}</span><button className="table-filter" type="button" onClick={() => fileInputRef.current?.click()}><FileSpreadsheet size={14} aria-hidden="true" /> Import CSV</button></div>
            </div>
            <div className="table-responsive">
              <table className="table activity-table mb-0">
                <thead><tr><th scope="col">DATE</th><th scope="col">DEPARTMENT</th><th scope="col" className="text-end">REVENUE</th><th scope="col" className="text-end">ORDERS</th><th scope="col" className="text-end">NET PROFIT</th><th scope="col" className="text-end">MARGIN</th></tr></thead>
                <tbody>
                  {displayedRows.length ? displayedRows.map((row) => (
                    <tr key={row.id}>
                      <td className="transaction-date">{formatShortDate(row.date)}, {row.date.slice(0, 4)}</td>
                      <td><span className={`team-avatar team-${Math.abs(row.department.length) % 5}`}>{row.department.slice(0, 1).toUpperCase()}</span><span className="team-name">{row.department}</span></td>
                      <td className="text-end amount-cell">{formatCurrency(row.revenue)}</td>
                      <td className="text-end">{formatNumber(row.orders)}</td>
                      <td className="text-end amount-cell">{formatCurrency(row.profit)}</td>
                      <td className="text-end"><span className="margin-pill">{row.revenue ? (row.profit / row.revenue * 100).toFixed(1) : '0.0'}%</span></td>
                    </tr>
                  )) : <tr><td colSpan="6" className="table-empty">No transactions found. Try another date range or department.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="table-footer"><span>Showing <b>{formatNumber(displayedRows.length)}</b> of <b>{formatNumber(currentRecords.length)}</b> transactions</span><button type="button" onClick={exportCsv} disabled={!currentRecords.length}>Export all <ArrowDownToLine size={14} /></button></div>
          </section>

          <footer className="dashboard-footer"><span>© {new Date().getFullYear()} Northstar Analytics</span><span className="footer-links"><a href="#overview">Privacy</a><a href="#overview">Help center</a><span>Built for better decisions <Sparkles size={13} /></span></span></footer>
        </main>
      </div>
    </div>
  )
}

export default App
