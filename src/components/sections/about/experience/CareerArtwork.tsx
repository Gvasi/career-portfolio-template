'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import DepthFrame from './DepthFrame'

export default function CareerArtwork({ image, position, description, active, reduced }: {
  image: string
  position?: string
  description: string
  active: boolean
  reduced: boolean
}) {
  // Measure the still frame. Its inner scene moves without changing layout.
  const element = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: element, offset: ['start 98%', 'start 43%'] })
  const arrival = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: .8, restDelta: .001 })
  const x = useTransform(arrival, [0, .7, 1], [48, 7, 0])
  const y = useTransform(arrival, [0, .7, 1], [54, 9, 0])
  const scale = useTransform(arrival, [0, 1], [.92, 1])
  const rotateY = useTransform(arrival, [0, 1], [-9, 0])
  const rotateX = useTransform(arrival, [0, 1], [5, 0])
  const imageScale = useTransform(arrival, [0, 1], [1.13, 1])
  const imageY = useTransform(arrival, [0, 1], [9, 0])
  return <div ref={element} className="ae-milestone-visual" data-focused={active}>
    <motion.div className="ae-artwork-arrival" style={{ x: reduced ? 0 : x, y: reduced ? 0 : y, scale: reduced ? 1 : scale, rotateY: reduced ? 0 : rotateY, rotateX: reduced ? 0 : rotateX, transformPerspective: 1300 }}>
      <DepthFrame reduced={reduced} active={active} className="ae-career-frame">
        <div className="ae-career-image">
          <motion.div className="ae-career-image-inner" style={{ scale: reduced ? 1 : imageScale, y: reduced ? 0 : imageY }}>
            <Image src={image} alt={description} fill quality={75} sizes="(max-width: 767px) calc(100vw - 60px), (max-width: 1100px) 34vw, 430px" style={{ objectPosition: position ?? '50% 50%' }}/>
          </motion.div>
        </div>
      </DepthFrame>
    </motion.div>
  </div>
}
