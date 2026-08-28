import { Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'

export default function TabLayout() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  )
}
