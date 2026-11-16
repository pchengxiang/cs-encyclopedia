import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Technologies from './pages/Technologies'
import TechnologyDetail from './pages/TechnologyDetail'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><Routes><Route element={<Layout/>}><Route index element={<Home/>}/><Route path="technologies" element={<Technologies/>}/><Route path="technologies/:id" element={<TechnologyDetail/>}/><Route path="*" element={<Home/>}/></Route></Routes></BrowserRouter></React.StrictMode>)
