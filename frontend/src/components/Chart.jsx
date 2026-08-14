import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

export default function Chart({ option, height = 260 }) {
  const ref = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    chartRef.current = echarts.init(ref.current)
    const onResize = () => chartRef.current && chartRef.current.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chartRef.current && chartRef.current.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    if (chartRef.current && option) {
      chartRef.current.setOption(option, true)
    }
  }, [option])

  return <div ref={ref} style={{ width: '100%', height }} />
}

const DARK_TEXT = '#9aa3b2'
const AXIS = {
  axisLine: { lineStyle: { color: '#2c3140' } },
  axisLabel: { color: DARK_TEXT, fontSize: 11 },
  splitLine: { lineStyle: { color: '#1f232e' } },
}

export const pieOption = (title, data) => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { bottom: 0, textStyle: { color: DARK_TEXT, fontSize: 11 }, type: 'scroll' },
  color: ['#4f7cff', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#38bdf8', '#fb923c', '#94a3b8'],
  series: [{
    type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'],
    itemStyle: { borderColor: '#14161c', borderWidth: 2 },
    label: { color: DARK_TEXT, fontSize: 11 },
    data,
  }],
})

export const barOption = (labels, values, name = '数量') => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 40, right: 16, top: 16, bottom: 40 },
  xAxis: { ...AXIS, type: 'category', data: labels, axisLabel: { ...AXIS.axisLabel, interval: 0, rotate: labels.length > 6 ? 30 : 0 } },
  yAxis: { ...AXIS, type: 'value' },
  series: [{
    type: 'bar', data: values, barMaxWidth: 34,
    itemStyle: { color: '#4f7cff', borderRadius: [5, 5, 0, 0] },
  }],
})

export const barTopOption = (labels, values, name = '次数') => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 80, right: 24, top: 16, bottom: 30 },
  xAxis: { ...AXIS, type: 'value' },
  yAxis: { ...AXIS, type: 'category', data: labels, axisLabel: { ...AXIS.axisLabel, interval: 0 } },
  series: [{
    type: 'bar', data: values, barMaxWidth: 18,
    itemStyle: { color: '#a78bfa', borderRadius: [0, 5, 5, 0] },
  }],
})
