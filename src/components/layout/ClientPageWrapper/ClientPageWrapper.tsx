'use client'

import { useEffect } from 'react'

interface ClientPageWrapperProps {
    children: React.ReactNode
}

// `--global-scale` stays fixed at 1 in globals.css; the former viewport-derived
// recalculation always produced 1 and has been removed.
export default function ClientPageWrapper({ children }: ClientPageWrapperProps) {
    useEffect(() => {
        // Scroll reveal animations
        const io = new IntersectionObserver(entries => {
            for (const e of entries) {
                if (e.isIntersecting) {
                    e.target.classList.add('reveal-show')
                    io.unobserve(e.target)
                }
            }
        }, { threshold: 0.2 })
        document.querySelectorAll('.reveal').forEach(el => io.observe(el))

        // Staggered card animations
        const cardIO = new IntersectionObserver(entries => {
            for (const e of entries) {
                if (e.isIntersecting) {
                    e.target.classList.add('reveal-card-show')
                    cardIO.unobserve(e.target)
                }
            }
        }, { threshold: 0.1 })
        document.querySelectorAll('.reveal-card').forEach(el => cardIO.observe(el))

        return () => {
            io.disconnect()
            cardIO.disconnect()
        }
    }, [])

    return <>{children}</>
}
