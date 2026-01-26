'use client'

import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'


//TODO: Doc for future graph - https://www.chartjs.org/docs/latest/samples/advanced/data-decimation.html 
//Just a basic graph for now
export default function LineChart() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
        datasets: [
          {
            label: 'My First Dataset',
            data: [65, 59, 80, 81, 56, 55, 40],
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
          },
        ],
      },
    })
    
    return () => {
      chart.destroy()
    }
  }, [])

  return <canvas ref={canvasRef} />
}
