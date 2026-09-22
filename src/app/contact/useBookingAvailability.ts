'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { availabilityUrl, BookingNotEnabledError, cachedAvailability, invalidateAvailability, loadAvailability, type AvailabilityPayload } from '@/lib/contact/availability'

export function toLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const visitorZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

/** Calendar month, the server's availability payload for it, and the day/slot lookups the form needs. */
export function useBookingAvailability() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  // The server's payload is held whole: offered slots and their configured length arrive together.
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  // True until the server says booking is not configured; the page then offers direct email instead.
  const [bookingEnabled, setBookingEnabled] = useState(true)
  const [availabilityVersion, setAvailabilityVersion] = useState(0)
  const [timeZone, setTimeZone] = useState('')
  const [isLoadingSlots, setIsLoadingSlots] = useState(true)

  // Seed from the shared cache when booking mode is entered, before the load effect runs.
  const prime = useCallback(() => {
    const cached = cachedAvailability(availabilityUrl(currentMonth, visitorZone()))
    setAvailability(cached ?? null)
    setIsLoadingSlots(!cached)
    if (!cached) setAvailabilityVersion(version => version + 1)
  }, [currentMonth])

  // Resolve capability in either form mode. An intent link may open email first,
  // and switching modes must not discard an in-flight "unconfigured" response.
  // Pending reads are shared with link preloading; only a departed month is ignored.
  useEffect(() => {
    const zone = visitorZone()
    setTimeZone(zone)
    let cancelled = false
    const url = availabilityUrl(currentMonth, zone)
    const cached = cachedAvailability(url)
    setIsLoadingSlots(!cached)
    setAvailabilityError(null)
    setAvailability(cached ?? null)
    async function load() {
      try {
        const payload = await loadAvailability(url)
        if (!cancelled) setAvailability(payload)
      } catch (error) {
        if (cancelled) return
        if (error instanceof BookingNotEnabledError) setBookingEnabled(false)
        else setAvailabilityError('I couldn’t load the calendar. Try again, or send me a message below.')
      } finally {
        if (!cancelled) setIsLoadingSlots(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [currentMonth, availabilityVersion])

  const retryAvailability = useCallback(() => { invalidateAvailability(); setAvailability(null); setIsLoadingSlots(true); setAvailabilityVersion(value => value + 1) }, [])
  const changeMonth = useCallback((month: Date) => {
    setCurrentMonth(month)
    setIsLoadingSlots(true)
    setAvailability(null)
  }, [])

  // Calendar helpers
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysCount = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = []
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1
    for (let i = 0; i < adjustedFirstDay; i++) days.push(null)
    for (let i = 1; i <= daysCount; i++) days.push(i)
    return days
  }, [currentMonth])

  const getDateKey = useCallback((day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return toLocalDateKey(date)
  }, [currentMonth])

  const isDateAvailable = useCallback((day: number) => {
    const dateKey = getDateKey(day)
    const hasSlots = (availability?.slots[dateKey]?.length ?? 0) > 0
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date >= today && hasSlots
  }, [currentMonth, availability, getDateKey])

  const getSlotsForDate = useCallback((date: Date | null) => {
    if (!date) return []
    return availability?.slots[toLocalDateKey(date)] ?? []
  }, [availability])

  return {
    currentMonth, changeMonth, prime,
    availability, availabilityError, bookingEnabled, isLoadingSlots, retryAvailability, timeZone,
    daysInMonth, getDateKey, isDateAvailable, getSlotsForDate,
    slotMinutes: availability?.slotMinutes ?? null,
  }
}
