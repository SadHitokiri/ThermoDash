import LineChart from './components/LineChart'
import Tile from './components/Tile'

export default function Page() {
  return (
    <div>
      <h1 className='text-6xl font-bold antialiased'>Dashboard</h1>
      <div id="graphs-list" className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] auto-rows-fr gap-6">
        <Tile title="Temperature">
          <LineChart />
        </Tile>
        <Tile title="Temperature">
          <LineChart />
        </Tile>
        <Tile title="Temperature">
          <LineChart />
        </Tile>
      </div>
    </div>
  )
}
