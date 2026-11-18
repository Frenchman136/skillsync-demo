import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Request from './pages/Request.jsx'
import Join from './pages/Join.jsx'
import Admin from './pages/Admin.jsx'
import Login from './pages/Login.jsx'
import Portal from './pages/Portal.jsx'
import RequireRole from './components/RequireRole.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="request" element={<Request />} />
        <Route path="join" element={<Join />} />
        <Route path="login" element={<Login />} />
        <Route path="admin" element={<RequireRole role="admin"><Admin /></RequireRole>} />
        <Route path="portal" element={<RequireRole role="contractor"><Portal /></RequireRole>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
