import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'

const formatCurrency = (value, compact = false) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
  ...(compact ? { notation: 'compact', maximumSignificantDigits: 3 } : {}),
}).format(value || 0)

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <p key={item.dataKey}>
          <span className="tooltip-dot" style={{ backgroundColor: item.color }} />
          {item.name}: <b>{formatCurrency(item.value)}</b>
        </p>
      ))}
    </div>
  )
}

function PerformanceCharts({ trend, departmentData, onChartAction }) {
  return (
    <section className="charts-grid" id="performance" aria-label="Performance charts">
      <article className="panel trend-panel">
        <div className="panel-heading">
          <div><h2>Revenue &amp; profit</h2><p>Monthly financial performance</p></div>
          <button className="chart-menu" type="button" aria-label="Revenue and profit chart options" onClick={onChartAction}>•••</button>
        </div>
        <div className="chart-legend"><span><i className="legend-swatch revenue-swatch" /> Revenue</span><span><i className="legend-swatch profit-swatch" /> Profit</span></div>
        {trend.length ? (
          <div className="chart-wrap trend-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 8, left: -12, bottom: 0 }} accessibilityLayer>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4263eb" stopOpacity={0.16} /><stop offset="94%" stopColor="#4263eb" stopOpacity={0} /></linearGradient>
                  <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#14a88a" stopOpacity={0.12} /><stop offset="94%" stopColor="#14a88a" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#edf0f5" strokeDasharray="3 4" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#657187', fontSize: 12 }} tickMargin={12} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#657187', fontSize: 11 }} tickFormatter={(value) => formatCurrency(value, true)} tickMargin={8} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#cbd3e0', strokeDasharray: '3 3' }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#4263eb" strokeWidth={2.5} fill="url(#revenueFill)" activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#14a88a" strokeWidth={2.5} fill="url(#profitFill)" activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="empty-chart">No revenue data in this date range.</div>}
      </article>

      <article className="panel department-panel" id="departments">
        <div className="panel-heading">
          <div><h2>Department performance</h2><p>Revenue compared to previous period</p></div>
          <button className="chart-menu" type="button" aria-label="Department chart options" onClick={onChartAction}>•••</button>
        </div>
        <div className="chart-legend"><span><i className="legend-swatch current-swatch" /> Current</span><span><i className="legend-swatch previous-swatch" /> Previous</span></div>
        {departmentData.length ? (
          <div className="chart-wrap dept-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData.slice(0, 5)} layout="vertical" margin={{ top: 2, right: 2, left: 0, bottom: 2 }} barCategoryGap={12} accessibilityLayer>
                <CartesianGrid horizontal={false} stroke="#edf0f5" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="department" axisLine={false} tickLine={false} width={102} tick={{ fill: '#657187', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f6f8fb' }} />
                <Bar dataKey="current" name="Current" fill="#4263eb" radius={[0, 4, 4, 0]} barSize={8} />
                <Bar dataKey="previous" name="Previous" fill="#dce2ed" radius={[0, 4, 4, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="empty-chart">No department data in this date range.</div>}
      </article>
    </section>
  )
}

export default PerformanceCharts
